import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      )
    }

    // --------------------------------------------------
    // 1. Fetch active tasks
    // --------------------------------------------------
    const { data: tasks, error: tasksError } = await supabase
      .from("project_tasks")
      .select(`
        id,
        title,
        description,
        status,
        priority,
        assigned_to,
        due_date,
        created_at,
        updated_at
      `)
      .eq("project_id", projectId)
      .neq("status", "cancelled")

    if (tasksError) throw tasksError

    // --------------------------------------------------
    // 2. Fetch recent collaboration events
    // --------------------------------------------------
    const { data: events, error: eventsError } = await supabase
      .from("collaboration_events")
      .select(`
        id,
        user_id,
        event_type,
        entity_type,
        entity_id,
        metadata,
        created_at
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (eventsError) throw eventsError

    // --------------------------------------------------
    // 3. Fetch recent interventions
    // Prevent the coach from repeatedly generating
    // the exact same warning.
    // --------------------------------------------------
    const { data: existingInterventions, error: interventionError } =
      await supabase
        .from("ai_interventions")
        .select(`
          id,
          intervention_type,
          title,
          target_user_id,
          is_dismissed,
          is_actioned,
          created_at
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50)

    if (interventionError) throw interventionError

    const interventions: any[] = []

    const hasRecentIntervention = (
      type: string,
      targetUserId?: string | null
    ) => {
      const cutoff =
        Date.now() - 24 * 60 * 60 * 1000

      return (
        existingInterventions?.some((item) => {
          const created =
            new Date(item.created_at).getTime()

          return (
            item.intervention_type === type &&
            item.target_user_id ===
              (targetUserId ?? null) &&
            created > cutoff &&
            !item.is_dismissed &&
            !item.is_actioned
          )
        }) ?? false
      )
    }

    // ==================================================
    // RULE 1 — BLOCKED TASK
    // ==================================================

    for (const task of tasks ?? []) {
      if (task.status !== "blocked") continue

      const blockedSince = new Date(
        task.updated_at
      ).getTime()

      const hoursBlocked =
        (Date.now() - blockedSince) /
        (1000 * 60 * 60)

      // Don't bother people immediately.
      if (hoursBlocked < 24) continue

      if (
        hasRecentIntervention(
          "blocked_task",
          task.assigned_to
        )
      ) {
        continue
      }

      const severity =
        hoursBlocked >= 72
          ? "high"
          : "medium"

      interventions.push({
        project_id: projectId,
        intervention_type: "blocked_task",
        title: `Task blocked for ${Math.floor(
          hoursBlocked
        )} hours`,
        message: `"${task.title}" has been blocked for ${
          Math.floor(hoursBlocked)
        } hours. Consider discussing the blocker with the team.`,
        severity,
        trigger_data: {
          task_id: task.id,
          task_title: task.title,
          hours_blocked: Math.round(
            hoursBlocked
          ),
          priority: task.priority,
          status: task.status,
        },
        target_user_id:
          task.assigned_to ?? null,
        is_dismissed: false,
        is_actioned: false,
      })
    }

    // ==================================================
    // RULE 2 — UNASSIGNED HIGH-PRIORITY TASK
    // ==================================================

    for (const task of tasks ?? []) {
      if (
        task.status === "completed" ||
        task.status === "cancelled"
      ) {
        continue
      }

      if (!task.assigned_to) {
        if (
          task.priority === "high" ||
          task.priority === "critical"
        ) {
          if (
            !hasRecentIntervention(
              "unassigned_priority_task",
              null
            )
          ) {
            interventions.push({
              project_id: projectId,
              intervention_type:
                "unassigned_priority_task",
              title: "High-priority task needs an owner",
              message: `"${task.title}" is ${
                task.priority
              } priority but has no team member assigned.`,
              severity:
                task.priority === "critical"
                  ? "high"
                  : "medium",
              trigger_data: {
                task_id: task.id,
                task_title: task.title,
                priority: task.priority,
              },
              target_user_id: null,
              is_dismissed: false,
              is_actioned: false,
            })
          }
        }
      }
    }

    // ==================================================
    // RULE 3 — OVERDUE TASK
    // ==================================================

    for (const task of tasks ?? []) {
      if (
        !task.due_date ||
        task.status === "completed" ||
        task.status === "cancelled"
      ) {
        continue
      }

      const dueTime =
        new Date(task.due_date).getTime()

      if (dueTime >= Date.now()) continue

      if (
        hasRecentIntervention(
          "overdue_task",
          task.assigned_to
        )
      ) {
        continue
      }

      const daysOverdue = Math.floor(
        (Date.now() - dueTime) /
          (1000 * 60 * 60 * 24)
      )

      interventions.push({
        project_id: projectId,
        intervention_type: "overdue_task",
        title: "Task is overdue",
        message: `"${task.title}" is ${
          daysOverdue
        } day${
          daysOverdue === 1 ? "" : "s"
        } overdue.`,
        severity:
          daysOverdue >= 3
            ? "high"
            : "medium",
        trigger_data: {
          task_id: task.id,
          task_title: task.title,
          days_overdue: daysOverdue,
          due_date: task.due_date,
          priority: task.priority,
        },
        target_user_id:
          task.assigned_to ?? null,
        is_dismissed: false,
        is_actioned: false,
      })
    }

    // ==================================================
    // RULE 4 — PROJECT GOING QUIET
    // ==================================================

    const lastEvent = events?.[0]

    if (lastEvent) {
      const hoursSinceActivity =
        (Date.now() -
          new Date(
            lastEvent.created_at
          ).getTime()) /
        (1000 * 60 * 60)

      const hasActiveWork =
        (tasks ?? []).some(
          (task) =>
            task.status === "in_progress" ||
            task.status === "blocked"
        )

      if (
        hoursSinceActivity >= 72 &&
        hasActiveWork &&
        !hasRecentIntervention(
          "project_inactive",
          null
        )
      ) {
        interventions.push({
          project_id: projectId,
          intervention_type: "project_inactive",
          title: "Project activity has slowed down",
          message:
            "There has been little collaboration activity for several days while active work remains unfinished.",
          severity: "medium",
          trigger_data: {
            hours_since_activity:
              Math.round(
                hoursSinceActivity
              ),
            last_activity:
              lastEvent.created_at,
            active_task_count:
              (tasks ?? []).filter(
                (task) =>
                  task.status ===
                    "in_progress" ||
                  task.status === "blocked"
              ).length,
          },
          target_user_id: null,
          is_dismissed: false,
          is_actioned: false,
        })
      }
    }

    // ==================================================
    // 5. Save interventions
    // ==================================================

    if (interventions.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        interventions: [],
      })
    }

    const { data: inserted, error: insertError } =
      await supabase
        .from("ai_interventions")
        .insert(interventions)
        .select("*")

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      created: inserted?.length ?? 0,
      interventions: inserted ?? [],
    })
  } catch (error: any) {
    console.error(
      "[Collaboration Coach]",
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Collaboration Coach failed",
      },
      { status: 500 }
    )
  }
}
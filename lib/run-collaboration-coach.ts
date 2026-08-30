"use client"

import { supabase } from "@/lib/supabase/client"

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

type ExistingIntervention = {
  intervention_type: string
  target_user_id: string | null
  created_at: string
  is_dismissed: boolean
  is_actioned: boolean
}

function hasRecentIntervention(
  interventions: ExistingIntervention[],
  type: string,
  targetUserId: string | null = null
) {
  const cutoff =
    Date.now() - 24 * 60 * 60 * 1000

  return interventions.some((item) => {
    return (
      item.intervention_type === type &&
      item.target_user_id === targetUserId &&
      !item.is_dismissed &&
      !item.is_actioned &&
      new Date(item.created_at).getTime() >
        cutoff
    )
  })
}

export async function runCollaborationCoach(
  projectId: string
) {
  if (!projectId) {
    return
  }

  try {
    // ---------------------------------------------
    // Fetch tasks
    // ---------------------------------------------

    const { data: tasks, error: tasksError } =
      await supabase
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

    if (tasksError) {
      console.error(
        "[Coach] Task fetch error:",
        tasksError
      )
      return
    }

    // ---------------------------------------------
    // Fetch recent events
    // ---------------------------------------------

    const { data: events, error: eventsError } =
      await supabase
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
        .order("created_at", {
          ascending: false,
        })
        .limit(50)

    if (eventsError) {
      console.error(
        "[Coach] Event fetch error:",
        eventsError
      )
      return
    }

    // ---------------------------------------------
    // Fetch existing interventions
    // ---------------------------------------------

    const {
      data: existingInterventions,
      error: interventionError,
    } = await supabase
      .from("ai_interventions")
      .select(`
        intervention_type,
        target_user_id,
        created_at,
        is_dismissed,
        is_actioned
      `)
      .eq("project_id", projectId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100)

    if (interventionError) {
      console.error(
        "[Coach] Intervention fetch error:",
        interventionError
      )
      return
    }

    const existing =
      (existingInterventions ||
        []) as ExistingIntervention[]

    const interventions: any[] = []

    // =============================================
    // RULE 1
    // BLOCKED TASK > 24 HOURS
    // =============================================

    for (const task of (tasks || []) as Task[]) {
      if (task.status !== "blocked") {
        continue
      }

      const blockedHours =
        (Date.now() -
          new Date(task.updated_at).getTime()) /
        (1000 * 60 * 60)

      if (blockedHours < 24) {
        continue
      }

      if (
        hasRecentIntervention(
          existing,
          "blocked_task",
          task.assigned_to
        )
      ) {
        continue
      }

      interventions.push({
        project_id: projectId,
        intervention_type: "blocked_task",

        title:
          blockedHours >= 72
            ? "This task may need team attention"
            : "Task has been blocked",

        message:
          blockedHours >= 72
            ? `"${task.title}" has been blocked for ${Math.floor(
                blockedHours
              )} hours. It may be worth discussing the blocker with the team.`
            : `"${task.title}" has been blocked for more than a day. Consider discussing what is preventing progress.`,

        severity:
          blockedHours >= 72
            ? "high"
            : "medium",

        trigger_data: {
          task_id: task.id,
          task_title: task.title,
          hours_blocked: Math.floor(
            blockedHours
          ),
          priority: task.priority,
        },

        target_user_id:
          task.assigned_to,

        is_dismissed: false,
        is_actioned: false,
      })
    }

    // =============================================
    // RULE 2
    // OVERDUE TASK
    // =============================================

    for (const task of (tasks || []) as Task[]) {
      if (
        !task.due_date ||
        task.status === "completed"
      ) {
        continue
      }

      const due =
        new Date(task.due_date).getTime()

      if (due >= Date.now()) {
        continue
      }

      const daysOverdue = Math.max(
        1,
        Math.floor(
          (Date.now() - due) /
            (1000 * 60 * 60 * 24)
        )
      )

      if (
        hasRecentIntervention(
          existing,
          "overdue_task",
          task.assigned_to
        )
      ) {
        continue
      }

      interventions.push({
        project_id: projectId,
        intervention_type: "overdue_task",

        title: "A task is overdue",

        message:
          `"${task.title}" is ${daysOverdue} day${
            daysOverdue === 1 ? "" : "s"
          } overdue. The team may want to revisit its deadline.`,

        severity:
          daysOverdue >= 3
            ? "high"
            : "medium",

        trigger_data: {
          task_id: task.id,
          task_title: task.title,
          days_overdue: daysOverdue,
          priority: task.priority,
        },

        target_user_id:
          task.assigned_to,

        is_dismissed: false,
        is_actioned: false,
      })
    }

    // =============================================
    // RULE 3
    // HIGH PRIORITY + NO ASSIGNEE
    // =============================================

    for (const task of (tasks || []) as Task[]) {
      if (
        task.status === "completed" ||
        task.status === "cancelled"
      ) {
        continue
      }

      if (task.assigned_to) {
        continue
      }

      if (
        task.priority !== "high" &&
        task.priority !== "critical"
      ) {
        continue
      }

      if (
        hasRecentIntervention(
          existing,
          "unassigned_priority_task",
          null
        )
      ) {
        continue
      }

      interventions.push({
        project_id: projectId,

        intervention_type:
          "unassigned_priority_task",

        title:
          "This task needs an owner",

        message:
          `"${task.title}" is ${task.priority} priority but nobody is assigned to it.`,

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

    // =============================================
    // RULE 4
    // PROJECT HAS GONE QUIET
    // =============================================

    const lastEvent = events?.[0]

    if (lastEvent) {
      const hoursSinceActivity =
        (Date.now() -
          new Date(
            lastEvent.created_at
          ).getTime()) /
        (1000 * 60 * 60)

      const activeTasks =
        (tasks || []).filter(
          (task: Task) =>
            task.status ===
              "in_progress" ||
            task.status === "blocked"
        )

      if (
        hoursSinceActivity >= 72 &&
        activeTasks.length > 0 &&
        !hasRecentIntervention(
          existing,
          "project_inactive",
          null
        )
      ) {
        interventions.push({
          project_id: projectId,

          intervention_type:
            "project_inactive",

          title:
            "The project has gone quiet",

          message:
            "There has been little collaboration activity for several days while active work is still unfinished. A quick team check-in may help.",

          severity: "medium",

          trigger_data: {
            hours_since_activity:
              Math.floor(
                hoursSinceActivity
              ),

            active_task_count:
              activeTasks.length,

            last_activity:
              lastEvent.created_at,
          },

          target_user_id: null,

          is_dismissed: false,
          is_actioned: false,
        })
      }
    }

    // =============================================
    // Insert
    // =============================================

    if (interventions.length === 0) {
      return
    }

    const { error: insertError } =
      await supabase
        .from("ai_interventions")
        .insert(interventions)

    if (insertError) {
  console.error(
    "[Coach] Insert error:",
    insertError
  )
}

    console.log(
      `[Coach] Created ${interventions.length} intervention(s)`
    )
  } catch (error) {
    console.error(
      "[Coach] Unexpected error:",
      error
    )
  }
}
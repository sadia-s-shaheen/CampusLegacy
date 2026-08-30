import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const { projectId, userId } = await request.json()

    if (!projectId || !userId) {
      return NextResponse.json({ error: "Missing project or user ID" }, { status: 400 })
    }

    // 1. Gather recent collaboration data
    const [
      { data: recentEvents },
      { data: recentMessages },
      { data: blockedTasks }
    ] = await Promise.all([
      supabase
        .from("collaboration_events")
        .select("event_type, created_at")
        .eq("project_id", projectId)
        .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
        .order("created_at", { ascending: false }),
      
      supabase
        .from("message_analysis")
        .select("transactivity_score, sender_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("project_tasks")
        .select("id, title, assigned_to, status")
        .eq("project_id", projectId)
        .in("status", ["blocked", "todo"])
    ])

    // 2. Analyze the data for "Stall Patterns"
    let triggerType = "info"
    let severity = "info"
    let title = ""
    let message = ""

    const eventCount = recentEvents?.length || 0
    const avgTransactivity = recentMessages?.length 
      ? recentMessages.reduce((sum: number, m: any) => sum + (m.transactivity_score || 0), 0) / recentMessages.length 
      : 0

    // Pattern A: The Ghost Town (No activity for 48 hours)
    if (eventCount < 3) {
      triggerType = "stall_detected"
      severity = "warning"
      title = "Project Momentum Stalling"
      message = "It looks like the team hasn't logged any major updates in the last 48 hours. Consider scheduling a quick 15-minute sync to realign on your driving question."
    } 
    // Pattern B: Low Transactivity (Parallel play, not collaboration)
    else if (recentMessages && recentMessages.length >= 5 && avgTransactivity < 0.3) {
      triggerType = "low_transactivity"
      severity = "suggestion"
      title = "Collaboration Depth Check"
      message = "Recent chat analysis shows the team is mostly compartmentalizing tasks ('I'll do X, you do Y') rather than building on each other's reasoning. Try asking a teammate: 'What do you think about my approach to X?'"
    }
    // Pattern C: Blocked Tasks with No Resolution
    else if (blockedTasks && blockedTasks.length > 0) {
      const blockedCount = blockedTasks.filter((t: any) => t.status === "blocked").length
      if (blockedCount > 0) {
        triggerType = "blocked_task"
        severity = "critical"
        title = `${blockedCount} Task(s) Blocked`
        message = `There are ${blockedCount} tasks currently marked as blocked. If a task is blocked for more than 24 hours, it's time to ask for help in the chat or reassign it.`
      }
    }

    // If no issues found, generate a positive reinforcement nudge
    if (!title) {
      triggerType = "positive_reinforcement"
      severity = "info"
      title = "Great Team Momentum!"
      message = `Your team's recent transactivity score is ${avgTransactivity.toFixed(2)} (above average). You are actively building on each other's ideas. Keep it up!`
    }

    // 3. Save the Intervention to the Database
    const { data: intervention, error } = await supabase
      .from("ai_interventions")
      .insert({
        project_id: projectId,
        intervention_type: triggerType,
        title,
        message,
        severity,
        trigger_data: { eventCount, avgTransactivity, blockedTasks: blockedTasks?.length || 0 },
        target_user_id: userId, // Could be null to show to everyone
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, intervention })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json({ error: "Failed to check project health" }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// ============================================================
// TYPES
// ============================================================

type CoachAction =
  | { type: "none" }
  | {
      type: "create_task"
      title: string
      description?: string | null
      priority?: string | null
      status?: string | null
      due_date?: string | null
      assignee_id?: string | null
    }
  | {
      type: "create_multiple_tasks"
      tasks: Array<{
        title: string
        description?: string | null
        priority?: string | null
        status?: string | null
        due_date?: string | null
        assignee_id?: string | null
      }>
    }
  | { type: "complete_task"; task_id: string }
  | { type: "assign_task"; task_id: string; assignee_id: string }
  | { type: "unassign_task"; task_id: string }
  | {
      type: "update_task"
      task_id: string
      title?: string
      description?: string | null
      priority?: string | null
      status?: string | null
      due_date?: string | null
      assignee_id?: string | null
    }
  | { type: "change_task_status"; task_id: string; status: string }
  | { type: "change_task_priority"; task_id: string; priority: string }
  | { type: "set_task_due_date"; task_id: string; due_date: string | null }
  | { type: "delete_task"; task_id: string }
  | { type: "add_task_comment"; task_id: string; comment: string }
  | { type: "search_tasks"; query: string }

type Task = {
  id: string
  title: string
  description?: string | null
  status: string
  priority?: string | null
  assigned_to?: string | null
  due_date?: string | null
}

type TeamMember = {
  id: string
  name: string
}

// ============================================================
// HELPERS
// ============================================================

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function safeDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function normalizePriority(priority?: string | null): string {
  if (!priority) return "medium"
  const value = priority.toLowerCase().trim()
  if (["low", "medium", "high", "critical"].includes(value)) return value
  return "medium"
}

function normalizeStatus(status?: string | null): string {
  if (!status) return "todo"
  const value = status.toLowerCase().trim()
  const validStatuses = ["todo", "in_progress", "blocked", "completed", "cancelled"]
  if (validStatuses.includes(value)) return value
  return "todo"
}

// ============================================================
// POST
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 1. CREATE SERVER SUPABASE CLIENT
    const supabase = await createSupabaseServerClient()

    // 2. READ REQUEST
    const body = await request.json()
    const projectId = normalize(body?.projectId)
    const projectTitle = normalize(body?.projectTitle) || "Unknown project"
    const tasks: Task[] = Array.isArray(body?.tasks) ? body.tasks : []
    const recentMessages = Array.isArray(body?.recentMessages) ? body.recentMessages : []
    const question = normalize(body?.question)

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 })
    }

    // 3. VERIFY PROJECT (We need the project first to get the owner_id)
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, owner_id, title")
      .eq("id", projectId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }

    // 4. SKIP AUTH FOR PROTOTYPE
    // We use the project owner's ID as the user ID so database inserts (like created_by) don't fail.
    const userId = project.owner_id

    // 5. GROQ KEY
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error("❌ GROQ_API_KEY is missing")
      return NextResponse.json({ error: "AI service is not configured." }, { status: 500 })
    }

    // 6. FETCH TEAM MEMBERS
    const { data: rawMembers, error: membersError } = await supabase
      .from("team_members")
      .select(`person_id, status, people (id, full_name)`)
      .eq("project_id", projectId)
      .eq("status", "active")

    if (membersError) {
      console.error("⚠️ Coach team member context error:", membersError)
    }

    const teamMembers: TeamMember[] = (rawMembers ?? [])
      .map((member: any) => ({
        id: member.person_id,
        name: member.people?.full_name || "Unknown member",
      }))
      .filter((member) => member.id && member.name)

    // 7. FETCH CURRENT TASKS
    const { data: currentTasks, error: currentTasksError } = await supabase
      .from("project_tasks")
      .select(`id, title, description, status, priority, assigned_to, due_date`)
      .eq("project_id", projectId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true })

    if (currentTasksError) {
      console.error("⚠️ Coach current task context error:", currentTasksError)
    }
    const effectiveTasks = currentTasks ?? tasks

    // 8. BUILD CONTEXT STRINGS
    const taskList =
      effectiveTasks.length > 0
        ? effectiveTasks
            .map((task: Task) => {
              const assignee = teamMembers.find((member) => member.id === task.assigned_to)
              return [
                `ID: ${task.id}`,
                `Title: ${task.title}`,
                `Status: ${task.status}`,
                `Priority: ${task.priority || "medium"}`,
                `Assigned to: ${assignee?.name || task.assigned_to || "unassigned"}`,
                `Assignee ID: ${task.assigned_to || "none"}`,
                `Due: ${task.due_date || "none"}`,
                `Description: ${task.description || ""}`,
              ].join(" | ")
            })
            .join("\n")
        : "No tasks currently exist."

    const memberList =
      teamMembers.length > 0
        ? teamMembers.map((member) => `ID: ${member.id} | Name: ${member.name}`).join("\n")
        : "No team members found."

    const conversation =
      recentMessages.length > 0
        ? recentMessages.slice(-30).map((message: any) => `${message.sender || "User"}: ${message.content || ""}`).join("\n")
        : "No recent conversation."

    // 9. SYSTEM PROMPT
    const systemPrompt = `
You are CampusLegacy Coach, an AI collaboration teammate inside a student project group.
You help the team plan, organize, understand, and execute project work.
When the user asks you to perform an operation that you support, return a structured ACTION so the application can execute it.

============================================================
PROJECT
Project ID: ${projectId}
Project title: ${projectTitle}

============================================================
TEAM MEMBERS
${memberList}

============================================================
CURRENT TASKS
${taskList}

============================================================
RECENT CONVERSATION
${conversation}

============================================================
USER REQUEST
${question}

============================================================
SUPPORTED ACTIONS
Return VALID JSON ONLY with exactly TWO top-level fields: "reply" and "action".

NO ACTION: { "reply": "...", "action": { "type": "none" } }

CREATE TASK: { "reply": "...", "action": { "type": "create_task", "title": "Short task title", "description": "Useful description", "priority": "low|medium|high|critical", "status": "todo", "due_date": "ISO date or null", "assignee_id": "TEAM MEMBER ID or null" } }

CREATE MULTIPLE TASKS: { "reply": "...", "action": { "type": "create_multiple_tasks", "tasks": [{ "title": "Task 1", "description": "...", "priority": "medium", "status": "todo", "due_date": null, "assignee_id": null }] } }

COMPLETE TASK: { "reply": "...", "action": { "type": "complete_task", "task_id": "EXACT TASK ID" } }

ASSIGN TASK: { "reply": "...", "action": { "type": "assign_task", "task_id": "EXACT TASK ID", "assignee_id": "EXACT TEAM MEMBER ID" } }

UNASSIGN TASK: { "reply": "...", "action": { "type": "unassign_task", "task_id": "EXACT TASK ID" } }

UPDATE TASK: { "reply": "...", "action": { "type": "update_task", "task_id": "EXACT TASK ID", "title": "optional", "description": "optional", "priority": "optional", "status": "optional", "due_date": "optional", "assignee_id": "optional" } }

CHANGE STATUS: { "reply": "...", "action": { "type": "change_task_status", "task_id": "EXACT TASK ID", "status": "todo|in_progress|blocked|completed|cancelled" } }

CHANGE PRIORITY: { "reply": "...", "action": { "type": "change_task_priority", "task_id": "EXACT TASK ID", "priority": "low|medium|high|critical" } }

SET DUE DATE: { "reply": "...", "action": { "type": "set_task_due_date", "task_id": "EXACT TASK ID", "due_date": "ISO DATE" } }

DELETE TASK: { "reply": "...", "action": { "type": "delete_task", "task_id": "EXACT TASK ID" } }

ADD COMMENT: { "reply": "...", "action": { "type": "add_task_comment", "task_id": "EXACT TASK ID", "comment": "Comment text" } }

SEARCH TASKS: { "reply": "...", "action": { "type": "search_tasks", "query": "search phrase" } }

============================================================
SAFETY RULES
- Never invent task IDs or team member IDs. Only use IDs from CURRENT TASKS and TEAM MEMBERS.
- If a name is provided (e.g., "Sadia"), match it against TEAM MEMBERS and use the EXACT team member ID.
- If several tasks could match a vague request, DO NOT GUESS. Return type "none" and ask for clarification.
- Do not perform destructive actions (like delete) without an explicit request.
`

    // 10. CALL GROQ
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("❌ Groq error:", errorText)
      return NextResponse.json({ error: "The Coach could not respond right now." }, { status: 500 })
    }

    // 11. PARSE GROQ RESPONSE
    const result = await groqResponse.json()
    const rawReply = result?.choices?.[0]?.message?.content
    if (!rawReply) {
      return NextResponse.json({ error: "The Coach returned an empty response." }, { status: 500 })
    }

    let parsed: { reply: string; action: CoachAction }
    try {
      parsed = JSON.parse(rawReply)
    } catch {
      console.error("❌ Failed to parse Coach JSON:", rawReply)
      return NextResponse.json({ reply: rawReply, action: { type: "none" } })
    }

    if (!parsed || typeof parsed.reply !== "string") {
      return NextResponse.json({ error: "The Coach returned an invalid response." }, { status: 500 })
    }

    const action = parsed.action || { type: "none" }

    // 12. VALIDATORS
    const taskExists = (taskId: string) => effectiveTasks.some((task) => task.id === taskId)
    const memberExists = (memberId: string) => teamMembers.some((member) => member.id === memberId)

    // 13. EXECUTE ACTIONS
    if (action.type === "create_task") {
      if (!action.title?.trim()) {
        return NextResponse.json({ reply: "I need a task title before I can create it.", action: { type: "none" } })
      }
      if (action.assignee_id && !memberExists(action.assignee_id)) {
        return NextResponse.json({ reply: "I couldn't verify that team member, so I didn't create the task.", action: { type: "none" } })
      }
      const { data, error } = await supabase
        .from("project_tasks")
        .insert({
          project_id: projectId,
          title: action.title.trim(),
          description: action.description || null,
          status: normalizeStatus(action.status),
          priority: normalizePriority(action.priority),
          due_date: safeDate(action.due_date),
          assigned_to: action.assignee_id || null,
          created_by: userId, // Uses project owner ID
        })
        .select("*")
        .single()

      if (error) {
        console.error("❌ Coach create task failed:", error)
        return NextResponse.json({ reply: parsed.reply + "\n\n⚠️ I couldn't create the task because the database rejected the request.", action: { type: "none" } })
      }
      return NextResponse.json({ reply: parsed.reply + `\n\n✅ Task created: "${data.title}"`, action, task: data })
    }

    if (action.type === "assign_task") {
      if (!memberExists(action.assignee_id)) {
        return NextResponse.json({ reply: "I couldn't verify that person as a member of this project.", action: { type: "none" } })
      }
      const member = teamMembers.find((m) => m.id === action.assignee_id)
      const { data, error } = await supabase
        .from("project_tasks")
        .update({ assigned_to: action.assignee_id, updated_at: new Date().toISOString() })
        .eq("id", action.task_id)
        .eq("project_id", projectId)
        .select("*")
        .single()

      if (error) {
        console.error("❌ Assign task failed:", error)
        return NextResponse.json({ reply: "I couldn't assign that task.", action: { type: "none" } })
      }
      return NextResponse.json({ reply: parsed.reply + `\n\n✅ "${data.title}" assigned to ${member?.name || "the selected member"}.`, action, task: data })
    }

    if (action.type === "complete_task") {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from("project_tasks")
        .update({ status: "completed", completed_at: now, updated_at: now })
        .eq("id", action.task_id)
        .eq("project_id", projectId)
        .select("*")
        .single()

      if (error) {
        console.error("❌ Complete task failed:", error)
        return NextResponse.json({ reply: "I couldn't mark that task as completed.", action: { type: "none" } })
      }
      return NextResponse.json({ reply: parsed.reply + `\n\n✅ "${data.title}" is now completed.`, action, task: data })
    }

    if (action.type === "change_task_status") {
      const status = normalizeStatus(action.status)
      const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() }
      if (status === "completed") updateData.completed_at = new Date().toISOString()
      else updateData.completed_at = null

      const { data, error } = await supabase
        .from("project_tasks")
        .update(updateData)
        .eq("id", action.task_id)
        .eq("project_id", projectId)
        .select("*")
        .single()

      if (error) {
        console.error("❌ Change status failed:", error)
        return NextResponse.json({ reply: "I couldn't change that task's status.", action: { type: "none" } })
      }
      return NextResponse.json({ reply: parsed.reply + `\n\n✅ "${data.title}" is now ${data.status}.`, action, task: data })
    }

    if (action.type === "search_tasks") {
      const query = action.query.trim().toLowerCase()
      const matches = effectiveTasks.filter(
        (task) => task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query)
      )
      return NextResponse.json({
        reply:
          matches.length > 0
            ? `I found ${matches.length} matching task${matches.length === 1 ? "" : "s"}:\n\n${matches.map((task) => `• ${task.title} — ${task.status} — ${task.priority || "medium"}`).join("\n")}`
            : `I couldn't find any task matching "${action.query}".`,
        action,
        tasks: matches,
      })
    }

    // Default: Return the AI's text reply without executing a DB action
    return NextResponse.json({ reply: parsed.reply || "I couldn't determine what to do.", action: { type: "none" } })

  } catch (error: any) {
    console.error("❌ Coach chat error:", error)
    return NextResponse.json({ error: error?.message || "Something went wrong while talking to the Coach." }, { status: 500 })
  }
}
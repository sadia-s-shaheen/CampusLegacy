import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use the same Supabase client pattern as your other routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

    // 1. Get Project Context
    const { data: project } = await supabase.from("projects").select("title, description").eq("id", projectId).single()
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const { data: skills } = await supabase.from("project_skills").select("skills(name)").eq("project_id", projectId)
    const skillNames = skills?.map((s: any) => s.skills?.name).filter(Boolean) || []

    // 2. Call Groq AI
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 })

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{
          role: "system",
          content: `You are an expert academic project manager. 
          Project: "${project.title}" - ${project.description}
          Current Skills: ${skillNames.join(", ")}
          
          Suggest exactly 3 concrete "child project" extensions or major feature additions that a future student cohort could build on top of this.
          Return ONLY a valid JSON array of objects with this exact structure:
          [
            { "title": "Short Title", "description": "2-3 sentences explaining the extension", "domain": "e.g. AI, Web, Mobile", "difficulty": "intermediate", "ai_reason": "Why this is a valuable next step" }
          ]`
        }],
        response_format: { type: "json_object" }
      })
    })

    const aiData = await aiRes.json()
    // Strip markdown code blocks if the AI adds them
    const rawJson = aiData.choices?.[0]?.message?.content?.replace(/^```json\s*|\s*```$/g, "") || "[]"
    const extensions = JSON.parse(rawJson)

    // 3. Save to Database
    const rowsToInsert = extensions.map((ext: any) => ({
      source_project_id: projectId,
      title: ext.title,
      description: ext.description,
      domain: ext.domain || "General",
      difficulty: ext.difficulty || "intermediate",
      ai_reason: ext.ai_reason,
      created_from_ai: true
    }))

    const { error } = await supabase.from("project_ideas").insert(rowsToInsert)
    if (error) throw error

    return NextResponse.json({ success: true, count: rowsToInsert.length })

  } catch (error: any) {
    console.error("❌ Generate extensions failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
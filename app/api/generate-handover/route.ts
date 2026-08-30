import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    // 1. Safely parse the request body
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { projectId, userId } = body

    if (!projectId || !userId) {
      return NextResponse.json({ error: "Missing project or user ID" }, { status: 400 })
    }

    // 2. Check if GROQ_API_KEY exists
    if (!process.env.GROQ_API_KEY) {
      console.error("❌ GROQ_API_KEY is not set in .env.local")
      return NextResponse.json({ error: "Server configuration error: GROQ_API_KEY is missing" }, { status: 500 })
    }

    // 3. Gather all context for the AI safely
    const [
      { data: project },
      { data: decisions },
      { data: messages },
      { data: tasks }
    ] = await Promise.all([
      supabase.from("projects").select("title, description, status").eq("id", projectId).single(),
      supabase.from("project_decisions").select("title, decision, reasoning").eq("project_id", projectId),
      supabase.from("project_messages").select("content").eq("project_id", projectId).order("created_at", { ascending: false }).limit(30),
      supabase.from("project_tasks").select("title, status, priority").eq("project_id", projectId).eq("status", "blocked"),
    ])

    // 4. Call AI (Groq)
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          {
            role: "system",
            content: `You are an expert software architect and mentor. Generate a "Legacy Handover Document" in Markdown for the next generation of students taking over this project. 
            Use the following structure:
            ### Project Summary
            ### Architecture & Key Decisions
            ### Known Issues & Blockers
            ### Recommended Next Steps
            ### What NOT to Change
            
            IMPORTANT: Output ONLY raw Markdown text. Do NOT wrap the output in JSON, and do NOT use markdown code blocks (like \`\`\`markdown). Just output the raw text.`,
          },
          {
            role: "user",
            content: `Project: ${project?.title || "Unknown"}\nDescription: ${project?.description || "None"}\n\nDecisions Made:\n${JSON.stringify(decisions || [], null, 2)}\n\nRecent Chat Context:\n${(messages || []).map((m: any) => m.content).join("\n---\n")}\n\nCurrently Blocked Tasks:\n${JSON.stringify(tasks || [], null, 2)}`,
          },
        ],
        temperature: 0.7,
      }),
    })

    // 5. Handle AI Provider Errors gracefully
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error("❌ Groq API Error:", aiResponse.status, errorText)
      
      // Check if it's an HTML error page (e.g., from a proxy, firewall, or Next.js 404/500)
      if (errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html")) {
        return NextResponse.json({ error: "AI Provider returned an HTML error page. Check your API key, network, or proxy settings." }, { status: 500 })
      }
      
      return NextResponse.json({ error: `AI Provider Error: ${aiResponse.status} - ${errorText}` }, { status: 500 })
    }

    const aiData = await aiResponse.json()
    const handoverMarkdown = aiData.choices?.[0]?.message?.content || "Failed to generate content."

    // 6. Save to Database
    const { error } = await supabase.from("project_handovers").insert({
      project_id: projectId,
      summary: handoverMarkdown,
      generated_by_ai: true,
      ai_model: "groq-llama-3.1-8b",
      created_by: userId,
    })

    if (error) {
      console.error("❌ Database save error:", error)
      return NextResponse.json({ error: "Failed to save handover to database" }, { status: 500 })
    }

    return NextResponse.json({ success: true, content: handoverMarkdown })
  } catch (error: any) {
    console.error("❌ Handover generation failed:", error)
    return NextResponse.json({ error: error.message || "Failed to generate handover" }, { status: 500 })
  }
}
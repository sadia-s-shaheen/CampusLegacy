import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client" // Ensure this is your initialized client

export async function POST(request: Request) {
  try {
    const { messageId, projectId, senderId, content, previousMessages } = await request.json()

    if (!messageId || !projectId || !senderId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Call AI (Using Groq)
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Note: Ensure this model name exactly matches an available model in your Groq dashboard
        model: "qwen-2.5-32b", 
        messages: [
          {
            role: "system",
            content: `You are a collaboration analyzer. Analyze the latest message in the context of previous messages. 
            Output ONLY a raw JSON object with these keys (values 0.0 to 1.0):
            - transactivity: Does it build on or operate on another person's reasoning?
            - reasoning: Does it contain logical justification or technical depth?
            - questioning: Does it ask clarifying or probing questions?
            - knowledge_sharing: Does it share new information, code, or resources?
            - initiative: Does it propose a new action or take ownership?
            
            Example output: {"transactivity": 0.8, "reasoning": 0.9, "questioning": 0.1, "knowledge_sharing": 0.7, "initiative": 0.5}`,
          },
          {
            role: "user",
            content: `Previous messages:\n${previousMessages.map((m: any) => `${m.sender_name}: ${m.content}`).join("\n")}\n\nLatest message to analyze: ${content}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error("❌ Groq API error:", errorText)
      return NextResponse.json({ error: "AI service failed" }, { status: 500 })
    }

    const aiData = await aiResponse.json()
    let rawContent = aiData.choices[0].message.content

    // ✅ FIX 1: Safely parse JSON (strip markdown code blocks if the LLM adds them)
    rawContent = rawContent.replace(/^```json\s*|\s*```$/g, "").trim()
    const scores = JSON.parse(rawContent)

    // 2. Insert into message_analysis
    await supabase.from("message_analysis").insert({
      message_id: messageId,
      project_id: projectId,
      sender_id: senderId,
      transactivity_score: scores.transactivity || 0,
      reasoning_score: scores.reasoning || 0,
      questioning_score: scores.questioning || 0,
      knowledge_sharing_score: scores.knowledge_sharing || 0,
      initiative_score: scores.initiative || 0,
      model_name: "qwen-2.5-32b", // ✅ FIX 2: Match the actual model used
    })

    // 3. Update collaboration_profiles (Running Average)
    const { data: profile } = await supabase
      .from("collaboration_profiles")
      .select("*")
      .eq("user_id", senderId)
      .single()

    // ✅ FIX 3: Safer null handling to prevent NaN
    const n = profile?.messages_analyzed || 0
    const calculateAvg = (current: number, newVal: number) => 
      n === 0 ? newVal : (current * n + newVal) / (n + 1)

    await supabase.from("collaboration_profiles").upsert({
      user_id: senderId,
      messages_analyzed: n + 1,
      transactivity_score: calculateAvg(profile?.transactivity_score || 0, scores.transactivity || 0),
      reasoning_score: calculateAvg(profile?.reasoning_score || 0, scores.reasoning || 0),
      questioning_score: calculateAvg(profile?.questioning_score || 0, scores.questioning || 0),
      knowledge_sharing_score: calculateAvg(profile?.knowledge_sharing_score || 0, scores.knowledge_sharing || 0),
      initiative_score: calculateAvg(profile?.initiative_score || 0, scores.initiative || 0),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Background analysis failed:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
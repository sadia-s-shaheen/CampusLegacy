import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    // 1. Get current user's data
    const { data: userProfile } = await supabase
      .from("people")
      .select(`id, people_skills(skill_id, skills(name)), collaboration_profiles(transactivity_score)`)
      .eq("id", userId)
      .single()

    if (!userProfile) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const userSkillIds = new Set(userProfile.people_skills?.map((ps: any) => ps.skill_id) || [])
    const userTransactivity = userProfile.collaboration_profiles?.[0]?.transactivity_score ?? 0.5
    const userSkillsNames = userProfile.people_skills?.map((ps: any) => ps.skills.name) || []

    // 2. Get candidates
    const { data: candidates } = await supabase
      .from("people")
      .select(`id, full_name, role, year, people_skills(skill_id, skills(name)), collaboration_profiles(transactivity_score)`)
      .neq("id", userId)
      .limit(100)

    if (!candidates) return NextResponse.json({ results: [] })

    // 3. Score candidates mathematically
    const scoredCandidates = candidates.map((c: any) => {
      const candidateSkillIds = new Set(c.people_skills?.map((ps: any) => ps.skill_id) || [])
      const candidateTransactivity = c.collaboration_profiles?.[0]?.transactivity_score ?? 0.5

      const complementarySkills = c.people_skills?.filter((ps: any) => !userSkillIds.has(ps.skill_id)).map((ps: any) => ps.skills.name) || []
      const skillScore = candidateSkillIds.size > 0 ? complementarySkills.length / candidateSkillIds.size : 0
      const transactivityCompat = 1 - Math.abs(userTransactivity - candidateTransactivity)
      const finalScore = (skillScore * 0.6) + (transactivityCompat * 0.4)

      return {
        id: c.id,
        full_name: c.full_name,
        role: c.role,
        year: c.year,
        complementary_skills: complementarySkills.slice(0, 3),
        final_score: finalScore,
        skill_score: skillScore,
        collab_score: transactivityCompat,
        reason: "", // We will fill this with Groq
      }
    })

    scoredCandidates.sort((a: any, b: any) => b.final_score - a.final_score)

    // 4. Generate AI Reasoning for the Top 5 Candidates using Groq
    let aiReasons: Record<string, string> = {}
    const topCandidates = scoredCandidates.slice(0, 5)

    if (topCandidates.length > 0) {
      const groqKey = process.env.GROQ_API_KEY
      if (groqKey) {
        try {
          const prompt = `
You are an expert team-matching AI. 
I am a student with skills: [${userSkillsNames.join(", ")}] and a collaboration intensity score of ${Math.round(userTransactivity * 100)}%.

Here are my top recommended teammates based on complementary skills and matching work ethic:
${JSON.stringify(topCandidates.map(c => ({ 
  name: c.full_name, 
  role: c.role, 
  year: c.year, 
  unique_skills: c.complementary_skills, 
  skill_match: Math.round(c.skill_score * 100) + "%", 
  collab_match: Math.round(c.collab_score * 100) + "%" 
})), null, 2)}

For each candidate, generate a short, natural, and insightful 1-2 sentence reason why they are a great match for me. Focus on how their unique skills fill my gaps and how their collaboration style aligns with mine.

Return ONLY a valid JSON object where the keys are their full names and the values are the reasoning strings. Do not include markdown formatting.
Example: { "Alice Smith": "Alice brings strong Python skills that complement your frontend focus, and her high collaboration score means she'll communicate just as frequently as you do." }
          `

          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-120b", // Fast and cheap model
              temperature: 0.7,
              max_tokens: 500,
              response_format: { type: "json_object" },
              messages: [{ role: "system", content: prompt }],
            }),
          })

          const groqData = await groqResponse.json()
          const rawContent = groqData.choices?.[0]?.message?.content || "{}"
          
          // Clean up markdown if Groq adds it
          const cleanJson = rawContent.replace(/^```json\s*|\s*```$/g, "").trim()
          aiReasons = JSON.parse(cleanJson)

        } catch (groqError) {
          console.error("Groq reasoning generation failed:", groqError)
          // Fallback if Groq fails
          topCandidates.forEach(c => { aiReasons[c.full_name] = `High compatibility match based on complementary skills and collaboration style.` })
        }
      }
    }

    // 5. Merge AI reasons back into the full list
    const finalResults = scoredCandidates.map(c => ({
      ...c,
      reason: aiReasons[c.full_name] || `Strong match based on complementary skills and collaboration alignment.`
    }))

    return NextResponse.json({ results: finalResults.slice(0, 20) })

  } catch (error: any) {
    console.error("Global recommendation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
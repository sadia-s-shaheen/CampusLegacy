import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

    // 1. Get project's REQUIRED skills
    const { data: projectSkills } = await supabase
      .from("project_skills")
      .select("skill_id, importance, skills(name)")
      .eq("project_id", projectId)
      .eq("importance", "required")

    const requiredSkillIds = new Set(projectSkills?.map((ps: any) => ps.skill_id) || [])
    const requiredSkillNames = projectSkills?.map((ps: any) => ps.skills.name) || []

    // 2. Get current active team members and their skills
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select(`
        person_id,
        covered_skill_ids,
        people!inner(
          id,
          people_skills(skill_id, skills(name)),
          collaboration_profiles(transactivity_score)
        )
      `)
      .eq("project_id", projectId)
      .eq("status", "active")

    const currentTeamIds = new Set(teamMembers?.map((m: any) => m.person_id) || [])
    
    // Calculate team average transactivity
    const teamTransactivityScores = teamMembers
      ?.map((m: any) => m.people?.collaboration_profiles?.[0]?.transactivity_score)
      .filter((score: any) => score !== null && score !== undefined) || []
    
    const teamAvgTransactivity = teamTransactivityScores.length > 0 
      ? teamTransactivityScores.reduce((a: number, b: number) => a + b, 0) / teamTransactivityScores.length 
      : 0.5

    // Find all skills currently covered by the team (from profile OR manually covered)
    const coveredSkillIds = new Set<string>()
    teamMembers?.forEach((m: any) => {
      m.people?.people_skills?.forEach((ps: any) => coveredSkillIds.add(ps.skill_id))
      m.covered_skill_ids?.forEach((id: string) => coveredSkillIds.add(id))
    })

    // Find MISSING required skills
    const missingSkillIds = [...requiredSkillIds].filter(id => !coveredSkillIds.has(id))
    
    // Target the missing skills (or all required if none are missing)
    const targetSkillIds = missingSkillIds.length > 0 ? missingSkillIds : [...requiredSkillIds]

    // 3. Fetch a pool of candidates (excluding current team)
    const { data: candidates } = await supabase
      .from("people")
      .select(`
        id,
        full_name,
        role,
        year,
        people_skills(skill_id, skills(name)),
        collaboration_profiles(transactivity_score)
      `)
      .limit(150)

    if (!candidates) {
      return NextResponse.json({ recommendations: [], team_avg_transactivity: teamAvgTransactivity })
    }

    const filteredCandidates = candidates.filter((c: any) => !currentTeamIds.has(c.id))

    // 4. Score candidates mathematically
    const scoredCandidates = filteredCandidates.map((c: any) => {
      const candidateSkillIds = new Set(c.people_skills?.map((ps: any) => ps.skill_id) || [])
      const candidateTransactivity = c.collaboration_profiles?.[0]?.transactivity_score ?? 0.5

      // HETEROGENEOUS SKILLS: How many of the MISSING skills do they have?
      const matchingMissingSkills = targetSkillIds.filter(id => candidateSkillIds.has(id))
      const skillScore = targetSkillIds.length > 0 ? matchingMissingSkills.length / targetSkillIds.length : 0

      // HOMOGENEOUS TRANSACTIVITY: How close is their score to the team average?
      const transactivityCompat = 1 - Math.abs(teamAvgTransactivity - candidateTransactivity)

      // FINAL SCORE: 60% Skill, 40% Transactivity
      const finalScore = (skillScore * 0.6) + (transactivityCompat * 0.4)

      const matchingSkillNames = c.people_skills
        ?.filter((ps: any) => targetSkillIds.includes(ps.skill_id))
        .map((ps: any) => ps.skills.name) || []

      return {
        user_id: c.id,
        name: c.full_name,
        year: c.year,
        skills: matchingSkillNames.slice(0, 3),
        technical_score: skillScore,
        transactivity_compatibility: transactivityCompat,
        final_score: finalScore,
        ai_reason: `${c.full_name} has the missing ${matchingSkillNames.slice(0, 2).join(" and ")} skills your team needs, and their collaboration style (${Math.round(candidateTransactivity * 100)}%) aligns well with your team's average (${Math.round(teamAvgTransactivity * 100)}%).`
      }
    })

    // Sort by final score descending
    scoredCandidates.sort((a, b) => b.final_score - a.final_score)

    // 5. Enhance top 3 with Groq AI reasoning
    const topCandidates = scoredCandidates.slice(0, 3)
    if (topCandidates.length > 0 && process.env.GROQ_API_KEY) {
      try {
        const prompt = `
You are an expert academic project manager. 
The project requires these skills: [${requiredSkillNames.join(", ")}].
The current team's average collaboration/transactivity score is ${Math.round(teamAvgTransactivity * 100)}%.
Here are top candidates who have the missing skills:
${JSON.stringify(topCandidates.map(c => ({ name: c.name, skills: c.skills, collab_score: Math.round(c.transactivity_compatibility * 100) + "%" })), null, 2)}

For each candidate, generate a short, natural, 1-sentence reason why they are a great fit for this specific project. Focus on how their skills fill the gap and their collaboration style matches the team.
Return ONLY a valid JSON object where keys are their names and values are the reasoning strings. No markdown formatting.
Example: { "Alice Smith": "Alice brings the missing Python skills your team needs, and her high collaboration score ensures she'll communicate just as frequently as your current members." }
`
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 300,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: prompt }],
          }),
        })
        const groqData = await groqResponse.json()
        const rawContent = groqData.choices?.[0]?.message?.content || "{}"
        const cleanJson = rawContent.replace(/^```json\s*|\s*```$/g, "").trim()
        const aiReasons = JSON.parse(cleanJson)

        scoredCandidates.forEach(c => {
          if (aiReasons[c.name]) {
            c.ai_reason = aiReasons[c.name]
          }
        })
      } catch (err) {
        console.error("Groq reasoning failed, using fallback:", err)
      }
    }

    return NextResponse.json({ 
      recommendations: scoredCandidates.slice(0, 10), 
      team_avg_transactivity: teamAvgTransactivity 
    })

  } catch (error: any) {
    console.error("Teammate recommendation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
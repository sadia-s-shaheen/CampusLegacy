import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { projectId } = await request.json()
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 })

    // 1. FETCH PROJECT CONTEXT
    const { data: project } = await supabase.from("projects").select("id, title, description").eq("id", projectId).single()
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    // 2. FETCH OPEN ROLES & REQUIRED SKILLS
    const { data: openRoles } = await supabase
      .from("project_roles")
      .select(`id, title, project_role_skills(skill_id, skills(name))`)
      .eq("project_id", projectId)
      .eq("status", "open")

    const allRequiredSkillIds = new Set<string>()
    openRoles?.forEach((role: any) => {
      role.project_role_skills?.forEach((rs: any) => allRequiredSkillIds.add(rs.skill_id))
    })

    // 3. FETCH CURRENT TEAM (To exclude them and calculate avg transactivity)
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("person_id, people(year)")
      .eq("project_id", projectId)
      .eq("status", "active")

    const currentTeamIds = new Set(teamMembers?.map((m: any) => m.person_id) || [])
    const teamYears = teamMembers?.map((m: any) => m.people?.year).filter(Boolean) || []
    
    // Calculate Team Transactivity Average
    let teamAvgTransactivity = 0.5
    if (currentTeamIds.size > 0) {
      const { data: profiles } = await supabase.from("collaboration_profiles").select("transactivity_score").in("user_id", Array.from(currentTeamIds))
      const scores = profiles?.map((p: any) => p.transactivity_score ?? 0.5) || []
      teamAvgTransactivity = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5
    }

    // 4. FETCH CANDIDATE POOL (Limit to 50 to prevent timeout, filter by at least 1 relevant skill)
    const { data: candidateSkills } = await supabase
      .from("people_skills")
      .select("person_id")
      .in("skill_id", Array.from(allRequiredSkillIds))
      .limit(150) // Get a broad pool

    const candidateIds = [...new Set(candidateSkills?.map((c: any) => c.person_id) || [])].filter((id) => !currentTeamIds.has(id))
    
    if (candidateIds.length === 0) {
      return NextResponse.json({ recommendations: [], team_avg_transactivity: teamAvgTransactivity })
    }

    const { data: candidates } = await supabase
      .from("people")
      .select(`id, full_name, year, interests, people_skills(skill_id, skills(name)), collaboration_profiles(transactivity_score)`)
      .in("id", candidateIds.slice(0, 50)) // Cap at 50 for performance

    // 5. DETERMINISTIC SCORING (Fast Math)
    const scoredCandidates = candidates?.map((c: any) => {
      const candidateSkillIds = new Set(c.people_skills?.map((ps: any) => ps.skill_id) || [])
      
      // A. Open Role Match (Highest Weight)
      let roleMatchScore = 0
      let matchedRoleTitle = null
      openRoles?.forEach((role: any) => {
        const roleSkillIds = role.project_role_skills?.map((rs: any) => rs.skill_id) || []
        const matchCount = roleSkillIds.filter((id: string) => candidateSkillIds.has(id)).length
        if (roleSkillIds.length > 0 && matchCount / roleSkillIds.length > roleMatchScore) {
          roleMatchScore = matchCount / roleSkillIds.length
          matchedRoleTitle = role.title
        }
      })

      // B. General Technical Skill Match
      const techMatchScore = allRequiredSkillIds.size > 0 
        ? [...allRequiredSkillIds].filter(id => candidateSkillIds.has(id)).length / allRequiredSkillIds.size 
        : 0

      // C. Transactivity Compatibility (Homogeneous)
      const candidateTransactivity = c.collaboration_profiles?.[0]?.transactivity_score ?? 0.5
      const transactivityCompat = 1 - Math.abs(teamAvgTransactivity - candidateTransactivity)

      // D. Year of Study Diversity (Bonus if they bring a different year perspective)
      const avgTeamYear = teamYears.length > 0 ? teamYears.reduce((a, b) => a + b, 0) / teamYears.length : 0
      const yearDiff = Math.abs((c.year || 0) - avgTeamYear)
      const yearDiversityScore = Math.min(yearDiff * 0.2, 1.0) // Up to 1.0 bonus for being a different year

      // Weighted Deterministic Score
      const detScore = (roleMatchScore * 0.4) + (techMatchScore * 0.3) + (transactivityCompat * 0.2) + (yearDiversityScore * 0.1)

      return {
        user_id: c.id,
        name: c.full_name,
        year: c.year,
        interests: c.interests,
        skills: c.people_skills?.map((ps: any) => ps.skills?.name).filter(Boolean),
        transactivity_score: candidateTransactivity,
        matched_role: matchedRoleTitle,
        det_score: detScore
      }
    }).sort((a, b) => b.det_score - a.det_score) || []

    // 6. AI "WILDCARD" ANALYSIS (The Overall Criteria)
    // Send top 10 deterministic candidates to AI to find the "Strategic Fit"
    const topCandidates = scoredCandidates.slice(0, 10)
    let aiReasons: Record<string, { score: number; reason: string }> = {}

    if (topCandidates.length > 0) {
      const apiKey = process.env.GROQ_API_KEY
      if (apiKey) {
        try {
          const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai/gpt-oss-120b",
              messages: [{
                role: "system",
                content: `You are an expert academic project manager. 
                Project: "${project.title}" - ${project.description}
                Open Roles: ${openRoles?.map((r: any) => r.title).join(", ")}
                
                Analyze these top candidates based on their skills, interests, and year. 
                Return a JSON object where keys are user_ids and values are { "strategic_score": 0-100, "ai_reason": "max 12 words on why they are uniquely useful for THIS specific project" }.
                ONLY return valid JSON.`
              }, {
                role: "user",
                content: JSON.stringify(topCandidates.map(c => ({ id: c.user_id, name: c.name, year: c.year, skills: c.skills, interests: c.interests })))
              }],
              response_format: { type: "json_object" }
            })
          })
          const aiData = await aiRes.json()
          aiReasons = JSON.parse(aiData.choices[0].message.content.replace(/^```json\s*|\s*```$/g, ""))
        } catch (e) { console.error("AI wildcard failed", e) }
      }
    }

    // 7. FINAL MERGE & RETURN
    const finalRecommendations = topCandidates.map(c => {
      const aiData = aiReasons[c.user_id] || { strategic_score: 50, ai_reason: "Strong technical match." }
      const finalScore = (c.det_score * 0.6) + ((aiData.strategic_score / 100) * 0.4)
      
      return {
        ...c,
        final_score: finalScore,
        ai_reason: aiData.ai_reason,
        technical_score: c.det_score, // Reusing for UI
        transactivity_compatibility: 1 - Math.abs(teamAvgTransactivity - c.transactivity_score)
      }
    }).sort((a, b) => b.final_score - a.final_score)

    return NextResponse.json({ 
      recommendations: finalRecommendations.slice(0, 5), 
      team_avg_transactivity: teamAvgTransactivity 
    })

  } catch (error: any) {
    console.error("❌ Recommendation engine error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
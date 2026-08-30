import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET() {
  try {
    /*
     * Fetch the main entities first.
     * Limits keep the graph usable instead of attempting
     * to render the entire college database at once.
     */

    const [
      { data: projects, error: projectsError },
      { data: people, error: peopleError },
      { data: skills, error: skillsError },
      { data: tools, error: toolsError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id, title, description, status, image_url")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("people")
        .select("id, full_name, role, year, avatar_url")
        .limit(80),

      supabase
        .from("skills")
        .select("id, name, category")
        .limit(60),

      supabase
        .from("tools")
        .select("id, name, category")
        .limit(40),
    ])

    if (projectsError) throw projectsError
    if (peopleError) throw peopleError
    if (skillsError) throw skillsError
    if (toolsError) throw toolsError

    const projectIds = (projects || []).map((p) => p.id)

    /*
     * Fetch relationships.
     */

    const [
      { data: projectSkills, error: projectSkillsError },
      { data: teamMembers, error: teamMembersError },
      { data: lineages, error: lineagesError },
      { data: projectTools, error: projectToolsError },
    ] = await Promise.all([
      supabase
        .from("project_skills")
        .select("project_id, skill_id")
        .in("project_id", projectIds),

      supabase
        .from("team_members")
        .select("project_id, person_id, status")
        .in("project_id", projectIds)
        .not("person_id", "is", null),

      supabase
        .from("project_lineages")
        .select(
          "id, parent_project_id, child_project_id, relationship_type"
        )
        .or(
          `parent_project_id.in.(${projectIds.join(",")}),child_project_id.in.(${projectIds.join(",")})`
        ),

      supabase
        .from("project_tools")
        .select("project_id, tool_id")
        .in("project_id", projectIds),
    ])

    if (projectSkillsError) throw projectSkillsError
    if (teamMembersError) throw teamMembersError
    if (lineagesError) throw lineagesError
    if (projectToolsError) throw projectToolsError

    /*
     * Only include people/skills/tools that actually participate
     * in the current graph.
     */

    const usedPeople = new Set(
      (teamMembers || [])
        .map((x) => x.person_id)
        .filter(Boolean)
    )

    const usedSkills = new Set(
      (projectSkills || [])
        .map((x) => x.skill_id)
        .filter(Boolean)
    )

    const usedTools = new Set(
      (projectTools || [])
        .map((x) => x.tool_id)
        .filter(Boolean)
    )

    /*
     * GRAPH NODES
     */

    const nodes = [
      ...(projects || []).map((project) => ({
        id: `project:${project.id}`,
        type: "project",
        label: project.title,
        href: `/projects/${project.id}`,
        data: {
          type: "project",
          title: project.title,
          description: project.description,
          status: project.status,
          image_url: project.image_url,
        },
      })),

      ...(people || [])
        .filter((person) => usedPeople.has(person.id))
        .map((person) => ({
          id: `person:${person.id}`,
          type: "person",
          label: person.full_name,
          href: `/profile/${person.id}`,
          data: {
            type: "person",
            title: person.full_name,
            role: person.role,
            year: person.year,
            avatar_url: person.avatar_url,
          },
        })),

      ...(skills || [])
        .filter((skill) => usedSkills.has(skill.id))
        .map((skill) => ({
          id: `skill:${skill.id}`,
          type: "skill",
          label: skill.name,
          data: {
            type: "skill",
            title: skill.name,
            category: skill.category,
          },
        })),

      ...(tools || [])
        .filter((tool) => usedTools.has(tool.id))
        .map((tool) => ({
          id: `tool:${tool.id}`,
          type: "tool",
          label: tool.name,
          data: {
            type: "tool",
            title: tool.name,
            category: tool.category,
          },
        })),
    ]

    const nodeIds = new Set(nodes.map((node) => node.id))

    /*
     * GRAPH EDGES
     */

    const edges: any[] = []

    /*
     * Project → Skill
     */

    for (const relation of projectSkills || []) {
      const source = `project:${relation.project_id}`
      const target = `skill:${relation.skill_id}`

      if (!nodeIds.has(source) || !nodeIds.has(target)) continue

      edges.push({
        id: `skill-${relation.project_id}-${relation.skill_id}`,
        source,
        target,
        type: "smoothstep",
        data: {
          relationship: "skill",
        },
      })
    }

    /*
     * Project → Person
     */

    for (const relation of teamMembers || []) {
      if (!relation.person_id) continue

      const source = `project:${relation.project_id}`
      const target = `person:${relation.person_id}`

      if (!nodeIds.has(source) || !nodeIds.has(target)) continue

      edges.push({
        id: `member-${relation.project_id}-${relation.person_id}`,
        source,
        target,
        type: "smoothstep",
        data: {
          relationship: "member",
        },
      })
    }

    /*
     * Project → Tool
     */

    for (const relation of projectTools || []) {
      const source = `project:${relation.project_id}`
      const target = `tool:${relation.tool_id}`

      if (!nodeIds.has(source) || !nodeIds.has(target)) continue

      edges.push({
        id: `tool-${relation.project_id}-${relation.tool_id}`,
        source,
        target,
        type: "smoothstep",
        data: {
          relationship: "tool",
        },
      })
    }

    /*
     * Parent Project → Child Project
     */

    for (const relation of lineages || []) {
      const source = `project:${relation.parent_project_id}`
      const target = `project:${relation.child_project_id}`

      if (!nodeIds.has(source) || !nodeIds.has(target)) continue

      edges.push({
        id: `lineage-${relation.id}`,
        source,
        target,
        type: "smoothstep",
        animated: true,
        data: {
          relationship: "lineage",
          relationship_type: relation.relationship_type,
        },
      })
    }

    return NextResponse.json({
      nodes,
      edges,
    })
  } catch (error) {
    console.error("College graph error:", error)

    return NextResponse.json(
      {
        error: "Failed to build college graph",
      },
      { status: 500 }
    )
  }
}
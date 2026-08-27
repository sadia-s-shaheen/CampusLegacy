"use client"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export type ProjectWithMeta = {
  id: string
  title: string
  description: string | null
  status: string | null
  visibility?: string
  owner_id?: string
  created_at?: string
  source_type?: string | null
  repo_url?: string | null
  report_url?: string | null
  project_skills?: { skills: { name: string } }[]
  team_members?: { person_id: string }[]
}

const PROJECT_SELECT = `
  id, title, description, status, visibility, owner_id, created_at,
  source_type, repo_url, report_url,
  project_skills ( skills ( name ) ),
  team_members ( person_id )
`

/**
 * Fetches every project a person is involved with — owned OR an active
 * team member of — deduped by id. This logic used to be copy-pasted
 * (slightly differently, with slightly different bugs) in dashboard-view,
 * projects-view, profile-view and user-profile-view.
 *
 * Pass `limit` to cap the result (e.g. a 3-item dashboard preview).
 */
export function useUserProjects(personId: string | null | undefined, limit?: number) {
  const [projects, setProjects] = useState<ProjectWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!personId) {
      setProjects([])
      setLoading(false)
      return
    }
  
    setLoading(true)
    setError(null)

    try {
      const [{ data: owned, error: ownedError }, { data: memberships, error: memberError }] =
        await Promise.all([
          supabase
            .from("projects")
            .select(PROJECT_SELECT)
            .eq("owner_id", personId)
            .order("created_at", { ascending: false }),
          supabase
            .from("team_members")
            .select("project_id")
            .eq("person_id", personId)
            .eq("status", "active"),
        ])

      if (ownedError) throw ownedError
      if (memberError) throw memberError

      const ownedIds = new Set((owned || []).map((p: any) => p.id))
      const joinedIds = (memberships || [])
        .map((m: any) => m.project_id)
        .filter((id: string) => !ownedIds.has(id))

      let joined: any[] = []
      if (joinedIds.length > 0) {
        const { data: joinedData, error: joinedError } = await supabase
          .from("projects")
          .select(PROJECT_SELECT)
          .in("id", joinedIds)
          .order("created_at", { ascending: false })
        if (joinedError) throw joinedError
        joined = joinedData || []
      }

      const combined = [...(owned || []), ...joined]
      setProjects(typeof limit === "number" ? combined.slice(0, limit) : combined)
    } catch (err: any) {
      console.error("useUserProjects error:", err)
      setError(err?.message || "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [personId, limit])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { projects, loading, error, refetch }
}

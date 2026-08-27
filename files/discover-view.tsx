"use client"
import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Search, Users, FolderGit2, UserPlus, MessageCircle, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export function DiscoverView() {
  const { user } = useCurrentUser()
  const [teammates, setTeammates] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [pendingConnections, setPendingConnections] = useState<Set<string>>(new Set())
  const [connectingId, setConnectingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const [{ data: peopleData }, { data: projectsData }, { data: existingConnections }] = await Promise.all([
          supabase
            .from("people")
            .select("id, full_name, role, year, people_skills(skills(name))")
            .neq("id", user.id)
            .limit(20),
          supabase
            .from("projects")
            .select("id, title, description, status, project_skills(skills(name)), team_members(person_id)")
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .limit(12),
          supabase
            .from("connections")
            .select("follower_id, following_id")
            .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
        ])

        if (peopleData) {
          setTeammates(
            peopleData.map((p) => ({
              ...p,
              initials: p.full_name ? p.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "?",
              tags: p.people_skills?.map((ps: any) => ps.skills.name).slice(0, 2) || [],
            }))
          )
        }

        if (projectsData) {
          setProjects(
            projectsData.map((p) => ({
              ...p,
              teamCount: p.team_members?.length || 0,
              tags: p.project_skills?.map((ps: any) => ps.skills.name).slice(0, 3) || [],
            }))
          )
        }

        if (existingConnections) {
          const ids = existingConnections.map((c: any) => (c.follower_id === user.id ? c.following_id : c.follower_id))
          setPendingConnections(new Set(ids))
        }
      } catch (error) {
        console.error("Error fetching discover data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const filteredTeammates = useMemo(() => {
    if (!query.trim()) return teammates
    const q = query.toLowerCase()
    return teammates.filter(
      (p) => p.full_name?.toLowerCase().includes(q) || p.tags.some((t: string) => t.toLowerCase().includes(q))
    )
  }, [teammates, query])

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projects
    const q = query.toLowerCase()
    return projects.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags.some((t: string) => t.toLowerCase().includes(q))
    )
  }, [projects, query])

  const handleConnect = async (personId: string) => {
    if (!user) return
    setConnectingId(personId)
    try {
      const { error } = await supabase.from("connections").insert({
        follower_id: user.id,
        following_id: personId,
        status: "pending",
      })
      if (error) throw error
      setPendingConnections((prev) => new Set(prev).add(personId))
      toast.success("Connection request sent")
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send connection request.")
    } finally {
      setConnectingId(null)
    }
  }

  const tones = ["aqua", "lilac", "peach", "ink"]

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <div className="glass-button glass-neutral mt-4 flex items-center gap-3 rounded-full px-5 py-3.5">
            <Search className="size-5 text-[#668184]" strokeWidth={1.8} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, skills, or people..."
              className="w-full bg-transparent text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none"
            />
          </div>
        </motion.header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-10 animate-spin text-[#668184]" />
          </div>
        ) : (
          <>
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Users className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
                {query.trim() ? "Matching People" : "Recommended Teammates"}
              </h2>
              {filteredTeammates.length === 0 ? (
                <p className="text-sm text-[#668184]">No people match "{query}".</p>
              ) : (
                <div className="space-y-3">
                  {filteredTeammates.map((person, idx) => {
                    const isPending = pendingConnections.has(person.id)
                    return (
                      <div key={person.id} className={`glass-button glass-${tones[idx % tones.length]} rounded-3xl p-4 flex items-center justify-between`}>
                        <Link href={`/profile/${person.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">
                            {person.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{person.full_name}</p>
                            <p className="text-xs text-[#668184]">{person.role || "Student"} · {person.year || ""} Year</p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="hidden sm:flex gap-1">
                            {person.tags.map((tag: string) => (
                              <span key={tag} className="rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-medium text-[#22393c]">{tag}</span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleConnect(person.id)}
                            disabled={isPending || connectingId === person.id}
                            title={isPending ? "Request pending" : "Connect"}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c] text-white transition-transform hover:scale-105 disabled:opacity-50"
                          >
                            {connectingId === person.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : isPending ? (
                              <Check className="size-4" strokeWidth={2} />
                            ) : (
                              <UserPlus className="size-4" strokeWidth={2} />
                            )}
                          </button>
                          <Link href={`/chat/${person.id}`}>
                            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c] transition-transform hover:scale-105">
                              <MessageCircle className="size-4" strokeWidth={2} />
                            </button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <FolderGit2 className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
                  {query.trim() ? "Matching Projects" : "Trending Projects"}
                </h2>
                <Link href="/projects" className="text-xs font-semibold uppercase tracking-wider text-[#668184] hover:text-[#22393c]">
                  View All
                </Link>
              </div>

              {filteredProjects.length === 0 ? (
                <p className="text-sm text-[#668184]">No projects match "{query}".</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
                  {filteredProjects.map((project, idx) => (
                    <Link href={`/projects/${project.id}`} key={project.id} className="block w-64 flex-shrink-0 snap-center">
                      <div className={`glass-button glass-${tones[idx % tones.length]} h-full rounded-3xl p-4 transition-transform hover:-translate-y-1 cursor-pointer`}>
                        <div className="mb-2 flex items-start justify-between">
                          <h3 className="text-sm font-bold leading-tight text-[#22393c] line-clamp-1">{project.title}</h3>
                          <span className="ml-2 flex-shrink-0 rounded-full bg-[#8a9a7b]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#22393c]">
                            {project.status || "Active"}
                          </span>
                        </div>
                        <p className="mb-3 text-[11px] leading-relaxed text-[#22393c]/80 line-clamp-3">
                          {project.description || "No description provided."}
                        </p>
                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#22393c]/5">
                          <span className="text-[10px] font-medium text-[#668184]">Team: {project.teamCount}</span>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {project.tags.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-semibold text-[#22393c]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </main>
  )
}

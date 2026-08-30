"use client"
import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Users, FolderGit2, UserPlus, MessageCircle, Check, Loader2, Sparkles, Briefcase, Tag, X, ChevronRight, Info } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

type FilterType = "all" | "projects" | "people" | "skills" | "roles"

export function DiscoverView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useCurrentUser()
  
  // Data States
  const [teammates, setTeammates] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Search & Filter States
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [isSearching, setIsSearching] = useState(false)
  const [semanticResults, setSemanticResults] = useState<any[]>([])
  
  // Connection State
  const [pendingConnections, setPendingConnections] = useState<Set<string>>(new Set())
  const [connectingId, setConnectingId] = useState<string | null>(null)

  // AI Insight Modal State
  const [insightPerson, setInsightPerson] = useState<any | null>(null)

  // Display caps
  const CAPS = { people: 3, projects: 4, skills: 8, roles: 3 }

  // Initialize filter from URL params
  useEffect(() => {
    const filterParam = searchParams?.get("filter") as FilterType
    if (filterParam && ["projects", "people", "skills", "roles"].includes(filterParam)) {
      setActiveFilter(filterParam)
    }
  }, [searchParams])

  // Fetch Initial Data
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        // 1. Fetch Recommended People using V4 Intelligence
        const peopleRes = await fetch("/api/recommend-people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })
        const peopleData = peopleRes.ok ? (await peopleRes.json()).results : []

        // 2. Fetch other data in parallel
        const [projectsRes, skillsRes, rolesRes, connectionsRes] = await Promise.all([
          supabase.from("projects").select("id, title, description, status, project_skills(skills(name)), team_members(person_id)").eq("visibility", "public").order("created_at", { ascending: false }).limit(20),
          supabase.from("skills").select("id, name, category").limit(50),
          supabase.from("project_roles").select("id, title, description, slots, projects(title)").eq("status", "open").limit(20),
          supabase.from("connections").select("follower_id, following_id").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
        ])

        if (peopleData) {
          setTeammates(peopleData.map((p: any) => ({
            ...p,
            initials: p.full_name ? p.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "?",
            tags: p.complementary_skills || [],
          })))
        }

        if (projectsRes.data) {
          setProjects(projectsRes.data.map((p) => ({
            ...p,
            teamCount: p.team_members?.length || 0,
            tags: p.project_skills?.map((ps: any) => ps.skills.name).slice(0, 3) || [],
          })))
        }

        if (skillsRes.data) setSkills(skillsRes.data)
        if (rolesRes.data) setRoles(rolesRes.data)

        if (connectionsRes.data) {
          const ids = connectionsRes.data.map((c: any) => (c.follower_id === user.id ? c.following_id : c.follower_id))
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

  // Semantic Search Handler
  const handleSemanticSearch = async (searchText: string) => {
    if (!searchText.trim()) { setSemanticResults([]); return }
    setIsSearching(true)
    try {
      const response = await fetch("/api/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchText }),
      })
      const data = await response.json()
      if (response.ok) setSemanticResults(data.results || [])
      else toast.error("Search failed")
    } catch (error) {
      console.error("Semantic search error:", error)
      toast.error("Could not connect to search engine")
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSemanticSearch(query)
  }

  // Filtering Logic
  const filteredTeammates = useMemo(() => {
    if (!query.trim()) return teammates
    const q = query.toLowerCase()
    return teammates.filter((p) => p.full_name?.toLowerCase().includes(q) || p.tags.some((t: string) => t.toLowerCase().includes(q)))
  }, [teammates, query])

  const filteredProjects = useMemo(() => {
    if (semanticResults.length > 0 && !["people", "skills", "roles"].includes(activeFilter)) return semanticResults
    if (!query.trim()) return projects
    const q = query.toLowerCase()
    return projects.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.tags.some((t: string) => t.toLowerCase().includes(q)))
  }, [projects, query, semanticResults, activeFilter])

  const filteredSkills = useMemo(() => {
    if (!query.trim()) return skills
    const q = query.toLowerCase()
    return skills.filter((s) => s.name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))
  }, [skills, query])

  const filteredRoles = useMemo(() => {
    if (!query.trim()) return roles
    const q = query.toLowerCase()
    return roles.filter((r) => r.title.toLowerCase().includes(q) || r.projects?.title.toLowerCase().includes(q))
  }, [roles, query])

  const handleConnect = async (personId: string) => {
    if (!user) return
    setConnectingId(personId)
    try {
      const { error } = await supabase.from("connections").insert({ follower_id: user.id, following_id: personId, status: "pending" })
      if (error) throw error
      setPendingConnections((prev) => new Set(prev).add(personId))
      toast.success("Connection request sent")
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send connection request.")
    } finally {
      setConnectingId(null)
    }
  }

  // ✅ UPDATED: Navigates to the dedicated "View All" page
  const handleViewAll = (type: string) => {
    router.push(`/discover/all?type=${type}`)
  }

  const tones = ["aqua", "lilac", "peach", "ink"]
  const filters: { id: FilterType; label: string; icon: any }[] = [
    { id: "all", label: "All", icon: Sparkles },
    { id: "projects", label: "Projects", icon: FolderGit2 },
    { id: "people", label: "People", icon: Users },
    { id: "skills", label: "Skills", icon: Tag },
    { id: "roles", label: "Roles", icon: Briefcase },
  ]

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-2xl">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          
          {/* Search Bar */}
          <div className="glass-button glass-neutral mt-4 flex items-center gap-3 rounded-full px-5 py-3.5">
            <Search className="size-5 text-[#668184]" strokeWidth={1.8} />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setSemanticResults([]) }}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, people, skills, or roles..."
              className="w-full bg-transparent text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none"
            />
            {isSearching && <Loader2 className="size-4 animate-spin text-[#8a9a7b]" />}
            {!isSearching && query && (
              <button onClick={() => handleSemanticSearch(query)} className="text-[#8a9a7b] hover:text-[#22393c]">
                <Sparkles className="size-4" />
              </button>
            )}
            {query && (
              <button onClick={() => { setQuery(""); setSemanticResults([]); }} className="text-[#668184] hover:text-[#22393c]">
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setActiveFilter(filter.id)
                  if (filter.id !== "all") router.push(`/discover?filter=${filter.id}`)
                  else router.push("/discover")
                }}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                  activeFilter === filter.id ? "bg-[#22393c] text-white shadow-md" : "bg-white/50 text-[#668184] hover:bg-white"
                }`}
              >
                <filter.icon className="size-3.5" />
                {filter.label}
              </button>
            ))}
          </div>

          {semanticResults.length > 0 && !["people", "skills", "roles"].includes(activeFilter) && (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#8a9a7b] flex items-center gap-1">
              <Sparkles className="size-3" /> AI Semantic Matches for Projects
            </p>
          )}
        </motion.header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-10 animate-spin text-[#668184]" /></div>
        ) : (
          <div className="space-y-8">
            {/* PROJECTS SECTION */}
            {(activeFilter === "all" || activeFilter === "projects") && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <FolderGit2 className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
                    {semanticResults.length > 0 ? "AI Recommendations" : query.trim() ? "Matching Projects" : "Trending Projects"}
                  </h2>
                </div>

                {filteredProjects.length === 0 ? (
                  <p className="text-sm text-[#668184]">No projects found.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredProjects.slice(0, CAPS.projects).map((project, idx) => {
                        const matchScore = project.similarity ? Math.round(project.similarity * 100) : null;
                        return (
                          <Link href={`/projects/${project.id}`} key={project.id} className="block">
                            <div className={`glass-button glass-${tones[idx % tones.length]} h-full rounded-3xl p-4 transition-transform hover:-translate-y-1 cursor-pointer relative`}>
                              {matchScore !== null && (
                                <div className="absolute -top-2 -right-2 bg-[#8a9a7b] text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                  <Sparkles className="size-3" /> {matchScore}% Match
                                </div>
                              )}
                              <div className="mb-2 flex items-start justify-between">
                                <h3 className="text-sm font-bold leading-tight text-[#22393c] line-clamp-1 pr-12">{project.title}</h3>
                                {!matchScore && (
                                  <span className="ml-2 flex-shrink-0 rounded-full bg-[#8a9a7b]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#22393c]">
                                    {project.status || "Active"}
                                  </span>
                                )}
                              </div>
                              <p className="mb-3 text-[11px] leading-relaxed text-[#22393c]/80 line-clamp-3">{project.description || "No description provided."}</p>
                              <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#22393c]/5">
                                <span className="text-[10px] font-medium text-[#668184]">{project.teamCount !== undefined ? `Team: ${project.teamCount}` : "View Details"}</span>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {project.tags?.slice(0, 2).map((tag: string) => (
                                    <span key={tag} className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-semibold text-[#22393c]">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                    {filteredProjects.length > CAPS.projects && (
                      <div className="mt-3 flex justify-center">
                        <button onClick={() => handleViewAll("projects")} className="glass-button glass-neutral flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#668184] hover:text-[#22393c] transition-colors">
                          View All Projects <ChevronRight className="size-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.section>
            )}

            {/* ✅ PEOPLE SECTION (With AI Insight Modal Trigger) */}
            {(activeFilter === "all" || activeFilter === "people") && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
                    {query.trim() ? "Matching People" : "Recommended People"}
                  </h2>
                </div>
                {filteredTeammates.length === 0 ? (
                  <p className="text-sm text-[#668184]">No people match your search.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {filteredTeammates.slice(0, CAPS.people).map((person, idx) => {
                        const isPending = pendingConnections.has(person.id)
                        const matchPercent = person.final_score ? Math.round(person.final_score * 100) : null
                        
                        return (
                          <div key={person.id} className={`glass-button glass-${tones[idx % tones.length]} rounded-3xl p-4 flex items-center justify-between relative`}>
                            {matchPercent !== null && !query.trim() && (
                              <div className="absolute -top-2 -right-2 bg-[#8a9a7b] text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                <Sparkles className="size-3" /> {matchPercent}% Match
                              </div>
                            )}
                            
                            <Link href={`/profile/${person.id}`} className="flex items-center gap-3 flex-1 min-w-0 pr-12">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">{person.initials}</div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{person.full_name}</p>
                                <p className="text-xs text-[#668184]">{person.role || "Student"} · {person.year || ""} Year</p>
                              </div>
                            </Link>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* ✅ AI Insight Button */}
                              <button 
                                onClick={() => setInsightPerson(person)} 
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8a9a7b]/20 text-[#8a9a7b] hover:bg-[#8a9a7b]/30 transition-colors"
                                title="Why this match?"
                              >
                                <Info className="size-4" />
                              </button>
                              
                              <button 
                                onClick={() => handleConnect(person.id)} 
                                disabled={isPending || connectingId === person.id} 
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c] text-white transition-transform hover:scale-105 disabled:opacity-50"
                              >
                                {connectingId === person.id ? <Loader2 className="size-4 animate-spin" /> : isPending ? <Check className="size-4" strokeWidth={2} /> : <UserPlus className="size-4" strokeWidth={2} />}
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
                    {filteredTeammates.length > CAPS.people && (
                      <div className="mt-3 flex justify-center">
                        <button onClick={() => handleViewAll("people")} className="glass-button glass-neutral flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#668184] hover:text-[#22393c] transition-colors">
                          View All People <ChevronRight className="size-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.section>
            )}

            {/* SKILLS SECTION */}
            {(activeFilter === "all" || activeFilter === "skills") && filteredSkills.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Tag className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
                    {query.trim() ? "Matching Skills" : "Popular Skills"}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredSkills.slice(0, CAPS.skills).map((skill) => (
                    <span key={skill.id} className="glass-button glass-neutral rounded-full px-4 py-2 text-xs font-semibold text-[#22393c]">
                      {skill.name} <span className="text-[#668184] ml-1">({skill.category})</span>
                    </span>
                  ))}
                </div>
                {filteredSkills.length > CAPS.skills && (
                  <div className="mt-3 flex justify-center">
                    <button onClick={() => handleViewAll("skills")} className="glass-button glass-neutral flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#668184] hover:text-[#22393c] transition-colors">
                      View All Skills <ChevronRight className="size-3" />
                    </button>
                  </div>
                )}
              </motion.section>
            )}

            {/* ROLES SECTION */}
            {(activeFilter === "all" || activeFilter === "roles") && filteredRoles.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Briefcase className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
                    {query.trim() ? "Matching Roles" : "Open Roles"}
                  </h2>
                </div>
                <div className="space-y-3">
                  {filteredRoles.slice(0, CAPS.roles).map((role) => (
                    <div key={role.id} className="glass-button glass-lilac rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-bold text-[#22393c]">{role.title}</h3>
                        <span className="rounded-full bg-[#8a9a7b]/20 px-2 py-0.5 text-[9px] font-bold text-[#22393c]">{role.slots} slots</span>
                      </div>
                      <p className="text-xs text-[#668184] mb-2">{role.projects?.title}</p>
                      {role.description && <p className="text-[11px] text-[#22393c]/80 line-clamp-2">{role.description}</p>}
                    </div>
                  ))}
                </div>
                {filteredRoles.length > CAPS.roles && (
                  <div className="mt-3 flex justify-center">
                    <button onClick={() => handleViewAll("roles")} className="glass-button glass-neutral flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#668184] hover:text-[#22393c] transition-colors">
                      View All Roles <ChevronRight className="size-3" />
                    </button>
                  </div>
                )}
              </motion.section>
            )}
          </div>
        )}

        {/* ✅ AI INSIGHT MODAL */}
        <AnimatePresence>
          {insightPerson && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" 
              onClick={() => setInsightPerson(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.9, y: 20 }} 
                onClick={(e) => e.stopPropagation()} 
                className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">Why {insightPerson.full_name}?</h3>
                  <button onClick={() => setInsightPerson(null)} className="p-1 hover:bg-white/50 rounded-full"><X className="size-5" /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-[#8a9a7b]/10 p-4 rounded-2xl">
                    <p className="text-xs font-bold uppercase text-[#668184] mb-1 flex items-center gap-1">
                      <Sparkles className="size-3" /> AI Reasoning
                    </p>
                    <p className="text-sm italic text-[#22393c]">"{insightPerson.reason || "Strong match based on complementary skills and collaboration alignment."}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/50 p-3 rounded-2xl text-center">
                      <p className="text-[10px] font-bold uppercase text-[#668184]">Skill Match</p>
                      <p className="text-2xl font-bold text-[#22393c]">{Math.round((insightPerson.skill_score || 0) * 100)}%</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded-2xl text-center">
                      <p className="text-[10px] font-bold uppercase text-[#668184]">Collab Match</p>
                      <p className="text-2xl font-bold text-[#22393c]">{Math.round((insightPerson.collab_score || 0) * 100)}%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-[#668184] mb-2">Complementary Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {insightPerson.complementary_skills?.map((s: string, i: number) => (
                        <span key={i} className="rounded-full bg-[#22393c] text-white px-3 py-1 text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
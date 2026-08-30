export const dynamic = 'force-dynamic'

"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion" // ✅ ADD THIS LINE
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Users, FolderGit2, Tag, Briefcase, Sparkles, UserPlus, MessageCircle, Check, Info, X } from "lucide-react" // ✅ Also make sure 'X' is imported for the close button
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"


function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

export default function DiscoverAllPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "projects"
  const { user } = useCurrentUser()

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingConnections, setPendingConnections] = useState<Set<string>>(new Set())
  const [insightPerson, setInsightPerson] = useState<any | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      setLoading(true)
      try {
        let data: any[] = []
        
        if (type === "people") {
          const res = await fetch("/api/recommend-people", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id }),
          })
          const json = await res.json()
          data = json.results || []
          
          const { data: connections } = await supabase
            .from("connections")
            .select("follower_id, following_id")
            .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
          if (connections) {
            const ids = connections.map((c: any) => (c.follower_id === user.id ? c.following_id : c.follower_id))
            setPendingConnections(new Set(ids))
          }
        } else if (type === "projects") {
          const { data: d } = await supabase
            .from("projects")
            .select("id, title, description, status, project_skills(skills(name)), team_members(person_id)")
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
          data = d?.map((p: any) => ({ ...p, teamCount: p.team_members?.length || 0, tags: p.project_skills?.map((ps: any) => ps.skills.name) || [] })) || []
        } else if (type === "skills") {
          const { data: d } = await supabase.from("skills").select("id, name, category").order("name")
          data = d || []
        } else if (type === "roles") {
          const { data: d } = await supabase.from("project_roles").select("id, title, description, slots, projects(title)").eq("status", "open")
          data = d || []
        }
        
        setItems(data)
      } catch (error) {
        console.error("Error fetching all items:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, type])

  const handleConnect = async (personId: string) => {
    if (!user) return
    try {
      const { error } = await supabase.from("connections").insert({ follower_id: user.id, following_id: personId, status: "pending" })
      if (error) throw error
      setPendingConnections((prev) => new Set(prev).add(personId))
      toast.success("Connection request sent")
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send connection request.")
    }
  }

  const getTitle = () => {
    if (type === "people") return "All Recommended People"
    if (type === "projects") return "All Projects"
    if (type === "skills") return "All Skills"
    if (type === "roles") return "All Open Roles"
    return "Discover"
  }

  const getIcon = () => {
    if (type === "people") return <Users className="size-5 text-[#8a9a7b]" />
    if (type === "projects") return <FolderGit2 className="size-5 text-[#8a9a7b]" />
    if (type === "skills") return <Tag className="size-5 text-[#8a9a7b]" />
    if (type === "roles") return <Briefcase className="size-5 text-[#8a9a7b]" />
    return <Sparkles className="size-5 text-[#8a9a7b]" />
  }

  const tones = ["aqua", "lilac", "peach", "ink"]

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-2xl">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#668184] hover:text-[#22393c] transition-colors">
          <ArrowLeft className="size-4" /> Back to Discover
        </button>
        
        <h1 className="mb-8 flex items-center gap-2 text-2xl font-bold">
          {getIcon()}
          {getTitle()}
        </h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-10 animate-spin text-[#668184]" /></div>
        ) : (
          <div className="space-y-4">
            
            {/* PEOPLE LIST */}
            {type === "people" && items.map((p: any, idx: number) => {
              const isPending = pendingConnections.has(p.id)
              const matchPercent = p.final_score ? Math.round(p.final_score * 100) : null
              return (
                <div key={p.id} className={`glass-button glass-${tones[idx % tones.length]} rounded-2xl p-4 flex justify-between items-center relative`}>
                  {matchPercent !== null && (
                    <div className="absolute -top-2 -right-2 bg-[#8a9a7b] text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="size-3" /> {matchPercent}% Match
                    </div>
                  )}
                  <Link href={`/profile/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0 pr-12">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">
                      {getInitials(p.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.full_name}</p>
                      <p className="text-xs text-[#668184]">{p.role || "Student"} · {p.year || ""} Year</p>
                      <p className="text-xs text-[#22393c]/80 mt-1 italic line-clamp-2">"{p.reason || "Strong match based on complementary skills."}"</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setInsightPerson(p)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8a9a7b]/20 text-[#8a9a7b] hover:bg-[#8a9a7b]/30 transition-colors">
                      <Info className="size-4" />
                    </button>
                    <button onClick={() => handleConnect(p.id)} disabled={isPending} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c] text-white transition-transform hover:scale-105 disabled:opacity-50">
                      {isPending ? <Check className="size-4" strokeWidth={2} /> : <UserPlus className="size-4" strokeWidth={2} />}
                    </button>
                    <Link href={`/chat/${p.id}`}>
                      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c] transition-transform hover:scale-105">
                        <MessageCircle className="size-4" strokeWidth={2} />
                      </button>
                    </Link>
                  </div>
                </div>
              )
            })}
            
            {/* PROJECTS GRID */}
            {type === "projects" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((p: any, idx: number) => {
                  const matchScore = p.similarity ? Math.round(p.similarity * 100) : null;
                  return (
                    <Link href={`/projects/${p.id}`} key={p.id} className="block">
                      <div className={`glass-button glass-${tones[idx % tones.length]} h-full rounded-3xl p-4 transition-transform hover:-translate-y-1 cursor-pointer relative`}>
                        {matchScore !== null && (
                          <div className="absolute -top-2 -right-2 bg-[#8a9a7b] text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                            <Sparkles className="size-3" /> {matchScore}% Match
                          </div>
                        )}
                        <div className="mb-2 flex items-start justify-between">
                          <h3 className="text-sm font-bold leading-tight text-[#22393c] line-clamp-1 pr-12">{p.title}</h3>
                          {!matchScore && (
                            <span className="ml-2 flex-shrink-0 rounded-full bg-[#8a9a7b]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#22393c]">
                              {p.status || "Active"}
                            </span>
                          )}
                        </div>
                        <p className="mb-3 text-[11px] leading-relaxed text-[#22393c]/80 line-clamp-3">{p.description || "No description provided."}</p>
                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#22393c]/5">
                          <span className="text-[10px] font-medium text-[#668184]">{p.teamCount !== undefined ? `Team: ${p.teamCount}` : "View Details"}</span>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {p.tags?.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-semibold text-[#22393c]">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* SKILLS GRID */}
            {type === "skills" && (
              <div className="flex flex-wrap gap-2">
                {items.map((s: any) => (
                  <span key={s.id} className="glass-button glass-neutral rounded-full px-4 py-2 text-sm font-semibold text-[#22393c]">
                    {s.name} <span className="text-[#668184] ml-1">({s.category})</span>
                  </span>
                ))}
              </div>
            )}

            {/* ROLES LIST */}
            {type === "roles" && items.map((r: any) => (
              <div key={r.id} className="glass-button glass-lilac rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-[#22393c]">{r.title}</h3>
                  <span className="rounded-full bg-[#8a9a7b]/20 px-2 py-0.5 text-[9px] font-bold text-[#22393c]">{r.slots} slots</span>
                </div>
                <p className="text-xs text-[#668184] mb-2">{r.projects?.title}</p>
                {r.description && <p className="text-[11px] text-[#22393c]/80 line-clamp-2">{r.description}</p>}
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="text-center py-10 text-[#668184]">
                No items found in this category.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ AI INSIGHT MODAL (Reused for the All Page) */}
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
    </main>
  )
}
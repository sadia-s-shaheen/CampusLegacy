"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FolderGit2, Plus, Filter, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { CreateProjectModal } from "./create-project-modal"

const tones = ["aqua", "lilac", "peach", "ink"]

export function ProjectsView() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // 1. Fetch projects where the user is the OWNER
        const { data: ownedProjects, error: ownerError } = await supabase
          .from("projects")
          .select(`
            id, title, description, status, visibility, owner_id,
            project_skills ( skills ( name ) ),
            team_members ( person_id )
          `)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })

        if (ownerError) throw ownerError
        // 2. Fetch projects where the user is an ACTIVE TEAM MEMBER
        const { data: memberships, error: memberError } = await supabase
          .from("team_members")
          .select("project_id")
          .eq("person_id", user.id)
          .eq("status", "active")

        if (memberError) throw memberError
        
        const joinedProjectIds = memberships?.map((m: any) => m.project_id) || []
        let joinedProjects: any[] = []

        if (joinedProjectIds.length > 0) {
          const { data: joinedData, error: joinedError } = await supabase
            .from("projects")
            .select(`
              id, title, description, status, visibility, owner_id,
              project_skills ( skills ( name ) ),
              team_members ( person_id )
            `)
            .in("id", joinedProjectIds)
            .order("created_at", { ascending: false })
          
          if (joinedError) console.error("Joined projects query error:", joinedError)
          joinedProjects = joinedData || []
        }

        // 3. Combine both lists (removing duplicates just in case)
        const allProjects = [...(ownedProjects || []), ...joinedProjects]
        const uniqueProjects = allProjects.filter((project, index, self) => 
          index === self.findIndex((p) => p.id === project.id)
        )

        setProjects(uniqueProjects)
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <h1 className="text-2xl font-semibold tracking-tight">My Projects</h1>
          <button className="glass-button glass-neutral flex h-9 w-9 items-center justify-center rounded-full">
            <Filter className="size-4 text-[#22393c]" strokeWidth={1.8} />
          </button>
        </motion.header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-10 animate-spin text-[#668184]" />
          </div>
        ) : projects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="glass-button glass-neutral rounded-3xl p-8 text-center"
          >
            <FolderGit2 className="mx-auto size-12 text-[#668184] mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-[#22393c] mb-1">You haven't joined any projects yet.</p>
            <p className="text-xs text-[#668184] mb-4">Start building your legacy by creating or joining a project.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="glass-button glass-ink rounded-full px-5 py-2 text-xs font-semibold text-white transition-transform hover:scale-105"
            >
              Create Project
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {projects.map((project, index) => {
              const skillNames = project.project_skills?.map((ps: any) => ps.skills.name) || []
              const teamCount = project.team_members?.length || 0
              const tone = tones[index % tones.length]
              
              return (
                <Link href={`/projects/${project.id}`} key={project.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`glass-button glass-${tone} rounded-3xl p-5 transition-transform hover:-translate-y-0.5 cursor-pointer`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-base font-semibold text-[#22393c]">{project.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        project.status === "active" ? "bg-[#8a9a7b]/20 text-[#22393c]" :
                        project.status === "legacy" ? "bg-[#22393c]/10 text-[#22393c]" :
                        "bg-[#afbb98]/20 text-[#22393c]"
                      }`}>
                        {project.status || "Active"}
                      </span>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-[#22393c]/80 line-clamp-2">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {skillNames.slice(0, 3).map((skill: string) => (
                          <span key={skill} className="rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-medium text-[#22393c]">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs font-medium text-[#668184]">Team: {teamCount}</span>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.5 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#22393c] text-white shadow-lg transition-transform hover:scale-110 sm:right-[calc(50%-220px+1.5rem)]"
      >
        <Plus className="size-6" strokeWidth={2} />
      </motion.button>

      <AnimatePresence>
        {isModalOpen && <CreateProjectModal onClose={() => setIsModalOpen(false)} />}
      </AnimatePresence>
    </main>
  )
}
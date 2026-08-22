"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MessageCircle, LogOut, Loader2, Edit3, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { EditProfileModal } from "./edit-profile-modal"

export function ProfileView() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [departmentName, setDepartmentName] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [skillIds, setSkillIds] = useState<string[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase.from("people").select("*").eq("id", user.id).single()
        if (profileData) {
          let currentDepartmentName = ""
          if (profileData.department_id) {
            const { data: departmentData } = await supabase.from("departments").select("name").eq("id", profileData.department_id).single()
            currentDepartmentName = departmentData?.name || ""
          }
          setDepartmentName(currentDepartmentName || null)
          setProfile({ ...profileData, department: currentDepartmentName })
        }

        const { data: skillsData } = await supabase.from("people_skills").select("skill_id, skills(name)").eq("person_id", user.id)
        if (skillsData) {
          const skillNames = skillsData.map((s: any) => {
            const skill = Array.isArray(s.skills) ? s.skills[0] : s.skills
            return skill?.name
          }).filter(Boolean)
          setSkillIds(skillsData.map((skill: any) => skill.skill_id).filter(Boolean))
          setSkills(skillNames)
        }

        const { data: connectionsData } = await supabase.from("connections").select("id, status, follower_id, following_id").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`).eq("status", "accepted")
        if (connectionsData && connectionsData.length > 0) {
          const peopleIds = connectionsData.map((c: any) => c.follower_id === user.id ? c.following_id : c.follower_id)
          const { data: peopleData } = await supabase.from("people").select("id, full_name, role, year").in("id", peopleIds)
          setConnections(peopleData || [])
        }

        const { data: projectsData } = await supabase.from("projects").select("id, title, status").eq("owner_id", user.id).limit(5)
        if (projectsData) setProjects(projectsData)
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfileData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8] dark:bg-[#16241f]"><Loader2 className="size-10 animate-spin text-[#668184]" /></div>

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || "User"
  const initials = displayName ? displayName.split(/[\s@._]+/).map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U"
  const interests = profile?.interests || []

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] dark:bg-[#16241f] px-5 pb-32 pt-10 text-[#22393c] dark:text-[#f4f1ea] sm:px-8 transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(22,36,31,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(31,64,55,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8a9a7b] text-2xl font-bold text-white shadow-lg">{initials}</div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
            <p className="text-sm text-[#668184] dark:text-[#8a9a7b]">{profile?.year ? `${profile.year} Year` : "Year not set"} · {departmentName || "Department not set"}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#22393c]/80 dark:text-[#f4f1ea]/80">{profile?.bio || "Building accessible tech for the future."}</p>
          </div>
        </motion.header>

        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onClick={() => setIsEditing(true)} className="w-full mb-6 glass-button glass-neutral rounded-2xl p-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#22393c] dark:text-[#f4f1ea] transition-transform hover:scale-[1.02]">
          <Edit3 className="size-4" /> Edit Profile
        </motion.button>

        <div className="space-y-4 mb-6">
          <TagSection title="Skills" tags={skills.length > 0 ? skills : ["No skills added"]} />
          <TagSection title="Interests" tags={interests.length > 0 ? interests : ["No interests added"]} />
          <TagSection title="Roles" tags={profile?.role ? [profile.role] : ["Role not set"]} />
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">My Projects</h2>
            <Link href="/projects" className="text-xs font-semibold uppercase tracking-wider text-[#8a9a7b]">View All</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {projects.length > 0 ? projects.map((project) => (
              <Link href={`/projects/${project.id}`} key={project.id} className={`glass-button glass-aqua flex-shrink-0 w-32 rounded-2xl p-3 text-center transition-transform hover:scale-105`}>
                <p className="text-sm font-semibold mb-1 truncate text-[#22393c] dark:text-white">{project.title}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#668184]">{project.status || "Active"}</span>
              </Link>
            )) : (
              <div className="glass-button glass-neutral flex-shrink-0 w-32 rounded-2xl p-3 text-center"><p className="text-xs text-[#668184]">No projects yet</p></div>
            )}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Connections</h2>
            <button className="text-xs font-semibold uppercase tracking-wider text-[#8a9a7b]">View All</button>
          </div>
          <div className="space-y-3">
            {connections.length > 0 ? connections.map((person) => (
              <div key={person.id} className="glass-button glass-lilac rounded-2xl p-4 flex items-center justify-between">
                {/* Clickable Profile Area */}
                <Link href={`/profile/${person.id}`} className="flex items-center gap-3 flex-1 group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 dark:bg-white/10 text-xs font-bold text-[#22393c] dark:text-white group-hover:scale-105 transition-transform">
                    {person.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#22393c] dark:text-white group-hover:text-[#8a9a7b] transition-colors">{person.full_name}</p>
                    <p className="text-xs text-[#668184]">{person.role || "Student"} · {person.year || ""} Year</p>
                  </div>
                </Link>
                
                <Link href={`/chat/${person.id}`}>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c] dark:bg-[#8a9a7b] text-white transition-transform hover:scale-105">
                    <MessageCircle className="size-4" strokeWidth={2} />
                  </button>
                </Link>
              </div>
            )) : (
              <div className="glass-button glass-neutral rounded-2xl p-4 text-center"><p className="text-xs text-[#668184]">No connections yet. Explore to find teammates!</p></div>
            )}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Settings</h3>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="glass-button glass-neutral flex w-full items-center justify-between rounded-2xl p-4 transition-transform hover:scale-[1.02]">
            <span className="text-sm font-semibold text-[#22393c] dark:text-[#f4f1ea]">Appearance</span>
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-full">
              {theme === 'dark' ? <Moon className="size-4 text-[#f4f1ea]" /> : <Sun className="size-4 text-[#22393c]" />}
              <span className="text-xs font-medium text-[#668184] dark:text-[#a0a0a0]">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </div>
          </button>
          <button onClick={handleLogout} className="glass-button flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-sm font-semibold text-red-600 transition-transform hover:scale-[1.02] bg-red-500/10 border-red-500/20 dark:bg-red-900/20 dark:border-red-900/30">
            <LogOut className="size-4" strokeWidth={1.8} /> Log Out
          </button>
        </motion.section>
      </div>
      {isEditing && <EditProfileModal onClose={() => setIsEditing(false)} currentProfile={profile} currentSkills={skillIds} />}
    </main>
  )
}

function TagSection({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="glass-button glass-neutral rounded-full px-3 py-1.5 text-xs font-semibold text-[#22393c] dark:text-white">{tag}</span>
        ))}
      </div>
    </div>
  )
}
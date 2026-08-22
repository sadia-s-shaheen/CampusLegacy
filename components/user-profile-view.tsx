"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MessageCircle, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export function UserProfileView({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      const { data: profileData } = await supabase
        .from("people")
        .select("*")
        .eq("id", userId)
        .single()
      
      if (profileData) setProfile(profileData)

      const { data: skillsData } = await supabase
        .from("people_skills")
        .select("skills(name)")
        .eq("person_id", userId)
      
      if (skillsData) setSkills(skillsData.map((s: any) => s.skills.name))

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title, status")
        .eq("owner_id", userId)
        .limit(5)
      
      if (projectsData) setProjects(projectsData)
      setLoading(false)
    }
    fetchProfile()
  }, [userId])

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="size-10 animate-spin text-[#668184]" /></div>
  if (!profile) return <div className="flex min-h-dvh items-center justify-center">User not found</div>

  const initials = profile.full_name ? profile.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U"
  const isOwnProfile = currentUser?.id === userId

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c]">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8a9a7b] text-2xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{profile.full_name}</h1>
            <p className="text-sm text-[#668184]">{profile.year ? `${profile.year} Year` : "Student"} · {profile.department_id ? "CS" : "Computer Science"}</p>
          </div>
          {!isOwnProfile && (
            <Link href={`/chat/${userId}`}>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c] text-white transition-transform hover:scale-105">
                <MessageCircle className="size-5" strokeWidth={2} />
              </button>
            </Link>
          )}
        </motion.header>

        {/* Bio */}
        {profile.bio && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-sm leading-relaxed text-[#22393c]/80">
            {profile.bio}
          </motion.p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((tag) => (
                <span key={tag} className="glass-button glass-neutral rounded-full px-3 py-1.5 text-xs font-semibold text-[#22393c]">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h2 className="mb-3 text-base font-semibold">Projects by {profile.full_name.split(" ")[0]}</h2>
            <div className="space-y-3">
              {projects.map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id}>
                  <div className="glass-button glass-aqua rounded-2xl p-4 flex items-center justify-between transition-transform hover:scale-[1.02]">
                    <p className="text-sm font-semibold text-[#22393c]">{project.title}</p>
                    <span className="text-[10px] font-bold uppercase text-[#668184]">{project.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </main>
  )
}
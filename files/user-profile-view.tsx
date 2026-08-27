"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MessageCircle, ArrowLeft, Loader2, UserPlus, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { useUserProjects } from "@/lib/hooks/use-user-projects"

export function UserProfileView({ userId }: { userId: string }) {
  const router = useRouter()
  const { user: currentUser } = useCurrentUser()
  const { projects } = useUserProjects(userId)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [departmentName, setDepartmentName] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [connectionState, setConnectionState] = useState<"none" | "pending" | "accepted">("none")
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: profileData } = await supabase.from("people").select("*").eq("id", userId).single()
      if (profileData) {
        setProfile(profileData)
        if (profileData.department_id) {
          const { data: deptData } = await supabase.from("departments").select("name").eq("id", profileData.department_id).single()
          setDepartmentName(deptData?.name || null)
        }
      }

      const { data: skillsData } = await supabase.from("people_skills").select("skills(name)").eq("person_id", userId)
      if (skillsData) {
        const skillNames = skillsData
          .map((s: any) => (Array.isArray(s.skills) ? s.skills[0] : s.skills)?.name)
          .filter(Boolean)
        setSkills(skillNames)
      }

      setLoading(false)
    }
    fetchProfile()
  }, [userId])

  useEffect(() => {
    if (!currentUser || currentUser.id === userId) return
    const checkConnection = async () => {
      const { data } = await supabase
        .from("connections")
        .select("status")
        .or(
          `and(follower_id.eq.${currentUser.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${currentUser.id})`
        )
        .maybeSingle()
      if (data) setConnectionState(data.status === "accepted" ? "accepted" : "pending")
    }
    checkConnection()
  }, [currentUser, userId])

  const handleConnect = async () => {
    if (!currentUser) return
    setConnecting(true)
    try {
      const { error } = await supabase.from("connections").insert({
        follower_id: currentUser.id,
        following_id: userId,
        status: "pending",
      })
      if (error) throw error
      setConnectionState("pending")
      toast.success("Connection request sent")
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send connection request.")
    } finally {
      setConnecting(false)
    }
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="size-10 animate-spin text-[#668184]" /></div>
  if (!profile) return <div className="flex min-h-dvh items-center justify-center">User not found</div>

  const initials = profile.full_name ? profile.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U"
  const isOwnProfile = currentUser?.id === userId
  const interests = profile.interests || []

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c]">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#8a9a7b] text-2xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{profile.full_name}</h1>
            <p className="text-sm text-[#668184]">{profile.year ? `${profile.year} Year` : "Year not set"} · {departmentName || "Department not set"}</p>
          </div>
          {!isOwnProfile && (
            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={connectionState !== "none" || connecting}
                title={connectionState === "accepted" ? "Connected" : connectionState === "pending" ? "Request pending" : "Connect"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c] transition-transform hover:scale-105 disabled:opacity-60"
              >
                {connecting ? <Loader2 className="size-4 animate-spin" /> : connectionState === "none" ? <UserPlus className="size-5" strokeWidth={2} /> : <Check className="size-5" strokeWidth={2} />}
              </button>
              <Link href={`/chat/${userId}`}>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c] text-white transition-transform hover:scale-105">
                  <MessageCircle className="size-5" strokeWidth={2} />
                </button>
              </Link>
            </div>
          )}
        </motion.header>

        {profile.bio && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-sm leading-relaxed text-[#22393c]/80">
            {profile.bio}
          </motion.p>
        )}

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

        {interests.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((tag: string) => (
                <span key={tag} className="glass-button glass-neutral rounded-full px-3 py-1.5 text-xs font-semibold text-[#22393c]">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 ? (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h2 className="mb-3 text-base font-semibold">Projects</h2>
            <div className="space-y-3">
              {projects.map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id}>
                  <div className="glass-button glass-aqua rounded-2xl p-4 flex items-center justify-between transition-transform hover:scale-[1.02]">
                    <p className="text-sm font-semibold text-[#22393c]">{project.title}</p>
                    <span className="text-[10px] font-bold uppercase text-[#668184]">{project.status || "Active"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        ) : (
          <div className="glass-button glass-neutral rounded-2xl p-6 text-center">
            <p className="text-sm text-[#668184]">No projects yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}

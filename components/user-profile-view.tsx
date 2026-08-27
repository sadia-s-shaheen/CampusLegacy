"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MessageCircle, ArrowLeft, Loader2, UserPlus, Star } from "lucide-react"
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
  
  // Action states
  const [followState, setFollowState] = useState<"none" | "pending" | "accepted">("none")
  const [followLoading, setFollowLoading] = useState(false)
  const [isStarred, setIsStarred] = useState(false)
  const [starLoading, setStarLoading] = useState(false)
  
  // Social stats
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

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

      // Fetch social stats
      const { count: followers } = await supabase.from("connections").select("*", { count: "exact", head: true }).eq("following_id", userId).eq("status", "accepted")
      const { count: following } = await supabase.from("connections").select("*", { count: "exact", head: true }).eq("follower_id", userId).eq("status", "accepted")
      
      setFollowersCount(followers || 0)
      setFollowingCount(following || 0)

      setLoading(false)
    }
    fetchProfile()
  }, [userId])

  useEffect(() => {
    if (!currentUser || currentUser.id === userId) return
    const checkActions = async () => {
      // Check follow state
      const { data: followData } = await supabase
        .from("connections")
        .select("status")
        .or(`and(follower_id.eq.${currentUser.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${currentUser.id})`)
        .maybeSingle()
      if (followData) setFollowState(followData.status === "accepted" ? "accepted" : "pending")

      // Check star state
      const { data: starData } = await supabase
        .from("stars")
        .select("id")
        .eq("starrer_id", currentUser.id)
        .eq("starred_id", userId)
        .maybeSingle()
      if (starData) setIsStarred(true)
    }
    checkActions()
  }, [currentUser, userId])

  const handleFollow = async () => {
    if (!currentUser) return
    setFollowLoading(true)
    try {
      // If we are currently following (accepted) OR have a pending request, we should remove it first
      if (followState === "accepted" || followState === "pending") {
        const { error } = await supabase
          .from("connections")
          .delete()
          // Delete the specific connection from CurrentUser -> UserId
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)
        
        if (error) {
            console.error("Delete error:", error)
            throw error
        }
        
        setFollowState("none")
        toast.success("Unfollowed")
      } else {
        // If we are not following, create a new connection
        const { error } = await supabase.from("connections").insert({
          follower_id: currentUser.id,
          following_id: userId,
          status: "pending",
        })
        
        if (error) {
            // If it's a duplicate error, it means the row still exists. 
            // We can just refresh the state to match the DB.
            if (error.message.includes("duplicate")) {
                setFollowState("pending")
                toast.info("Request already sent")
            } else {
                throw error
            }
        } else {
            setFollowState("pending")
            toast.success("Follow request sent")
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Couldn't update follow status.")
    } finally {
      setFollowLoading(false)
    }
  }

  const handleStar = async () => {
    if (!currentUser) return
    setStarLoading(true)
    try {
      if (isStarred) {
        const { error } = await supabase
          .from("stars")
          .delete()
          .eq("starrer_id", currentUser.id)
          .eq("starred_id", userId)
        if (error) throw error
        setIsStarred(false)
        toast.success("Unstarred")
      } else {
        const { error } = await supabase.from("stars").insert({
          starrer_id: currentUser.id,
          starred_id: userId,
        })
        if (error) throw error
        setIsStarred(true)
        toast.success("Starred")
      }
    } catch (err: any) {
      toast.error(err?.message || "Couldn't update star status.")
    } finally {
      setStarLoading(false)
    }
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="size-10 animate-spin text-[#668184]" /></div>
  if (!profile) return <div className="flex min-h-dvh items-center justify-center">User not found</div>

  const initials = profile.full_name ? profile.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U"
  const isOwnProfile = currentUser?.id === userId
  const interests = profile.interests || []

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] dark:bg-[#16241f] px-5 pb-32 pt-10 text-[#22393c] dark:text-[#f4f1ea] sm:px-8 transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(22,36,31,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(31,64,55,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start gap-4 mb-4">
            <button onClick={() => router.back()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c] dark:text-[#f4f1ea] dark:bg-white/10">
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-2xl font-bold text-white shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">{profile.full_name}</h1>
              <p className="text-sm text-[#668184] dark:text-[#8a9a7b]">{profile.year ? `${profile.year} Year` : "Year not set"} · {departmentName || "Department not set"}</p>
            </div>
          </div>

          {/* Stats Row (Removed Starred) */}
          <div className="flex items-center justify-around mb-4 p-3 glass-button glass-neutral rounded-2xl">
            <div className="text-center">
              <p className="text-lg font-bold text-[#22393c] dark:text-white">{followersCount}</p>
              <p className="text-[10px] text-[#668184]">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#22393c] dark:text-white">{followingCount}</p>
              <p className="text-[10px] text-[#668184]">Following</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#22393c] dark:text-white">{projects.length}</p>
              <p className="text-[10px] text-[#668184]">Projects</p>
            </div>
          </div>

          {/* Action Buttons: Follow, Star, Chat */}
          {!isOwnProfile && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex-1 rounded-full p-3 flex items-center justify-center gap-2 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-60 ${
                  followState === "accepted"
                    ? "glass-button glass-neutral text-[#22393c] dark:text-white"
                    : "glass-button glass-ink text-white"
                }`}
              >
                {followLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="size-4" />{" "}
                    {followState === "pending" ? "Requested" : followState === "accepted" ? "Following" : "Follow"}
                  </>
                )}
              </button>

              <button
                onClick={handleStar}
                disabled={starLoading}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-[1.02] disabled:opacity-60 ${
                  isStarred
                    ? "glass-button glass-neutral text-yellow-500"
                    : "glass-button glass-neutral text-[#22393c] dark:text-[#f4f1ea]"
                }`}
              >
                {starLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Star className="size-5" fill={isStarred ? "currentColor" : "none"} />
                )}
              </button>

              <Link
                href={`/chat/${userId}`}
                className="glass-button glass-neutral flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-[1.02]"
              >
                <MessageCircle className="size-5 text-[#22393c] dark:text-[#f4f1ea]" strokeWidth={2} />
              </Link>
            </div>
          )}
        </motion.header>

        {/* Bio */}
        {profile.bio && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-sm leading-relaxed text-[#22393c]/80 dark:text-[#f4f1ea]/80">
            {profile.bio}
          </motion.p>
        )}

        {/* Academic & Contact Info */}
        <div className="glass-button glass-neutral rounded-2xl p-4 space-y-3 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Academic & Contact Info</h3>
          
          {profile.roll_number && (
            <div className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white">
              <span className="text-[#668184] w-20 shrink-0">Roll No:</span>
              <span className="font-medium">{profile.roll_number}</span>
            </div>
          )}
          
          {profile.email && (
            <div className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white">
              <span className="text-[#668184] w-20 shrink-0">Email:</span>
              <span className="font-medium truncate">{profile.email}</span>
            </div>
          )}
          
          {profile.phone_number && (
            <div className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white">
              <span className="text-[#668184] w-20 shrink-0">Phone:</span>
              <span className="font-medium">{profile.phone_number}</span>
            </div>
          )}
          
          {profile.github_url && (
            <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white hover:text-[#8a9a7b] transition-colors group">
              <span className="text-[#668184] w-20 shrink-0">GitHub:</span>
              <span className="font-medium truncate group-hover:underline">
                {profile.github_url.replace('https://github.com/', '').replace('http://github.com/', '')}
              </span>
            </a>
          )}
          
          {profile.linkedin_url && (
            <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white hover:text-[#8a9a7b] transition-colors group">
              <span className="text-[#668184] w-20 shrink-0">LinkedIn:</span>
              <span className="font-medium truncate group-hover:underline">
                {profile.linkedin_url.replace('https://linkedin.com/in/', '').replace('https://www.linkedin.com/in/', '')}
              </span>
            </a>
          )}

          {!profile?.roll_number && !profile?.phone_number && !profile?.github_url && !profile?.linkedin_url && (
            <p className="text-sm text-[#668184] italic pl-7">No additional contact details provided.</p>
          )}
        </div>

        {/* Skills & Interests */}
        <div className="space-y-4 mb-6">
          {skills.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((tag) => (
                  <span key={tag} className="glass-button glass-neutral rounded-full px-3 py-1.5 text-xs font-semibold text-[#22393c] dark:text-white">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {interests.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {interests.map((tag: string) => (
                  <span key={tag} className="glass-button glass-neutral rounded-full px-3 py-1.5 text-xs font-semibold text-[#22393c] dark:text-white">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Projects */}
        {projects.length > 0 ? (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h2 className="mb-3 text-base font-semibold">Projects ({projects.length})</h2>
        <div className="flex flex-col gap-3">
              {projects.map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id}>
                  <div className="glass-button glass-aqua rounded-2xl p-4 flex items-center justify-between transition-transform hover:scale-[1.02]">
                    <p className="text-sm font-semibold text-[#22393c] dark:text-white">{project.title}</p>
                    <span className="text-[10px] font-bold uppercase text-[#668184]">{project.status || "Active"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        ) : (
          <div className="glass-button glass-neutral rounded-2xl p-6 text-center mb-6">
            <p className="text-sm text-[#668184]">No projects yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}
"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MessageCircle, LogOut, Loader2, Edit3, Sun, Moon, Star, UserPlus, Users, Mail, Heart, ArrowLeft, Code, Phone, Mail as MailIcon, Hash } from "lucide-react"
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
  const [activeTab, setActiveTab] = useState<"about" | "projects" | "network">("about")
  const [networkTab, setNetworkTab] = useState<"followers" | "following" | "starred" | "chats">("followers")
  
  // Social features
  const [isFollowing, setIsFollowing] = useState(false)
  const [isStarred, setIsStarred] = useState(false)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [starred, setStarred] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUser(user)

        // 1. Fetch User Profile (selects ALL columns including roll_number, phone, github, linkedin)
        const { data: profileData } = await supabase
          .from("people")
          .select("*")
          .eq("id", user.id)
          .single()
        
        if (profileData) {
          let currentDepartmentName = ""
          if (profileData.department_id) {
            const { data: departmentData } = await supabase
              .from("departments")
              .select("name")
              .eq("id", profileData.department_id)
              .single()
            currentDepartmentName = departmentData?.name || ""
          }
          setDepartmentName(currentDepartmentName || null)
          setProfile({ ...profileData, department: currentDepartmentName })
        }

        // 2. Fetch User Skills
        const { data: skillsData } = await supabase
          .from("people_skills")
          .select("skill_id, skills(name)")
          .eq("person_id", user.id)
        
        if (skillsData) {
          const skillNames = skillsData.map((s: any) => {
            const skill = Array.isArray(s.skills) ? s.skills[0] : s.skills
            return skill?.name
          }).filter(Boolean)
          setSkillIds(skillsData.map((skill: any) => skill.skill_id).filter(Boolean))
          setSkills(skillNames)
        }

        // 3. Fetch User Connections
        const { data: connectionsData } = await supabase
          .from("connections")
          .select("id, status, follower_id, following_id")
          .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
          .eq("status", "accepted")
        
        if (connectionsData && connectionsData.length > 0) {
          const peopleIds = connectionsData.map((c: any) => 
            c.follower_id === user.id ? c.following_id : c.follower_id
          )
          const { data: peopleData } = await supabase
            .from("people")
            .select("id, full_name, role, year")
            .in("id", peopleIds)
          setConnections(peopleData || [])
        }

        // 4. Fetch ALL Projects (owned + team member)
        const { data: ownedProjects } = await supabase
          .from("projects")
          .select("id, title, status")
          .eq("owner_id", user.id)

        const { data: memberships } = await supabase
          .from("team_members")
          .select("project_id")
          .eq("person_id", user.id)
          .eq("status", "active")

        const joinedProjectIds = memberships?.map((m: any) => m.project_id) || []
        let joinedProjects: any[] = []

        if (joinedProjectIds.length > 0) {
          const { data: joinedData } = await supabase
            .from("projects")
            .select("id, title, status")
            .in("id", joinedProjectIds)
            .neq("owner_id", user.id)
          joinedProjects = joinedData || []
        }

        const allProjects = [...(ownedProjects || []), ...joinedProjects]
        const uniqueProjects = allProjects.filter((project, index, self) => 
          index === self.findIndex((p) => p.id === project.id)
        )
        setProjects(uniqueProjects)

        // 5. Fetch Social Data (Followers, Following, Starred, Chats)
        await fetchSocialData(user.id)

      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfileData()
  }, [])

  const fetchSocialData = async (userId: string) => {
    try {
      // Followers
      const { data: followersData } = await supabase
        .from("connections")
        .select("follower_id, people!follower_id(id, full_name, role, year)")
        .eq("following_id", userId)
        .eq("status", "accepted")
      
      if (followersData) {
        setFollowers(followersData.map((f: any) => f.people).filter(Boolean))
      }

      // Following
      const { data: followingData } = await supabase
        .from("connections")
        .select("following_id, people!following_id(id, full_name, role, year)")
        .eq("follower_id", userId)
        .eq("status", "accepted")
      
      if (followingData) {
        setFollowing(followingData.map((f: any) => f.people).filter(Boolean))
      }

      // Starred
      const { data: starredData } = await supabase
        .from("stars")
        .select("starred_id, people!starred_id(id, full_name, role, year)")
        .eq("starrer_id", userId)
      
      if (starredData) {
        setStarred(starredData.map((s: any) => s.people).filter(Boolean))
      }

      // Chats (conversations)
      const { data: conversationsData } = await supabase
        .from("conversations")
        .select("id, participant_1_id, participant_2_id")
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      
      if (conversationsData && conversationsData.length > 0) {
        const otherUserIds = conversationsData.map((c: any) => 
          c.participant_1_id === userId ? c.participant_2_id : c.participant_1_id
        )
        const { data: chatUsers } = await supabase
          .from("people")
          .select("id, full_name, role")
          .in("id", otherUserIds)
        setChats(chatUsers || [])
      }
    } catch (error) {
      console.error("Error fetching social data:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8] dark:bg-[#16241f]">
        <Loader2 className="size-10 animate-spin text-[#668184]" />
      </div>
    )
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || "User"
  const initials = displayName ? displayName.split(/[\s@._]+/).map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U"
  const interests = profile?.interests || []

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] dark:bg-[#16241f] px-5 pb-32 pt-10 text-[#22393c] dark:text-[#f4f1ea] sm:px-8 transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(22,36,31,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(31,64,55,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        {/* Profile Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#8a9a7b] text-3xl font-bold text-white shadow-lg shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{displayName}</h1>
              <p className="text-sm text-[#668184] dark:text-[#8a9a7b]">
                {profile?.year ? `${profile.year} Year` : "Year not set"} · {departmentName || "Department not set"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#22393c]/80 dark:text-[#f4f1ea]/80">
                {profile?.bio || "Building accessible tech for the future."}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-around mb-4 p-3 glass-button glass-neutral rounded-2xl">
            <div className="text-center">
              <p className="text-lg font-bold text-[#22393c] dark:text-white">{followers.length}</p>
              <p className="text-[10px] text-[#668184]">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#22393c] dark:text-white">{following.length}</p>
              <p className="text-[10px] text-[#668184]">Following</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#22393c] dark:text-white">{starred.length}</p>
              <p className="text-[10px] text-[#668184]">Starred</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#22393c] dark:text-white">{projects.length}</p>
              <p className="text-[10px] text-[#668184]">Projects</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 glass-button glass-neutral rounded-full p-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#22393c] dark:text-[#f4f1ea] transition-transform hover:scale-[1.02]"
            >
              <Edit3 className="size-4" /> Edit Profile
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="glass-button glass-neutral flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-[1.02]"
            >
              {theme === 'dark' ? <Moon className="size-5 text-[#f4f1ea]" /> : <Sun className="size-5 text-[#22393c]" />}
            </button>
          </div>
        </motion.header>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6 glass-button glass-neutral rounded-full p-1">
          <button
            onClick={() => setActiveTab("about")}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "about" ? "glass-ink text-white" : "text-[#668184]"
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "projects" ? "glass-ink text-white" : "text-[#668184]"
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab("network")}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "network" ? "glass-ink text-white" : "text-[#668184]"
            }`}
          >
            Network
          </button>
        </div>

        {/* About Tab */}
        {activeTab === "about" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mb-6"
          >
            {/* Contact & Academic Details */}
            <div className="glass-button glass-neutral rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Academic & Contact Info</h3>
              
              {profile?.roll_number && (
                <div className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white">
                  <Hash className="size-4 text-[#668184] shrink-0" />
                  <span className="text-[#668184] w-20 shrink-0">Roll No:</span>
                  <span className="font-medium">{profile.roll_number}</span>
                </div>
              )}
              
              {profile?.email && (
                <div className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white">
                  <MailIcon className="size-4 text-[#668184] shrink-0" />
                  <span className="text-[#668184] w-20 shrink-0">Email:</span>
                  <span className="font-medium truncate">{profile.email}</span>
                </div>
              )}
              
              {profile?.phone_number && (
                <div className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white">
                  <Phone className="size-4 text-[#668184] shrink-0" />
                  <span className="text-[#668184] w-20 shrink-0">Phone:</span>
                  <span className="font-medium">{profile.phone_number}</span>
                </div>
              )}
              
              {profile?.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white hover:text-[#8a9a7b] transition-colors group">
                  <Code className="size-4 text-[#668184] shrink-0" />
                  <span className="text-[#668184] w-20 shrink-0">GitHub:</span>
                  <span className="font-medium truncate group-hover:underline">
                    {profile.github_url.replace('https://github.com/', '').replace('http://github.com/', '')}
                  </span>
                </a>
              )}
              
              {profile?.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-[#22393c] dark:text-white hover:text-[#8a9a7b] transition-colors group">
                  <UserPlus className="size-4 text-[#668184] shrink-0" />
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

            <TagSection title="Skills" tags={skills.length > 0 ? skills : ["No skills added"]} />
            <TagSection title="Interests" tags={interests.length > 0 ? interests : ["No interests added"]} />
            <TagSection title="Roles" tags={profile?.role ? [profile.role] : ["Role not set"]} />
          </motion.div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">All Projects ({projects.length})</h2>
              <Link href="/projects" className="text-xs font-semibold uppercase tracking-wider text-[#8a9a7b]">View All</Link>
            </div>
              <div className="flex flex-col gap-3">
              {projects.length > 0 ? projects.map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id}>
                  <div className="glass-button glass-aqua rounded-2xl p-4 flex items-center justify-between transition-transform hover:scale-[1.02]">
                    <p className="text-sm font-semibold text-[#22393c] dark:text-white">{project.title}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#668184]">
                      {project.status || "Active"}
                    </span>
                  </div>
                </Link>
              )) : (
                <div className="glass-button glass-neutral rounded-2xl p-6 text-center">
                  <p className="text-sm text-[#668184]">No projects yet</p>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Network Tab */}
        {activeTab === "network" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            {/* Network Sub-Tabs */}
            <div className="flex gap-2 mb-4 glass-button glass-neutral rounded-full p-1 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setNetworkTab("followers")}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                  networkTab === "followers" ? "glass-ink text-white" : "text-[#668184]"
                }`}
              >
                Followers ({followers.length})
              </button>
              <button
                onClick={() => setNetworkTab("following")}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                  networkTab === "following" ? "glass-ink text-white" : "text-[#668184]"
                }`}
              >
                Following ({following.length})
              </button>
              <button
                onClick={() => setNetworkTab("starred")}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                  networkTab === "starred" ? "glass-ink text-white" : "text-[#668184]"
                }`}
              >
                Starred ({starred.length})
              </button>
              <button
                onClick={() => setNetworkTab("chats")}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                  networkTab === "chats" ? "glass-ink text-white" : "text-[#668184]"
                }`}
              >
                Chats ({chats.length})
              </button>
            </div>

            {/* Network Content */}
            <div className="space-y-3">
              {networkTab === "followers" && (
                followers.length > 0 ? followers.map((person: any) => (
                  <NetworkPerson key={person.id} person={person} />
                )) : (
                  <div className="glass-button glass-neutral rounded-2xl p-6 text-center">
                    <p className="text-sm text-[#668184]">No followers yet</p>
                  </div>
                )
              )}

              {networkTab === "following" && (
                following.length > 0 ? following.map((person: any) => (
                  <NetworkPerson key={person.id} person={person} />
                )) : (
                  <div className="glass-button glass-neutral rounded-2xl p-6 text-center">
                    <p className="text-sm text-[#668184]">Not following anyone yet</p>
                  </div>
                )
              )}

              {networkTab === "starred" && (
                starred.length > 0 ? starred.map((person: any) => (
                  <NetworkPerson key={person.id} person={person} />
                )) : (
                  <div className="glass-button glass-neutral rounded-2xl p-6 text-center">
                    <p className="text-sm text-[#668184]">No starred users yet</p>
                  </div>
                )
              )}

              {networkTab === "chats" && (
                chats.length > 0 ? chats.map((person: any) => (
                  <Link href={`/chat/${person.id}`} key={person.id}>
                    <div className="glass-button glass-lilac rounded-2xl p-4 flex items-center justify-between transition-transform hover:scale-[1.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 dark:bg-white/10 text-xs font-bold text-[#22393c] dark:text-white">
                          {person.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#22393c] dark:text-white">{person.full_name}</p>
                          <p className="text-xs text-[#668184]">{person.role || "Student"}</p>
                        </div>
                      </div>
                      <MessageCircle className="size-5 text-[#8a9a7b]" />
                    </div>
                  </Link>
                )) : (
                  <div className="glass-button glass-neutral rounded-2xl p-6 text-center">
                    <p className="text-sm text-[#668184]">No conversations yet</p>
                  </div>
                )
              )}
            </div>
          </motion.section>
        )}

        {/* Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 pt-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Settings</h3>
          <button 
            onClick={handleLogout}
            className="glass-button flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-sm font-semibold text-red-600 transition-transform hover:scale-[1.02] bg-red-500/10 border-red-500/20 dark:bg-red-900/20 dark:border-red-900/30"
          >
            <LogOut className="size-4" strokeWidth={1.8} />
            Log Out
          </button>
        </motion.section>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && <EditProfileModal onClose={() => setIsEditing(false)} currentProfile={profile} currentSkills={skillIds} />}
    </main>
  )
}

// Helper component for tag sections
function TagSection({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="glass-button glass-neutral rounded-full px-3 py-1.5 text-xs font-semibold text-[#22393c] dark:text-white">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// Helper component for network people
// Helper component for network people
function NetworkPerson({ person }: { person: any }) {
  return (
    <div className="glass-button glass-lilac rounded-2xl p-4 flex items-center justify-between transition-transform hover:scale-[1.02]">
      {/* Link 1: The Person's Info */}
      <Link href={`/profile/${person.id}`} className="flex items-center gap-3 flex-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 dark:bg-white/10 text-xs font-bold text-[#22393c] dark:text-white">
          {person.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#22393c] dark:text-white">{person.full_name}</p>
          <p className="text-xs text-[#668184]">{person.role || "Student"} · {person.year || ""} Year</p>
        </div>
      </Link>
      
      {/* Link 2: The Chat Button (Separated) */}
      <Link href={`/chat/${person.id}`}>
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c] dark:bg-[#8a9a7b] text-white transition-transform hover:scale-105">
          <MessageCircle className="size-4" strokeWidth={2} />
        </button>
      </Link>
    </div>
  )
}
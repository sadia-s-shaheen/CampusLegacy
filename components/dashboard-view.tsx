"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FolderGit2, Users, ChevronRight, Bell, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { useUserProjects } from "@/lib/hooks/use-user-projects"

export function DashboardView() {
  const { user } = useCurrentUser()
  const { projects, loading: projectsLoading } = useUserProjects(user?.id, 3)
  const [userName, setUserName] = useState("there")
  
  // Collaboration Hub Counts
  const [invitationsReceived, setInvitationsReceived] = useState(0)
  const [joinRequests, setJoinRequests] = useState(0)
  const [invitesSent, setInvitesSent] = useState(0)
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0)
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false)
  const [loadingCounts, setLoadingCounts] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchDashboardExtras = async () => {
      try {
        // 1. Get user's projects to check for join requests
        const { data: myProjects } = await supabase.from("projects").select("id").eq("owner_id", user.id)
        const projectIds = (myProjects || []).map((p) => p.id)

        // 2. Fetch all counts in parallel
        const [
          { data: profile },
          { count: receivedCount },
          { count: sentCount },
          { count: notifsCount },
          { data: notifsForBell }
        ] = await Promise.all([
          supabase.from("people").select("full_name").eq("id", user.id).single(),
          // Invitations Received (invitee_id = me)
          supabase.from("project_invitations").select("*", { count: "exact", head: true }).eq("invitee_id", user.id).eq("status", "pending"),
          // Invites Sent (invited_by = me)
          supabase.from("project_invitations").select("*", { count: "exact", head: true }).eq("invited_by", user.id).eq("status", "pending"),
          // Total Unread Notifications
          supabase.from("notifications").select("*", { count: "exact", head: true }).eq("recipient_id", user.id).eq("is_read", false),
          // Check if at least 1 unread notif exists (for the red dot on the bell)
          supabase.from("notifications").select("id").eq("recipient_id", user.id).eq("is_read", false).limit(1),
        ])

        if (profile?.full_name) setUserName(profile.full_name)
        setInvitationsReceived(receivedCount || 0)
        setInvitesSent(sentCount || 0)
        setUnreadNotifsCount(notifsCount || 0)
        setHasUnreadNotifs((notifsForBell?.length || 0) > 0)

        // 3. Fetch join requests for user's projects
        if (projectIds.length > 0) {
          const { count: joinCount } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .in("project_id", projectIds)
            .eq("status", "requested")
          setJoinRequests(joinCount || 0)
        } else {
          setJoinRequests(0)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoadingCounts(false)
      }
    }
    fetchDashboardExtras()
  }, [user])

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[#e8e9e8] px-5 pb-24 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />
      <div className="relative w-full max-w-md">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#668184]">Welcome back,</p>
            <h1 className="text-3xl font-semibold tracking-tight">{userName}!</h1>
            <p className="mt-1 text-sm text-[#668184]">Ready to build your legacy today?</p>
          </div>
          <Link href="/requests" className="relative">
            <button className="glass-button glass-neutral flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5">
              <Bell className="size-5 text-[#22393c]" strokeWidth={1.8} />
            </button>
            {hasUnreadNotifs && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#e8e9e8]" />
            )}
          </Link>
        </motion.header>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FolderGit2 className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
              My Projects
            </h2>
            <Link href="/projects" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#668184] hover:text-[#22393c] transition-colors">
              View All <ChevronRight className="size-3" />
            </Link>
          </div>

          {projectsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-8 animate-spin text-[#668184]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
              <p className="text-sm font-medium text-[#668184]">You haven't created any projects yet.</p>
              <Link href="/projects" className="mt-2 inline-block text-xs font-bold uppercase tracking-wider text-[#22393c]">
                Create your first project &rarr;
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {projects.map((project) => {
                const skillNames = project.project_skills?.map((ps: any) => ps.skills.name) || []
                return (
                  <Link href={`/projects/${project.id}`} key={project.id}>
                    <div className="glass-button glass-aqua rounded-3xl p-5 transition-transform hover:-translate-y-0.5 cursor-pointer">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-[#22393c]">{project.title}</h3>
                        <span className="glass-button glass-ink rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                          {project.status || "Active"}
                        </span>
                      </div>
                      <p className="mb-4 text-sm leading-relaxed text-[#22393c]/80 line-clamp-2">
                        {project.description || "No description provided."}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5 flex-wrap">
                          {skillNames.slice(0, 3).map((skill: string) => (
                            <span key={skill} className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-semibold text-[#22393c]">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-medium text-[#668184]">
                          {project.created_at ? new Date(project.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="size-5 text-[#8a9a7b]" strokeWidth={1.8} />
              Collaboration Hub
            </h2>
            <Link href="/requests" className="text-xs font-semibold uppercase tracking-wider text-[#668184] hover:text-[#22393c] transition-colors">
              View All
            </Link>
          </div>
          <Link href="/requests">
            <div className="grid grid-cols-2 gap-3 cursor-pointer">
              {/* Card 1: Invitations Received */}
              <div className="glass-button glass-lilac rounded-3xl p-4 text-center transition-transform hover:-translate-y-0.5">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#22393c]/10">
                  <span className="text-xl font-bold text-[#22393c]">{loadingCounts ? "\u2014" : invitationsReceived}</span>
                </div>
                <p className="text-sm font-semibold text-[#22393c]">Received</p>
                <p className="mt-1 text-[10px] font-medium text-[#668184]">Invites</p>
              </div>

              {/* Card 2: Join Requests */}
              <div className="glass-button glass-peach rounded-3xl p-4 text-center transition-transform hover:-translate-y-0.5">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#22393c]/10">
                  <span className="text-xl font-bold text-[#22393c]">{loadingCounts ? "\u2014" : joinRequests}</span>
                </div>
                <p className="text-sm font-semibold text-[#22393c]">Requests</p>
                <p className="mt-1 text-[10px] font-medium text-[#668184]">To Join</p>
              </div>

              {/* Card 3: Invites Sent */}
              <div className="glass-button glass-aqua rounded-3xl p-4 text-center transition-transform hover:-translate-y-0.5">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#22393c]/10">
                  <span className="text-xl font-bold text-[#22393c]">{loadingCounts ? "\u2014" : invitesSent}</span>
                </div>
                <p className="text-sm font-semibold text-[#22393c]">Sent</p>
                <p className="mt-1 text-[10px] font-medium text-[#668184]">Invites</p>
              </div>

              {/* Card 4: Unread Notifications */}
              <div className="glass-button glass-neutral rounded-3xl p-4 text-center transition-transform hover:-translate-y-0.5">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#22393c]/10">
                  <span className="text-xl font-bold text-[#22393c]">{loadingCounts ? "\u2014" : unreadNotifsCount}</span>
                </div>
                <p className="text-sm font-semibold text-[#22393c]">Alerts</p>
                <p className="mt-1 text-[10px] font-medium text-[#668184]">Unread</p>
              </div>
            </div>
          </Link>
        </motion.section>
      </div>
    </main>
  )
}
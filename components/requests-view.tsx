"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Check, X, Bell, GitBranch, Clock, UserPlus, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type RelatedPerson = { full_name: string | null }
type RelatedProject = { title: string | null }
type ReceivedRequest = {
  id: string
  role: string | null
  project_id: string
  people: RelatedPerson[]
}
type SentRequest = {
  id: string
  role: string | null
  status: string
  project_id: string
  projects: RelatedProject[]
}

export function RequestsView() {
  const [activeTab, setActiveTab] = useState<"requests" | "notifications">("requests")
  const [loading, setLoading] = useState(true)
  
  const [requestsReceived, setRequestsReceived] = useState<any[]>([])
  const [invitesSent, setInvitesSent] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Fetch Notifications
        const { data: notifsData } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
        
        if (notifsData) setNotifications(notifsData)

        // 2. Fetch Requests Received (People wanting to join MY projects)
        const { data: myProjects } = await supabase
          .from("projects")
          .select("id, title")
          .eq("owner_id", user.id)
        
        const myProjectIds = myProjects?.map(p => p.id) || []
        
        if (myProjectIds.length > 0) {
          const { data: reqsData } = await supabase
            .from("team_members")
            .select("id, role, project_id, people(full_name)")
            .in("project_id", myProjectIds)
            .eq("status", "requested")
          
          if (reqsData) {
            // Attach project title to each request
            const formattedReqs = (reqsData as ReceivedRequest[]).map((req) => {
              const person = req.people[0]

              return {
                ...req,
                projectName: myProjects?.find(p => p.id === req.project_id)?.title || "Unknown Project",
                name: person?.full_name || "Unknown User",
                initials: person?.full_name ? person.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "?"
              }
            })
            setRequestsReceived(formattedReqs)
          }
        }

        // 3. Fetch Invites Sent (Me requesting to join OTHER projects)
        const { data: myReqsData } = await supabase
          .from("team_members")
          .select("id, role, status, project_id, projects(title)")
          .eq("person_id", user.id)
          .in("status", ["requested", "invited"])
        
        if (myReqsData) {
          const formattedInvites = (myReqsData as SentRequest[]).map((inv) => {
            const project = inv.projects[0]

            return {
              ...inv,
              projectName: project?.title || "Unknown Project",
              name: "You",
              initials: "ME"
            }
          })
          setInvitesSent(formattedInvites)
        }

      } catch (error) {
        console.error("Error fetching requests:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper to handle accepting a request
    const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ status: "active" }) // <--- This is the critical part
        .eq("id", requestId)

      if (error) {
        console.error("Failed to accept:", error)
        alert("Failed to accept request: " + error.message)
        return
      }

      // Remove from UI
      setRequestsReceived(prev => prev.filter(r => r.id !== requestId))
      alert("Request accepted successfully!")
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    await supabase.from("team_members").update({ status: "rejected" }).eq("id", requestId)
    setRequestsReceived(prev => prev.filter(r => r.id !== requestId))
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8]">
        <Loader2 className="size-10 animate-spin text-[#668184]" />
      </div>
    )
  }

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        {/* Header & Tabs */}
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-4">Collaboration Hub</h1>
          
          <div className="glass-button glass-neutral flex items-center rounded-full p-1">
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "requests" ? "glass-ink text-white shadow-sm" : "text-[#668184]"
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "notifications" ? "glass-ink text-white shadow-sm" : "text-[#668184]"
              }`}
            >
              Notifications
            </button>
          </div>
        </motion.header>

        {/* REQUESTS TAB */}
        {activeTab === "requests" && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {/* Requests Received */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#668184]">Requests Received</h2>
              {requestsReceived.length === 0 ? (
                <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
                  <p className="text-sm text-[#668184]">No pending requests for your projects.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requestsReceived.map((req) => (
                    <div key={req.id} className="glass-button glass-lilac rounded-3xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">
                          {req.initials}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{req.name}</p>
                          <p className="text-xs text-[#668184]">wants to join: <span className="font-medium text-[#22393c]">{req.projectName}</span></p>
                          <p className="text-[10px] text-[#8a9a7b] mt-1">Role: {req.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]">
                          Accept
                        </button>
                        <button onClick={() => handleDeclineRequest(req.id)} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] transition-transform hover:scale-[1.02]">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Invites Sent */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#668184]">Invites Sent</h2>
              {invitesSent.length === 0 ? (
                <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
                  <p className="text-sm text-[#668184]">You haven't sent any requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitesSent.map((invite) => (
                    <div key={invite.id} className="glass-button glass-aqua rounded-3xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">
                          {invite.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">You</p>
                          <p className="text-xs text-[#668184]">Requested to join: {invite.projectName}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#22393c]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#668184]">
                        {invite.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {notifications.length === 0 ? (
              <div className="glass-button glass-neutral rounded-3xl p-8 text-center">
                <Bell className="mx-auto size-8 text-[#668184] mb-2" />
                <p className="text-sm font-medium text-[#668184]">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`glass-button glass-neutral rounded-2xl p-4 flex items-start gap-3 ${!notif.is_read ? 'border-l-4 border-l-[#8a9a7b]' : ''}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${notif.is_read ? "bg-[#22393c]/10 text-[#668184]" : "bg-[#22393c] text-white"}`}>
                      <Bell className="size-4" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm leading-relaxed ${!notif.is_read ? "font-semibold text-[#22393c]" : "text-[#22393c]/80"}`}>
                        {notif.content}
                      </p>
                      <p className="mt-1 text-[10px] text-[#668184] flex items-center gap-1">
                        <Clock className="size-3" /> {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  )
}
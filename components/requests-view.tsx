"use client"
import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Bell, Clock, Loader2, Send, Check, X, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export function RequestsView() {
  const { user } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<"received" | "sent" | "notifications">("received")
  const [loading, setLoading] = useState(true)
  
  const [requestsReceived, setRequestsReceived] = useState<any[]>([])
  const [invitesSent, setInvitesSent] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Fetch Notifications
      const { data: notifsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
      if (notifsData) setNotifications(notifsData)

      // 2. Fetch Requests Received (people requesting to join YOUR projects)
      const { data: myProjects } = await supabase.from("projects").select("id, title").eq("owner_id", user.id)
      const myProjectIds = myProjects?.map((p) => p.id) || []
      
      if (myProjectIds.length > 0) {
        const { data: reqsData } = await supabase
          .from("team_members")
          .select("id, role, project_id, people(full_name)")
          .in("project_id", myProjectIds)
          .eq("status", "requested")
        
        if (reqsData) {
          const formatted = reqsData.map((req: any) => ({
            ...req,
            projectName: myProjects?.find((p) => p.id === req.project_id)?.title || "Unknown Project",
            name: req.people?.full_name || "Unknown User",
            initials: req.people?.full_name ? req.people.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "?",
          }))
          setRequestsReceived(formatted)
        }
      } else {
        setRequestsReceived([])
      }

      // 3. Fetch Invites Sent (invitations YOU sent to OTHERS)
      const { data: sentInvites } = await supabase
        .from("project_invitations")
        .select(`
          id, 
          status, 
          created_at, 
          invitee_id, 
          people!invitee_id(full_name, role), 
          projects(title), 
          project_roles(title)
        `)
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false })

      if (sentInvites) {
        const formattedInvites = sentInvites.map((inv: any) => ({
          id: inv.id,
          status: inv.status,
          createdAt: inv.created_at,
          name: inv.people?.full_name || "Unknown User",
          role: inv.people?.role || "Student",
          projectName: inv.projects?.title || "Unknown Project",
          roleName: inv.project_roles?.title || null,
          initials: inv.people?.full_name ? inv.people.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "?",
        }))
        setInvitesSent(formattedInvites)
      }

    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime notifications subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
          toast(payload.new.content || "New notification")
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from("team_members").update({ status: "active" }).eq("id", requestId)
      if (error) throw error
      setRequestsReceived((prev) => prev.filter((r) => r.id !== requestId))
      toast.success("Request accepted")
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept request.")
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    const { error } = await supabase.from("team_members").update({ status: "rejected" }).eq("id", requestId)
    if (error) {
      toast.error("Failed to decline request.")
      return
    }
    setRequestsReceived((prev) => prev.filter((r) => r.id !== requestId))
  }

  if (loading || !user) {
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
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-4">Collaboration Hub</h1>
          <div className="glass-button glass-neutral flex items-center rounded-full p-1">
            <button
              onClick={() => setActiveTab("received")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "received" ? "glass-ink text-white shadow-sm" : "text-[#668184]"
              }`}
            >
              Received
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                activeTab === "sent" ? "glass-ink text-white shadow-sm" : "text-[#668184]"
              }`}
            >
              Sent <Send className="size-3" />
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "notifications" ? "glass-ink text-white shadow-sm" : "text-[#668184]"
              }`}
            >
              Alerts
            </button>
          </div>
        </motion.header>

        {/* TAB 1: RECEIVED */}
        {activeTab === "received" && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#668184]">Join Requests ({requestsReceived.length})</h2>
              {requestsReceived.length === 0 ? (
                <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
                  <UserPlus className="mx-auto size-8 text-[#668184] mb-2" />
                  <p className="text-sm text-[#668184]">No pending requests for your projects.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requestsReceived.map((req) => (
                    <div key={req.id} className="glass-button glass-peach rounded-2xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-[#22393c]">{req.name}</p>
                          <p className="text-xs text-[#668184]">wants to join <span className="font-semibold text-[#22393c]">{req.projectName}</span></p>
                        </div>
                        <span className="rounded-full bg-[#c99a5b]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#c99a5b]">Pending</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 flex items-center justify-center gap-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white hover:scale-[1.02] transition-transform">
                          <Check className="size-3" /> Accept
                        </button>
                        <button onClick={() => handleDeclineRequest(req.id)} className="flex-1 flex items-center justify-center gap-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] hover:scale-[1.02] transition-transform">
                          <X className="size-3" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* TAB 2: SENT (Fixed Query) */}
        {activeTab === "sent" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#668184]">Invitations You Sent ({invitesSent.length})</h2>
              {invitesSent.length === 0 ? (
                <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
                  <Send className="mx-auto size-8 text-[#668184] mb-2" />
                  <p className="text-sm text-[#668184]">You haven't sent any invitations yet.</p>
                  <p className="text-xs text-[#668184] mt-1">Go to a project's Team tab to invite someone.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitesSent.map((inv) => (
                    <div key={inv.id} className="glass-button glass-lilac rounded-2xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">
                            {inv.initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#22393c]">{inv.name}</p>
                            <p className="text-xs text-[#668184]">
                              Invited to <span className="font-semibold text-[#22393c]">{inv.projectName}</span>
                              {inv.roleName && <> as <span className="font-semibold text-[#22393c]">{inv.roleName}</span></>}
                            </p>
                            {inv.createdAt && (
                              <p className="text-[10px] text-[#668184] mt-1">
                                Sent {new Date(inv.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          inv.status === "pending"
                            ? "bg-[#c99a5b]/20 text-[#c99a5b]"
                            : inv.status === "accepted"
                            ? "bg-[#8a9a7b]/20 text-[#8a9a7b]"
                            : "bg-red-200/60 text-red-700"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
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
                  <div
                    key={notif.id}
                    className={`glass-button glass-neutral rounded-2xl p-4 flex items-start gap-3 ${!notif.is_read ? "border-l-4 border-l-[#8a9a7b]" : ""}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notif.is_read ? "bg-[#22393c]/10 text-[#668184]" : "bg-[#22393c] text-white"}`}>
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
"use client"
import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Bell, Clock, Loader2, Send, Check, X, UserPlus, Mail } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

export function RequestsView() {
  const { user } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<"requests" | "notifications">("requests")
  const [loading, setLoading] = useState(true)
  
  const [joinRequests, setJoinRequests] = useState<any[]>([])
  const [receivedInvites, setReceivedInvites] = useState<any[]>([])
  const [sentInvites, setSentInvites] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Notifications
      const { data: notifsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
      if (notifsData) setNotifications(notifsData)

      // 2. Join Requests (People requesting to join MY projects)
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
          setJoinRequests(formatted)
        }
      } else {
        setJoinRequests([])
      }

      // 3. Invitations Received (Invites sent TO ME)
      const { data: rawReceivedInvites } = await supabase
        .from("project_invitations")
        .select("*")
        .eq("invitee_id", user.id)
        .order("created_at", { ascending: false })
      
      if (rawReceivedInvites && rawReceivedInvites.length > 0) {
        const projectIds = [...new Set(rawReceivedInvites.map(i => i.project_id))]
        const inviterIds = [...new Set(rawReceivedInvites.map(i => i.invited_by))]
        const roleIds = rawReceivedInvites.map(i => i.project_role_id).filter(Boolean)
        
        const [{ data: projectsData }, { data: invitersData }, { data: rolesData }] = await Promise.all([
          supabase.from("projects").select("id, title").in("id", projectIds),
          supabase.from("people").select("id, full_name").in("id", inviterIds),
          roleIds.length > 0 ? supabase.from("project_roles").select("id, title").in("id", roleIds) : { data: [] }
        ])

        const formatted = rawReceivedInvites.map((inv: any) => ({
          ...inv,
          projectName: projectsData?.find((p) => p.id === inv.project_id)?.title || "Unknown Project",
          inviterName: invitersData?.find((p) => p.id === inv.invited_by)?.full_name || "Unknown User",
          roleName: rolesData?.find((r) => r.id === inv.project_role_id)?.title || null,
          initials: invitersData?.find((p) => p.id === inv.invited_by)?.full_name 
            ? invitersData.find((p) => p.id === inv.invited_by)!.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() 
            : "?",
        }))
        setReceivedInvites(formatted)
      } else {
        setReceivedInvites([])
      }

      // 4. Invitations Sent (Invites I sent to OTHERS)
      const { data: rawSentInvites } = await supabase
        .from("project_invitations")
        .select("*")
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false })
      
      if (rawSentInvites && rawSentInvites.length > 0) {
        const projectIds = [...new Set(rawSentInvites.map(i => i.project_id))]
        const inviteeIds = [...new Set(rawSentInvites.map(i => i.invitee_id))]
        const roleIds = rawSentInvites.map(i => i.project_role_id).filter(Boolean)
        
        const [{ data: projectsData }, { data: inviteesData }, { data: rolesData }] = await Promise.all([
          supabase.from("projects").select("id, title").in("id", projectIds),
          supabase.from("people").select("id, full_name").in("id", inviteeIds),
          roleIds.length > 0 ? supabase.from("project_roles").select("id, title").in("id", roleIds) : { data: [] }
        ])

        const formatted = rawSentInvites.map((inv: any) => ({
          ...inv,
          projectName: projectsData?.find((p) => p.id === inv.project_id)?.title || "Unknown Project",
          inviteeName: inviteesData?.find((p) => p.id === inv.invitee_id)?.full_name || "Unknown User",
          roleName: rolesData?.find((r) => r.id === inv.project_role_id)?.title || null,
          initials: inviteesData?.find((p) => p.id === inv.invitee_id)?.full_name 
            ? inviteesData.find((p) => p.id === inv.invitee_id)!.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() 
            : "?",
        }))
        setSentInvites(formatted)
      } else {
        setSentInvites([])
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

  // Realtime notifications
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("notifications-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev])
        toast(payload.new.content || "New notification")
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  // --- Handlers ---
  const handleAcceptJoinRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from("team_members").update({ status: "active" }).eq("id", requestId)
      if (error) throw error
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
      toast.success("Request accepted")
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept request.")
    }
  }

  const handleDeclineJoinRequest = async (requestId: string) => {
    const { error } = await supabase.from("team_members").update({ status: "rejected" }).eq("id", requestId)
    if (error) { toast.error("Failed to decline request."); return }
    setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
    toast.success("Request declined")
  }

  const handleAcceptInvite = async (inviteId: string, projectId: string, roleTitle: string | null) => {
    try {
      // 1. Update invitation status
      const { error: invError } = await supabase
        .from("project_invitations")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", inviteId)
      if (invError) throw invError

      // 2. Add user to team_members
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({ project_id: projectId, person_id: user!.id, role: roleTitle || "Contributor", status: "active" })
      if (memberError) throw memberError

      toast.success("Welcome to the team!")
      fetchData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept invite.")
    }
  }

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("project_invitations")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", inviteId)
      if (error) throw error
      toast.success("Invite declined.")
      fetchData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline invite.")
    }
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
            <button onClick={() => setActiveTab("requests")} className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${activeTab === "requests" ? "glass-ink text-white shadow-sm" : "text-[#668184]"}`}>Requests</button>
            <button onClick={() => setActiveTab("notifications")} className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${activeTab === "notifications" ? "glass-ink text-white shadow-sm" : "text-[#668184]"}`}>Notifications</button>
          </div>
        </motion.header>

        {activeTab === "requests" && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            
            {/* 1. INVITATIONS RECEIVED */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#668184] flex items-center gap-2">
                <Mail className="size-4" /> Invitations Received ({receivedInvites.filter(i => i.status === 'pending').length})
              </h2>
              {receivedInvites.filter(i => i.status === 'pending').length === 0 ? (
                <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
                  <p className="text-sm text-[#668184]">No pending invitations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedInvites.filter(i => i.status === 'pending').map((inv) => (
                    <div key={inv.id} className="glass-button glass-lilac rounded-3xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">{inv.initials}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{inv.inviterName}</p>
                          <p className="text-xs text-[#668184]">invited you to join <span className="font-medium text-[#22393c]">{inv.projectName}</span></p>
                          {inv.roleName && <p className="text-[10px] text-[#8a9a7b] mt-1">Role: {inv.roleName}</p>}
                          {inv.message && <p className="text-xs italic text-[#668184] mt-2">"{inv.message}"</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptInvite(inv.id, inv.project_id, inv.roleName)} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]">Accept</button>
                        <button onClick={() => handleDeclineInvite(inv.id)} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] transition-transform hover:scale-[1.02]">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. JOIN REQUESTS (For my projects) */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#668184] flex items-center gap-2">
                <UserPlus className="size-4" /> Join Requests ({joinRequests.length})
              </h2>
              {joinRequests.length === 0 ? (
                <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
                  <p className="text-sm text-[#668184]">No pending requests for your projects.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((req) => (
                    <div key={req.id} className="glass-button glass-peach rounded-3xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">{req.initials}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{req.name}</p>
                          <p className="text-xs text-[#668184]">wants to join <span className="font-medium text-[#22393c]">{req.projectName}</span></p>
                          {req.role && <p className="text-[10px] text-[#8a9a7b] mt-1">Requested Role: {req.role}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptJoinRequest(req.id)} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]">Accept</button>
                        <button onClick={() => handleDeclineJoinRequest(req.id)} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] transition-transform hover:scale-[1.02]">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. SENT INVITATIONS */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#668184] flex items-center gap-2">
                <Send className="size-4" /> Sent ({sentInvites.length})
              </h2>
              {sentInvites.length === 0 ? (
                <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
                  <p className="text-sm text-[#668184]">You haven't sent any invitations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentInvites.map((inv) => (
                    <div key={inv.id} className="glass-button glass-aqua rounded-3xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold text-[#22393c]">{inv.initials}</div>
                        <div>
                          <p className="text-sm font-semibold">{inv.inviteeName}</p>
                          <p className="text-xs text-[#668184]">Invited to: {inv.projectName}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        inv.status === "pending" ? "bg-[#c99a5b]/20 text-[#c99a5b]" :
                        inv.status === "accepted" ? "bg-[#8a9a7b]/20 text-[#8a9a7b]" :
                        "bg-red-200/60 text-red-700"
                      }`}>{inv.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </motion.div>
        )}

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
                  <div key={notif.id} className={`glass-button glass-neutral rounded-2xl p-4 flex items-start gap-3 ${!notif.is_read ? "border-l-4 border-l-[#8a9a7b]" : ""}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${notif.is_read ? "bg-[#22393c]/10 text-[#668184]" : "bg-[#22393c] text-white"}`}>
                      <Bell className="size-4" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm leading-relaxed ${!notif.is_read ? "font-semibold text-[#22393c]" : "text-[#22393c]/80"}`}>{notif.content}</p>
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
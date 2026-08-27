"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, MessageCircle } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

type ConversationRow = {
  id: string
  participant_1_id: string
  participant_2_id: string
  other_person: { id: string; full_name: string | null } | null
  last_message: { content: string; created_at: string; sender_id: string } | null
}

// This view was previously missing entirely — ChatView existed for a single
// contact, but there was no way to see the list of conversations you're in.
export function InboxView() {
  const { user, loading: userLoading } = useCurrentUser()
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchConversations = async () => {
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("id, participant_1_id, participant_2_id")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)

      if (error || !convos) {
        console.error("Failed to load conversations:", error)
        setLoading(false)
        return
      }

      const enriched = await Promise.all(
        convos.map(async (c: any) => {
          const otherId = c.participant_1_id === user.id ? c.participant_2_id : c.participant_1_id

          const [{ data: person }, { data: lastMsg }] = await Promise.all([
            supabase.from("people").select("id, full_name").eq("id", otherId).maybeSingle(),
            supabase
              .from("messages")
              .select("content, created_at, sender_id")
              .eq("conversation_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ])

          return {
            ...c,
            other_person: person || null,
            last_message: lastMsg || null,
          } as ConversationRow
        })
      )

      enriched.sort((a, b) => {
        const at = a.last_message?.created_at || ""
        const bt = b.last_message?.created_at || ""
        return bt.localeCompare(at)
      })

      setConversations(enriched)
      setLoading(false)
    }

    fetchConversations()

    // Live-update the inbox when a new message lands in any of the user's
    // conversations, so unopened chats surface without a manual refresh.
    const channel = supabase
      .channel("inbox-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  if (userLoading || loading) {
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
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        </motion.header>

        {conversations.length === 0 ? (
          <div className="glass-button glass-neutral rounded-3xl p-8 text-center">
            <MessageCircle className="mx-auto size-10 text-[#668184] mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-[#22393c]">No conversations yet.</p>
            <p className="mt-1 text-xs text-[#668184]">Head to Discover to find teammates and start chatting.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((c, idx) => {
              const name = c.other_person?.full_name || "Unknown User"
              const initials = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
              return (
                <Link href={`/chat/${c.other_person?.id}`} key={c.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="glass-button glass-neutral rounded-3xl p-4 flex items-center gap-3 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-xs font-bold text-white">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#22393c]">{name}</p>
                      <p className="text-xs text-[#668184] truncate">
                        {c.last_message?.content || "Say hello \u2014 no messages yet"}
                      </p>
                    </div>
                    {c.last_message && (
                      <span className="flex-shrink-0 text-[10px] text-[#668184]">
                        {new Date(c.last_message.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

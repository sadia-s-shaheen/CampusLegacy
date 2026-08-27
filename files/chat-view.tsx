"use client"
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

type Message = {
  id: string | number
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  pending?: boolean
}

export function ChatView({ contactId, contactName }: { contactId: string; contactName: string }) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    const initChat = async () => {
      // 1. Find or create the conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${contactId}),and(participant_1_id.eq.${contactId},participant_2_id.eq.${user.id})`
        )
        .maybeSingle()

      let convId = existingConv?.id

      if (!convId) {
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({ participant_1_id: user.id, participant_2_id: contactId })
          .select()
          .single()
        if (error) {
          console.error("Failed to start conversation:", error)
          setLoading(false)
          return
        }
        convId = newConv?.id
      }

      if (!convId) {
        setLoading(false)
        return
      }

      setConversationId(convId)

      // 2. Load message history
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })

      if (msgs) setMessages(msgs)
      setLoading(false)

      // 3. Subscribe to new messages. Our own sends are already shown
      // optimistically in handleSend, so the realtime echo of our own
      // insert is skipped here to avoid a duplicate bubble — only the
      // other participant's messages get added from this channel.
      const channel = supabase
        .channel(`room-${convId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
          (payload) => {
            const incoming = payload.new as Message
            if (incoming.sender_id === user.id) return
            setMessages((prev) => [...prev, incoming])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    initChat()
  }, [contactId, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !conversationId || !user) return

    const content = input
    setInput("")

    const tempId = `temp-${Date.now()}`
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, tempMsg])

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, content })
      .select()
      .single()

    if (error) {
      console.error("Failed to send:", error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setInput(content)
      return
    }

    // Reconcile the optimistic message with the real row (real id, no
    // longer "pending") instead of leaving a fake id in state forever.
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data, pending: false } : m)))
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8]">
        <Loader2 className="size-8 animate-spin text-[#668184]" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#e8e9e8] text-[#22393c]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <header className="sticky top-0 z-20 glass-button glass-neutral px-4 py-3 flex items-center gap-3 border-b border-[#22393c]/5">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22393c]/5 text-[#22393c]">
          <ArrowLeft className="size-4" strokeWidth={2} />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b] text-xs font-bold text-white">
          {contactName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold leading-tight">{contactName}</h1>
          <p className="text-[10px] text-[#668184]">Online</p>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-40">
        {messages.map((msg, index) => {
          const isSent = msg.sender_id === user.id
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`flex ${isSent ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${isSent ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    isSent ? "glass-button glass-ink text-white rounded-br-md" : "glass-button glass-neutral text-[#22393c] rounded-bl-md"
                  } ${msg.pending ? "opacity-60" : ""}`}
                >
                  {msg.content}
                </div>
                <span className="mt-1 text-[9px] text-[#668184]">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </motion.div>
          )
        })}
        <div ref={messagesEndRef} />
      </main>

      <div className="fixed bottom-20 left-0 right-0 z-30 px-4 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">
        <form onSubmit={handleSend} className="glass-button glass-neutral flex items-center gap-2 rounded-full px-2 py-2 shadow-lg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none px-2"
          />
          <button type="submit" disabled={!input.trim()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22393c] text-white transition-all hover:scale-105 disabled:opacity-50">
            <Send className="size-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  )
}

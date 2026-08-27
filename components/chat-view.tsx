"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

// ============================================================
// TYPES
// ============================================================

type ChatMessage = {
  id: string
  sender_id: string
  content: string
  created_at: string
  conversation_id?: string
  project_id?: string
}

type GroupInfo = {
  title: string
  members: string[]
}

// ============================================================
// HELPERS
// ============================================================

function getProjectId(contactId: string): string {
  let id = contactId

  // Safely remove any accidental repeated prefixes.
  while (id.startsWith("project-")) {
    id = id.substring("project-".length)
  }

  return id
}

// ============================================================
// USER MESSAGE
// ============================================================

function UserMessage({
  message,
  currentUserId,
  index,
}: {
  message: ChatMessage
  currentUserId: string | null
  index: number
}) {
  const isSent =
    !!currentUserId &&
    message.sender_id === currentUserId

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: Math.min(index * 0.02, 0.2),
      }}
      className={`flex ${
        isSent
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] ${
          isSent
            ? "items-end"
            : "items-start"
        } flex flex-col`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isSent
              ? "glass-button glass-ink text-white rounded-br-md"
              : "glass-button glass-neutral text-[#22393c] rounded-bl-md"
          }`}
        >
          {message.content}
        </div>

        <span className="mt-1 text-[9px] text-[#668184]">
          {message.created_at
            ? new Date(
                message.created_at
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </span>
      </div>
    </motion.div>
  )
}

// ============================================================
// CHAT VIEW
// ============================================================

export function ChatView({
  contactId,
  contactName,
}: {
  contactId: string
  contactName: string
}) {
  const router = useRouter()

  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<
    ChatMessage[]
  >([])

  const [loading, setLoading] =
    useState(true)

  const [sending, setSending] =
    useState(false)

  const [conversationId, setConversationId] =
    useState<string | null>(null)

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null)

  const [groupInfo, setGroupInfo] =
    useState<GroupInfo | null>(null)

  const messagesEndRef =
    useRef<HTMLDivElement>(null)

  // Prevent overlapping polling requests.
  const fetchingMessages =
    useRef(false)

  // ============================================================
  // DETERMINE CHAT TYPE
  // ============================================================

  const isGroupChat =
    contactId.startsWith("project-")

  // ============================================================
  // CURRENT USER
  // ============================================================

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error(
          "❌ Failed to get current user:",
          error
        )
        return
      }

      if (!mounted) return

      setCurrentUserId(
        user?.id ?? null
      )
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [])

  // ============================================================
  // GROUP CHAT INFO
  // ============================================================

  useEffect(() => {
    let mounted = true

    const loadGroupInfo = async () => {
      if (!isGroupChat) {
        if (mounted) {
          setGroupInfo(null)
        }

        return
      }

      const projectId =
        getProjectId(contactId)

      console.log(
        "👥 Loading group:",
        projectId
      )

      const {
        data: project,
        error,
      } = await supabase
        .from("projects")
        .select(
          "title, team_members(people(full_name))"
        )
        .eq("id", projectId)
        .single()

      if (error) {
        console.error(
          "❌ Group info error:",
          error
        )

        if (mounted) {
          setGroupInfo(null)
        }

        return
      }

      if (!project || !mounted) {
        return
      }

      const members =
        (project.team_members ?? [])
          .map(
            (member: any) =>
              member.people?.full_name
          )
          .filter(Boolean)

      setGroupInfo({
        title: project.title,
        members,
      })
    }

    loadGroupInfo()

    return () => {
      mounted = false
    }
  }, [contactId, isGroupChat])

  // ============================================================
  // LOAD PROJECT MESSAGES
  // ============================================================

  const loadProjectMessages = async (
    projectId: string,
    initial = false
  ) => {
    if (fetchingMessages.current) {
      return
    }

    fetchingMessages.current = true

    try {
      const {
        data,
        error,
      } = await supabase
        .from("project_messages")
        .select("*")
        .eq(
          "project_id",
          projectId
        )
        .order("created_at", {
          ascending: true,
        })

      if (error) {
        console.error(
          "❌ Project messages error:",
          error
        )

        return
      }

      if (!data) return

      setMessages((previous) => {
        /*
         * During polling, don't unnecessarily replace
         * the array if nothing changed.
         */
        if (
          previous.length ===
            data.length &&
          previous.every(
            (message, index) =>
              message.id ===
              data[index]?.id
          )
        ) {
          return previous
        }

        return data as ChatMessage[]
      })
    } finally {
      fetchingMessages.current = false
    }
  }

  // ============================================================
  // LOAD DIRECT MESSAGES
  // ============================================================

  const loadDirectMessages = async (
    convId: string
  ) => {
    if (fetchingMessages.current) {
      return
    }

    fetchingMessages.current = true

    try {
      const {
        data,
        error,
      } = await supabase
        .from("messages")
        .select("*")
        .eq(
          "conversation_id",
          convId
        )
        .order("created_at", {
          ascending: true,
        })

      if (error) {
        console.error(
          "❌ Direct messages error:",
          error
        )

        return
      }

      if (!data) return

      setMessages((previous) => {
        if (
          previous.length ===
            data.length &&
          previous.every(
            (message, index) =>
              message.id ===
              data[index]?.id
          )
        ) {
          return previous
        }

        return data as ChatMessage[]
      })
    } finally {
      fetchingMessages.current = false
    }
  }

  // ============================================================
  // INITIALIZE CHAT
  // ============================================================

  useEffect(() => {
    let mounted = true
    let pollingInterval:
      | ReturnType<typeof setInterval>
      | null = null

    const initChat = async () => {
      setLoading(true)
      setMessages([])
      setConversationId(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (
        userError ||
        !user ||
        !mounted
      ) {
        if (userError) {
          console.error(
            "❌ Auth error:",
            userError
          )
        }

        if (mounted) {
          setLoading(false)
        }

        return
      }

      // ========================================================
      // GROUP CHAT
      // ========================================================

      if (isGroupChat) {
        const projectId =
          getProjectId(contactId)

        console.log(
          "💬 Opening project chat:",
          projectId
        )

        /*
         * This is only a logical conversation ID.
         * It is NOT a Supabase realtime channel.
         */
        setConversationId(
          `project-${projectId}`
        )

        await loadProjectMessages(
          projectId,
          true
        )

        if (!mounted) return

        setLoading(false)

        /*
         * POLLING
         *
         * Every 1.5 seconds, fetch new messages.
         *
         * No Supabase realtime channel is created.
         * Therefore this component cannot trigger:
         *
         * "cannot add postgres_changes callbacks..."
         */
        pollingInterval =
          setInterval(() => {
            if (!mounted) return

            loadProjectMessages(
              projectId
            )
          }, 1500)

        return
      }

      // ========================================================
      // ONE-TO-ONE CHAT
      // ========================================================

      const {
        data: existingConversation,
        error: conversationError,
      } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1_id.eq.${user.id},participant_2_id.eq.${contactId}),and(participant_1_id.eq.${contactId},participant_2_id.eq.${user.id})`
        )
        .maybeSingle()

      if (conversationError) {
        console.error(
          "❌ Conversation lookup error:",
          conversationError
        )
      }

      let convId =
        existingConversation?.id

      // --------------------------------------------------------
      // CREATE CONVERSATION IF NECESSARY
      // --------------------------------------------------------

      if (!convId) {
        const {
          data: newConversation,
          error: createError,
        } = await supabase
          .from("conversations")
          .insert({
            participant_1_id:
              user.id,
            participant_2_id:
              contactId,
          })
          .select("id")
          .single()

        if (createError) {
          console.error(
            "❌ Conversation creation error:",
            createError
          )

          if (mounted) {
            setLoading(false)
          }

          return
        }

        convId =
          newConversation?.id
      }

      if (!convId || !mounted) {
        if (mounted) {
          setLoading(false)
        }

        return
      }

      setConversationId(convId)

      await loadDirectMessages(
        convId
      )

      if (!mounted) return

      setLoading(false)

      // --------------------------------------------------------
      // POLLING FOR DIRECT MESSAGES
      // --------------------------------------------------------

      pollingInterval =
        setInterval(() => {
          if (!mounted) return

          loadDirectMessages(
            convId!
          )
        }, 1500)
    }

    initChat()

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      mounted = false

      if (pollingInterval) {
        clearInterval(
          pollingInterval
        )
        pollingInterval = null
      }
    }
  }, [contactId])

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    )
  }, [messages])

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    const content =
      input.trim()

    if (
      !content ||
      !conversationId ||
      sending
    ) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    setSending(true)

    // ==========================================================
    // GROUP MESSAGE
    // ==========================================================

    if (isGroupChat) {
      const projectId =
        getProjectId(contactId)

      const tempId =
        `temp-${crypto.randomUUID()}`

      const optimisticMessage: ChatMessage =
        {
          id: tempId,
          project_id: projectId,
          sender_id: user.id,
          content,
          created_at:
            new Date().toISOString(),
        }

      // Immediately show message
      setMessages((previous) => [
        ...previous,
        optimisticMessage,
      ])

      setInput("")

      const {
        data: insertedMessage,
        error,
      } = await supabase
        .from("project_messages")
        .insert({
          project_id:
            projectId,
          sender_id:
            user.id,
          content,
        })
        .select("*")
        .single()

      if (error) {
        console.error(
          "❌ Failed to send project message:",
          error
        )

        // Remove failed optimistic message
        setMessages((previous) =>
          previous.filter(
            (message) =>
              message.id !==
              tempId
          )
        )

        setSending(false)
        return
      }

      /*
       * Replace temporary message with
       * the actual database message.
       */
      if (insertedMessage) {
        setMessages((previous) =>
          previous.map(
            (message) =>
              message.id === tempId
                ? (insertedMessage as ChatMessage)
                : message
          )
        )
      }

      setSending(false)
      return
    }

    // ==========================================================
    // ONE-TO-ONE MESSAGE
    // ==========================================================

    const tempId =
      `temp-${crypto.randomUUID()}`

    const optimisticMessage: ChatMessage =
      {
        id: tempId,
        conversation_id:
          conversationId,
        sender_id:
          user.id,
        content,
        created_at:
          new Date().toISOString(),
      }

    // Immediately show message
    setMessages((previous) => [
      ...previous,
      optimisticMessage,
    ])

    setInput("")

    const {
      data: insertedMessage,
      error,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id:
          conversationId,
        sender_id:
          user.id,
        content,
      })
      .select("*")
      .single()

    if (error) {
      console.error(
        "❌ Failed to send message:",
        error
      )

      setMessages((previous) =>
        previous.filter(
          (message) =>
            message.id !==
            tempId
        )
      )

      setSending(false)
      return
    }

    if (insertedMessage) {
      setMessages((previous) =>
        previous.map(
          (message) =>
            message.id === tempId
              ? (insertedMessage as ChatMessage)
              : message
        )
      )
    }

    setSending(false)
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8]">
        <Loader2 className="size-8 animate-spin text-[#668184]" />
      </div>
    )
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#e8e9e8] text-[#22393c]">

      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-20 glass-button glass-neutral px-4 py-3 flex items-center gap-3 border-b border-[#22393c]/5">

        {/* Back */}
        <button
          onClick={() =>
            router.back()
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22393c]/5 text-[#22393c]"
        >
          <ArrowLeft
            className="size-4"
            strokeWidth={2}
          />
        </button>

        {/* ==================================================
            GROUP CHAT HEADER
            ================================================== */}

        {groupInfo ? (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-white">
              <Users
                className="size-5"
                strokeWidth={2}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold leading-tight truncate">
                {groupInfo.title}
              </h1>

              <p className="text-[10px] text-[#668184] truncate">
                {groupInfo.members.length >
                0
                  ? groupInfo.members.join(
                      ", "
                    )
                  : "No members"}
              </p>
            </div>
          </>
        ) : (

          /* ==================================================
             1-TO-1 HEADER
             ================================================== */

          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-xs font-bold text-white">
              {contactName
                .split(" ")
                .map(
                  (name) =>
                    name[0]
                )
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold leading-tight truncate">
                {contactName}
              </h1>

              <p className="text-[10px] text-[#668184]">
                Online
              </p>
            </div>
          </>
        )}
      </header>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      <main className="relative flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-40">

        {messages.map(
          (message, index) => (
            <UserMessage
              key={message.id}
              message={message}
              currentUserId={
                currentUserId
              }
              index={index}
            />
          )
        )}

        <div
          ref={messagesEndRef}
        />
      </main>

      {/* ======================================================
          INPUT
      ====================================================== */}

      <div className="fixed bottom-20 left-0 right-0 z-30 px-4 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">

        <form
          onSubmit={handleSend}
          className="glass-button glass-neutral flex items-center gap-2 rounded-full px-2 py-2 shadow-lg"
        >
          <input
            type="text"
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            placeholder={
              groupInfo
                ? "Message group..."
                : "Type a message..."
            }
            disabled={sending}
            className="flex-1 bg-transparent text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none px-2 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              !input.trim() ||
              !conversationId ||
              sending
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22393c] text-white transition-all hover:scale-105 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send
                className="size-4"
                strokeWidth={2}
              />
            )}
          </button>
        </form>

      </div>
    </div>
  )
}
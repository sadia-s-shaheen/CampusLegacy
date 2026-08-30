"use client"

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  Bot,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { logCollaborationEvent } from "@/lib/collaboration-events"
import { CollaborationCoach } from "@/components/collaboration-coach"
import { runCollaborationCoach } from "@/lib/run-collaboration-coach"

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

  // AI Coach messages are identified in UI state.
  // They are ALSO persisted in coach_messages.
  isCoach?: boolean
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

  while (id.startsWith("project-")) {
    id = id.substring("project-".length)
  }

  return id
}

// ============================================================
// COACH REQUEST DETECTION
// ============================================================

function isCoachRequest(text: string): boolean {
  const normalized = text.toLowerCase().trim()

  return (
    normalized === "hey coach" ||
    normalized === "hi coach" ||
    normalized === "hello coach" ||
    normalized === "@coach" ||
    normalized.startsWith("hey coach ") ||
    normalized.startsWith("hi coach ") ||
    normalized.startsWith("hello coach ") ||
    normalized.startsWith("@coach ")
  )
}

function cleanCoachQuestion(text: string): string {
  return text
    .replace(
      /^(@coach|hey coach|hi coach|hello coach)\s*:?\s*/i,
      ""
    )
    .trim()
}

// ============================================================
// SORT MESSAGES
// ============================================================

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  )
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
        isSent ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] ${
          isSent ? "items-end" : "items-start"
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
// AI COACH MESSAGE
// ============================================================

function CoachMessage({
  message,
}: {
  message: ChatMessage
}) {
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
        duration: 0.2,
      }}
      className="flex justify-start"
    >
      <div className="flex max-w-[88%] items-start gap-2">
        {/* Coach avatar */}
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22393c] text-white shadow-sm">
          <Bot
            className="size-4"
            strokeWidth={2}
          />
        </div>

        <div className="flex min-w-0 flex-col items-start">
          {/* Coach name */}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#22393c]">
              CampusLegacy Coach
            </span>

            <span className="rounded-full bg-[#22393c]/10 px-1.5 py-0.5 text-[8px] font-semibold text-[#668184]">
              AI
            </span>
          </div>

          {/* Message */}
          <div className="glass-button glass-neutral rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-[#22393c] shadow-sm whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Time */}
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
  const [messages, setMessages] =
    useState<ChatMessage[]>([])

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [conversationId, setConversationId] =
    useState<string | null>(null)

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null)

  const [groupInfo, setGroupInfo] =
    useState<GroupInfo | null>(null)

  const messagesEndRef =
    useRef<HTMLDivElement>(null)

  const fetchingMessages =
    useRef(false)

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

      if (mounted) {
        setCurrentUserId(user?.id ?? null)
      }
    }

    void loadUser()

    return () => {
      mounted = false
    }
  }, [])

  // ============================================================
  // GROUP INFO
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

      const {
        data: project,
        error,
      } = await supabase
        .from("projects")
        .select(
          `
          title,
          team_members(
            person_id,
            people(
              full_name
            )
          )
        `
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

      const members = (
        project.team_members ?? []
      )
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

    void loadGroupInfo()

    return () => {
      mounted = false
    }
  }, [contactId, isGroupChat])

  // ============================================================
  // LOAD PROJECT MESSAGES + COACH HISTORY
  // ============================================================

  const loadProjectMessages =
    useCallback(
      async (projectId: string) => {
        if (fetchingMessages.current) {
          return
        }

        fetchingMessages.current = true

        try {
          // ------------------------------------------------------
          // NORMAL PROJECT MESSAGES
          // ------------------------------------------------------

          const {
            data: projectMessages,
            error: projectError,
          } = await supabase
            .from("project_messages")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", {
              ascending: true,
            })

          if (projectError) {
            console.error(
              "❌ Project messages error:",
              projectError
            )

            return
          }

          // ------------------------------------------------------
          // PERSISTED COACH MESSAGES
          // ------------------------------------------------------

          const {
            data: coachMessages,
            error: coachError,
          } = await supabase
            .from("coach_messages")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", {
              ascending: true,
            })

          if (coachError) {
            console.error(
              "❌ Coach messages error:",
              coachError
            )

            return
          }

          // ------------------------------------------------------
          // NORMALIZE COACH MESSAGES
          // ------------------------------------------------------

          const normalizedCoachMessages: ChatMessage[] =
            (coachMessages ?? []).map(
              (message: any) => ({
                id: message.id,
                sender_id:
                  "campuslegacy-coach",
                content: message.content,
                created_at:
                  message.created_at,
                project_id:
                  message.project_id,
                isCoach: true,
              })
            )

          // ------------------------------------------------------
          // COMBINE EVERYTHING
          // ------------------------------------------------------

          const combinedMessages: ChatMessage[] = [
            ...((projectMessages ??
              []) as ChatMessage[]),
            ...normalizedCoachMessages,
          ]

          // ------------------------------------------------------
          // SORT CHRONOLOGICALLY
          // ------------------------------------------------------

          const sortedMessages =
            sortMessages(
              combinedMessages
            )

          setMessages(sortedMessages)
        } finally {
          fetchingMessages.current = false
        }
      },
      []
    )

  // ============================================================
  // LOAD DIRECT MESSAGES
  // ============================================================

  const loadDirectMessages =
    useCallback(
      async (convId: string) => {
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

          if (!data) {
            return
          }

          setMessages(
            data as ChatMessage[]
          )
        } finally {
          fetchingMessages.current = false
        }
      },
      []
    )

  // ============================================================
  // ASK CAMPUSLEGACY COACH
  // ============================================================

  const askCoach = useCallback(
    async (
      question: string,
      projectId: string
    ): Promise<string> => {
      try {
        // ======================================================
        // GET TASKS
        // ======================================================

        const {
          data: tasks,
          error: taskError,
        } = await supabase
          .from("project_tasks")
          .select(`
            id,
            title,
            description,
            status,
            priority,
            assigned_to,
            due_date
          `)
          .eq("project_id", projectId)
          .neq("status", "cancelled")
          .order("created_at", {
            ascending: true,
          })

        if (taskError) {
          console.error(
            "⚠️ Coach task context error:",
            taskError
          )
        }

        // ======================================================
        // RECENT CHAT
        // ======================================================

        const recentMessages = messages
  .slice(-20)
  .map((message) => ({
    sender: message.isCoach
      ? "CampusLegacy Coach"
      : message.sender_id === currentUserId
        ? "You"
        : "Teammate",
    content: message.content,
  }))

        // ======================================================
        // ASK AI
        // ======================================================

        const response =
          await fetch(
            "/api/coach-chat",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                projectId,

                projectTitle:
                  groupInfo?.title ||
                  "Project",

                tasks: tasks || [],

                recentMessages,

                question,
              }),
            }
          )

        const result =
          await response.json()

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Coach request failed"
          )
        }

        // ======================================================
        // EXECUTE COACH ACTION
        // ======================================================

        const action =
          result?.action

        // ======================================================
        // CREATE TASK
        // ======================================================

        if (
          action?.type ===
          "create_task"
        ) {
          const {
            error: createError,
          } = await supabase
            .from("project_tasks")
            .insert({
              project_id:
                projectId,

              title:
                action.title,

              description:
                action.description ||
                null,

              status: "todo",

              priority:
                action.priority ||
                "medium",

              created_by:
                currentUserId,
            })

          if (createError) {
            console.error(
              "❌ Coach task creation failed:",
              createError
            )

            return (
              result.reply +
              "\n\n⚠️ I couldn't create the task because the database rejected the request."
            )
          }

          void runCollaborationCoach(
            projectId
          )

          return (
            result.reply +
            "\n\n✅ Task added to the project."
          )
        }

        // ======================================================
        // COMPLETE TASK
        // ======================================================

        if (
          action?.type ===
          "complete_task"
        ) {
          const {
            data: existingTask,
            error: lookupError,
          } = await supabase
            .from("project_tasks")
            .select(
              "id, title"
            )
            .eq(
              "id",
              action.task_id
            )
            .eq(
              "project_id",
              projectId
            )
            .maybeSingle()

          if (lookupError) {
            console.error(
              "❌ Coach task lookup failed:",
              lookupError
            )

            return result.reply
          }

          if (!existingTask) {
            return (
              result.reply +
              "\n\n⚠️ I couldn't find that task in this project."
            )
          }

          const {
            error: updateError,
          } = await supabase
            .from("project_tasks")
            .update({
              status:
                "completed",
              completed_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              action.task_id
            )
            .eq(
              "project_id",
              projectId
            )

          if (updateError) {
            console.error(
              "❌ Coach task completion failed:",
              updateError
            )

            return (
              result.reply +
              "\n\n⚠️ I couldn't update that task."
            )
          }

          void runCollaborationCoach(
            projectId
          )

          return (
            result.reply +
            "\n\n✅ Task marked as completed."
          )
        }

        // ======================================================
        // NORMAL RESPONSE
        // ======================================================

        return (
          result.reply ||
          "I couldn't generate a response right now."
        )
      } catch (error) {
        console.error(
          "❌ Coach request failed:",
          error
        )

        return "I'm having trouble accessing the project context right now. Please try again."
      }
    },
    [
      messages,
      currentUserId,
      groupInfo,
    ]
  )

  // ============================================================
  // INITIALIZE CHAT
  // ============================================================

  useEffect(() => {
    let mounted = true

    let pollingInterval:
      | ReturnType<typeof setInterval>
      | null = null

    let coachInterval:
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

        const projectConversationId =
          `project-${projectId}`

        setConversationId(
          projectConversationId
        )

        // ------------------------------------------------------
        // Load project + Coach history
        // ------------------------------------------------------

        await loadProjectMessages(
          projectId
        )

        if (!mounted) {
          return
        }

        setLoading(false)

        // ------------------------------------------------------
        // Poll messages
        // ------------------------------------------------------

        pollingInterval =
          setInterval(() => {
            if (!mounted) return

            void loadProjectMessages(
              projectId
            )
          }, 1500)

        // ------------------------------------------------------
        // Initial proactive coach run
        // ------------------------------------------------------

        void runCollaborationCoach(
          projectId
        )

        // ------------------------------------------------------
        // Proactive Coach polling
        // ------------------------------------------------------

        coachInterval =
          setInterval(() => {
            if (!mounted) return

            void runCollaborationCoach(
              projectId
            )
          }, 30000)

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

      if (!mounted) {
        return
      }

      let convId =
        existingConversation?.id

      // --------------------------------------------------------
      // Create conversation if necessary
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

      if (
        !convId ||
        !mounted
      ) {
        if (mounted) {
          setLoading(false)
        }

        return
      }

      setConversationId(convId)

      // --------------------------------------------------------
      // Initial message load
      // --------------------------------------------------------

      await loadDirectMessages(
        convId
      )

      if (!mounted) {
        return
      }

      setLoading(false)

      // --------------------------------------------------------
      // Direct-message polling
      // --------------------------------------------------------

      pollingInterval =
        setInterval(() => {
          if (!mounted) return

          void loadDirectMessages(
            convId!
          )
        }, 1500)
    }

    void initChat()

    return () => {
      mounted = false

      if (pollingInterval) {
        clearInterval(
          pollingInterval
        )

        pollingInterval = null
      }

      if (coachInterval) {
        clearInterval(
          coachInterval
        )

        coachInterval = null
      }
    }
  }, [
    contactId,
    isGroupChat,
    loadProjectMessages,
    loadDirectMessages,
  ])

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
      sending ||
      !currentUserId
    ) {
      return
    }

    setSending(true)

    const tempId =
      `temp-${crypto.randomUUID()}`

    // ==========================================================
    // GROUP MESSAGE
    // ==========================================================

    if (isGroupChat) {
      const projectId =
        getProjectId(contactId)

      const optimisticMessage:
        ChatMessage = {
          id: tempId,

          project_id:
            projectId,

          sender_id:
            currentUserId,

          content,

          created_at:
            new Date().toISOString(),
        }

      // --------------------------------------------------------
      // Immediate UI
      // --------------------------------------------------------

      setMessages(
        (previous) =>
          sortMessages([
            ...previous,
            optimisticMessage,
          ])
      )

      setInput("")

      // --------------------------------------------------------
      // Save actual project message
      // --------------------------------------------------------

      const {
        data: insertedMessage,
        error,
      } = await supabase
        .from("project_messages")
        .insert({
          project_id:
            projectId,

          sender_id:
            currentUserId,

          content,
        })
        .select("*")
        .single()

      if (error) {
        console.error(
          "❌ Failed to send project message:",
          error
        )

        setMessages(
          (previous) =>
            previous.filter(
              (message) =>
                message.id !==
                tempId
            )
        )

        setSending(false)

        return
      }

      // --------------------------------------------------------
      // Replace optimistic message
      // --------------------------------------------------------

      if (insertedMessage) {
        setMessages(
          (previous) =>
            sortMessages(
              previous.map(
                (message) =>
                  message.id ===
                  tempId
                    ? (insertedMessage as ChatMessage)
                    : message
              )
            )
        )

        // ======================================================
        // COLLABORATION EVENT
        // ======================================================

        try {
          await logCollaborationEvent({
            projectId,

            userId:
              currentUserId,

            eventType:
              "message_sent",

            entityType:
              "message",

            entityId:
              insertedMessage.id,

            metadata: {
              content_length:
                content.length,
            },
          })
        } catch (error) {
          console.error(
            "⚠️ Collaboration event logging failed:",
            error
          )
        }

        // ======================================================
        // BACKGROUND MESSAGE ANALYSIS
        // ======================================================

        fetch(
          "/api/analyze-message",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              messageId:
                insertedMessage.id,

              projectId,

              senderId:
                currentUserId,

              content,

              previousMessages:
                messages
                  .filter(
                    (message) =>
                      !message.isCoach
                  )
                  .slice(-5)
                  .map(
                    (message) => ({
                      sender_name:
                        message.sender_id ===
                        currentUserId
                          ? "You"
                          : "Teammate",

                      content:
                        message.content,
                    })
                  ),
            }),
          }
        ).catch((error) => {
          console.error(
            "⚠️ Background analysis trigger failed:",
            error
          )
        })
      }

      // ========================================================
      // PROACTIVE COACH
      // ========================================================

      void runCollaborationCoach(
        projectId
      )

      // ========================================================
      // CONVERSATIONAL COACH
      // ========================================================

      if (
        isCoachRequest(content)
      ) {
        const question =
          cleanCoachQuestion(
            content
          ) ||
          "What should our team focus on right now?"

        const thinkingId =
          `coach-thinking-${crypto.randomUUID()}`

        // ------------------------------------------------------
        // Show thinking state
        // ------------------------------------------------------

        setMessages(
          (previous) =>
            sortMessages([
              ...previous,
              {
                id: thinkingId,

                sender_id:
                  "campuslegacy-coach",

                project_id:
                  projectId,

                content:
                  "I'm checking the project context...",

                created_at:
                  new Date().toISOString(),

                isCoach: true,
              },
            ])
        )

        // ------------------------------------------------------
        // Ask AI
        // ------------------------------------------------------

        const reply =
          await askCoach(
            question,
            projectId
          )

        // ------------------------------------------------------
        // SAVE COACH RESPONSE
        // ------------------------------------------------------

        const {
          data: savedCoachMessage,
          error: coachSaveError,
        } = await supabase
          .from("coach_messages")
          .insert({
            project_id:
              projectId,

            content:
              reply,
          })
          .select("*")
          .single()

        if (coachSaveError) {
          console.error(
            "❌ Failed to save Coach message:",
            coachSaveError
          )

          // Keep it visible even if DB persistence fails.
          setMessages(
            (previous) =>
              sortMessages(
                previous.map(
                  (message) =>
                    message.id ===
                    thinkingId
                      ? {
                          ...message,

                          content:
                            reply,

                          created_at:
                            new Date().toISOString(),
                        }
                      : message
                )
              )
          )
        } else if (savedCoachMessage) {
          // ----------------------------------------------------
          // Replace thinking state with persisted message
          // ----------------------------------------------------

          const persistedCoachMessage:
            ChatMessage = {
              id:
                savedCoachMessage.id,

              sender_id:
                "campuslegacy-coach",

              project_id:
                projectId,

              content:
                savedCoachMessage.content,

              created_at:
                savedCoachMessage.created_at,

              isCoach: true,
            }

          setMessages(
            (previous) =>
              sortMessages(
                previous.map(
                  (message) =>
                    message.id ===
                    thinkingId
                      ? persistedCoachMessage
                      : message
                )
              )
          )
        }
      }

      setSending(false)

      return
    }

    // ==========================================================
    // ONE-TO-ONE MESSAGE
    // ==========================================================

    const optimisticMessage:
      ChatMessage = {
        id: tempId,

        conversation_id:
          conversationId,

        sender_id:
          currentUserId,

        content,

        created_at:
          new Date().toISOString(),
      }

    // ----------------------------------------------------------
    // Immediate UI
    // ----------------------------------------------------------

    setMessages(
      (previous) =>
        sortMessages([
          ...previous,
          optimisticMessage,
        ])
    )

    setInput("")

    // ----------------------------------------------------------
    // Save direct message
    // ----------------------------------------------------------

    const {
      data: insertedMessage,
      error,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id:
          conversationId,

        sender_id:
          currentUserId,

        content,
      })
      .select("*")
      .single()

    if (error) {
      console.error(
        "❌ Failed to send message:",
        error
      )

      setMessages(
        (previous) =>
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
      setMessages(
        (previous) =>
          sortMessages(
            previous.map(
              (message) =>
                message.id ===
                tempId
                  ? (insertedMessage as ChatMessage)
                  : message
            )
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
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      {/* ======================================================
          HEADER
      ======================================================= */}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#22393c]/5 glass-button glass-neutral px-4 py-3">
        {/* Back */}
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22393c]/5 text-[#22393c] transition-transform hover:scale-105"
        >
          <ArrowLeft
            className="size-4"
            strokeWidth={2}
          />
        </button>

        {/* ====================================================
            GROUP HEADER
        ===================================================== */}

        {isGroupChat ? (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-white shadow-sm">
              <Users
                className="size-5"
                strokeWidth={2}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold leading-tight">
                {groupInfo?.title ||
                  "Project Group"}
              </h1>

              <p className="truncate text-[10px] text-[#668184]">
                {groupInfo &&
                groupInfo.members.length >
                  0
                  ? groupInfo.members.join(
                      ", "
                    )
                  : "Loading members..."}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* ==================================================
                DIRECT HEADER
            ================================================== */}

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-xs font-bold text-white">
              {contactName
                .split(" ")
                .map(
                  (name) =>
                    name[0]
                )
                .join("")
                .substring(
                  0,
                  2
                )
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold leading-tight">
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
          MESSAGE AREA
      ======================================================= */}

      <main className="relative flex-1 space-y-4 overflow-y-auto px-4 py-6 pb-44">
        {/* ----------------------------------------------------
            Messages
        ----------------------------------------------------- */}

        {messages.length > 0 ? (
          messages.map(
            (
              message,
              index
            ) =>
              message.isCoach ? (
                <CoachMessage
                  key={message.id}
                  message={message}
                />
              ) : (
                <UserMessage
                  key={message.id}
                  message={message}
                  currentUserId={
                    currentUserId
                  }
                  index={index}
                />
              )
          )
        ) : (
          /* --------------------------------------------------
             Empty state
          --------------------------------------------------- */

          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#22393c]/5">
                {isGroupChat ? (
                  <Users className="size-5 text-[#668184]" />
                ) : (
                  <div className="text-sm font-bold text-[#668184]">
                    {contactName
                      .split(" ")
                      .map(
                        (name) =>
                          name[0]
                      )
                      .join("")
                      .substring(
                        0,
                        2
                      )
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <p className="text-sm font-semibold text-[#22393c]">
                {isGroupChat
                  ? "Start the project conversation"
                  : `Start a conversation with ${contactName}`}
              </p>

              <p className="mt-1 text-xs text-[#668184]">
                {isGroupChat
                  ? "Messages from your project team will appear here."
                  : "Send a message to get started."}
              </p>
            </div>
          </div>
        )}

        {/* ====================================================
            PROACTIVE CAMPUSLEGACY COACH
        ===================================================== */}

        {isGroupChat && (
          <CollaborationCoach
            projectId={getProjectId(
              contactId
            )}
          />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </main>

      {/* ======================================================
          MESSAGE INPUT
      ======================================================= */}

      <div className="fixed bottom-20 left-0 right-0 z-30 px-4 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">
        <form
          onSubmit={
            handleSend
          }
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
              isGroupChat
                ? "Message group..."
                : "Type a message..."
            }
            disabled={sending}
            className="flex-1 bg-transparent px-2 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              !input.trim() ||
              !conversationId ||
              sending
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22393c] text-white transition-all hover:scale-105 disabled:opacity-50"
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

        {/* ----------------------------------------------------
            Small Coach hint for group chats
        ----------------------------------------------------- */}

        {isGroupChat && (
          <p className="mt-1 text-center text-[9px] text-[#668184]/80">
            Tip: say{" "}
            <span className="font-semibold">
              "Hey Coach"
            </span>{" "}
            to ask about your project
          </p>
        )}
      </div>
    </div>
  )
}
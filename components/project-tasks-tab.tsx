"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Loader2,
  Plus,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { logCollaborationEvent } from "@/lib/collaboration-events"

type TaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled"

type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "critical"

type TeamMember = {
  id: string
  person_id: string | null
  role: string | null
  people?: {
    id: string
    full_name: string | null
  } | null
}

type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  assignee?: {
    id: string
    full_name: string | null
  } | null
}

interface ProjectTasksTabProps {
  projectId: string
  currentUserId: string
  isOwner: boolean
  teamMembers: TeamMember[]
}

const STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string
    icon: typeof Circle
    className: string
  }
> = {
  todo: {
    label: "To Do",
    icon: Circle,
    className: "bg-[#22393c]/10 text-[#22393c]",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "bg-[#8a9a7b]/20 text-[#536343]",
  },
  blocked: {
    label: "Blocked",
    icon: AlertCircle,
    className: "bg-red-100 text-red-700",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700",
  },
  cancelled: {
    label: "Cancelled",
    icon: X,
    className: "bg-gray-100 text-gray-500",
  },
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string
    className: string
  }
> = {
  low: {
    label: "Low",
    className: "bg-[#22393c]/5 text-[#668184]",
  },
  medium: {
    label: "Medium",
    className: "bg-[#8a9a7b]/15 text-[#536343]",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700",
  },
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-700",
  },
}

function getInitials(name?: string | null) {
  if (!name) return "?"

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatDueDate(date?: string | null) {
  if (!date) return null

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function isOverdue(task: Task) {
  if (!task.due_date) return false
  if (task.status === "completed") return false

  return new Date(task.due_date).getTime() < Date.now()
}

function TaskModal({
  projectId,
  currentUserId,
  teamMembers,
  onClose,
  onCreated,
}: {
  projectId: string
  currentUserId: string
  teamMembers: TeamMember[]
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] =
    useState<TaskPriority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Task title is required.")
      return
    }

    setLoading(true)

    try {
      const { data: task, error } = await supabase
        .from("project_tasks")
        .insert({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          assigned_to: assignedTo || null,
          priority,
          due_date: dueDate
            ? new Date(`${dueDate}T23:59:59`).toISOString()
            : null,
          status: "todo",
          created_by: currentUserId,
        })
        .select("*")
        .single()

      if (error) {
        throw error
      }

      await logCollaborationEvent({
        projectId,
        userId: currentUserId,
        eventType: "task_created",
        entityType: "task",
        entityId: task.id,
        metadata: {
          title: task.title,
          priority: task.priority,
          assigned_to: task.assigned_to,
        },
      })

      toast.success("Task created.")
      onCreated()
      onClose()
    } catch (error: any) {
      console.error("[Tasks] Create error:", error)

      toast.error(
        error?.message || "Couldn't create the task."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#22393c]/30 p-5 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg rounded-3xl bg-[#f4f5f3] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#22393c]">
              Create Task
            </h3>

            <p className="mt-1 text-xs text-[#668184]">
              Give the team something concrete to move forward.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22393c]/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#668184]">
              Task
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Supabase authentication"
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[#8a9a7b]"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#668184]">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              rows={3}
              className="w-full resize-none rounded-2xl border border-[#22393c]/10 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[#8a9a7b]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#668184]">
                Assign To
              </label>

              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-2xl border border-[#22393c]/10 bg-white/70 px-4 py-3 text-sm outline-none"
              >
                <option value="">Unassigned</option>

                {teamMembers.map((member) => (
                  <option
                    key={member.person_id || member.id}
                    value={member.person_id || ""}
                  >
                    {member.people?.full_name || "Unknown"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#668184]">
                Priority
              </label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as TaskPriority)
                }
                className="w-full rounded-2xl border border-[#22393c]/10 bg-white/70 px-4 py-3 text-sm outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#668184]">
              Due Date
            </label>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/70 px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-[#22393c]/10 py-3 text-sm font-semibold text-[#22393c]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22393c] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}

            {loading ? "Creating..." : "Create Task"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function ProjectTasksTab({
  projectId,
  currentUserId,
  isOwner,
  teamMembers,
}: ProjectTasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] =
    useState<"all" | TaskStatus>("all")
  const [updatingTask, setUpdatingTask] =
    useState<string | null>(null)

  const fetchTasks = async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          id,
          project_id,
          title,
          description,
          assigned_to,
          status,
          priority,
          due_date,
          completed_at,
          created_by,
          created_at,
          updated_at,
          assignee:people!project_tasks_assignee_fkey (
            id,
            full_name
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        })

      if (error) {
        throw error
      }

      setTasks((data || []) as Task[])
    } catch (error: any) {
      console.error("[Tasks] Fetch error:", error)

      toast.error(
        error?.message || "Couldn't load project tasks."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks

    return tasks.filter(
      (task) => task.status === filter
    )
  }, [tasks, filter])

  const stats = useMemo(() => {
    const total = tasks.length

    const completed = tasks.filter(
      (task) => task.status === "completed"
    ).length

    const inProgress = tasks.filter(
      (task) => task.status === "in_progress"
    ).length

    const blocked = tasks.filter(
      (task) => task.status === "blocked"
    ).length

    const todo = tasks.filter(
      (task) => task.status === "todo"
    ).length

    const progress =
      total === 0
        ? 0
        : Math.round((completed / total) * 100)

    return {
      total,
      completed,
      inProgress,
      blocked,
      todo,
      progress,
    }
  }, [tasks])

  const updateTaskStatus = async (
    task: Task,
    status: TaskStatus
  ) => {
    if (task.status === status) return

    setUpdatingTask(task.id)

    try {
      const updates: Record<string, any> = {
        status,
      }

      if (status === "completed") {
        updates.completed_at =
          new Date().toISOString()
      } else {
        updates.completed_at = null
      }

      const { error } = await supabase
        .from("project_tasks")
        .update(updates)
        .eq("id", task.id)

      if (error) {
        throw error
      }

      if (status === "completed") {
        await logCollaborationEvent({
          projectId,
          userId: currentUserId,
          eventType: "task_completed",
          entityType: "task",
          entityId: task.id,
          metadata: {
            title: task.title,
          },
        })
      }

      if (status === "blocked") {
        await logCollaborationEvent({
          projectId,
          userId: currentUserId,
          eventType: "task_blocked",
          entityType: "task",
          entityId: task.id,
          metadata: {
            title: task.title,
          },
        })
      }

      if (
        task.status === "completed" &&
        status !== "completed"
      ) {
        await logCollaborationEvent({
          projectId,
          userId: currentUserId,
          eventType: "task_reopened",
          entityType: "task",
          entityId: task.id,
          metadata: {
            title: task.title,
            new_status: status,
          },
        })
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status,
                completed_at:
                  status === "completed"
                    ? new Date().toISOString()
                    : null,
              }
            : item
        )
      )

      const message =
        status === "completed"
          ? "Task completed."
          : status === "blocked"
            ? "Task marked as blocked."
            : status === "in_progress"
              ? "Task moved to in progress."
              : "Task updated."

      toast.success(message)
    } catch (error: any) {
      console.error(
        "[Tasks] Status update error:",
        error
      )

      toast.error(
        error?.message ||
          "Couldn't update the task."
      )
    } finally {
      setUpdatingTask(null)
    }
  }

  const deleteTask = async (task: Task) => {
    if (
      !confirm(
        `Delete "${task.title}"? This cannot be undone.`
      )
    ) {
      return
    }

    setUpdatingTask(task.id)

    try {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", task.id)

      if (error) {
        throw error
      }

      setTasks((current) =>
        current.filter(
          (item) => item.id !== task.id
        )
      )

      toast.success("Task deleted.")
    } catch (error: any) {
      console.error(
        "[Tasks] Delete error:",
        error
      )

      toast.error(
        error?.message ||
          "Couldn't delete the task."
      )
    } finally {
      setUpdatingTask(null)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-[#8a9a7b]" />

            <h2 className="text-xl font-bold">
              Project Tasks
            </h2>
          </div>

          <p className="mt-1 text-sm text-[#668184]">
            Turn project goals into concrete work.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex shrink-0 items-center gap-2 rounded-full bg-[#22393c] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-[1.02]"
        >
          <Plus className="size-4" />
          New Task
        </button>
      </div>

      {/* Progress */}
      <div className="mb-6 rounded-3xl bg-[#22393c] p-5 text-white shadow-sm">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Project Progress
            </p>

            <p className="mt-1 text-3xl font-bold">
              {stats.progress}%
            </p>
          </div>

          <p className="text-xs text-white/60">
            {stats.completed} of {stats.total} completed
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${stats.progress}%`,
            }}
            className="h-full rounded-full bg-[#8a9a7b]"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-2xl p-4 text-left transition ${
            filter === "all"
              ? "bg-[#22393c] text-white"
              : "glass-button glass-neutral"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Total
          </p>
          <p className="mt-1 text-2xl font-bold">
            {stats.total}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("todo")}
          className={`rounded-2xl p-4 text-left transition ${
            filter === "todo"
              ? "bg-[#22393c] text-white"
              : "glass-button glass-neutral"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            To Do
          </p>
          <p className="mt-1 text-2xl font-bold">
            {stats.todo}
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter("in_progress")
          }
          className={`rounded-2xl p-4 text-left transition ${
            filter === "in_progress"
              ? "bg-[#22393c] text-white"
              : "glass-button glass-neutral"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Active
          </p>
          <p className="mt-1 text-2xl font-bold">
            {stats.inProgress}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("blocked")}
          className={`rounded-2xl p-4 text-left transition ${
            filter === "blocked"
              ? "bg-red-600 text-white"
              : "glass-button glass-neutral"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Blocked
          </p>
          <p className="mt-1 text-2xl font-bold">
            {stats.blocked}
          </p>
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#668184]">
          {filter === "all"
            ? "All Tasks"
            : STATUS_CONFIG[filter].label}
        </h3>

        {filter !== "all" && (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="text-xs font-semibold text-[#8a9a7b]"
          >
            Show all
          </button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl glass-button glass-neutral">
          <Loader2 className="size-7 animate-spin text-[#668184]" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#22393c]/15 bg-white/30 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#8a9a7b]/15">
            <CheckCircle2 className="size-6 text-[#8a9a7b]" />
          </div>

          <h3 className="font-semibold">
            {filter === "all"
              ? "No tasks yet"
              : "No tasks here"}
          </h3>

          <p className="mx-auto mt-1 max-w-sm text-xs text-[#668184]">
            {filter === "all"
              ? "Create your first task to start tracking project progress."
              : "There are no tasks matching this status."}
          </p>

          {filter === "all" && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-5 rounded-full bg-[#22393c] px-5 py-2.5 text-xs font-bold text-white"
            >
              <Plus className="mr-1 inline size-3" />
              Create Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => {
              const status =
                STATUS_CONFIG[task.status]

              const priority =
                PRIORITY_CONFIG[task.priority]

              const StatusIcon = status.icon

              const overdue = isOverdue(task)

              const isUpdating =
                updatingTask === task.id

              return (
                <motion.article
                  key={task.id}
                  layout
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.98,
                  }}
                  className="glass-button glass-neutral rounded-3xl p-5"
                >
                  <div className="flex gap-4">
                    {/* Status button */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        updateTaskStatus(
                          task,
                          task.status === "completed"
                            ? "todo"
                            : "completed"
                        )
                      }
                      className="mt-0.5 shrink-0"
                      title={
                        task.status === "completed"
                          ? "Reopen task"
                          : "Mark complete"
                      }
                    >
                      {isUpdating ? (
                        <Loader2 className="size-5 animate-spin text-[#8a9a7b]" />
                      ) : (
                        <StatusIcon
                          className={`size-5 ${
                            task.status === "completed"
                              ? "text-green-600"
                              : task.status === "blocked"
                                ? "text-red-600"
                                : "text-[#8a9a7b]"
                          }`}
                        />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h4
                            className={`text-sm font-bold ${
                              task.status ===
                              "completed"
                                ? "text-[#668184] line-through"
                                : ""
                            }`}
                          >
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="mt-1 text-xs leading-relaxed text-[#668184]">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${status.className}`}
                          >
                            {status.label}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${priority.className}`}
                          >
                            {priority.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {/* Assignee */}
                        {task.assignee?.full_name ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#668184]">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8a9a7b] text-[8px] font-bold text-white">
                              {getInitials(
                                task.assignee.full_name
                              )}
                            </span>

                            <span>
                              {task.assignee.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-[#668184]">
                            <User className="size-3" />
                            Unassigned
                          </span>
                        )}

                        {/* Due date */}
                        {task.due_date && (
                          <span
                            className={`flex items-center gap-1 text-[10px] ${
                              overdue
                                ? "font-bold text-red-600"
                                : "text-[#668184]"
                            }`}
                          >
                            <Calendar className="size-3" />

                            {overdue
                              ? "Overdue · "
                              : ""}

                            {formatDueDate(
                              task.due_date
                            )}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#22393c]/5 pt-3">
                        {task.status !==
                          "in_progress" &&
                          task.status !==
                            "completed" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                updateTaskStatus(
                                  task,
                                  "in_progress"
                                )
                              }
                              className="rounded-full bg-[#8a9a7b]/15 px-3 py-1.5 text-[10px] font-semibold text-[#536343]"
                            >
                              Start
                            </button>
                          )}

                        {task.status !==
                          "blocked" &&
                          task.status !==
                            "completed" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                updateTaskStatus(
                                  task,
                                  "blocked"
                                )
                              }
                              className="rounded-full bg-red-100 px-3 py-1.5 text-[10px] font-semibold text-red-700"
                            >
                              Block
                            </button>
                          )}

                        {task.status === "blocked" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              updateTaskStatus(
                                task,
                                "in_progress"
                              )
                            }
                            className="rounded-full bg-[#22393c]/10 px-3 py-1.5 text-[10px] font-semibold"
                          >
                            Unblock
                          </button>
                        )}

                        {isOwner && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              deleteTask(task)
                            }
                            className="ml-auto rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-semibold text-red-600"
                          >
                            <Trash2 className="mr-1 inline size-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showCreate && (
          <TaskModal
            projectId={projectId}
            currentUserId={currentUserId}
            teamMembers={teamMembers}
            onClose={() => setShowCreate(false)}
            onCreated={fetchTasks}
          />
        )}
      </AnimatePresence>
    </motion.section>
  )
}
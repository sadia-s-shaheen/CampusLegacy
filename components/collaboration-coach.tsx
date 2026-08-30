"use client"

import { useEffect, useState } from "react"
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"

type Intervention = {
  id: string
  project_id: string
  intervention_type: string
  title: string
  message: string
  severity: string
  trigger_data: Record<string, any> | null
  target_user_id: string | null
  is_dismissed: boolean
  is_actioned: boolean
  created_at: string
  dismissed_at: string | null
  actioned_at: string | null
}

type CollaborationCoachProps = {
  projectId: string
}

export function CollaborationCoach({
  projectId,
}: CollaborationCoachProps) {
  const [interventions, setInterventions] =
    useState<Intervention[]>([])

  const [expanded, setExpanded] =
    useState(true)

  const [loading, setLoading] =
    useState(true)

  const [processingId, setProcessingId] =
    useState<string | null>(null)

  // ============================================================
  // FETCH INTERVENTIONS
  // ============================================================

  const fetchInterventions = async () => {
    if (!projectId) return

    const {
      data,
      error,
    } = await supabase
      .from("ai_interventions")
      .select(`
        id,
        project_id,
        intervention_type,
        title,
        message,
        severity,
        trigger_data,
        target_user_id,
        is_dismissed,
        is_actioned,
        created_at,
        dismissed_at,
        actioned_at
      `)
      .eq("project_id", projectId)
      .eq("is_dismissed", false)
      .eq("is_actioned", false)
      .order("created_at", {
        ascending: false,
      })
      .limit(10)

    if (error) {
      console.error(
        "[Collaboration Coach] Fetch error:",
        error
      )
      return
    }

    setInterventions(
      (data || []) as Intervention[]
    )
  }

  // ============================================================
  // POLLING
  //
  // NO postgres_changes.
  // This avoids the Supabase realtime subscription error.
  // ============================================================

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!mounted) return

      await fetchInterventions()

      if (mounted) {
        setLoading(false)
      }
    }

    void load()

    const interval = setInterval(() => {
      if (!mounted) return

      void fetchInterventions()
    }, 3000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [projectId])

  // ============================================================
  // DISMISS
  // ============================================================

  const handleDismiss = async (
    interventionId: string
  ) => {
    setProcessingId(interventionId)

    const {
      error,
    } = await supabase
      .from("ai_interventions")
      .update({
        is_dismissed: true,
        dismissed_at:
          new Date().toISOString(),
      })
      .eq("id", interventionId)

    if (error) {
      console.error(
        "[Collaboration Coach] Dismiss error:",
        error
      )

      setProcessingId(null)
      return
    }

    setInterventions(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !== interventionId
        )
    )

    setProcessingId(null)
  }

  // ============================================================
  // MARK AS ACTIONED
  // ============================================================

  const handleAction = async (
    interventionId: string
  ) => {
    setProcessingId(interventionId)

    const {
      error,
    } = await supabase
      .from("ai_interventions")
      .update({
        is_actioned: true,
        actioned_at:
          new Date().toISOString(),
      })
      .eq("id", interventionId)

    if (error) {
      console.error(
        "[Collaboration Coach] Action error:",
        error
      )

      setProcessingId(null)
      return
    }

    setInterventions(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !== interventionId
        )
    )

    setProcessingId(null)
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return null
  }

  // ============================================================
  // NOTHING TO SHOW
  // ============================================================

  if (interventions.length === 0) {
    return null
  }

  // ============================================================
  // HELPERS
  // ============================================================

  const getSeverityIcon = (
    severity: string
  ) => {
    if (severity === "high") {
      return (
        <AlertTriangle className="size-4" />
      )
    }

    if (severity === "medium") {
      return (
        <Clock className="size-4" />
      )
    }

    return (
      <Bot className="size-4" />
    )
  }

  const getSeverityLabel = (
    severity: string
  ) => {
    switch (severity) {
      case "high":
        return "Important"

      case "medium":
        return "Suggestion"

      case "low":
        return "Tip"

      default:
        return "Coach"
    }
  }

  const getSeverityClasses = (
    severity: string
  ) => {
    switch (severity) {
      case "high":
        return "bg-[#8f5f5f]/10 border-[#8f5f5f]/20 text-[#7d4f4f]"

      case "medium":
        return "bg-[#9a8560]/10 border-[#9a8560]/20 text-[#75633f]"

      default:
        return "bg-[#668184]/10 border-[#668184]/20 text-[#506a6d]"
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="w-full px-1 py-2">

      {/* ======================================================
          COACH HEADER
      ======================================================= */}

      <button
        type="button"
        onClick={() =>
          setExpanded(
            (previous) => !previous
          )
        }
        className="glass-button glass-neutral flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-sm"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22393c] text-white">
          <Bot
            className="size-4"
            strokeWidth={2}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#22393c]">
              Collaboration Coach
            </span>

            <span className="rounded-full bg-[#22393c]/10 px-2 py-0.5 text-[9px] font-semibold text-[#668184]">
              AI
            </span>
          </div>

          <p className="mt-0.5 text-[10px] text-[#668184]">
            {interventions.length === 1
              ? "1 thing worth your team's attention"
              : `${interventions.length} things worth your team's attention`}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="size-4 shrink-0 text-[#668184]" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-[#668184]" />
        )}
      </button>

      {/* ======================================================
          INTERVENTIONS
      ======================================================= */}

      {expanded && (
        <div className="mt-2 space-y-2">
          {interventions.map(
            (intervention) => {
              const severityClasses =
                getSeverityClasses(
                  intervention.severity
                )

              const isProcessing =
                processingId ===
                intervention.id

              return (
                <div
                  key={intervention.id}
                  className={`relative rounded-2xl border p-4 shadow-sm ${severityClasses}`}
                >
                  {/* ------------------------------------------------
                      TOP ROW
                  ------------------------------------------------- */}

                  <div className="flex items-start gap-3">

                    <div className="mt-0.5 shrink-0">
                      {getSeverityIcon(
                        intervention.severity
                      )}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-2">

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                            {getSeverityLabel(
                              intervention.severity
                            )}
                          </p>

                          <h3 className="mt-0.5 text-sm font-semibold">
                            {intervention.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleDismiss(
                              intervention.id
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 disabled:opacity-50"
                          aria-label="Dismiss"
                        >
                          {isProcessing ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <X className="size-3" />
                          )}
                        </button>
                      </div>

                      {/* ------------------------------------------------
                          MESSAGE
                      ------------------------------------------------- */}

                      <p className="mt-2 text-xs leading-relaxed opacity-85">
                        {intervention.message}
                      </p>

                      {/* ------------------------------------------------
                          ACTIONS
                      ------------------------------------------------- */}

                      <div className="mt-3 flex items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            handleAction(
                              intervention.id
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#22393c] px-3 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}

                          Mark as handled
                        </button>

                        <span className="text-[9px] opacity-50">
                          {new Date(
                            intervention.created_at
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          )}
        </div>
      )}
    </div>
  )
}
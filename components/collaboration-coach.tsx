"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, Loader2 } from "lucide-react"
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

export function CollaborationCoach({ projectId }: { projectId: string }) {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchInterventions = async () => {
    if (!projectId) return

    const { data, error } = await supabase
      .from("ai_interventions")
      .select(`
        id, project_id, intervention_type, title, message, severity,
        trigger_data, target_user_id, is_dismissed, is_actioned,
        created_at, dismissed_at, actioned_at
      `)
      .eq("project_id", projectId)
      .eq("is_dismissed", false)
      .eq("is_actioned", false)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("[Collaboration Coach] Fetch error:", error)
      return
    }

    setInterventions((data || []) as Intervention[])
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!mounted) return
      await fetchInterventions()
      if (mounted) setLoading(false)
    }

    void load()

    const interval = setInterval(() => {
      if (!mounted) return
      void fetchInterventions()
    }, 15000) // Poll every 15 seconds for new suggestions

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [projectId])

  const handleDismiss = async (interventionId: string) => {
    setProcessingId(interventionId)
    const { error } = await supabase
      .from("ai_interventions")
      .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
      .eq("id", interventionId)

    if (error) {
      console.error("[Collaboration Coach] Dismiss error:", error)
      setProcessingId(null)
      return
    }

    setInterventions((previous) => previous.filter((item) => item.id !== interventionId))
    setProcessingId(null)
  }

  const handleAction = async (interventionId: string) => {
    setProcessingId(interventionId)
    const { error } = await supabase
      .from("ai_interventions")
      .update({ is_actioned: true, actioned_at: new Date().toISOString() })
      .eq("id", interventionId)

    if (error) {
      console.error("[Collaboration Coach] Action error:", error)
      setProcessingId(null)
      return
    }

    setInterventions((previous) => previous.filter((item) => item.id !== interventionId))
    setProcessingId(null)
  }

  if (loading) return null
  if (interventions.length === 0) return null

  const getSeverityIcon = (severity: string) => {
    if (severity === "high") return <X className="size-4 text-red-500" /> // Using X or AlertTriangle based on preference
    if (severity === "medium") return <Sparkles className="size-4 text-[#c99a5b]" />
    return <Sparkles className="size-4 text-[#668184]" />
  }

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-50/80 border-red-200 text-red-800"
      case "medium": return "bg-[#c99a5b]/10 border-[#c99a5b]/20 text-[#75633f]"
      default: return "bg-[#668184]/10 border-[#668184]/20 text-[#506a6d]"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className="glass-button glass-neutral flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-sm border border-[#22393c]/5"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22393c] text-white">
          <Sparkles className="size-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#22393c]">Collaboration Coach</span>
            <span className="rounded-full bg-[#22393c]/10 px-2 py-0.5 text-[9px] font-semibold text-[#668184]">AI</span>
          </div>
          <p className="mt-0.5 text-[10px] text-[#668184]">
            {interventions.length === 1
              ? "1 thing worth your team's attention"
              : `${interventions.length} things worth your team's attention`}
          </p>
        </div>
        {expanded ? (
          <svg className="size-4 shrink-0 text-[#668184]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        ) : (
          <svg className="size-4 shrink-0 text-[#668184]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-2 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin"
          >
            {interventions.map((intervention) => {
              const severityClasses = getSeverityClasses(intervention.severity)
              const isProcessing = processingId === intervention.id

              return (
                <div key={intervention.id} className={`relative rounded-2xl border p-4 shadow-sm ${severityClasses}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{getSeverityIcon(intervention.severity)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                            {intervention.severity === "high" ? "Important" : intervention.severity === "medium" ? "Suggestion" : "Tip"}
                          </p>
                          <h3 className="mt-0.5 text-sm font-semibold">{intervention.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDismiss(intervention.id)}
                          disabled={isProcessing}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 disabled:opacity-50"
                          aria-label="Dismiss"
                        >
                          {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                        </button>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed opacity-85">{intervention.message}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(intervention.id)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#22393c] px-3 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="size-3 animate-spin" /> : <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          Mark as handled
                        </button>
                        <span className="text-[9px] opacity-50">
                          {new Date(intervention.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
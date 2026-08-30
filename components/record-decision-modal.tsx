"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X, Lightbulb } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { logCollaborationEvent } from "@/lib/collaboration-events"

export function RecordDecisionModal({ 
  projectId, 
  userId, 
  onClose, 
  onSuccess 
}: { 
  projectId: string
  userId: string
  onClose: () => void
  onSuccess: () => void 
}) {
  const [title, setTitle] = useState("")
  const [decision, setDecision] = useState("")
  const [reasoning, setReasoning] = useState("")
  const [alternatives, setAlternatives] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !decision.trim()) return
    setLoading(true)

    try {
      // 1. Insert Decision
      const { data: newDecision, error } = await supabase
        .from("project_decisions")
        .insert({
          project_id: projectId,
          title: title.trim(),
          decision: decision.trim(),
          reasoning: reasoning.trim() || null,
          alternatives_considered: alternatives.trim() || null,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error

      // 2. Log V4 Event (Instant)
      if (newDecision) {
        await logCollaborationEvent({
          projectId,
          userId,
          eventType: "decision_created",
          entityType: "decision",
          entityId: newDecision.id,
          metadata: { title: newDecision.title },
        })
      }

      onSuccess()
    } catch (err: any) {
      alert(err?.message || "Failed to record decision.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-[#8a9a7b]" />
            <h3 className="text-xl font-bold text-[#22393c]">Record Decision</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button>
        </div>
        
        <p className="text-xs text-[#668184] mb-4">Documenting your choices helps future teams understand the "why" behind your code.</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#668184]">Decision Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Chose Supabase over Firebase" className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#668184]">What did we decide?</label>
            <textarea value={decision} onChange={(e) => setDecision(e.target.value)} rows={2} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#668184]">Why? (Reasoning)</label>
            <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} rows={3} placeholder="e.g., We needed relational data and built-in auth..." className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#668184]">Alternatives Considered</label>
            <textarea value={alternatives} onChange={(e) => setAlternatives(e.target.value)} rows={2} placeholder="e.g., Firebase, AWS Amplify" className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none" />
          </div>
          <button onClick={handleSave} disabled={loading || !title.trim() || !decision.trim()} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50">
            {loading ? "Saving..." : "Log Decision"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
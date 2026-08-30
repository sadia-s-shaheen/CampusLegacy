"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Award, Brain, CheckCircle2, Sparkles, TrendingUp, Zap, X, Mail, Loader2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

type TeammateRecommendation = {
  user_id: string
  name: string
  year?: number | null
  skills: string[]
  matched_role?: string | null
  technical_score: number
  transactivity_compatibility: number
  final_score: number
  ai_reason?: string
}

type Extension = {
  id: string
  title: string
  description: string
  domain?: string
  difficulty?: string
  ai_reason?: string
}

type ProjectAITabProps = {
  projectId: string
  recommendedTeammates: TeammateRecommendation[]
  teamAvgTransactivity: number
  onShowAIExtensions: () => void
  currentUser: any
  onRemoveRecommendation: (userId: string) => void
  onAdoptExtension: (ideaId: string) => void // ✅ ADDED
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

/* =========================================================
   RECOMMENDATION DETAIL MODAL
========================================================= */
function RecommendationDetailModal({
  rec,
  projectId,
  currentUser,
  onClose,
  onRemove,
}: {
  rec: TeammateRecommendation
  projectId: string
  currentUser: any
  onClose: () => void
  onRemove: () => void
}) {
  const [inviting, setInviting] = useState(false)

  const handleDirectInvite = async () => {
    if (!currentUser?.id) return
    setInviting(true)
    try {
      const { error } = await supabase.from("project_invitations").insert({
        project_id: projectId,
        invitee_id: rec.user_id,
        invited_by: currentUser.id,
        status: "pending",
      })
      if (error) throw error
      alert(`Invitation sent to ${rec.name}!`)
      onClose()
    } catch (err: any) {
      alert(err?.message || "Failed to send invitation.")
    } finally {
      setInviting(false)
    }
  }

  const handleDismiss = () => {
    onRemove()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#22393c]/10 text-sm font-bold text-[#22393c]">
              {getInitials(rec.name)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#22393c]">{rec.name}</h3>
              <p className="text-xs text-[#668184]">
                {rec.year ? `${rec.year} Year Student` : "Student"} • Match: {Math.round(rec.final_score * 100)}%
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184] flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> AI Recommendation Reason
            </h4>
            <p className="text-sm italic text-[#22393c]/90 bg-white/40 p-3 rounded-xl border border-[#22393c]/5">
              "{rec.ai_reason || "This candidate shows strong technical alignment and collaboration potential."}"
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#8a9a7b]/10 p-3 rounded-2xl text-center">
              <p className="text-[9px] font-bold uppercase text-[#668184]">Tech</p>
              <p className="text-lg font-bold text-[#22393c]">{Math.round(rec.technical_score * 100)}%</p>
            </div>
            <div className="bg-[#5f8fa3]/10 p-3 rounded-2xl text-center">
              <p className="text-[9px] font-bold uppercase text-[#668184]">Collab</p>
              <p className="text-lg font-bold text-[#22393c]">{Math.round(rec.transactivity_compatibility * 100)}%</p>
            </div>
            <div className="bg-[#c99a5b]/10 p-3 rounded-2xl text-center">
              <p className="text-[9px] font-bold uppercase text-[#668184]">Final</p>
              <p className="text-lg font-bold text-[#22393c]">{Math.round(rec.final_score * 100)}%</p>
            </div>
          </div>

          {rec.matched_role && (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Fits Open Role</h4>
              <span className="inline-block rounded-full bg-[#8a9a7b]/20 px-3 py-1 text-xs font-semibold text-[#22393c]">
                {rec.matched_role}
              </span>
            </div>
          )}

          {rec.skills && rec.skills.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Technical Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {rec.skills.map((skill: string, i: number) => (
                  <span key={i} className="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-semibold text-[#22393c]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={handleDismiss} className="flex-1 rounded-2xl bg-[#22393c]/10 py-3.5 text-sm font-semibold text-[#22393c] transition-transform hover:scale-[1.02]">
            Dismiss
          </button>
          <button onClick={handleDirectInvite} disabled={inviting} className="flex-1 rounded-2xl bg-[#22393c] py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2">
            {inviting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            {inviting ? "Sending..." : "Invite"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* =========================================================
   MAIN AI TAB COMPONENT
========================================================= */
export function ProjectAITab({
  projectId,
  recommendedTeammates,
  teamAvgTransactivity,
  onShowAIExtensions,
  currentUser,
  onRemoveRecommendation,
  onAdoptExtension, // ✅ ADDED
}: ProjectAITabProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<TeammateRecommendation | null>(null)
  const [generatingExtensions, setGeneratingExtensions] = useState(false)
  const [extensions, setExtensions] = useState<Extension[]>([])

  // Fetch existing extensions on mount
  useState(() => {
    const fetchExtensions = async () => {
      const { data } = await supabase
        .from("project_ideas")
        .select("*")
        .eq("source_project_id", projectId)
        .eq("created_from_ai", true)
        .order("created_at", { ascending: false })
      if (data) setExtensions(data)
    }
    fetchExtensions()
  })

  const handleGenerateExtensions = async () => {
    setGeneratingExtensions(true)
    try {
      const res = await fetch("/api/generate-extensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      // Refetch to show the new extensions
      const { data: newData } = await supabase
        .from("project_ideas")
        .select("*")
        .eq("source_project_id", projectId)
        .eq("created_from_ai", true)
        .order("created_at", { ascending: false })
      if (newData) setExtensions(newData)
    } catch (err: any) {
      alert(err?.message || "Failed to generate extensions.")
    } finally {
      setGeneratingExtensions(false)
    }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-[#8a9a7b]" />
          <h3 className="text-lg font-semibold">AI Intelligence</h3>
        </div>
      </div>

      {/* 1. Team Match Summary */}
      <div className="glass-button glass-aqua rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
          <div>
            <h4 className="mb-1 text-sm font-bold">V4 Intelligent Matching</h4>
            <p className="text-xs text-[#22393c]/80">
              {recommendedTeammates.length > 0
                ? `Found ${recommendedTeammates.length} highly compatible candidates based on open roles, transactivity, and AI strategic fit.`
                : "Your team currently covers every required skill."}
            </p>
            {teamAvgTransactivity > 0 && (
              <p className="mt-2 text-[10px] font-medium text-[#668184]">
                Team Avg. Collaboration Score: <span className="font-semibold text-[#22393c]">{Math.round(teamAvgTransactivity * 100)}%</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Recommended Teammates (Horizontal Scroll) */}
      {recommendedTeammates.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#668184] flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Top Strategic Matches
            </h4>
            <span className="text-[10px] text-[#668184]">Swipe to see more →</span>
          </div>
          
          {/* Horizontal Scroll Container */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
            {recommendedTeammates.map((rec, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedRecommendation(rec)}
                className="snap-start min-w-[260px] w-[260px] glass-button glass-peach rounded-3xl p-4 cursor-pointer transition-transform hover:scale-[1.02] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#22393c]/10 text-sm font-bold text-[#22393c]">
                      {getInitials(rec.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#22393c]">{rec.name}</p>
                      <p className="text-[10px] text-[#668184]">
                        {rec.year ? `${rec.year} Year` : "Student"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-full bg-[#8a9a7b]/20 px-2.5 py-1 text-[10px] font-bold text-[#536343]">
                      {Math.round(rec.final_score * 100)}% Match
                    </span>
                    {rec.matched_role && (
                      <span className="rounded-full bg-[#22393c]/10 px-2.5 py-1 text-[10px] font-bold text-[#22393c] truncate max-w-[120px]">
                        {rec.matched_role}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-[#668184] line-clamp-2 italic mb-3">
                    "{rec.ai_reason || "Strong technical and collaboration match."}"
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#22393c]/5 pt-3">
                  <div className="flex gap-2 text-[9px] font-bold text-[#668184]">
                    <span>Tech: {Math.round(rec.technical_score * 100)}%</span>
                    <span>•</span>
                    <span>Collab: {Math.round(rec.transactivity_compatibility * 100)}%</span>
                  </div>
                  <ChevronRight className="size-4 text-[#8a9a7b]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. AI Project Extensions (Horizontal Scroll) */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#668184] flex items-center gap-2">
            <Zap className="size-4" /> Legacy Extensions
          </h4>
          <button 
            onClick={handleGenerateExtensions}
            disabled={generatingExtensions}
            className="flex items-center gap-1 rounded-full bg-[#22393c] px-3 py-1.5 text-[10px] font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
          >
            {generatingExtensions ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            {generatingExtensions ? "Generating..." : "Generate New"}
          </button>
        </div>

        {extensions.length === 0 ? (
          <div className="glass-button glass-neutral rounded-3xl p-6 text-center">
            <Zap className="mx-auto mb-2 size-6 text-[#668184]" />
            <p className="text-xs text-[#668184]">No extensions generated yet. Click "Generate New" to let AI suggest child projects.</p>
          </div>
        ) : (
          /* Horizontal Scroll Container */
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
            {extensions.map((ext) => (
              <div 
                key={ext.id} 
                className="snap-start min-w-[280px] w-[280px] glass-button glass-lilac rounded-3xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h5 className="text-sm font-bold text-[#22393c] line-clamp-2">{ext.title}</h5>
                    {ext.domain && (
                      <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[9px] font-bold text-[#668184]">
                        {ext.domain}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-[#22393c]/80 line-clamp-3 mb-3">
                    {ext.description}
                  </p>

                  {ext.ai_reason && (
                    <p className="text-[10px] italic text-[#668184] bg-white/30 p-2 rounded-lg mb-3">
                      💡 {ext.ai_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#22393c]/5 pt-3">
                  <span className="rounded-full bg-[#8a9a7b]/20 px-2 py-0.5 text-[9px] font-bold capitalize text-[#536343]">
                    {ext.difficulty || "Intermediate"}
                  </span>
                  
                  {/* ✅ REPLACED BROKEN <Link> WITH BUTTON */}
                  <button 
                    onClick={() => onAdoptExtension(ext.id)} 
                    className="text-[10px] font-bold text-[#8a9a7b] flex items-center gap-1 hover:underline"
                  >
                    Adopt <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Teammate Details */}
      <AnimatePresence>
        {selectedRecommendation && (
          <RecommendationDetailModal
            rec={selectedRecommendation}
            projectId={projectId}
            currentUser={currentUser}
            onClose={() => setSelectedRecommendation(null)}
            onRemove={() => onRemoveRecommendation(selectedRecommendation.user_id)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  )
}
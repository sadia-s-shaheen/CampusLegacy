"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Award, Brain, CheckCircle2, Code, ExternalLink, GitBranch, Plus, Users, X, Clock, ChevronDown, MessageCircle } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

type ProjectOverviewTabProps = {
  project: any
  projectId: string
  teamMembers: any[]
  skills: any[]
  tools: any[]
  lineages: any[]
  recommendedTeammates: any[]
  isOwner: boolean
  isTeamMember: boolean
  hasPendingRequest: boolean
  teamIsFull: boolean
  canRequestToJoin: boolean
  onShowAddLink: () => void
  onShowCreateChild: () => void
  onRequestToJoin: () => void
  onRefresh: () => void
}

const PROJECT_STATUSES = ["active", "completed", "legacy", "archived", "abandoned", "open_for_continuation"] as const
const PROJECT_VISIBILITIES = ["public", "department", "private"] as const

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[#8a9a7b]/25 text-[#22393c]",
  completed: "bg-[#5f8fa3]/25 text-[#22393c]",
  legacy: "bg-[#22393c]/15 text-[#22393c]",
  archived: "bg-gray-400/20 text-gray-600",
  abandoned: "bg-red-200/60 text-red-700",
  open_for_continuation: "bg-[#c99a5b]/25 text-[#22393c]",
}

function statusLabel(status: string) {
  return status.split("_").join(" ")
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

function formatDate(date?: string | null) {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString()
}

export function ProjectOverviewTab({
  project,
  projectId,
  teamMembers,
  skills,
  tools,
  lineages,
  recommendedTeammates,
  isOwner,
  isTeamMember,
  hasPendingRequest,
  teamIsFull,
  canRequestToJoin,
  onShowAddLink,
  onShowCreateChild,
  onRequestToJoin,
  onRefresh,
}: ProjectOverviewTabProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)

  const teamSkillIds = new Set(
    teamMembers.flatMap((m) => [
      ...(m.people?.people_skills?.map((ps: any) => ps.skills?.id) || []),
      ...(m.covered_skill_ids || []),
    ]).filter(Boolean)
  )

  // ✅ ROBUST LINEAGE CALCULATION
  const parentLineages = lineages.filter((l: any) => l.child_project_id === project.id)
  const parentIds = parentLineages.map((l: any) => l.parent_project_id)
  
  const siblingLineages = lineages.filter(
    (l: any) => parentIds.includes(l.parent_project_id) && l.child_project_id !== project.id
  )
  
  const childLineages = lineages.filter((l: any) => l.parent_project_id === project.id)

  return (
    <>
      {/* Project Header */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-button glass-aqua rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#8a9a7b] to-[#22393c] mx-auto sm:mx-0">
            {project.image_url ? (
              <img src={project.image_url} alt={project.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                {project.title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            {/* ✅ Responsive title and dropdown container */}
            <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-[#22393c] break-words text-center sm:text-left">
                {project.title}
              </h2>
              
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 shrink-0 w-full sm:w-auto justify-center sm:justify-end">
                
                {/* Status Dropdown */}
                <div className="relative w-full sm:w-auto">
                  <button 
                    onClick={() => isOwner && setStatusMenuOpen((v) => !v)} 
                    className={`flex items-center justify-center sm:justify-end gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors w-full sm:w-auto ${STATUS_STYLES[project.status || "active"] || STATUS_STYLES.active} ${isOwner ? "cursor-pointer hover:bg-black/5" : ""}`}
                  >
                    {statusLabel(project.status || "active")}
                    {isOwner && <ChevronDown className={`size-3 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />}
                  </button>
                  <AnimatePresence>
                    {statusMenuOpen && isOwner && (
                      <motion.div 
                        initial={{ opacity: 0, y: -6 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -6 }} 
                        className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-1 z-50 w-full sm:w-48 rounded-xl bg-white p-1.5 shadow-lg border border-[#22393c]/5"
                      >
                        {PROJECT_STATUSES.map((s) => (
                          <button 
                            key={s} 
                            onClick={() => { 
                              setStatusMenuOpen(false); 
                              supabase.from("projects").update({ status: s }).eq("id", projectId).then(() => { 
                                onRefresh(); 
                              }); 
                            }} 
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#22393c] hover:bg-[#22393c]/5"
                          >
                            {statusLabel(s)}
                            {project.status === s && <CheckCircle2 className="size-3.5 text-[#8a9a7b]" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Visibility Dropdown */}
                <div className="relative w-full sm:w-auto">
                  {isOwner ? (
                    <>
                      <button 
                        onClick={() => isOwner && setVisibilityOpen((v) => !v)} 
                        className="flex items-center justify-center sm:justify-end gap-1 rounded-full bg-[#22393c]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#22393c] transition-colors w-full sm:w-auto hover:bg-[#22393c]/20"
                      >
                        {project.visibility || "public"}
                        <ChevronDown className={`size-3 transition-transform ${visibilityOpen ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {visibilityOpen && isOwner && (
                          <motion.div 
                            initial={{ opacity: 0, y: -6 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -6 }} 
                            className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-1 z-50 w-full sm:w-48 rounded-xl bg-white p-1.5 shadow-lg border border-[#22393c]/5"
                          >
                            {PROJECT_VISIBILITIES.map((v) => (
                              <button 
                                key={v} 
                                onClick={() => { 
                                  setVisibilityOpen(false); 
                                  supabase.from("projects").update({ visibility: v }).eq("id", projectId).then(() => { 
                                    onRefresh(); 
                                  }); 
                                }} 
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#22393c] hover:bg-[#22393c]/5"
                              >
                                {v}
                                {project.visibility === v && <CheckCircle2 className="size-3.5 text-[#8a9a7b]" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <span className="rounded-full bg-[#22393c]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#22393c] w-full sm:w-auto text-center sm:text-right">
                      {project.visibility}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <p className="mb-3 text-sm text-[#22393c]/80 text-center sm:text-left">{project.description || "No description provided."}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-xs text-[#668184]">
              <span className="flex items-center gap-1"><Users className="size-3" />{project.people?.full_name || "Unknown Owner"}</span>
              {project.mentor?.full_name && <span className="flex items-center gap-1"><Award className="size-3" />Mentor: {project.mentor.full_name}</span>}
              <span className="flex items-center gap-1"><GitBranch className="size-3" />{project.departments?.name || "General"}</span>
              <span className="flex items-center gap-1"><Clock className="size-3" />Created: {formatDate(project.created_at)}</span>
              {project.end_date && <span className="flex items-center gap-1"><CheckCircle2 className="size-3" />Completed: {formatDate(project.end_date)}</span>}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3 border-t border-[#22393c]/10 pt-4">
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-[#22393c]/10 px-4 py-2 text-xs font-medium hover:bg-[#22393c]/20">
              <Code className="size-4" /> GitHub
            </a>
          )}
          {project.demo_url && (
            <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-[#8a9a7b]/20 px-4 py-2 text-xs font-medium hover:bg-[#8a9a7b]/30">
              <ExternalLink className="size-4" /> Live Demo
            </a>
          )}
          {project.links?.map((link: any, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-xs font-medium hover:bg-white">
              <ExternalLink className="size-4" /> {link.label}
            </a>
          ))}
          {isOwner && (
            <button onClick={onShowAddLink} className="flex items-center gap-2 rounded-full border border-dashed border-[#8a9a7b] px-4 py-2 text-xs font-semibold text-[#8a9a7b] hover:bg-[#8a9a7b]/10">
              <Plus className="size-4" /> Add Link
            </button>
          )}
        </div>
      </motion.section>

      {/* Join / Contact Section (Non-Owners Only) */}
      {!isOwner && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-button glass-neutral rounded-3xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            {isTeamMember ? (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8a9a7b]/15 px-4 py-3 text-sm font-semibold text-[#22393c]">
                <CheckCircle2 className="size-4 text-[#8a9a7b]" /> You're on the team
              </div>
            ) : hasPendingRequest ? (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#c99a5b]/15 px-4 py-3 text-sm font-semibold text-[#22393c]">
                <Clock className="size-4 text-[#c99a5b]" /> Request Pending
              </div>
            ) : teamIsFull ? (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22393c]/10 px-4 py-3 text-sm font-semibold text-[#668184]">
                <Users className="size-4" /> Team Full
              </div>
            ) : (
              <button type="button" onClick={onRequestToJoin} disabled={!canRequestToJoin} className="flex-1 rounded-2xl bg-[#22393c] px-4 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:bg-[#2d4a4e] disabled:cursor-not-allowed disabled:opacity-50">
                Request to Join
              </button>
            )}
            {project.owner_id && (
              <Link href={`/chat/${project.owner_id}`} className="flex items-center justify-center gap-2 rounded-2xl bg-[#8a9a7b] px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01]">
                <MessageCircle className="size-4" /> <span>Message Owner</span>
              </Link>
            )}
          </div>
        </motion.section>
      )}

      {/* Team Preview */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><Users className="size-5 text-[#8a9a7b]" /> Team Composition</h3>
          <span className="text-sm font-medium text-[#668184]">{teamMembers.length}/5</span>
        </div>
        <div className="glass-button glass-neutral rounded-3xl p-4">
          <div className="mb-3 flex -space-x-2 justify-center sm:justify-start">
            {teamMembers.slice(0, 5).map((member) => (
              <div key={member.id} title={member.people?.full_name || "Team member"} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#8a9a7b] text-xs font-bold text-white">
                {getInitials(member.people?.full_name)}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#668184] text-center sm:text-left">
            {teamMembers.length < 5 ? `${5 - teamMembers.length} open slot${5 - teamMembers.length > 1 ? "s" : ""}` : "Team is full"}
          </p>
        </div>
      </motion.section>

      {/* Skills & Tools */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#668184] text-center sm:text-left">Skills & Tools</h3>
          {isOwner && (
            <button onClick={onShowAddLink} className="flex items-center gap-1 text-xs font-semibold text-[#8a9a7b] hover:text-[#22393c] transition-colors">
              <Plus className="size-3" /> Edit
            </button>
          )}
        </div>
        <div className="glass-button glass-neutral flex flex-wrap justify-center sm:justify-start gap-2 rounded-3xl p-4">
          {skills.map((skill: any, index: number) => {
            const hasIt = teamSkillIds.has(skill.skills?.id)
            return (
              <span key={index} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${hasIt ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {skill.skills?.name} {hasIt ? <CheckCircle2 className="size-3" /> : <X className="size-3" />}
              </span>
            )
          })}
          {tools.map((tool: any, index: number) => (
            <a key={index} href={tool.tools?.website_url || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#22393c]/10 px-4 py-2 text-xs font-semibold text-[#22393c] hover:bg-[#22393c]/20">
              {tool.tools?.name} <ExternalLink className="size-3" />
            </a>
          ))}
          {skills.length === 0 && tools.length === 0 && <p className="text-xs text-[#668184] italic text-center sm:text-left w-full">No skills or tools listed yet.</p>}
        </div>
      </section>

      {/* Project Lineage */}
      {(parentLineages.length > 0 || childLineages.length > 0 || siblingLineages.length > 0 || isOwner) && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#668184] text-center sm:text-left">
            <GitBranch className="size-4 text-[#8a9a7b]" /> Project Lineage
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Parents */}
            <div className="glass-button glass-lilac rounded-2xl p-4">
              <h4 className="mb-2 text-xs font-bold text-[#668184] text-center sm:text-left">Parents ({parentLineages.length})</h4>
              {parentLineages.length > 0 ? (
                parentLineages.map((l: any) => (
                  <Link key={l.parent?.id} href={`/projects/${l.parent?.id}`} className="mb-1 block rounded bg-white/50 p-2 text-xs transition-colors hover:bg-white text-center sm:text-left">
                    {l.parent?.title}
                  </Link>
                ))
              ) : (
                <p className="text-xs italic text-[#668184] text-center sm:text-left">None</p>
              )}
            </div>

            {/* Siblings */}
            <div className="glass-button glass-peach rounded-2xl p-4">
              <h4 className="mb-2 text-xs font-bold text-[#668184] text-center sm:text-left">Siblings ({siblingLineages.length})</h4>
              {siblingLineages.length > 0 ? (
                siblingLineages.map((l: any) => (
                  <Link key={l.child?.id} href={`/projects/${l.child?.id}`} className="mb-1 block rounded bg-white/50 p-2 text-xs transition-colors hover:bg-white text-center sm:text-left">
                    {l.child?.title}
                  </Link>
                ))
              ) : (
                <p className="text-xs italic text-[#668184] text-center sm:text-left">None</p>
              )}
            </div>

            {/* Children */}
            <div className="glass-button glass-aqua rounded-2xl p-4">
              <h4 className="mb-2 text-xs font-bold text-[#668184] text-center sm:text-left">Children ({childLineages.length})</h4>
              {childLineages.length > 0 ? (
                childLineages.map((l: any) => (
                  <Link key={l.child?.id} href={`/projects/${l.child?.id}`} className="mb-1 block rounded bg-white/50 p-2 text-xs transition-colors hover:bg-white text-center sm:text-left">
                    {l.child?.title}
                  </Link>
                ))
              ) : (
                <p className="mb-2 text-xs italic text-[#668184] text-center sm:text-left">None</p>
              )}
              {isOwner && (
                <button onClick={onShowCreateChild} className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-[#8a9a7b] p-2 text-xs font-bold text-[#8a9a7b] transition-colors hover:bg-[#8a9a7b]/10">
                  <Plus className="size-3" /> Create Child Project
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      
    </>
  )
}
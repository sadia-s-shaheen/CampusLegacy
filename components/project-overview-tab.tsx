"use client"
import { motion } from "framer-motion"
import { Award, Brain, CheckCircle2, Code, ExternalLink, GitBranch, Plus, Users, X, Clock } from "lucide-react"
import Link from "next/link"

type ProjectOverviewTabProps = {
  project: any
  teamMembers: any[]
  skills: any[]
  tools: any[]
  lineages: any[]
  recommendedTeammates: any[]
  isOwner: boolean
  onShowAddLink: () => void
  onShowCreateChild: () => void
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
  teamMembers,
  skills,
  tools,
  lineages,
  recommendedTeammates,
  isOwner,
  onShowAddLink,
  onShowCreateChild,
}: ProjectOverviewTabProps) {
  const teamSkillIds = new Set(
    teamMembers.flatMap((m) => [
      ...(m.people?.people_skills?.map((ps: any) => ps.skills?.id) || []),
      ...(m.covered_skill_ids || []),
    ]).filter(Boolean)
  )

  return (
    <>
      {/* Project Header */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-button glass-aqua rounded-3xl p-6">
        <div className="flex gap-4">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#8a9a7b] to-[#22393c]">
            {project.image_url ? (
              <img src={project.image_url} alt={project.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                {project.title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold text-[#22393c]">{project.title}</h2>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-[#8a9a7b]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#22393c]">
                  {project.status || "unknown"}
                </span>
                <span className="rounded-full bg-[#22393c]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#22393c]">
                  {project.visibility || "public"}
                </span>
              </div>
            </div>
            <p className="mb-3 text-sm text-[#22393c]/80">{project.description || "No description provided."}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#668184]">
              <span className="flex items-center gap-1"><Users className="size-3" />{project.people?.full_name || "Unknown Owner"}</span>
              {project.mentor?.full_name && <span className="flex items-center gap-1"><Award className="size-3" />Mentor: {project.mentor.full_name}</span>}
              <span className="flex items-center gap-1"><GitBranch className="size-3" />{project.departments?.name || "General"}</span>
              <span className="flex items-center gap-1"><Clock className="size-3" />Created: {formatDate(project.created_at)}</span>
              {project.end_date && <span className="flex items-center gap-1"><CheckCircle2 className="size-3" />Completed: {formatDate(project.end_date)}</span>}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-[#22393c]/10 pt-4">
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

      {/* Team Preview */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold"><Users className="size-5 text-[#8a9a7b]" /> Team Composition</h3>
          <span className="text-sm font-medium text-[#668184]">{teamMembers.length}/5</span>
        </div>
        <div className="glass-button glass-neutral rounded-3xl p-4">
          <div className="mb-3 flex -space-x-2">
            {teamMembers.slice(0, 5).map((member) => (
              <div key={member.id} title={member.people?.full_name || "Team member"} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#8a9a7b] text-xs font-bold text-white">
                {getInitials(member.people?.full_name)}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#668184]">
            {teamMembers.length < 5 ? `${5 - teamMembers.length} open slot${5 - teamMembers.length > 1 ? "s" : ""}` : "Team is full"}
          </p>
        </div>
      </motion.section>

      {/* Skills & Tools */}
      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#668184]">Skills & Tools</h3>
        <div className="glass-button glass-neutral flex flex-wrap gap-2 rounded-3xl p-4">
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
          {skills.length === 0 && tools.length === 0 && <p className="text-xs text-[#668184] italic">No skills or tools listed yet.</p>}
        </div>
      </section>

      {/* Project Lineage */}
      {(lineages.length > 0 || isOwner) && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#668184]">
            <GitBranch className="size-4 text-[#8a9a7b]" /> Project Lineage
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass-button glass-lilac rounded-2xl p-4">
              <h4 className="mb-2 text-xs font-bold text-[#668184]">Parents ({lineages.filter((l: any) => l.child_project_id === project.id).length})</h4>
              {lineages.filter((l: any) => l.child_project_id === project.id).length > 0 ? (
                lineages.filter((l: any) => l.child_project_id === project.id).map((l: any) => (
                  <Link key={l.parent?.id} href={`/projects/${l.parent?.id}`} className="mb-1 block rounded bg-white/50 p-2 text-xs transition-colors hover:bg-white">{l.parent?.title}</Link>
                ))
              ) : <p className="text-xs italic text-[#668184]">None</p>}
            </div>
            <div className="glass-button glass-peach rounded-2xl p-4">
              <h4 className="mb-2 text-xs font-bold text-[#668184]">Siblings ({lineages.filter((l: any) => l.child_project_id !== project.id && l.parent_project_id === lineages.find((p: any) => p.child_project_id === project.id)?.parent_project_id).length})</h4>
              {lineages.filter((l: any) => l.child_project_id !== project.id && l.parent_project_id === lineages.find((p: any) => p.child_project_id === project.id)?.parent_project_id).length > 0 ? (
                lineages.filter((l: any) => l.child_project_id !== project.id && l.parent_project_id === lineages.find((p: any) => p.child_project_id === project.id)?.parent_project_id).map((l: any) => (
                  <Link key={l.child?.id} href={`/projects/${l.child?.id}`} className="mb-1 block rounded bg-white/50 p-2 text-xs transition-colors hover:bg-white">{l.child?.title}</Link>
                ))
              ) : <p className="text-xs italic text-[#668184]">None</p>}
            </div>
            <div className="glass-button glass-aqua rounded-2xl p-4">
              <h4 className="mb-2 text-xs font-bold text-[#668184]">Children ({lineages.filter((l: any) => l.parent_project_id === project.id).length})</h4>
              {lineages.filter((l: any) => l.parent_project_id === project.id).length > 0 ? (
                lineages.filter((l: any) => l.parent_project_id === project.id).map((l: any) => (
                  <Link key={l.child?.id} href={`/projects/${l.child?.id}`} className="mb-1 block rounded bg-white/50 p-2 text-xs transition-colors hover:bg-white">{l.child?.title}</Link>
                ))
              ) : <p className="mb-2 text-xs italic text-[#668184]">None</p>}
              {isOwner && (
                <button onClick={onShowCreateChild} className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-[#8a9a7b] p-2 text-xs font-bold text-[#8a9a7b] transition-colors hover:bg-[#8a9a7b]/10">
                  <Plus className="size-3" /> Create Child Project
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* AI Recommended Teammates */}
      {recommendedTeammates.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#668184]">
            <Brain className="size-4 text-[#8a9a7b]" /> AI Recommended Teammates
          </h3>
          <div className="glass-button glass-peach space-y-3 rounded-3xl p-4">
            <p className="mb-2 text-xs text-[#22393c]/80">Based on missing skills, we recommend inviting:</p>
            {recommendedTeammates.map((rec: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between rounded-2xl bg-white/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c]/10 text-xs font-bold">{getInitials(rec.people?.full_name)}</div>
                  <div>
                    <p className="text-sm font-semibold">{rec.people?.full_name}</p>
                    <p className="text-[10px] text-[#668184]">Has: <span className="font-medium text-[#22393c]">{rec.skills?.name}</span></p>
                  </div>
                </div>
                <Link href={`/profile/${rec.people?.id}`}>
                  <button className="rounded-full bg-[#22393c] px-3 py-1.5 text-[10px] font-bold text-white transition-transform hover:scale-105">View Profile</button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
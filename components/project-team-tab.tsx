"use client"

import { motion } from "framer-motion"
import { Briefcase, Clock, Mail, Pencil, Plus } from "lucide-react"
import Link from "next/link"

type ProjectTeamTabProps = {
  project: any
  teamMembers: any[]
  openRoles: any[]
  applications: any[]
  invitations: any[]
  skills: any[]
  isOwner: boolean
  currentUser: any
  onShowAddRole: () => void
  onShowInvite: () => void
  onShowEditMember: (member: any) => void
  onApplyRole: (role: any) => void
  onAcceptApplication: (appId: string) => void
  onRejectApplication: (appId: string) => void
  onAcceptInvitation: (invId: string) => void
  onDeclineInvitation: (invId: string) => void
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

export function ProjectTeamTab({
  project,
  teamMembers,
  openRoles,
  applications,
  invitations,
  skills,
  isOwner,
  currentUser,
  onShowAddRole,
  onShowInvite,
  onShowEditMember,
  onApplyRole,
  onAcceptApplication,
  onRejectApplication,
  onAcceptInvitation,
  onDeclineInvitation,
}: ProjectTeamTabProps) {
  const myPendingInvitations = invitations.filter((inv: any) => inv.invitee_id === currentUser?.id)

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <p className="mb-6 text-sm text-[#668184]">Build your team around the skills your project needs.</p>

      {/* Current Team */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Current Team</h3>
          <span className="text-sm font-medium text-[#668184]">{teamMembers.length} / 5 members</span>
        </div>
        <div className="overflow-hidden rounded-3xl glass-button glass-neutral">
          
          {/* Table Header - Hidden on mobile to prevent squishing */}
          <div className="hidden sm:grid grid-cols-12 gap-4 border-b border-[#22393c]/10 bg-[#22393c]/5 p-4 text-xs font-bold uppercase tracking-wider text-[#668184]">
            <div className="col-span-4">Person</div>
            <div className="col-span-3">Role</div>
            <div className="col-span-3">Skills Covered</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          
          <div className="divide-y divide-[#22393c]/5">
            {teamMembers.map((member: any) => {
              const canEditMember = isOwner || member.person_id === currentUser?.id
              const coveredNames = skills
                .filter((s: any) => s.skills?.id && (member.covered_skill_ids || []).includes(s.skills.id))
                .map((s: any) => s.skills?.name)

              return (
                // ✅ Responsive Row: Stacks on mobile, 12-col grid on desktop
                <div key={member.id} className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-3 sm:gap-4 p-4 border-b border-[#22393c]/5 last:border-0">
                  
                  <div className="sm:col-span-4 flex items-center gap-3 w-full">
                    <Link href={`/profile/${member.people?.id}`} className="group flex items-center gap-3 w-full">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-xs font-bold text-white transition-transform group-hover:scale-105">
                        {getInitials(member.people?.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold transition-colors group-hover:text-[#8a9a7b]">{member.people?.full_name || "Unknown"}</p>
                        <p className="text-[10px] text-[#668184]">{member.people?.role || "Student"}</p>
                      </div>
                    </Link>
                  </div>

                  <div className="sm:col-span-3 flex items-center w-full sm:w-auto">
                    {/* Mobile-only label */}
                    <span className="sm:hidden text-[10px] font-bold uppercase text-[#668184] mr-2 min-w-[40px]">Role:</span>
                    <span className="rounded-full bg-[#8a9a7b]/20 px-3 py-1 text-xs font-medium">{member.role || "Contributor"}</span>
                  </div>

                  <div className="sm:col-span-3 flex flex-wrap gap-1 items-center w-full sm:w-auto">
                    {/* Mobile-only label */}
                    <span className="sm:hidden text-[10px] font-bold uppercase text-[#668184] mr-2 min-w-[50px]">Skills:</span>
                    {coveredNames.length > 0 ? coveredNames.map((n: string) => (
                      <span key={n} className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">{n}</span>
                    )) : <span className="text-[10px] text-[#668184] italic">from profile</span>}
                  </div>

                  <div className="sm:col-span-2 flex sm:justify-end w-full sm:w-auto">
                    {canEditMember && (
                      <button
                        onClick={() => onShowEditMember(member)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8a9a7b]/10 text-[#8a9a7b] hover:bg-[#8a9a7b]/20 transition-colors"
                        title="Edit role"
                      >
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {teamMembers.length === 0 && <div className="p-8 text-center text-sm text-[#668184]">No team members yet.</div>}
          </div>
        </div>
      </div>

      {/* Owner Actions - Stacks on mobile */}
      {isOwner && (
        <div className="mb-8 flex flex-col sm:flex-row gap-3">
          <button onClick={onShowAddRole} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8a9a7b] py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">
            <Plus className="size-4" /> Create Open Role
          </button>
          <button onClick={onShowInvite} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22393c] py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">
            <Mail className="size-4" /> Invite Someone
          </button>
        </div>
      )}

      {/* Pending Applications (Owner only) */}
      {isOwner && applications.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Clock className="size-5 text-[#8a9a7b]" /> Pending Applications ({applications.length})</h3>
          <div className="space-y-3">
            {applications.map((app: any) => (
              <div key={app.id} className="glass-button glass-peach rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-[#22393c]">{app.people?.full_name}</p>
                    <p className="text-xs text-[#668184]">Applied for: {app.project_roles?.title}</p>
                  </div>
                  <span className="rounded-full bg-[#22393c]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#668184]">Pending</span>
                </div>
                {app.message && <p className="text-xs text-[#22393c]/80 mb-3 italic">"{app.message}"</p>}
                <div className="flex gap-2">
                  <button onClick={() => onAcceptApplication(app.id)} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white hover:scale-[1.02] transition-transform">Accept</button>
                  <button onClick={() => onRejectApplication(app.id)} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] hover:scale-[1.02] transition-transform">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Pending Invitations (Invitee only) */}
      {!isOwner && myPendingInvitations.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Mail className="size-5 text-[#8a9a7b]" /> Your Pending Invitations ({myPendingInvitations.length})</h3>
          <div className="space-y-3">
            {myPendingInvitations.map((inv: any) => (
              <div key={inv.id} className="glass-button glass-lilac rounded-2xl p-4">
                <div className="mb-2">
                  <p className="text-sm font-bold text-[#22393c]">Invited to join {project.title}</p>
                  {inv.project_roles?.title && <p className="text-xs text-[#668184]">Role: {inv.project_roles.title}</p>}
                </div>
                {inv.message && <p className="text-xs text-[#22393c]/80 mb-3 italic">"{inv.message}"</p>}
                <div className="flex gap-2">
                  <button onClick={() => onAcceptInvitation(inv.id)} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white hover:scale-[1.02] transition-transform">Accept</button>
                  <button onClick={() => onDeclineInvitation(inv.id)} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] hover:scale-[1.02] transition-transform">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Positions */}
      {openRoles.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Briefcase className="size-5 text-[#8a9a7b]" /> Open Positions</h3>
          <div className="space-y-3">
            {openRoles.map((role: any) => (
              <div key={role.id} className="glass-button glass-lilac rounded-2xl p-5">
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-lg font-bold">{role.title}</h4>
                  <span className="rounded-full bg-white/50 px-2 py-1 text-xs">{role.slots} slot{role.slots > 1 ? "s" : ""}</span>
                </div>
                {role.description && <p className="mb-3 text-sm text-[#22393c]/80">{role.description}</p>}
                {role.project_role_skills && role.project_role_skills.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1">
                    {role.project_role_skills.map((rs: any, idx: number) => (
                      <span key={idx} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${rs.importance === "required" ? "bg-[#8a9a7b] text-white" : "bg-[#22393c]/10 text-[#22393c]"}`}>
                        {rs.skills?.name}{rs.importance === "required" && " • Required"}
                      </span>
                    ))}
                  </div>
                )}
                {!isOwner && (
                  <button onClick={() => onApplyRole(role)} className="w-full rounded-xl bg-[#8a9a7b] py-2 text-sm font-bold text-white transition-transform hover:scale-[1.02]">
                    Apply for this Role
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {openRoles.length === 0 && teamMembers.length === 0 && !isOwner && (
        <div className="text-center py-8 text-[#668184]">
          <p className="text-sm">No open positions or team members yet.</p>
        </div>
      )}
    </motion.section>
  )
}
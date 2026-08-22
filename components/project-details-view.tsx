"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Brain,
  CheckCircle2,
  Code,
  ExternalLink,
  GitBranch,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
  Zap,
  Clock,
  Mail,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

type ProjectDetailsViewProps = {
  projectId: string
}

type Project = {
  id: string
  title: string
  description: string | null
  owner_id: string
  status: string | null
  visibility: string | null
  mentor_status: string | null
  created_at: string
  end_date: string | null
  github_url: string | null
  demo_url: string | null
  image_url: string | null
  departments?: { name: string } | null
  people?: { full_name: string } | null
}

type TeamMember = {
  id: string
  person_id: string | null
  project_id: string
  role: string | null
  status: string
  joined_at: string | null
  left_at: string | null
  people?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    role: string | null
    people_skills?: Array<{ skills?: { name: string } | null }>
  } | null
}

type OpenRole = {
  id: string
  project_id: string
  title: string
  description: string | null
  slots: number
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  project_role_skills?: Array<{
    id: string
    importance: string | null
    skills?: { id: string; name: string; category: string | null } | null
  }>
}

type Application = {
  id: string
  project_role_id: string
  applicant_id: string
  message: string | null
  status: string
  created_at: string
  updated_at: string
  project_roles?: { title: string } | null
  people?: { full_name: string; role: string | null } | null
}

type Invitation = {
  id: string
  project_id: string
  project_role_id: string | null
  invitee_id: string
  invited_by: string
  message: string | null
  status: string
  created_at: string
  responded_at: string | null
  project_roles?: { title: string } | null
  people?: { full_name: string; role: string | null } | null
}

type ProjectSkill = {
  importance: string | null
  skills?: { id: string; name: string; category: string | null } | null
}

type ProjectTool = {
  tools?: { id: string; name: string; category: string | null; website_url: string | null } | null
}

type ProjectLineage = {
  child_project_id: string
  relationship_type: string
  projects?: { id: string; title: string; description: string | null; status: string | null; image_url: string | null } | null
}

/* =========================================================
   Helpers
========================================================= */

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

/* =========================================================
   Add Open Role Modal
========================================================= */

function AddRoleSlotModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [roleName, setRoleName] = useState("")
  const [description, setDescription] = useState("")
  const [slots, setSlots] = useState(1)
  const [selectedSkills, setSelectedSkills] = useState<any[]>([])
  const [allSkills, setAllSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!isOpen) return
    const fetchSkills = async () => {
      const { data } = await supabase.from("skills").select("id, name, category").order("name")
      if (data) setAllSkills(data)
    }
    fetchSkills()
  }, [isOpen])

  const handleAddRole = async () => {
    if (!roleName.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: role, error } = await supabase
      .from("project_roles")
      .insert({
        project_id: projectId,
        title: roleName.trim(),
        description: description.trim() || null,
        slots,
        status: "open",
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      setLoading(false)
      alert(`Failed to create role: ${error.message}`)
      return
    }

    if (role && selectedSkills.length > 0) {
      await supabase.from("project_role_skills").insert(
        selectedSkills.map((skill) => ({
          project_role_id: role.id,
          skill_id: skill.id,
          importance: "required",
        }))
      )
    }

    setLoading(false)
    setRoleName("")
    setDescription("")
    setSlots(1)
    setSelectedSkills([])
    onSuccess()
    onClose()
  }

  const toggleSkill = (skill: any) => {
    setSelectedSkills((prev) =>
      prev.find((s) => s.id === skill.id)
        ? prev.filter((s) => s.id !== skill.id)
        : [...prev, skill]
    )
  }

  const filteredSkills = allSkills.filter((skill) =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#22393c]">Create Open Role</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Role Title</label>
            <input
              type="text"
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              placeholder="e.g. Frontend Developer"
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what this role entails..."
              rows={3}
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Number of Slots</label>
            <input
              type="number"
              value={slots}
              onChange={(event) => setSlots(Math.max(1, parseInt(event.target.value) || 1))}
              min="1"
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Required Skills</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#668184]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search skills..."
                className="w-full rounded-xl border border-[#22393c]/10 bg-white/50 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]"
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white/30 rounded-xl">
              {filteredSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedSkills.find((s) => s.id === skill.id)
                      ? "bg-[#8a9a7b] text-white"
                      : "bg-white/60 text-[#22393c] hover:bg-white"
                  }`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
            {selectedSkills.length > 0 && (
              <p className="text-xs text-[#668184] mt-2">
                {selectedSkills.length} skill{selectedSkills.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <button
            onClick={handleAddRole}
            disabled={!roleName.trim() || loading}
            className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating Role..." : "Create Open Role"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* =========================================================
   Invite Someone Modal
========================================================= */

function InviteModal({
  projectId,
  openRoles,
  isOpen,
  onClose,
  onSuccess,
}: {
  projectId: string
  openRoles: OpenRole[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [potentialInvitees, setPotentialInvitees] = useState<any[]>([])
  const [selectedInvitee, setSelectedInvitee] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setPotentialInvitees([])
      return
    }

    const searchPeople = async () => {
      setSearching(true)
      const { data } = await supabase
        .from("people")
        .select("id, full_name, role")
        .ilike("full_name", `%${searchQuery.trim()}%`)
        .limit(5)
      if (data) setPotentialInvitees(data)
      setSearching(false)
    }

    const timer = setTimeout(searchPeople, 250)
    return () => clearTimeout(timer)
  }, [isOpen, searchQuery])

  const handleInvite = async () => {
    if (!selectedInvitee || !selectedRole) {
      alert("Please select a person and a role.")
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from("project_invitations").insert({
      project_id: projectId,
      project_role_id: selectedRole || null,
      invitee_id: selectedInvitee,
      invited_by: user?.id,
      message: message.trim() || null,
      status: "pending",
    })

    setLoading(false)

    if (error) {
      alert(`Failed to send invitation: ${error.message}`)
      return
    }

    setSelectedInvitee("")
    setSelectedRole("")
    setMessage("")
    setSearchQuery("")
    onSuccess()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#22393c]">Invite Someone</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Search People</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#668184]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name..."
                className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]"
              />
            </div>
          </div>

          {searching && (
            <div className="flex justify-center py-3">
              <Loader2 className="size-5 animate-spin text-[#668184]" />
            </div>
          )}

          {potentialInvitees.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {potentialInvitees.map((person) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedInvitee(person.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 transition-colors ${
                    selectedInvitee === person.id
                      ? "border-2 border-[#8a9a7b] bg-[#8a9a7b]/20"
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b] text-sm font-bold text-white">
                    {getInitials(person.full_name)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-[#22393c]">{person.full_name}</p>
                    <p className="text-xs text-[#668184]">{person.role || "Student"}</p>
                  </div>
                  {selectedInvitee === person.id && <CheckCircle2 className="size-5 text-[#8a9a7b]" />}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Role (Optional)</label>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]"
            >
              <option value="">No specific role</option>
              {openRoles.map((role) => (
                <option key={role.id} value={role.id}>{role.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Message (Optional)</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Why are you inviting them?"
              rows={3}
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none"
            />
          </div>

          <button
            onClick={handleInvite}
            disabled={!selectedInvitee || loading}
            className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* =========================================================
   Apply for Role Modal
========================================================= */

function ApplyModal({
  role,
  isOpen,
  onClose,
  onSuccess,
}: {
  role: OpenRole | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    if (!role) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Please sign in to apply.")
      setLoading(false)
      return
    }

    const { error } = await supabase.from("project_applications").insert({
      project_role_id: role.id,
      applicant_id: user.id,
      message: message.trim() || null,
      status: "pending",
    })

    setLoading(false)

    if (error) {
      alert(`Failed to submit application: ${error.message}`)
      return
    }

    onSuccess()
    onClose()
  }

  if (!isOpen || !role) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#22393c]">Apply for {role.title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Why are you a good fit?</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell the project owner about your skills and interest..."
              rows={4}
              className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none"
            />
          </div>

          <button
            onClick={handleApply}
            disabled={loading}
            className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* =========================================================
   AI Extensions Modal
========================================================= */

function AIExtensionsModal({
  projectId,
  isOpen,
  onClose,
}: {
  projectId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [extensions, setExtensions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const fetchExtensions = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("project_ideas")
        .select("*")
        .eq("source_project_id", projectId)
        .eq("created_from_ai", true)
        .order("created_at", { ascending: false })
      if (!error && data) setExtensions(data)
      else setExtensions([])
      setLoading(false)
    }
    fetchExtensions()
  }, [isOpen, projectId])

  const handleAdoptExtension = async (ideaId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert("Please sign in first."); return }

    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({
        title: "New Extension Project",
        description: `Created from AI recommendation ${ideaId}`,
        owner_id: user.id,
        status: "active",
        visibility: "public",
      })
      .select("id")
      .single()

    if (error || !newProject) { alert(error?.message || "Unable to create project."); return }

    await supabase.from("project_lineages").insert({
      parent_project_id: projectId,
      child_project_id: newProject.id,
      relationship_type: "extension",
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-button glass-neutral max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b] text-white">
              <Brain className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-[#22393c]">AI Recommended Extensions</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10">
            <X className="size-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="size-8 animate-spin text-[#668184]" /></div>
        ) : extensions.length === 0 ? (
          <div className="py-10 text-center">
            <Brain className="mx-auto mb-3 size-12 text-[#668184]" />
            <p className="text-sm text-[#668184]">No AI extensions generated yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {extensions.map((extension) => (
              <div key={extension.id} className="glass-button glass-aqua rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
                  <div className="flex-1">
                    <h4 className="mb-1 text-base font-bold text-[#22393c]">{extension.title}</h4>
                    <p className="mb-2 text-sm text-[#22393c]/80">{extension.description}</p>
                    <div className="mb-3 flex items-center gap-2 text-xs text-[#668184]">
                      {extension.domain && <span className="rounded-full bg-white/60 px-2 py-1">{extension.domain}</span>}
                      {extension.difficulty && <span className="rounded-full bg-white/60 px-2 py-1 capitalize">{extension.difficulty}</span>}
                    </div>
                    {extension.ai_reason && <p className="mb-3 text-xs italic text-[#668184]">💡 {extension.ai_reason}</p>}
                    <button
                      onClick={() => handleAdoptExtension(extension.id)}
                      className="rounded-full bg-[#22393c] px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105"
                    >
                      Adopt This Idea
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

/* =========================================================
   Main Project Details
========================================================= */

export function ProjectDetailsView({ projectId }: ProjectDetailsViewProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [openRoles, setOpenRoles] = useState<OpenRole[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [skills, setSkills] = useState<ProjectSkill[]>([])
  const [tools, setTools] = useState<ProjectTool[]>([])
  const [lineages, setLineages] = useState<ProjectLineage[]>([])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hasRequested, setHasRequested] = useState(false)

  const [showAIExtensions, setShowAIExtensions] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [applyRole, setApplyRole] = useState<OpenRole | null>(null)

  const [activeTab, setActiveTab] = useState<"overview" | "team" | "ai">("overview")
  const [refreshing, setRefreshing] = useState(false)

  /* =========================================================
     Fetch Project
  ========================================================= */

  const fetchProjectData = async () => {
    if (!projectId) return

    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      /* Project */
      try {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(`*, departments(name), people!projects_owner_id_fkey(full_name)`)
          .eq("id", projectId)
          .maybeSingle()

        if (projectError) throw projectError
        if (!projectData) {
          setProject(null)
          return
        }
        setProject(projectData)
      } catch (err) {
        console.error("Project fetch error:", err)
        setError("Unable to load project.")
        return
      }

      /* Active Team */
      try {
        const { data: membersData } = await supabase
          .from("team_members")
          .select(`*, people(id, full_name, avatar_url, role, people_skills(skills(name)))`)
          .eq("project_id", projectId)
          .eq("status", "active")

        setTeamMembers(membersData || [])
      } catch (err) { console.error("Team members error:", err) }

      /* Open Roles */
      try {
        const { data: rolesData } = await supabase
          .from("project_roles")
          .select(`*, project_role_skills(id, importance, skills(id, name, category))`)
          .eq("project_id", projectId)
          .eq("status", "open")

        setOpenRoles(rolesData || [])
      } catch (err) { console.warn("Open roles fetch failed:", err); setOpenRoles([]) }

      /* Applications (owner only) */
      if (user && project && user.id === project.owner_id) {
        try {
          const { data: appsData } = await supabase
            .from("project_applications")
            .select(`*, project_roles(title), people(full_name, role)`)
            .in("project_role_id", (openRoles || []).map((r) => r.id))
            .eq("status", "pending")

          setApplications(appsData || [])
        } catch (err) { console.error("Applications error:", err) }
      }

      /* Invitations */
      try {
        const { data: invData } = await supabase
          .from("project_invitations")
          .select(`*, project_roles(title), people(full_name, role)`)
          .eq("project_id", projectId)
          .eq("status", "pending")

        setInvitations(invData || [])
      } catch (err) { console.error("Invitations error:", err) }

      /* Skills */
      try {
        const { data: skillsData } = await supabase
          .from("project_skills")
          .select(`importance, skills(id, name, category)`)
          .eq("project_id", projectId)

        setSkills(skillsData || [])
      } catch (err) { console.error("Skills error:", err) }

      /* Tools */
      try {
        const { data: toolsData } = await supabase
          .from("project_tools")
          .select(`tools(id, name, category, website_url)`)
          .eq("project_id", projectId)

        setTools(toolsData || [])
      } catch (err) { console.error("Tools error:", err) }

      /* Child Projects */
      try {
        const { data: lineageData } = await supabase
          .from("project_lineages")
          .select(`child_project_id, relationship_type, projects!child_project_id(id, title, description, status, image_url)`)
          .eq("parent_project_id", projectId)

        setLineages(lineageData || [])
      } catch (err) { console.error("Lineages error:", err) }

      /* Existing Join Request */
      if (user) {
        try {
          const { data: requestData } = await supabase
            .from("team_members")
            .select("id")
            .eq("project_id", projectId)
            .eq("person_id", user.id)
            .eq("status", "requested")
            .maybeSingle()

          setHasRequested(Boolean(requestData))
        } catch (err) { console.error("Request check error:", err) }
      } else {
        setHasRequested(false)
      }
    } catch (fetchError) {
      console.error("Project details error:", fetchError)
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load project details.")
    }
  }

  /* =========================================================
     Initial Load
  ========================================================= */

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchProjectData()
      setLoading(false)
    }
    load()
  }, [projectId])

  /* =========================================================
     Refresh
  ========================================================= */

  const refreshData = async () => {
    setRefreshing(true)
    await fetchProjectData()
    setRefreshing(false)
  }

  /* =========================================================
     Delete Project
  ========================================================= */

  const handleDeleteProject = async () => {
    if (!project) return
    const confirmed = window.confirm(`Delete "${project.title}"?\n\nThis action cannot be undone.`)
    if (!confirmed) return

    const { error: deleteError } = await supabase.from("projects").delete().eq("id", project.id)
    if (deleteError) { alert(`Unable to delete project: ${deleteError.message}`); return }
    router.push("/projects")
  }

  /* =========================================================
     Handle Application (Owner)
  ========================================================= */

  const handleApplicationDecision = async (applicationId: string, decision: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("project_applications")
      .update({ status: decision })
      .eq("id", applicationId)

    if (error) { alert(`Failed to ${decision} application: ${error.message}`); return }

    // If accepted, add to team_members
    if (decision === "accepted") {
      const app = applications.find((a) => a.id === applicationId)
      if (app) {
        await supabase.from("team_members").insert({
          project_id: projectId,
          person_id: app.applicant_id,
          role: app.project_roles?.title || "Contributor",
          status: "active",
        })
      }
    }

    refreshData()
  }

  /* =========================================================
     Handle Invitation Response (Invitee)
  ========================================================= */

  const handleInvitationResponse = async (invitationId: string, response: "accepted" | "declined") => {
    const { error } = await supabase
      .from("project_invitations")
      .update({ status: response, responded_at: new Date().toISOString() })
      .eq("id", invitationId)

    if (error) { alert(`Failed to ${response} invitation: ${error.message}`); return }

    // If accepted, add to team_members
    if (response === "accepted") {
      const inv = invitations.find((i) => i.id === invitationId)
      if (inv) {
        await supabase.from("team_members").insert({
          project_id: projectId,
          person_id: inv.invitee_id,
          role: inv.project_roles?.title || "Contributor",
          status: "active",
        })
      }
    }

    refreshData()
  }

  /* =========================================================
     Request To Join (Legacy fallback)
  ========================================================= */

  const handleRequestJoin = async () => {
    if (!currentUser || !project) { alert("Please sign in to request to join."); return }
    if (isOwner || isCurrentMember || hasRequested) return

    const { error: requestError } = await supabase.from("team_members").insert({
      project_id: projectId,
      person_id: currentUser.id,
      role: "Contributor",
      status: "requested",
    })

    if (requestError) { alert(`Unable to request to join: ${requestError.message}`); return }
    setHasRequested(true)
  }

  /* =========================================================
     Derived State
  ========================================================= */

  const isOwner = currentUser?.id === project?.owner_id
  const maxMembers = 5
  const currentMemberCount = teamMembers.length
  const hasOpenSlots = currentMemberCount < maxMembers
  const isCurrentMember = teamMembers.some((member) => member.person_id === currentUser?.id)
  const canRequestToJoin = !isOwner && !isCurrentMember && !hasRequested && hasOpenSlots

  /* My pending invitations */
  const myPendingInvitations = invitations.filter((inv) => inv.invitee_id === currentUser?.id)

  /* =========================================================
     Loading State
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8]">
        <Loader2 className="size-10 animate-spin text-[#668184]" />
      </div>
    )
  }

  /* =========================================================
     Error State
  ========================================================= */

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#e8e9e8] px-5 text-center text-[#22393c]">
        <AlertCircle className="size-10 text-red-600" />
        <p className="max-w-md text-sm">
          Unable to load this project:
          <br />
          <span className="text-[#668184]">{error}</span>
        </p>
        <button
          onClick={async () => { setLoading(true); await fetchProjectData(); setLoading(false) }}
          className="rounded-full bg-[#22393c] px-5 py-2.5 text-xs font-semibold text-white"
        >
          Try Again
        </button>
      </div>
    )
  }

  /* =========================================================
     Not Found
  ========================================================= */

  if (!project) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8] text-[#22393c]">
        <div className="text-center">
          <p className="mb-4 text-lg font-semibold">Project not found.</p>
          <button onClick={() => router.push("/projects")} className="rounded-full bg-[#22393c] px-5 py-2 text-sm font-semibold text-white">
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  /* =========================================================
     Render
  ========================================================= */

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] pb-32 text-[#22393c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between glass-button glass-neutral px-5 py-4">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c]">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 px-4 text-center">
          <h1 className="truncate text-sm font-bold">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button onClick={() => router.push(`/projects/${project.id}/edit`)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8a9a7b]/20 text-[#8a9a7b]" aria-label="Edit project">
                <Pencil className="size-4" />
              </button>
              <button onClick={handleDeleteProject} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600" aria-label="Delete project">
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[73px] z-10 mx-5 mt-4 flex items-center rounded-full p-1 glass-button glass-neutral">
        {([
          ["overview", "Overview"],
          ["team", "Team"],
          ["ai", "AI"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === value ? "glass-ink text-white" : "text-[#668184]"
            }`}
          >
            {value === "ai" && <Brain className="mr-1 inline size-3" />}
            {label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="relative mx-auto w-full max-w-2xl space-y-8 px-5 pb-40 pt-6">
        {/* =====================================================
            OVERVIEW
        ====================================================== */}
        {activeTab === "overview" && (
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
                        {project.mentor_status === "accepted" ? "Mentored" : "Student Led"}
                      </span>
                    </div>
                  </div>

                  <p className="mb-3 text-sm text-[#22393c]/80">{project.description || "No description provided."}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#668184]">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {project.people?.full_name || "Unknown Owner"}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="size-3" />
                      {project.departments?.name || "General"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {formatDate(project.created_at) && (
                      <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-medium">
                        Created: {formatDate(project.created_at)}
                      </span>
                    )}
                    {project.end_date && (
                      <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-medium">
                        Completed: {formatDate(project.end_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(project.github_url || project.demo_url) && (
                <div className="mt-4 flex gap-3 border-t border-[#22393c]/10 pt-4">
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
                </div>
              )}
            </motion.section>

            {/* Team Preview */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="size-5 text-[#8a9a7b]" /> Team Composition
                </h3>
                <span className="text-sm font-medium text-[#668184]">{currentMemberCount}/{maxMembers}</span>
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
                  {hasOpenSlots ? `${maxMembers - currentMemberCount} open slot${maxMembers - currentMemberCount > 1 ? "s" : ""}` : "Team is full"}
                </p>
              </div>
            </motion.section>

            {/* Tools */}
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#668184]">Tools & Technologies</h3>
              <div className="glass-button glass-neutral flex flex-wrap gap-2 rounded-3xl p-4">
                {tools.length > 0 ? (
                  tools.map((tool, index) => (
                    <a key={tool.tools?.id || index} href={tool.tools?.website_url || "#"} target={tool.tools?.website_url ? "_blank" : undefined} rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-[#22393c]/10 px-4 py-2 text-xs font-semibold">
                      {tool.tools?.name}
                      {tool.tools?.website_url && <ExternalLink className="size-3" />}
                    </a>
                  ))
                ) : (
                  <span className="text-sm text-[#668184]">No tools added yet.</span>
                )}
              </div>
            </section>

            {/* Skills */}
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#668184]">Required Skills</h3>
              <div className="glass-button glass-neutral flex flex-wrap gap-2 rounded-3xl p-4">
                {skills.length > 0 ? (
                  skills.map((skill, index) => (
                    <span key={skill.skills?.id || index} className={`rounded-full px-4 py-2 text-xs font-semibold ${skill.importance === "required" ? "bg-[#8a9a7b] text-white" : "bg-[#22393c]/10 text-[#22393c]"}`}>
                      {skill.skills?.name}{skill.importance === "required" && " • Required"}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#668184]">No skills specified.</span>
                )}
              </div>
            </section>

            {/* Extensions */}
            {lineages.length > 0 && (
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <GitBranch className="size-5 text-[#8a9a7b]" /> Project Extensions
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {lineages.map((lineage) => (
                    <Link key={lineage.child_project_id} href={`/projects/${lineage.projects?.id}`} className="glass-button glass-lilac rounded-3xl p-4 transition-transform hover:-translate-y-0.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#22393c]/10 text-lg font-bold">
                          {lineage.projects?.image_url ? (
                            <img src={lineage.projects.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            lineage.projects?.title?.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="mb-1 text-sm font-semibold">{lineage.projects?.title}</h4>
                          <p className="line-clamp-2 text-[10px] text-[#668184]">{lineage.projects?.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* =====================================================
            TEAM TAB
        ====================================================== */}
        {activeTab === "team" && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-6 text-sm text-[#668184]">Build your team around the skills your project needs.</p>

            {/* Current Team */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Team</h3>
                <span className="text-sm font-medium text-[#668184]">{currentMemberCount} / {maxMembers} members</span>
              </div>

              <div className="overflow-hidden rounded-3xl glass-button glass-neutral">
                <div className="grid grid-cols-12 gap-4 border-b border-[#22393c]/10 bg-[#22393c]/5 p-4 text-xs font-bold uppercase tracking-wider text-[#668184]">
                  <div className="col-span-4">Person</div>
                  <div className="col-span-4">Role</div>
                  <div className="col-span-4">Skills</div>
                </div>

                <div className="divide-y divide-[#22393c]/5">
                  {teamMembers.map((member) => (
                                      <div key={member.id} className="grid grid-cols-12 items-center gap-4 p-4">
                                        <div className="col-span-4 flex items-center gap-3">
                    <Link href={`/profile/${member.people?.id}`} className="flex items-center gap-3 group">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-xs font-bold text-white group-hover:scale-105 transition-transform">
                        {getInitials(member.people?.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold group-hover:text-[#8a9a7b] transition-colors">{member.people?.full_name || "Unknown"}</p>
                        <p className="text-[10px] text-[#668184]">{member.people?.role || "Student"}</p>
                      </div>
                    </Link>
                  </div>
                      <div className="col-span-4">
                        <span className="rounded-full bg-[#8a9a7b]/20 px-3 py-1 text-xs font-medium">{member.role || "Contributor"}</span>
                      </div>
                      <div className="col-span-4 flex flex-wrap gap-1">
                        {member.people?.people_skills?.slice(0, 2).map((skill, index) => (
                          <span key={index} className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium">{skill.skills?.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {teamMembers.length === 0 && (
                    <div className="p-8 text-center text-sm text-[#668184]">No team members yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="mb-8 flex gap-3">
                <button onClick={() => setShowAddRole(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8a9a7b] py-3 text-sm font-semibold text-white hover:scale-[1.02] transition-transform">
                  <Plus className="size-4" /> Create Open Role
                </button>
                <button onClick={() => setShowInvite(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22393c] py-3 text-sm font-semibold text-white hover:scale-[1.02] transition-transform">
                  <Mail className="size-4" /> Invite Someone
                </button>
              </div>
            )}

            {/* Pending Applications (Owner only) */}
            {isOwner && applications.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Clock className="size-5 text-[#8a9a7b]" /> Pending Applications ({applications.length})
                </h3>
                <div className="space-y-3">
                  {applications.map((app) => (
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
                        <button onClick={() => handleApplicationDecision(app.id, "accepted")} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white hover:scale-[1.02] transition-transform">
                          Accept
                        </button>
                        <button onClick={() => handleApplicationDecision(app.id, "rejected")} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] hover:scale-[1.02] transition-transform">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Pending Invitations (Invitee only) */}
            {!isOwner && myPendingInvitations.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Mail className="size-5 text-[#8a9a7b]" /> Your Pending Invitations ({myPendingInvitations.length})
                </h3>
                <div className="space-y-3">
                  {myPendingInvitations.map((inv) => (
                    <div key={inv.id} className="glass-button glass-lilac rounded-2xl p-4">
                      <div className="mb-2">
                        <p className="text-sm font-bold text-[#22393c]">Invited to join {project.title}</p>
                        {inv.project_roles?.title && <p className="text-xs text-[#668184]">Role: {inv.project_roles.title}</p>}
                      </div>
                      {inv.message && <p className="text-xs text-[#22393c]/80 mb-3 italic">"{inv.message}"</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleInvitationResponse(inv.id, "accepted")} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white hover:scale-[1.02] transition-transform">
                          Accept
                        </button>
                        <button onClick={() => handleInvitationResponse(inv.id, "declined")} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] hover:scale-[1.02] transition-transform">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Positions */}
            {openRoles.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Briefcase className="size-5 text-[#8a9a7b]" /> Open Positions
                </h3>
                <div className="space-y-3">
                  {openRoles.map((role) => (
                    <div key={role.id} className="glass-button glass-lilac rounded-2xl p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg">{role.title}</h4>
                        <span className="text-xs bg-white/50 px-2 py-1 rounded-full">{role.slots} slot{role.slots > 1 ? "s" : ""}</span>
                      </div>
                      {role.description && <p className="text-sm text-[#22393c]/80 mb-3">{role.description}</p>}
                      {role.project_role_skills && role.project_role_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {role.project_role_skills.map((rs) => (
                            <span key={rs.id} className={`text-[10px] px-2 py-1 rounded-full font-semibold ${rs.importance === "required" ? "bg-[#8a9a7b] text-white" : "bg-[#22393c]/10 text-[#22393c]"}`}>
                              {rs.skills?.name}{rs.importance === "required" && " • Required"}
                            </span>
                          ))}
                        </div>
                      )}
                      {!isOwner && (
                        <button onClick={() => setApplyRole(role)} className="w-full py-2 rounded-xl bg-[#8a9a7b] text-white text-sm font-bold hover:scale-[1.02] transition-transform">
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
        )}

        {/* =====================================================
            AI TAB
        ====================================================== */}
        {activeTab === "ai" && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-[#8a9a7b]" />
                <h3 className="text-lg font-semibold">AI Recommendations</h3>
              </div>
              <button onClick={() => setShowAIExtensions(true)} className="flex items-center gap-2 rounded-full bg-[#8a9a7b] px-4 py-2 text-xs font-semibold text-white">
                <Sparkles className="size-4" /> View All
              </button>
            </div>

            <div className="space-y-3">
              <div className="glass-button glass-aqua rounded-3xl p-5">
                <div className="flex items-start gap-3">
                  <TrendingUp className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
                  <div>
                    <h4 className="mb-1 text-sm font-bold">Skill Gap Analysis</h4>
                    <p className="text-xs text-[#22393c]/80">AI recommendations will appear here when generated for this project.</p>
                  </div>
                </div>
              </div>

              <div className="glass-button glass-lilac rounded-3xl p-5">
                <div className="flex items-start gap-3">
                  <Zap className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
                  <div>
                    <h4 className="mb-1 text-sm font-bold">Project Insights</h4>
                    <p className="text-xs text-[#22393c]/80">Project velocity and progress insights can be generated from project activity.</p>
                  </div>
                </div>
              </div>

              <div className="glass-button glass-peach rounded-3xl p-5">
                <div className="flex items-start gap-3">
                  <Award className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
                  <div className="flex-1">
                    <h4 className="mb-1 text-sm font-bold">Potential Extensions</h4>
                    <p className="mb-3 text-xs text-[#22393c]/80">Explore AI-generated ideas related to this project.</p>
                    <button onClick={() => setShowAIExtensions(true)} className="text-xs font-semibold underline">View Recommendations →</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </div>

      {/* Bottom Actions */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-3 px-5 py-4 glass-button glass-neutral sm:justify-center">
          <button
            onClick={handleRequestJoin}
            disabled={!canRequestToJoin}
            className="flex-1 rounded-full bg-[#22393c] py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-sm"
          >
            {hasRequested ? "Request Sent" : isCurrentMember ? "Already on Team" : !hasOpenSlots ? "Team is Full" : "Request to Join"}
          </button>
          {project.owner_id && (
            <button onClick={() => router.push(`/chat/${project.owner_id}`)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-white" aria-label="Message project owner">
              <MessageCircle className="size-5" />
            </button>
          )}
        </div>
      )}

      {/* Refresh Indicator */}
      {refreshing && (
        <div className="fixed right-5 top-24 z-40 flex items-center gap-2 rounded-full bg-[#22393c] px-4 py-2 text-xs font-medium text-white shadow-lg">
          <Loader2 className="size-3 animate-spin" /> Updating...
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddRole && <AddRoleSlotModal projectId={projectId} isOpen={showAddRole} onClose={() => setShowAddRole(false)} onSuccess={refreshData} />}
        {showInvite && <InviteModal projectId={projectId} openRoles={openRoles} isOpen={showInvite} onClose={() => setShowInvite(false)} onSuccess={refreshData} />}
        {showAIExtensions && <AIExtensionsModal projectId={projectId} isOpen={showAIExtensions} onClose={() => setShowAIExtensions(false)} />}
        {applyRole && <ApplyModal role={applyRole} isOpen={!!applyRole} onClose={() => setApplyRole(null)} onSuccess={refreshData} />}
      </AnimatePresence>
    </main>
  )
}
"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle, ArrowLeft, Award, Brain, CheckCircle2, Code, ExternalLink, GitBranch,
  Loader2, MessageCircle, Pencil, Plus, Search, Sparkles, Trash2, TrendingUp, Users, X, Zap,
  Clock, Mail, Briefcase, Link as LinkIcon, MessageSquare, ChevronDown, Tag, Bookmark,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { ProjectTasksTab } from "@/components/project-tasks-tab"
import { ProjectAITab } from "@/components/project-ai-tab"
import { ProjectOverviewTab } from "@/components/project-overview-tab"

type ProjectDetailsViewProps = { projectId: string }

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
  links: any[] | null
  department_id?: string | null
  departments?: { name: string } | null
  people?: { full_name: string } | null
  mentor?: { full_name: string } | null
}

type TeamMember = {
  id: string
  person_id: string | null
  project_id: string
  role: string | null
  status: string
  covered_skill_ids?: string[] | null
  people?: {
    id: string
    full_name: string | null
    role: string | null
    people_skills?: Array<{ skills?: { id: string; name: string } | null }>
  } | null
}

type OpenRole = {
  id: string
  title: string
  description: string | null
  slots: number
  project_role_skills?: Array<{ importance: string | null; skills?: { name: string } | null }>
}

type Application = {
  id: string
  project_role_id: string
  applicant_id: string
  message: string | null
  status: string
  project_roles?: { title: string } | null
  people?: { full_name: string } | null
}

type Invitation = {
  id: string
  project_id: string
  project_role_id: string | null
  invitee_id: string
  message: string | null
  status: string
  project_roles?: { title: string } | null
}

type ProjectSkill = { importance: string | null; skills?: { id: string; name: string } | null }
type ProjectTool = { tools?: { name: string; website_url: string | null } | null }

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
   Modals
========================================================= */

function EditSkillsToolsModal({ projectId, currentSkills, currentTools, onClose, onSuccess }: { 
  projectId: string; 
  currentSkills: ProjectSkill[]; 
  currentTools: ProjectTool[]; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const [allSkills, setAllSkills] = useState<any[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set(currentSkills.map(s => s.skills?.id).filter(Boolean) as string[]))
  const [tools, setTools] = useState<{ name: string; website_url: string }[]>(currentTools.map(t => ({ name: t.tools?.name || '', website_url: t.tools?.website_url || '' })))
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSkills = async () => {
      const { data } = await supabase.from("skills").select("id, name, category").order("name")
      if (data) setAllSkills(data)
    }
    fetchSkills()
  }, [])

  const toggleSkill = (id: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addTool = () => setTools([...tools, { name: "", website_url: "" }])
  const removeTool = (index: number) => setTools(tools.filter((_, i) => i !== index))
  const updateTool = (index: number, field: 'name' | 'website_url', value: string) => {
    const newTools = [...tools]
    newTools[index][field] = value
    setTools(newTools)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await supabase.from("project_skills").delete().eq("project_id", projectId)
      if (selectedSkillIds.size > 0) {
        const skillInserts = Array.from(selectedSkillIds).map(skill_id => ({ project_id: projectId, skill_id }))
        const { error: skillError } = await supabase.from("project_skills").insert(skillInserts)
        if (skillError) throw skillError
      }

      await supabase.from("project_tools").delete().eq("project_id", projectId)
      
      for (const tool of tools) {
        if (!tool.name.trim()) continue
        
        let { data: existingTool } = await supabase.from("tools").select("id").eq("name", tool.name.trim()).maybeSingle()
        let toolId = existingTool?.id
        
        if (!toolId) {
          const { data: newTool, error: createError } = await supabase.from("tools").insert({ name: tool.name.trim(), website_url: tool.website_url.trim() || null }).select("id").single()
          if (createError) throw createError
          toolId = newTool.id
        } else if (tool.website_url.trim()) {
           await supabase.from("tools").update({ website_url: tool.website_url.trim() }).eq("id", toolId)
        }

        const { error: linkError } = await supabase.from("project_tools").insert({ project_id: projectId, tool_id: toolId })
        if (linkError) throw linkError
      }

      alert("Skills and tools updated")
      onSuccess()
    } catch (err: any) {
      alert(err?.message || "Couldn't save changes.")
    } finally {
      setLoading(false)
    }
  }

  const filteredSkills = allSkills.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#22393c]">Edit Skills & Tools</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Skills</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#668184]" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search skills..." 
                className="w-full rounded-xl border border-[#22393c]/10 bg-white/50 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" 
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white/30 rounded-xl">
              {filteredSkills.map((skill) => (
                <button 
                  key={skill.id} 
                  onClick={() => toggleSkill(skill.id)} 
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedSkillIds.has(skill.id) ? "bg-[#8a9a7b] text-white" : "bg-white/60 text-[#22393c] hover:bg-white"}`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#668184] mt-2">{selectedSkillIds.size} skill{selectedSkillIds.size !== 1 ? "s" : ""} selected</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-bold uppercase text-[#668184]">Tools</label>
              <button onClick={addTool} className="flex items-center gap-1 text-xs font-semibold text-[#8a9a7b] hover:text-[#22393c]">
                <Plus className="size-3" /> Add Tool
              </button>
            </div>
            <div className="space-y-2">
              {tools.map((tool, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <input 
                      value={tool.name} 
                      onChange={(e) => updateTool(index, 'name', e.target.value)} 
                      placeholder="Tool name (e.g., Figma)" 
                      className="w-full rounded-lg border border-[#22393c]/10 bg-white/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" 
                    />
                    <input 
                      value={tool.website_url} 
                      onChange={(e) => updateTool(index, 'website_url', e.target.value)} 
                      placeholder="Website URL (optional)" 
                      className="w-full rounded-lg border border-[#22393c]/10 bg-white/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" 
                    />
                  </div>
                  <button onClick={() => removeTool(index)} className="mt-1 p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {tools.length === 0 && <p className="text-xs text-[#668184] italic">No tools added yet.</p>}
            </div>
          </div>

          <button onClick={handleSave} disabled={loading} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function EditProjectModal({ project, onClose, onSuccess }: { project: Project; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description || "")
  const [githubUrl, setGithubUrl] = useState(project.github_url || "")
  const [demoUrl, setDemoUrl] = useState(project.demo_url || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          github_url: githubUrl.trim() || null,
          demo_url: demoUrl.trim() || null,
        })
        .eq("id", project.id)
      
      if (error) throw error
      alert("Project updated successfully")
      onSuccess()
    } catch (err: any) {
      alert(err?.message || "Couldn't save changes.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#22393c]">Edit Project Details</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Project Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" placeholder="e.g. Campus Legacy Platform" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none" placeholder="Describe your project..." />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">GitHub URL</label>
            <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" placeholder="https://github.com/..." />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Demo URL</label>
            <input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" placeholder="https://..." />
          </div>
          <button onClick={handleSave} disabled={loading || !title.trim()} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function EditMemberModal({ member, projectSkills, onClose, onSuccess }: { member: TeamMember; projectSkills: ProjectSkill[]; onClose: () => void; onSuccess: () => void }) {
  const [role, setRole] = useState(member.role || "")
  const [coveredIds, setCoveredIds] = useState<Set<string>>(new Set(member.covered_skill_ids || []))
  const [loading, setLoading] = useState(false)
  const personalSkillIds = new Set(member.people?.people_skills?.map((ps) => ps.skills?.id).filter(Boolean) as string[] | undefined)
  const toggleSkill = (id: string) => { setCoveredIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  
  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from("team_members").update({ role, covered_skill_ids: Array.from(coveredIds) }).eq("id", member.id)
      if (error) throw error
      alert("Team member updated")
      onSuccess()
    } catch (err: any) { alert(err?.message || "Couldn't save changes.") } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-button glass-neutral w-full max-w-sm rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-[#22393c]">Edit {member.people?.full_name?.split(" ")[0] || "Member"}</h3><button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button></div>
        <div className="space-y-5">
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Role in Project</label><input value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" placeholder="e.g. Frontend Developer" /></div>
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-[#668184]"><Tag className="size-3.5" /> Skills covered on this project</label>
            {projectSkills.length === 0 ? <p className="text-xs text-[#668184] italic">This project has no required skills listed yet.</p> : (
              <div className="flex flex-wrap gap-2">
                {projectSkills.map((s, i) => { const id = s.skills?.id; if (!id) return null; const isCovered = coveredIds.has(id); const isPersonal = personalSkillIds.has(id); return (<button key={id || i} type="button" onClick={() => toggleSkill(id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${isCovered ? "bg-[#22393c] text-white" : "bg-white/60 text-[#22393c] hover:bg-white"}`}>{s.skills?.name}{isPersonal && !isCovered && <span className="ml-1 text-[9px] opacity-60">(on profile)</span>}</button>) })}
              </div>
            )}
            <p className="mt-2 text-[10px] text-[#668184]">Skills already on their profile are picked up automatically for the green/red indicator — tag extra ones here if they're covering something not listed on their profile.</p>
          </div>
          <button onClick={handleSave} disabled={loading} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50">{loading ? "Saving..." : "Save Changes"}</button>
        </div>
      </motion.div>
    </div>
  )
}

type LinkType = "github" | "demo" | "custom"
function AddLinkModal({ projectId, initialType = "custom", onClose, onSuccess }: { projectId: string; initialType?: LinkType; onClose: () => void; onSuccess: () => void }) {
  const [type, setType] = useState<LinkType>(initialType)
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const typeOptions: { id: LinkType; label: string }[] = [{ id: "github", label: "GitHub" }, { id: "demo", label: "Live Demo" }, { id: "custom", label: "Other" }]
  
  const handleAdd = async () => {
    if (!url.trim() || (type === "custom" && !label.trim())) return
    setLoading(true)
    try {
      if (type === "github") { const { error } = await supabase.from("projects").update({ github_url: url.trim() }).eq("id", projectId); if (error) throw error } 
      else if (type === "demo") { const { error } = await supabase.from("projects").update({ demo_url: url.trim() }).eq("id", projectId); if (error) throw error } 
      else { const { data: project } = await supabase.from("projects").select("links").eq("id", projectId).single(); const currentLinks = project?.links || []; const { error } = await supabase.from("projects").update({ links: [...currentLinks, { label: label.trim(), url: url.trim() }] }).eq("id", projectId); if (error) throw error }
      alert("Link added"); onSuccess()
    } catch (err: any) { alert(err?.message || "Couldn't add that link.") } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-button glass-neutral w-full max-w-sm rounded-3xl p-6">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-[#22393c]">Add Link</h3><button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button></div>
        <div className="space-y-4">
          <div className="flex gap-2">{typeOptions.map((opt) => (<button key={opt.id} onClick={() => setType(opt.id)} className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-all ${type === opt.id ? "bg-[#22393c] text-white" : "bg-white/60 text-[#22393c]"}`}>{opt.label}</button>))}</div>
          {type === "custom" && <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Link Label (e.g., Figma, Blog Post)" className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" />}
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" />
          <button onClick={handleAdd} disabled={loading} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50">{loading ? "Adding..." : "Add Link"}</button>
        </div>
      </motion.div>
    </div>
  )
}

function CreateChildProjectModal({ parentProject, currentUserId, onClose, onSuccess }: { parentProject: Project; currentUserId: string; onClose: () => void; onSuccess: (newProjectId: string) => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  
  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return
    setLoading(true)
    try {
      const { data: newProject, error: projectError } = await supabase.from("projects").insert({ title: title.trim(), description: description.trim(), owner_id: currentUserId, status: "active", visibility: parentProject.visibility || "public", department_id: parentProject.department_id || null }).select().single()
      if (projectError) throw projectError
      const { error: memberError } = await supabase.from("team_members").insert({ project_id: newProject.id, person_id: currentUserId, role: "Owner / Lead", status: "active" })
      if (memberError) throw memberError
      const { error: lineageError } = await supabase.from("project_lineages").insert({ parent_project_id: parentProject.id, child_project_id: newProject.id })
      if (lineageError) throw lineageError
      alert("Child project created"); onSuccess(newProject.id)
    } catch (err: any) { alert(err?.message || "Couldn't create child project.") } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-button glass-neutral w-full max-w-sm rounded-3xl p-6">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-[#22393c]">Create Child Project</h3><button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button></div>
        <p className="mb-4 text-xs text-[#668184]">This will continue on from <span className="font-semibold text-[#22393c]">{parentProject.title}</span>. You'll be the owner of the new project, and it'll be linked back to this one.</p>
        <div className="space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New project title" className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's different or new in this continuation?" rows={3} className="w-full resize-none rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" />
          <button onClick={handleCreate} disabled={loading} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50">{loading ? "Creating..." : "Create Child Project"}</button>
        </div>
      </motion.div>
    </div>
  )
}

function AddRoleSlotModal({ projectId, isOpen, onClose, onSuccess }: { projectId: string; isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
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
    const { data: role, error } = await supabase.from("project_roles").insert({ project_id: projectId, title: roleName.trim(), description: description.trim() || null, slots, status: "open", created_by: user?.id }).select().single()
    if (error) { setLoading(false); alert(`Failed to create role: ${error.message}`); return }
    if (role && selectedSkills.length > 0) {
      await supabase.from("project_role_skills").insert(selectedSkills.map((skill) => ({ project_role_id: role.id, skill_id: skill.id, importance: "required" })))
    }
    setLoading(false); setRoleName(""); setDescription(""); setSlots(1); setSelectedSkills([]); alert("Role created"); onSuccess(); onClose()
  }
  
  const toggleSkill = (skill: any) => { setSelectedSkills((prev) => prev.find((s) => s.id === skill.id) ? prev.filter((s) => s.id !== skill.id) : [...prev, skill]) }
  const filteredSkills = allSkills.filter((skill) => skill.name.toLowerCase().includes(searchQuery.toLowerCase()))
  
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-[#22393c]">Create Open Role</h3><button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button></div>
        <div className="space-y-4">
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Role Title</label><input type="text" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. Frontend Developer" className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" /></div>
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Description</label><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what this role entails..." rows={3} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none" /></div>
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Number of Slots</label><input type="number" value={slots} onChange={(event) => setSlots(Math.max(1, parseInt(event.target.value) || 1))} min="1" className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" /></div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Required Skills</label>
            <div className="relative mb-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#668184]" /><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search skills..." className="w-full rounded-xl border border-[#22393c]/10 bg-white/50 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" /></div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white/30 rounded-xl">
              {filteredSkills.map((skill) => (<button key={skill.id} onClick={() => toggleSkill(skill)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedSkills.find((s) => s.id === skill.id) ? "bg-[#8a9a7b] text-white" : "bg-white/60 text-[#22393c] hover:bg-white"}`}>{skill.name}</button>))}
            </div>
            {selectedSkills.length > 0 && <p className="text-xs text-[#668184] mt-2">{selectedSkills.length} skill{selectedSkills.length > 1 ? "s" : ""} selected</p>}
          </div>
          <button onClick={handleAddRole} disabled={!roleName.trim() || loading} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Creating Role..." : "Create Open Role"}</button>
        </div>
      </motion.div>
    </div>
  )
}

function InviteModal({ projectId, openRoles, isOpen, onClose, onSuccess }: { projectId: string; openRoles: OpenRole[]; isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [potentialInvitees, setPotentialInvitees] = useState<any[]>([])
  const [selectedInvitee, setSelectedInvitee] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  
  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) { setPotentialInvitees([]); return }
    const searchPeople = async () => {
      setSearching(true)
      const { data } = await supabase.from("people").select("id, full_name, role").ilike("full_name", `%${searchQuery.trim()}%`).limit(5)
      if (data) setPotentialInvitees(data)
      setSearching(false)
    }
    const timer = setTimeout(searchPeople, 250)
    return () => clearTimeout(timer)
  }, [isOpen, searchQuery])
  
  const handleInvite = async () => {
    if (!selectedInvitee) { alert("Please select a person."); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("project_invitations").insert({ project_id: projectId, project_role_id: selectedRole || null, invitee_id: selectedInvitee, invited_by: user?.id, message: message.trim() || null, status: "pending" })
    setLoading(false)
    if (error) { alert(`Failed to send invitation: ${error.message}`); return }
    setSelectedInvitee(""); setSelectedRole(""); setMessage(""); setSearchQuery(""); alert("Invitation sent"); onSuccess(); onClose()
  }
  
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-[#22393c]">Invite Someone</h3><button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button></div>
        <div className="space-y-4">
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Search People</label><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#668184]" /><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name..." className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]" /></div></div>
          {searching && <div className="flex justify-center py-3"><Loader2 className="size-5 animate-spin text-[#668184]" /></div>}
          {potentialInvitees.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {potentialInvitees.map((person) => (<button key={person.id} onClick={() => setSelectedInvitee(person.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 transition-colors ${selectedInvitee === person.id ? "border-2 border-[#8a9a7b] bg-[#8a9a7b]/20" : "bg-white/30 hover:bg-white/50"}`}><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b] text-sm font-bold text-white">{getInitials(person.full_name)}</div><div className="flex-1 text-left"><p className="text-sm font-semibold text-[#22393c]">{person.full_name}</p><p className="text-xs text-[#668184]">{person.role || "Student"}</p></div>{selectedInvitee === person.id && <CheckCircle2 className="size-5 text-[#8a9a7b]" />}</button>))}
            </div>
          )}
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Role (Optional)</label><select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]"><option value="">No specific role</option>{openRoles.map((role) => (<option key={role.id} value={role.id}>{role.title}</option>))}</select></div>
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Message (Optional)</label><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Why are you inviting them?" rows={3} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none" /></div>
          <button onClick={handleInvite} disabled={!selectedInvitee || loading} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Sending..." : "Send Invitation"}</button>
        </div>
      </motion.div>
    </div>
  )
}

function ApplyModal({ role, isOpen, onClose, onSuccess }: { role: OpenRole | null; isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const handleApply = async () => {
    if (!role) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert("Please sign in to apply."); setLoading(false); return }
    const { error } = await supabase.from("project_applications").insert({ project_role_id: role.id, applicant_id: user.id, message: message.trim() || null, status: "pending" })
    setLoading(false)
    if (error) { alert(`Failed to submit application: ${error.message}`); return }
    alert("Application submitted"); onSuccess(); onClose()
  }
  if (!isOpen || !role) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-bold text-[#22393c]">Apply for {role.title}</h3><button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button></div>
        <div className="space-y-4">
          <div><label className="mb-2 block text-xs font-bold uppercase text-[#668184]">Why are you a good fit?</label><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell the project owner about your skills and interest..." rows={4} className="w-full rounded-2xl border border-[#22393c]/10 bg-white/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none" /></div>
          <button onClick={handleApply} disabled={loading} className="w-full rounded-2xl bg-[#22393c] py-3.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Submitting..." : "Submit Application"}</button>
        </div>
      </motion.div>
    </div>
  )
}

function AIExtensionsModal({ projectId, isOpen, onClose, onAdopt }: { projectId: string; isOpen: boolean; onClose: () => void; onAdopt: (ideaId: string) => void }) {
  const [extensions, setExtensions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!isOpen) return
    const fetchExtensions = async () => {
      setLoading(true)
      const { data, error } = await supabase.from("project_ideas").select("*").eq("source_project_id", projectId).eq("created_from_ai", true).order("created_at", { ascending: false })
      if (!error && data) setExtensions(data); else setExtensions([])
      setLoading(false)
    }
    fetchExtensions()
  }, [isOpen, projectId])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-button glass-neutral max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b] text-white">
              <Brain className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-[#22393c]">AI Recommended Extensions</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#22393c]/10"><X className="size-5" /></button>
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
                    <button onClick={() => onAdopt(extension.id)} className="rounded-full bg-[#22393c] px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105">
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
   Main Component
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
  const [lineages, setLineages] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [recommendedTeammates, setRecommendedTeammates] = useState<any[]>([])
  const [teamAvgTransactivity, setTeamAvgTransactivity] = useState(0)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)

  const [showAIExtensions, setShowAIExtensions] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [applyRole, setApplyRole] = useState<OpenRole | null>(null)
  const [showEditMember, setShowEditMember] = useState<TeamMember | null>(null)
  const [showEditProject, setShowEditProject] = useState(false)
  const [showEditSkillsTools, setShowEditSkillsTools] = useState(false)
  const [showAddLink, setShowAddLink] = useState<LinkType | null>(null)
  const [showCreateChild, setShowCreateChild] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "tasks" | "ai">("overview")
  const [refreshing, setRefreshing] = useState(false)

  const handleAdoptExtension = async (ideaId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert("Please sign in first."); return }
    
    const { data: idea, error: ideaError } = await supabase
      .from("project_ideas")
      .select("title, description, domain, difficulty, ai_reason")
      .eq("id", ideaId)
      .single()
    
    if (ideaError || !idea) {
      alert(ideaError?.message || "Unable to load extension details.")
      return
    }
    
    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({ 
        title: idea.title,
        description: idea.description,
        owner_id: user.id, 
        status: "active", 
        visibility: "public",
        department_id: project?.department_id || null
      })
      .select("id")
      .single()
    
    if (error || !newProject) { 
      alert(error?.message || "Unable to create project.")
      return 
    }
    
    await supabase
      .from("project_lineages")
      .insert({ 
        parent_project_id: projectId, 
        child_project_id: newProject.id, 
        relationship_type: "extension" 
      })
    
    alert(`Extension project "${idea.title}" created successfully!`)
    setShowAIExtensions(false)
    router.push(`/projects/${newProject.id}`)
  }

  const fetchData = async () => {
    if (!projectId) return
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      const { data: projectData } = await supabase.from("projects").select(`*, departments(name), people!projects_owner_id_fkey(full_name), mentor:people!projects_mentor_id_fkey(full_name)`).eq("id", projectId).maybeSingle()
      if (projectData) setProject(projectData)
      else { setError("Unable to load project."); return }

      const { data: membersData } = await supabase.from("team_members").select(`*, people(id, full_name, role, people_skills(skills(id, name)))`).eq("project_id", projectId).eq("status", "active")
      if (membersData) setTeamMembers(membersData)

      const { data: rolesData } = await supabase.from("project_roles").select(`*, project_role_skills(id, importance, skills(id, name))`).eq("project_id", projectId).eq("status", "open")
      if (rolesData) setOpenRoles(rolesData)

      if (user && projectData && user.id === projectData.owner_id) {
        const { data: appsData } = await supabase.from("project_applications").select(`*, project_roles(title), people(full_name)`).in("project_role_id", (rolesData || []).map((r: any) => r.id)).eq("status", "pending")
        if (appsData) setApplications(appsData)
      }
      const { data: invData } = await supabase.from("project_invitations").select(`*, project_roles(title)`).eq("project_id", projectId).eq("status", "pending")
      if (invData) setInvitations(invData)

      const { data: skillsData } = await supabase.from("project_skills").select(`importance, skills(id, name)`).eq("project_id", projectId)
      if (skillsData) setSkills(skillsData)
      const { data: toolsData } = await supabase.from("project_tools").select(`tools(name, website_url)`).eq("project_id", projectId)
      if (toolsData) setTools(toolsData)

      const { data: parentLineages } = await supabase
        .from("project_lineages")
        .select(`id, parent_project_id, child_project_id, relationship_type, parent:parent_project_id(id, title, status)`)
        .eq("child_project_id", projectId)

      const parentIds = [
        ...new Set(
          (parentLineages || [])
            .map((l: any) => l.parent_project_id)
            .filter(Boolean)
        ),
      ]

      let siblingLineages: any[] = []
      if (parentIds.length > 0) {
        const { data: siblings } = await supabase
          .from("project_lineages")
          .select(`id, parent_project_id, child_project_id, relationship_type, child:child_project_id(id, title, status)`)
          .in("parent_project_id", parentIds)
          .neq("child_project_id", projectId)
        siblingLineages = siblings || []
      }

      const { data: childLineages } = await supabase
        .from("project_lineages")
        .select(`id, parent_project_id, child_project_id, relationship_type, child:child_project_id(id, title, status)`)
        .eq("parent_project_id", projectId)

      setLineages([
        ...(parentLineages || []),
        ...siblingLineages,
        ...(childLineages || []),
      ])

      try {
        const recResponse = await fetch("/api/recommend-teammates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        })
        const recData = await recResponse.json()
        setRecommendedTeammates(recData.recommendations || [])
        setTeamAvgTransactivity(recData.team_avg_transactivity || 0)
      } catch (recError) {
        console.error("⚠️ Recommendation engine failed:", recError)
        setRecommendedTeammates([])
      }

      if (user) {
        try {
          const { data: requestData } = await supabase.from("team_members").select("id, status").eq("project_id", projectId).eq("person_id", user.id).in("status", ["pending", "requested"]).maybeSingle()
          setHasPendingRequest(!!requestData)
        } catch (err) { console.error("Request check error:", err) }
      } else { setHasPendingRequest(false) }

    } catch (fetchError) {
      console.error("Project details error:", fetchError)
      setError("Unable to load project details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => { setLoading(true); await fetchData(); setLoading(false) }
    load()
  }, [projectId])

  const refreshData = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

  const handleDeleteProject = async () => {
    if (!project) return
    if (!window.confirm(`Delete "${project.title}"?\n\nThis action cannot be undone.`)) return
    const { error: deleteError } = await supabase.from("projects").delete().eq("id", project.id)
    if (deleteError) { alert(`Unable to delete project: ${deleteError.message}`); return }
    router.push("/projects")
  }

  const handleRequestToJoin = async () => {
    if (!currentUser?.id || !project) { alert("Please log in to request to join."); return }
    if (currentUser.id === project.owner_id) { alert("You already own this project."); return }
    
    const alreadyMember = teamMembers.some((member) => member.person_id === currentUser.id && member.status === "active")
    if (alreadyMember) { alert("You're already a member of this team."); return }

    const { data: existingRequest, error: existingError } = await supabase
      .from("team_members")
      .select("id, status")
      .eq("project_id", project.id)
      .eq("person_id", currentUser.id)
      .in("status", ["pending", "requested"])
      .maybeSingle()

    if (existingError) { console.error("Request lookup error:", existingError); alert("Couldn't check your existing request."); return }
    if (existingRequest) { alert("Your request is already pending."); return }

    const { count, error: countError } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("status", "active")

    if (countError) { console.error("Team capacity check error:", countError); alert("Couldn't check team availability."); return }
    if ((count ?? 0) >= 5) { alert("This team is already full."); await fetchData(); return }

    const { error: requestError } = await supabase
      .from("team_members")
      .insert({ project_id: project.id, person_id: currentUser.id, role: null, status: "pending" })

    if (requestError) { console.error("Request to join error:", requestError); alert(requestError.message || "Couldn't send your request."); return }
    alert("Request to join sent!")
    await fetchData()
  }

  const handleApplicationDecision = async (applicationId: string, decision: "accepted" | "rejected") => {
    const { error } = await supabase.from("project_applications").update({ status: decision }).eq("id", applicationId)
    if (error) { alert(`Failed to ${decision} application: ${error.message}`); return }
    if (decision === "accepted") {
      const app = applications.find((a) => a.id === applicationId)
      if (app) { await supabase.from("team_members").insert({ project_id: projectId, person_id: app.applicant_id, role: app.project_roles?.title || "Contributor", status: "active" }) }
    }
    alert(`Application ${decision}`)
    refreshData()
  }

  const handleInvitationResponse = async (invitationId: string, response: "accepted" | "declined") => {
    const { error } = await supabase.from("project_invitations").update({ status: response, responded_at: new Date().toISOString() }).eq("id", invitationId)
    if (error) { alert(`Failed to ${response} invitation: ${error.message}`); return }
    if (response === "accepted") {
      const inv = invitations.find((i) => i.id === invitationId)
      if (inv) { await supabase.from("team_members").insert({ project_id: projectId, person_id: inv.invitee_id, role: inv.project_roles?.title || "Contributor", status: "active" }) }
    }
    alert(`Invitation ${response}`)
    refreshData()
  }

  const handleRemoveRecommendation = (userId: string) => {
    setRecommendedTeammates(prev => prev.filter(r => r.user_id !== userId))
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8]"><Loader2 className="size-10 animate-spin text-[#668184]" /></div>
  if (error || !project) return <div className="flex min-h-dvh items-center justify-center bg-[#e8e9e8] text-[#22393c]"><div className="text-center"><p className="mb-4 text-lg font-semibold">Project not found.</p><button onClick={() => router.push("/projects")} className="rounded-full bg-[#22393c] px-5 py-2 text-sm font-semibold text-white">Back to Projects</button></div></div>

  const isOwner = currentUser?.id === project.owner_id
  const isTeamMember = !!currentUser?.id && teamMembers.some((member) => member.person_id === currentUser.id && member.status === "active")
  const teamIsFull = teamMembers.length >= 5
  const canRequestToJoin = !isOwner && !isTeamMember && !hasPendingRequest && !teamIsFull
  const myPendingInvitations = invitations.filter((inv) => inv.invitee_id === currentUser?.id)

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] pb-32 text-[#22393c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <header className="sticky top-0 z-20 flex items-center justify-between glass-button glass-neutral px-5 py-4">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c]">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 px-4 text-center">
          <h1 className="truncate text-sm font-bold">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/chat/project-${projectId}`}>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8a9a7b]/20 text-[#8a9a7b]" title="Group Chat">
              <MessageSquare className="size-4" />
            </button>
          </Link>
          {isOwner && (
            <>
              <button onClick={() => setShowEditProject(true)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8a9a7b]/20 text-[#8a9a7b]" aria-label="Edit project">
                <Pencil className="size-4" />
              </button>
              <button onClick={handleDeleteProject} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600" aria-label="Delete project">
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="sticky top-[73px] z-10 mx-5 mt-4 flex items-center rounded-full p-1 glass-button glass-neutral">
        {(["overview", "team", "tasks", "ai"] as const).map((value) => (
          <button key={value} onClick={() => setActiveTab(value)} className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${activeTab === value ? "glass-ink text-white" : "text-[#668184]"}`}>
            {value === "ai" && <Brain className="mr-1 inline size-3" />}
            {value === "tasks" && <CheckCircle2 className="mr-1 inline size-3" />}
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      <div className="relative mx-auto w-full max-w-2xl space-y-8 px-5 pb-40 pt-6">
        
        {/* ✅ REPLACED INLINE OVERVIEW JSX WITH THE NEW COMPONENT */}
        {activeTab === "overview" && (
          <ProjectOverviewTab
            project={project}
            projectId={projectId}
            teamMembers={teamMembers}
            skills={skills}
            tools={tools}
            lineages={lineages}
            recommendedTeammates={recommendedTeammates}
            isOwner={isOwner}
            isTeamMember={isTeamMember}
            hasPendingRequest={hasPendingRequest}
            teamIsFull={teamIsFull}
            canRequestToJoin={canRequestToJoin}
            onShowAddLink={() => setShowAddLink("custom")}
            onShowCreateChild={() => setShowCreateChild(true)}
            onRequestToJoin={handleRequestToJoin}
            onRefresh={refreshData}
          />
        )}

        {activeTab === "team" && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-6 text-sm text-[#668184]">Build your team around the skills your project needs.</p>
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Team</h3>
                <span className="text-sm font-medium text-[#668184]">{teamMembers.length} / 5 members</span>
              </div>
              <div className="overflow-hidden rounded-3xl glass-button glass-neutral">
                <div className="grid grid-cols-12 gap-4 border-b border-[#22393c]/10 bg-[#22393c]/5 p-4 text-xs font-bold uppercase tracking-wider text-[#668184]">
                  <div className="col-span-4">Person</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-3">Skills Covered</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-[#22393c]/5">
                  {teamMembers.map((member: any) => {
                    const canEditMember = isOwner || member.person_id === currentUser?.id
                    const coveredNames = skills.filter((s: any) => s.skills?.id && (member.covered_skill_ids || []).includes(s.skills.id)).map((s: any) => s.skills?.name)
                    return (
                      <div key={member.id} className="grid grid-cols-12 items-center gap-4 p-4">
                        <div className="col-span-4 flex items-center gap-3">
                          <Link href={`/profile/${member.people?.id}`} className="group flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8a9a7b] text-xs font-bold text-white transition-transform group-hover:scale-105">{getInitials(member.people?.full_name)}</div>
                            <div className="min-w-0"><p className="truncate text-sm font-semibold transition-colors group-hover:text-[#8a9a7b]">{member.people?.full_name || "Unknown"}</p><p className="text-[10px] text-[#668184]">{member.people?.role || "Student"}</p></div>
                          </Link>
                        </div>
                        <div className="col-span-3"><span className="rounded-full bg-[#8a9a7b]/20 px-3 py-1 text-xs font-medium">{member.role || "Contributor"}</span></div>
                        <div className="col-span-3 flex flex-wrap gap-1">
                          {coveredNames.length > 0 ? coveredNames.map((n: string) => (<span key={n} className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">{n}</span>)) : <span className="text-[10px] text-[#668184] italic">from profile</span>}
                        </div>
                        <div className="col-span-2 flex justify-end pr-2">
                          {canEditMember && (
                            <button onClick={() => setShowEditMember(member)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8a9a7b]/10 text-[#8a9a7b] hover:bg-[#8a9a7b]/20 transition-colors" title="Edit role">
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
            {isOwner && (
              <div className="mb-8 flex gap-3">
                <button onClick={() => setShowAddRole(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8a9a7b] py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"><Plus className="size-4" /> Create Open Role</button>
                <button onClick={() => setShowInvite(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#22393c] py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"><Mail className="size-4" /> Invite Someone</button>
              </div>
            )}
            {isOwner && applications.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Clock className="size-5 text-[#8a9a7b]" /> Pending Applications ({applications.length})</h3>
                <div className="space-y-3">
                  {applications.map((app: any) => (
                    <div key={app.id} className="glass-button glass-peach rounded-2xl p-4">
                      <div className="flex items-start justify-between mb-2"><div><p className="text-sm font-bold text-[#22393c]">{app.people?.full_name}</p><p className="text-xs text-[#668184]">Applied for: {app.project_roles?.title}</p></div><span className="rounded-full bg-[#22393c]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#668184]">Pending</span></div>
                      {app.message && <p className="text-xs text-[#22393c]/80 mb-3 italic">"{app.message}"</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleApplicationDecision(app.id, "accepted")} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white hover:scale-[1.02] transition-transform">Accept</button>
                        <button onClick={() => handleApplicationDecision(app.id, "rejected")} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] hover:scale-[1.02] transition-transform">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isOwner && myPendingInvitations.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Mail className="size-5 text-[#8a9a7b]" /> Your Pending Invitations ({myPendingInvitations.length})</h3>
                <div className="space-y-3">
                  {myPendingInvitations.map((inv: any) => (
                    <div key={inv.id} className="glass-button glass-lilac rounded-2xl p-4">
                      <div className="mb-2"><p className="text-sm font-bold text-[#22393c]">Invited to join {project.title}</p>{inv.project_roles?.title && <p className="text-xs text-[#668184]">Role: {inv.project_roles.title}</p>}</div>
                      {inv.message && <p className="text-xs text-[#22393c]/80 mb-3 italic">"{inv.message}"</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleInvitationResponse(inv.id, "accepted")} className="flex-1 rounded-full bg-[#8a9a7b] py-2 text-xs font-semibold text-white hover:scale-[1.02] transition-transform">Accept</button>
                        <button onClick={() => handleInvitationResponse(inv.id, "declined")} className="flex-1 rounded-full bg-[#22393c]/10 py-2 text-xs font-semibold text-[#22393c] hover:scale-[1.02] transition-transform">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {openRoles.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Briefcase className="size-5 text-[#8a9a7b]" /> Open Positions</h3>
                <div className="space-y-3">
                  {openRoles.map((role: any) => (
                    <div key={role.id} className="glass-button glass-lilac rounded-2xl p-5">
                      <div className="mb-2 flex items-start justify-between"><h4 className="text-lg font-bold">{role.title}</h4><span className="rounded-full bg-white/50 px-2 py-1 text-xs">{role.slots} slot{role.slots > 1 ? "s" : ""}</span></div>
                      {role.description && <p className="mb-3 text-sm text-[#22393c]/80">{role.description}</p>}
                      {role.project_role_skills && role.project_role_skills.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1">
                          {role.project_role_skills.map((rs: any, idx: number) => (<span key={idx} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${rs.importance === "required" ? "bg-[#8a9a7b] text-white" : "bg-[#22393c]/10 text-[#22393c]"}`}>{rs.skills?.name}{rs.importance === "required" && " • Required"}</span>))}
                        </div>
                      )}
                      {!isOwner && (<button onClick={() => setApplyRole(role)} className="w-full rounded-xl bg-[#8a9a7b] py-2 text-sm font-bold text-white transition-transform hover:scale-[1.02]">Apply for this Role</button>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {openRoles.length === 0 && teamMembers.length === 0 && !isOwner && (<div className="text-center py-8 text-[#668184]"><p className="text-sm">No open positions or team members yet.</p></div>)}
          </motion.section>
        )}

        {activeTab === "tasks" && currentUser && (
          <ProjectTasksTab
            projectId={projectId}
            currentUserId={currentUser.id}
            isOwner={isOwner}
            teamMembers={teamMembers}
          />
        )}

        {activeTab === "ai" && (
          <ProjectAITab
            projectId={projectId}
            recommendedTeammates={recommendedTeammates}
            teamAvgTransactivity={teamAvgTransactivity}
            onShowAIExtensions={() => setShowAIExtensions(true)}
            currentUser={currentUser}
            onRemoveRecommendation={handleRemoveRecommendation}
            onAdoptExtension={handleAdoptExtension}
          />
        )}
      </div>

      <AnimatePresence>
        {showEditProject && project && (
          <EditProjectModal
            project={project}
            onClose={() => setShowEditProject(false)}
            onSuccess={() => { setShowEditProject(false); refreshData() }}
          />
        )}
        {showEditSkillsTools && (
          <EditSkillsToolsModal
            projectId={projectId}
            currentSkills={skills}
            currentTools={tools}
            onClose={() => setShowEditSkillsTools(false)}
            onSuccess={() => { setShowEditSkillsTools(false); refreshData() }}
          />
        )}
        {showEditMember && (<EditMemberModal member={showEditMember} projectSkills={skills} onClose={() => setShowEditMember(null)} onSuccess={() => { setShowEditMember(null); refreshData() }} />)}
        {showAddLink && (<AddLinkModal projectId={projectId} initialType={showAddLink} onClose={() => setShowAddLink(null)} onSuccess={() => { setShowAddLink(null); refreshData() }} />)}
        {showCreateChild && currentUser && (<CreateChildProjectModal parentProject={project} currentUserId={currentUser.id} onClose={() => setShowCreateChild(false)} onSuccess={(newId) => { setShowCreateChild(false); router.push(`/projects/${newId}`) }} />)}
        {showAddRole && (<AddRoleSlotModal projectId={projectId} isOpen={showAddRole} onClose={() => setShowAddRole(false)} onSuccess={refreshData} />)}
        {showInvite && (<InviteModal projectId={projectId} openRoles={openRoles} isOpen={showInvite} onClose={() => setShowInvite(false)} onSuccess={refreshData} />)}
        {showAIExtensions && (<AIExtensionsModal projectId={projectId} isOpen={showAIExtensions} onClose={() => setShowAIExtensions(false)} onAdopt={handleAdoptExtension} />)}
        {applyRole && (<ApplyModal role={applyRole} isOpen={!!applyRole} onClose={() => setApplyRole(null)} onSuccess={refreshData} />)}
      </AnimatePresence>
    </main>
  )
}
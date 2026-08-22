"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X, PlusCircle, Upload, GitBranch, Code, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const createOptions = [
  { id: "empty", title: "Empty Project", desc: "Start something new from scratch", icon: PlusCircle, tone: "aqua" },
  { id: "github", title: "Pull from GitHub", desc: "Import an existing repository", icon: Code, tone: "lilac" },
  { id: "upload", title: "Upload Project Report", desc: "Add a report to continue your project", icon: Upload, tone: "peach" },
  { id: "legacy", title: "Continue a Legacy Project", desc: "Browse abandoned projects to continue", icon: GitBranch, tone: "ink" },
]

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Insert the new project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: title,
          description: description,
          owner_id: user.id,
          status: "active",
          visibility: "public",
        })
        .select()
        .single()

      if (projectError) throw projectError

      // 2. Add the creator as an active team member
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          project_id: project.id,
          person_id: user.id,
          role: "Owner / Lead",
          status: "active",
        })

      if (memberError) throw memberError

      // 3. Redirect to the new project's details page
      router.push(`/projects/${project.id}`)
      onClose()
    } catch (err: any) {
      const message = err?.message || err?.details || "Unable to create project. Check your database permissions."
      console.error("Error creating project:", message, err)
      alert("Failed to create project: " + message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-button glass-neutral w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#22393c]">
            {selectedOption ? "Project Details" : "Create Project"}
          </h2>
          <button 
            onClick={() => { setSelectedOption(null); onClose(); }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c] transition-colors hover:bg-[#22393c]/20"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        {/* Options Selection */}
        {!selectedOption && (
          <div className="space-y-3">
            {createOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`glass-button glass-${option.tone} flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-transform hover:scale-[1.02]`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50">
                  <option.icon className="size-5 text-[#22393c]" strokeWidth={1.8} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#22393c]">{option.title}</p>
                  <p className="text-xs text-[#22393c]/70">{option.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty Project Form */}
        {selectedOption === "empty" && (
          <form onSubmit={handleCreateProject} className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedOption(null)}
              className="text-xs font-semibold text-[#668184] hover:text-[#22393c] flex items-center gap-1"
            >
              ← Back to options
            </button>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Campus Nav v3.0"
                className="glass-button glass-neutral w-full rounded-2xl px-5 py-3 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your project do?"
                rows={4}
                className="glass-button glass-neutral w-full rounded-2xl px-5 py-3 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-button glass-ink flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Project"}
            </button>
          </form>
        )}

        {/* Placeholder for other options */}
        {selectedOption && selectedOption !== "empty" && (
          <div className="text-center py-10">
            <p className="text-sm text-[#668184]">This feature is coming soon!</p>
            <button onClick={() => setSelectedOption(null)} className="mt-4 text-xs font-bold text-[#22393c] underline">
              Go back
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
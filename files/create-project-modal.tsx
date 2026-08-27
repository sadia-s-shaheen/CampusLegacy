"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { X, PlusCircle, Upload, GitBranch, Code, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/hooks/use-current-user"

const createOptions = [
  { id: "empty", title: "Empty Project", desc: "Start something new from scratch", icon: PlusCircle, tone: "aqua" },
  { id: "github", title: "Pull from GitHub", desc: "Import an existing repository", icon: Code, tone: "lilac" },
  { id: "upload", title: "Upload Project Report", desc: "Add a report to continue your project", icon: Upload, tone: "peach" },
  { id: "legacy", title: "Continue a Legacy Project", desc: "Browse abandoned projects to continue", icon: GitBranch, tone: "ink" },
]

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, "")
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
  } catch {
    return null
  }
}

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user } = useCurrentUser()

  // --- Empty project + shared creation logic -------------------------------
  const createProject = async (fields: Partial<{ title: string; description: string; source_type: string; repo_url: string; report_url: string }>) => {
    if (!user) throw new Error("Not authenticated")

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: fields.title,
        description: fields.description,
        owner_id: user.id,
        status: "active",
        visibility: "public",
        source_type: fields.source_type || "empty",
        repo_url: fields.repo_url || null,
        report_url: fields.report_url || null,
      })
      .select()
      .single()

    if (projectError) throw projectError

    const { error: memberError } = await supabase.from("team_members").insert({
      project_id: project.id,
      person_id: user.id,
      role: "Owner / Lead",
      status: "active",
    })
    if (memberError) throw memberError

    return project
  }

  const handleCreateEmpty = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const project = await createProject({ title, description, source_type: "empty" })
      toast.success("Project created")
      router.push(`/projects/${project.id}`)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Unable to create project.")
    } finally {
      setLoading(false)
    }
  }

  // --- GitHub import ---------------------------------------------------------
  const [repoUrl, setRepoUrl] = useState("")
  const [repoPreview, setRepoPreview] = useState<{ name: string; description: string; stars: number } | null>(null)
  const [repoFetching, setRepoFetching] = useState(false)
  const [repoFetchError, setRepoFetchError] = useState("")

  const handleFetchRepo = async () => {
    const parsed = parseGithubUrl(repoUrl)
    if (!parsed) {
      setRepoFetchError("That doesn't look like a valid GitHub repository URL.")
      return
    }
    setRepoFetching(true)
    setRepoFetchError("")
    try {
      const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`)
      if (!res.ok) throw new Error(res.status === 404 ? "Repository not found or private." : "GitHub lookup failed.")
      const data = await res.json()
      setRepoPreview({
        name: data.full_name,
        description: data.description || "",
        stars: data.stargazers_count ?? 0,
      })
      setTitle(data.name)
      setDescription(data.description || "")
    } catch (err: any) {
      setRepoFetchError(err?.message || "Couldn't fetch that repository.")
      setRepoPreview(null)
    } finally {
      setRepoFetching(false)
    }
  }

  const handleCreateFromGithub = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const project = await createProject({
        title,
        description,
        source_type: "github",
        repo_url: repoUrl.trim(),
      })
      toast.success("Project imported from GitHub")
      router.push(`/projects/${project.id}`)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Unable to import project.")
    } finally {
      setLoading(false)
    }
  }

  // --- Report upload -----------------------------------------------------
  const [reportFile, setReportFile] = useState<File | null>(null)

  const handleCreateWithReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      let reportUrl: string | null = null

      if (reportFile) {
        const path = `${user.id}/${Date.now()}-${reportFile.name}`
        const { error: uploadError } = await supabase.storage
          .from("project-reports")
          .upload(path, reportFile)
        if (uploadError) throw new Error("Upload failed: " + uploadError.message)

        const { data: publicUrlData } = supabase.storage.from("project-reports").getPublicUrl(path)
        reportUrl = publicUrlData.publicUrl
      }

      const project = await createProject({
        title,
        description,
        source_type: "report",
        report_url: reportUrl || undefined,
      })
      toast.success("Project created with report attached")
      router.push(`/projects/${project.id}`)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Unable to create project.")
    } finally {
      setLoading(false)
    }
  }

  // --- Legacy project browse/claim ----------------------------------------
  const [legacyProjects, setLegacyProjects] = useState<any[]>([])
  const [legacyLoading, setLegacyLoading] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedOption !== "legacy") return
    const fetchLegacy = async () => {
      setLegacyLoading(true)
      const { data } = await supabase
        .from("projects")
        .select("id, title, description, status")
        .eq("status", "legacy")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(20)
      setLegacyProjects(data || [])
      setLegacyLoading(false)
    }
    fetchLegacy()
  }, [selectedOption])

  const handleClaimLegacy = async (projectId: string) => {
    if (!user) return
    setClaimingId(projectId)
    try {
      // Files a request rather than reassigning ownership outright — the
      // existing Requests view already shows and actions "requested" rows,
      // so the project owner (or an admin, for truly abandoned projects)
      // approves the handoff from there.
      const { error } = await supabase.from("team_members").insert({
        project_id: projectId,
        person_id: user.id,
        role: "Continuer",
        status: "requested",
      })
      if (error) throw error
      toast.success("Request sent to continue this project")
      setLegacyProjects((prev) => prev.filter((p) => p.id !== projectId))
    } catch (err: any) {
      toast.error(err?.message || "Unable to send request.")
    } finally {
      setClaimingId(null)
    }
  }

  const backToOptions = () => {
    setSelectedOption(null)
    setRepoUrl("")
    setRepoPreview(null)
    setRepoFetchError("")
    setReportFile(null)
    setTitle("")
    setDescription("")
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#22393c]">
            {selectedOption ? createOptions.find((o) => o.id === selectedOption)?.title : "Create Project"}
          </h2>
          <button
            onClick={() => { backToOptions(); onClose() }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22393c]/10 text-[#22393c] transition-colors hover:bg-[#22393c]/20"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

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

        {selectedOption === "empty" && (
          <form onSubmit={handleCreateEmpty} className="space-y-4">
            <BackButton onClick={backToOptions} />
            <TitleAndDescriptionFields title={title} setTitle={setTitle} description={description} setDescription={setDescription} />
            <SubmitButton loading={loading} label="Create Project" />
          </form>
        )}

        {selectedOption === "github" && (
          <form onSubmit={handleCreateFromGithub} className="space-y-4">
            <BackButton onClick={backToOptions} />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Repository URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="glass-button glass-neutral flex-1 rounded-2xl px-5 py-3 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
                />
                <button
                  type="button"
                  onClick={handleFetchRepo}
                  disabled={repoFetching || !repoUrl.trim()}
                  className="glass-button glass-ink flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white disabled:opacity-50"
                >
                  {repoFetching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </button>
              </div>
              {repoFetchError && <p className="mt-2 text-xs text-red-600">{repoFetchError}</p>}
              {repoPreview && (
                <div className="mt-3 rounded-2xl bg-white/50 p-3 text-xs text-[#22393c]">
                  <p className="font-semibold">{repoPreview.name}</p>
                  {repoPreview.description && <p className="mt-1 text-[#22393c]/70">{repoPreview.description}</p>}
                  <p className="mt-1 text-[#668184]">\u2b50 {repoPreview.stars}</p>
                </div>
              )}
            </div>

            <TitleAndDescriptionFields title={title} setTitle={setTitle} description={description} setDescription={setDescription} />
            <SubmitButton loading={loading} label="Import Project" disabled={!repoPreview} />
          </form>
        )}

        {selectedOption === "upload" && (
          <form onSubmit={handleCreateWithReport} className="space-y-4">
            <BackButton onClick={backToOptions} />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#668184] mb-2">Project Report</label>
              <label className="glass-button glass-neutral flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-5 py-6 text-center">
                <Upload className="size-5 text-[#668184]" />
                <span className="text-xs font-medium text-[#22393c]">
                  {reportFile ? reportFile.name : "Click to choose a PDF or document"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <TitleAndDescriptionFields title={title} setTitle={setTitle} description={description} setDescription={setDescription} />
            <SubmitButton loading={loading} label="Create Project" />
          </form>
        )}

        {selectedOption === "legacy" && (
          <div className="space-y-4">
            <BackButton onClick={backToOptions} />
            {legacyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-[#668184]" />
              </div>
            ) : legacyProjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#668184]">No legacy projects available right now.</p>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {legacyProjects.map((p) => (
                  <div key={p.id} className="glass-button glass-neutral rounded-2xl p-4">
                    <p className="text-sm font-semibold text-[#22393c]">{p.title}</p>
                    <p className="mt-1 text-xs text-[#22393c]/70 line-clamp-2">{p.description}</p>
                    <button
                      onClick={() => handleClaimLegacy(p.id)}
                      disabled={claimingId === p.id}
                      className="mt-3 w-full rounded-full bg-[#22393c] py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
                    >
                      {claimingId === p.id ? "Sending..." : "Request to Continue"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-semibold text-[#668184] hover:text-[#22393c] flex items-center gap-1">
      \u2190 Back to options
    </button>
  )
}

function TitleAndDescriptionFields({
  title,
  setTitle,
  description,
  setDescription,
}: {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
}) {
  return (
    <>
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
    </>
  )
}

function SubmitButton({ loading, label, disabled }: { loading: boolean; label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="glass-button glass-ink flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : label}
    </button>
  )
}

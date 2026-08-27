"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { X, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useDepartments, useSkills } from "@/lib/hooks/use-profile-options"

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
const availableInterests = ["Open Source", "Accessibility", "Web3", "AI/ML", "Product Design", "Startups"]

export function EditProfileModal({
  onClose,
  onSaved,
  currentProfile,
  currentSkills,
}: {
  onClose: () => void
  onSaved?: () => void
  currentProfile: any
  currentSkills: string[]
}) {
  const { options: departmentOptions } = useDepartments()
  const { options: skillOptions } = useSkills()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(currentProfile?.full_name || "")
  const [bio, setBio] = useState(currentProfile?.bio || "")
  const [year, setYear] = useState(currentProfile?.year ? `${currentProfile.year} Year` : "")
  const [departmentId, setDepartmentId] = useState(currentProfile?.department_id || "")
  const [selectedSkills, setSelectedSkills] = useState<string[]>(currentSkills || [])
  const [selectedInterests, setSelectedInterests] = useState<string[]>(currentProfile?.interests || [])

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const yearInt = year ? parseInt(year.replace(/\D/g, ""), 10) : null

      const { error: profileError } = await supabase.from("people").upsert(
        {
          id: user.id,
          full_name: fullName,
          bio: bio,
          year: yearInt,
          department_id: departmentId || null,
          interests: selectedInterests,
        },
        { onConflict: "id" }
      )
      if (profileError) throw new Error("Profile update failed: " + profileError.message)

      const { data: existingSkills, error: existingSkillsError } = await supabase
        .from("people_skills")
        .select("skill_id")
        .eq("person_id", user.id)
      if (existingSkillsError) throw new Error("Skills lookup failed: " + existingSkillsError.message)

      const selectedSkillIds = new Set(selectedSkills)
      const existingSkillIds = new Set((existingSkills || []).map((s: any) => s.skill_id))

      const removedSkills = (existingSkills || []).filter((s: any) => !selectedSkillIds.has(s.skill_id))
      if (removedSkills.length > 0) {
        const { error: deleteError } = await supabase
          .from("people_skills")
          .delete()
          .eq("person_id", user.id)
          .in("skill_id", removedSkills.map((s: any) => s.skill_id))
        if (deleteError) throw new Error("Skills clear failed: " + deleteError.message)
      }

      const newSkills = selectedSkills.filter((skillId) => !existingSkillIds.has(skillId))
      if (newSkills.length > 0) {
        const { error: insertError } = await supabase
          .from("people_skills")
          .insert(newSkills.map((skill_id) => ({ person_id: user.id, skill_id })))
        if (insertError) throw new Error("Skills update failed: " + insertError.message)
      }

      toast.success("Profile updated")
      // Previously called window.location.reload() here — a full page
      // reload to reflect a profile edit. The parent now refetches its own
      // data instead, which is instant and doesn't lose scroll position.
      onSaved?.()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Unable to save profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-button glass-neutral w-full max-w-md rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#22393c] dark:text-[#f4f1ea]">Edit Profile</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X className="size-5 text-[#22393c] dark:text-[#f4f1ea]" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2 block">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 rounded-2xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 text-[#22393c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-2xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 text-[#22393c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8a9a7b] resize-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2 block">Year</label>
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    year === y ? "glass-button glass-ink text-white" : "glass-button glass-neutral text-[#22393c] dark:text-[#f4f1ea]"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2 block">Department</label>
            <div className="flex flex-wrap gap-2">
              {departmentOptions.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setDepartmentId(dept.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    departmentId === dept.id ? "glass-button glass-ink text-white" : "glass-button glass-neutral text-[#22393c] dark:text-[#f4f1ea]"
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2 block">Skills</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              {skillOptions.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedSkills.includes(skill.id) ? "glass-button glass-ink text-white" : "glass-button glass-neutral text-[#22393c] dark:text-[#f4f1ea]"
                  }`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#668184] mb-2 block">Interests</label>
            <div className="flex flex-wrap gap-2">
              {availableInterests.map((interest) => (
                <button
                  key={interest}
                  onClick={() =>
                    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]))
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedInterests.includes(interest) ? "glass-button glass-ink text-white" : "glass-button glass-neutral text-[#22393c] dark:text-[#f4f1ea]"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl glass-button glass-ink text-white font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <><Save className="size-4" /> Save Changes</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ArrowLeft, Check, GraduationCap, Code, Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useDepartments, useSkills } from "@/lib/hooks/use-profile-options"

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
const availableInterests = ["Open Source", "Accessibility", "Web3", "AI/ML", "Product Design", "Startups"]

export function OnboardingView() {
  const router = useRouter()
  const { options: departmentOptions } = useDepartments()
  const { options: skillOptions } = useSkills()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    rollNumber: "",
    phone: "",
    github: "",
    departmentId: "",
    year: "",
    skills: [] as string[],
    interests: [] as string[],
  })

  useEffect(() => {
    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("people")
        .select("roll_number, phone_number, github_url, department_id, year, interests")
        .eq("id", user.id)
        .maybeSingle()

      const { data: existingSkills } = await supabase
        .from("people_skills")
        .select("skill_id, skills(id, name)")
        .eq("person_id", user.id)

      if (profile || existingSkills) {
        setFormData((current) => ({
          ...current,
          rollNumber: profile?.roll_number || "",
          phone: profile?.phone_number || "",
          github: profile?.github_url || "",
          departmentId: profile?.department_id || "",
          year: profile?.year
            ? `${profile.year}${profile.year === 1 ? "st" : profile.year === 2 ? "nd" : profile.year === 3 ? "rd" : "th"} Year`
            : "",
          skills: existingSkills?.map((skill: any) => skill.skill_id).filter(Boolean) || [],
          interests: profile?.interests || [],
        }))
      }
    }

    loadExistingProfile()
  }, [])

  const toggleSelection = (item: string, category: "skills" | "interests") => {
    setFormData(prev => {
      const current = prev[category]
      const updated = current.includes(item) 
        ? current.filter(i => i !== item) 
        : [...current, item]
      return { ...prev, [category]: updated }
    })
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Safely parse year to prevent NaN errors
      const yearValue = formData.year ? parseInt(formData.year.replace(/\D/g, ""), 10) : null
            // Change .update() to .upsert()
      const { error } = await supabase
        .from("people")
        .upsert({ 
          id: user.id, // <--- CRITICAL: Tells Supabase which row to upsert
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || null,
          roll_number: formData.rollNumber || null,
          phone_number: formData.phone || null,
          github_url: formData.github || null,
          department_id: formData.departmentId || null,
          year: yearValue,
          interests: formData.interests,
          is_verified: false,
        }, { onConflict: 'id' }) // <--- CRITICAL: Prevents duplicate errors

      if (error) {
        console.error("Supabase Error:", error.message, error.details)
        throw new Error(error.message)
      }

      const { data: existingSkills, error: existingSkillsError } = await supabase
        .from("people_skills")
        .select("skill_id, proficiency, years_experience")
        .eq("person_id", user.id)

      if (existingSkillsError) throw new Error(existingSkillsError.message)

      const selectedSkillIds = new Set(formData.skills)
      const removedSkills = (existingSkills || []).filter((skill) => !selectedSkillIds.has(skill.skill_id))

      for (const skill of removedSkills) {
        const { error: deleteError } = await supabase
          .from("people_skills")
          .delete()
          .eq("person_id", user.id)
          .eq("skill_id", skill.skill_id)

        if (deleteError) throw new Error(deleteError.message)
      }

      if (formData.skills.length > 0) {
        const existingSkillIds = new Set((existingSkills || []).map((skill) => skill.skill_id))
        const newSkills = formData.skills.filter((skillId) => !existingSkillIds.has(skillId))
        const { error: skillInsertError } = await supabase
          .from("people_skills")
          .insert(newSkills.map((skill_id) => ({ person_id: user.id, skill_id })))

        if (skillInsertError) throw new Error(skillInsertError.message)
      }
      
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Onboarding error:", err.message || err)
      alert("Failed to save profile: " + (err.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[#e8e9e8] px-5 py-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Progress Bar */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-[#22393c]" : "bg-[#22393c]/10"}`} />
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b]/20">
                <GraduationCap className="size-5 text-[#22393c]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Personal Details</h2>
                <p className="text-xs text-[#668184]">Let's get to know you better.</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Roll Number / Enrollment ID"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                className="glass-button glass-neutral w-full rounded-2xl px-5 py-4 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="glass-button glass-neutral w-full rounded-2xl px-5 py-4 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
              />
              <input
                type="text"
                placeholder="GitHub Username (optional)"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                className="glass-button glass-neutral w-full rounded-2xl px-5 py-4 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
              />
            </div>
          </motion.div>
        )}

        {/* Step 2: Academic Info */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b]/20">
                <Code className="size-5 text-[#22393c]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Academic Info</h2>
                <p className="text-xs text-[#668184]">Where do you study?</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Department</p>
                <div className="flex flex-wrap gap-2">
                  {departmentOptions.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => setFormData({ ...formData, departmentId: dept.id })}
                      className={`glass-button rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        formData.departmentId === dept.id ? "glass-ink text-white" : "glass-neutral text-[#22393c]"
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Year</p>
                <div className="flex flex-wrap gap-2">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => setFormData({ ...formData, year: year })}
                      className={`glass-button rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        formData.year === year ? "glass-ink text-white" : "glass-neutral text-[#22393c]"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Skills & Interests */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8a9a7b]/20">
                <Heart className="size-5 text-[#22393c]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Skills & Interests</h2>
                <p className="text-xs text-[#668184]">Help us find your perfect team.</p>
              </div>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Select your Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => toggleSelection(skill.id, "skills")}
                      className={`glass-button rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        formData.skills.includes(skill.id) ? "glass-ink text-white" : "glass-neutral text-[#22393c]"
                      }`}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#668184]">Select your Interests</p>
                <div className="flex flex-wrap gap-2">
                  {availableInterests.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleSelection(interest, "interests")}
                      className={`glass-button rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        formData.interests.includes(interest) ? "glass-ink text-white" : "glass-neutral text-[#22393c]"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 text-sm font-semibold text-[#668184] hover:text-[#22393c]"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
          ) : <div />}
          
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="glass-button glass-ink flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
            >
              Next <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="glass-button glass-ink flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 disabled:opacity-50"
            >
              {loading ? "Saving..." : <>Finish <Check className="size-4" /></>}
            </button>
          )}
        </div>
      </motion.div>
    </main>
  )
}
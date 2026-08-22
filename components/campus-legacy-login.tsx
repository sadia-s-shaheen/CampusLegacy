"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, GraduationCap, Briefcase, Shield, UserCircle, ArrowLeft, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const loginOptions = [
  { label: "Login as Student", icon: Users, tone: "aqua", role: "student" },
  { label: "Login as Faculty", icon: GraduationCap, tone: "lilac", role: "faculty" },
  { label: "Login as Alumni", icon: Briefcase, tone: "peach", role: "alumni" },
  { label: "Login as Admin", icon: Shield, tone: "ink", role: "admin" },
]

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""

  if (message === "Failed to fetch" || message.includes("NetworkError")) {
    return "Unable to reach Supabase. Check your internet connection and try again."
  }

  return message || "Authentication failed"
}

export function CampusLegacyLogin() {
  const [step, setStep] = useState<"roles" | "auth">("roles")
  const [selectedRole, setSelectedRole] = useState<string>("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
    setStep("auth")
    setError("")
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // 1. Try to sign in an existing user first
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // 2. If the user doesn't exist, sign them up instead
      if (error && error.message === "Invalid login credentials") {
        const signUpRes = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: selectedRole,
              full_name: email.split("@")[0],
            },
          },
        })
        if (signUpRes.error) throw signUpRes.error
        
        // NEW USER -> Send to Onboarding!
        router.push("/onboarding")
        return
      } else if (error) {
        throw error
      }

      // 3. EXISTING USER -> Send to Dashboard
      if (data?.session) {
        router.push("/dashboard")
      } else {
        setError("Please check your email to confirm your account.")
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { role: "guest", full_name: "Guest User" } },
      })
      if (error) throw error
      router.push("/dashboard")
    } catch (err: any) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#e8e9e8] px-5 py-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Header with YOUR LOGO */}
        <header className="mb-8 text-center sm:mb-9">
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.5, ease: "easeOut" }}
            className="mx-auto mb-4 flex w-full max-w-[330px] flex-col items-center"
          >
            <img
              src="/campus-legacy-mark.png"
              alt="Campus Legacy graduation cap monogram"
              className="h-auto w-[148px] sm:w-[168px]"
            />
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-[#22393c]">Campus</span>
              <span className="text-[#8a9a7b]">Legacy</span>
            </h1>
            <div className="mt-2 flex items-center gap-2" aria-hidden="true">
              <span className="h-px w-6 bg-[#22393c]/25" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#668184]">
                Connect · Learn · Leave a Mark
              </span>
              <span className="h-px w-6 bg-[#22393c]/25" />
            </div>
          </motion.div>
          <p className="text-balance text-base font-medium leading-6 text-[#22393c] sm:text-lg">
            {step === "roles" ? "Welcome back to your campus community." : `Continue as ${selectedRole}`}
          </p>
        </header>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-full bg-red-100 px-4 py-2 text-center text-xs font-medium text-red-700"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ROLES VIEW */}
        <AnimatePresence mode="wait">
          {step === "roles" && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-3" aria-label="Login options">
                {loginOptions.map(({ label, icon: Icon, tone, role }, index) => (
                  <motion.button
                    key={label}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + index * 0.07, duration: 0.42 }}
                    className={`glass-button glass-${tone} flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22393c]`}
                  >
                    <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                    {label}
                  </motion.button>
                ))}
              </div>

              <div className="my-7 flex items-center gap-4" aria-hidden="true">
                <div className="h-px flex-1 bg-[#22393c]/12" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#668184]">or</span>
                <div className="h-px flex-1 bg-[#22393c]/12" />
              </div>

              <motion.button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="glass-button glass-neutral flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm font-semibold text-[#22393c] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22393c] disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-[18px] animate-spin" /> : <UserCircle aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />}
                Continue as Guest
              </motion.button>
            </motion.div>
          )}

          {/* AUTH FORM VIEW */}
          {step === "auth" && (
            <motion.form
              key="auth"
              onSubmit={handleAuthSubmit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <button
                type="button"
                onClick={() => setStep("roles")}
                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#668184] hover:text-[#22393c]"
              >
                <ArrowLeft className="size-4" /> Back to roles
              </button>

              <div className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-button glass-neutral w-full rounded-full px-5 py-4 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="glass-button glass-neutral w-full rounded-full px-5 py-4 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className={`glass-button glass-${loginOptions.find(o => o.role === selectedRole)?.tone || 'aqua'} flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-50`}
              >
                {loading ? <Loader2 className="size-[18px] animate-spin" /> : "Sign In / Sign Up"}
              </motion.button>
              
              <p className="mt-4 text-center text-[10px] text-[#668184]">
                New users will be automatically created.
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-xs leading-5 text-[#668184]">
          Your campus community is waiting for you.
        </p>
      </motion.div>
    </main>
  )
}
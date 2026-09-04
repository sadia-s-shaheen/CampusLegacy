"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  GraduationCap,
  Briefcase,
  Shield,
  UserCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// Roles a person can grant themselves at signup. Faculty and Admin are
// NOT in this list on purpose — see handleSignUp below for why.
const selfServeRoles = [
  { label: "Student", icon: Users, tone: "aqua", role: "student" },
  { label: "Alumni", icon: Briefcase, tone: "peach", role: "alumni" },
]

// Shown for transparency, but selecting these does not grant the role.
// It files a verification request instead — see handleSignUp.
const verifiedRoles = [
  { label: "Faculty", icon: GraduationCap, tone: "lilac", role: "faculty" },
  { label: "Admin", icon: Shield, tone: "ink", role: "admin" },
]

type Mode = "roles" | "signin" | "signup" | "forgot"

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (message === "Failed to fetch" || message.includes("NetworkError")) {
    return "Unable to reach the server. Check your internet connection and try again."
  }
  if (message === "Invalid login credentials") {
    return "Incorrect email or password."
  }
  if (message === "User already registered") {
    return "An account with this email already exists. Try signing in instead."
  }
  return message || "Authentication failed"
}

export function CampusLegacyLogin() {
  const [mode, setMode] = useState<Mode>("roles")
  const [selectedRole, setSelectedRole] = useState<string>("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [forgotSent, setForgotSent] = useState(false)
  const router = useRouter()

  const allRoles = [...selfServeRoles, ...verifiedRoles]
  const isVerifiedRoleSelected = verifiedRoles.some((r) => r.role === selectedRole)

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
    setMode("signin")
    setError("")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data?.session) {
        router.push("/dashboard")
      } else {
        setError("Please check your email to confirm your account before signing in.")
      }
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const effectiveRole = isVerifiedRoleSelected ? "student" : selectedRole

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: effectiveRole,
            requested_role: isVerifiedRoleSelected ? selectedRole : null,
            full_name: email.split("@")[0],
          },
        },
      })
      if (error) throw error

      if (isVerifiedRoleSelected && data?.user) {
        await supabase.from("role_requests").insert({
          person_id: data.user.id,
          requested_role: selectedRole,
          status: "pending",
        }).then(({ error: reqError }) => {
          if (reqError) console.warn("role_requests insert skipped:", reqError.message)
        })
        toast.info(`Account created. Your request for ${selectedRole} access is pending verification.`)
      }

      router.push("/onboarding")
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setForgotSent(true)
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // ✅ NEW: One-Click Demo Login for SIH Judges
  const handleDemoLogin = async () => {
    setLoading(true)
    setError("")
    
    // ⚠️ REPLACE THESE with the actual email and password of your demo account!
    // (Supabase client-side auth requires email/password, not just the UUID)
    const demoEmail = "sadiasshaheen@gmail.com"
    const demoPassword = "password"
    
    setEmail(demoEmail)
    setPassword(demoPassword)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: demoEmail, 
        password: demoPassword 
      })
      if (error) throw error
      
      if (data?.session) {
        // Redirect to the most impressive part of your app for the demo
        router.push("/dashboard") 
      }
    } catch (err) {
      setError("Demo login failed. Please update the demoEmail/demoPassword in the code.")
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    setError("")
    try {
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { role: "guest", full_name: "Guest User" } },
      })
      if (error) throw error
      router.push("/dashboard")
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const activeTone = allRoles.find((o) => o.role === selectedRole)?.tone || "aqua"

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
            {mode === "roles" && "Welcome back to your campus community."}
            {mode === "signin" && `Sign in as ${selectedRole}`}
            {mode === "signup" && `Create your ${selectedRole} account`}
            {mode === "forgot" && "Reset your password"}
          </p>
        </header>

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

        <AnimatePresence mode="wait">
          {mode === "roles" && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-3" aria-label="Login options">
                {selfServeRoles.map(({ label, icon: Icon, tone, role }, index) => (
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
                    Continue as {label}
                  </motion.button>
                ))}
              </div>

              <div className="my-5 flex items-center gap-4" aria-hidden="true">
                <div className="h-px flex-1 bg-[#22393c]/12" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#668184]">
                  faculty / admin
                </span>
                <div className="h-px flex-1 bg-[#22393c]/12" />
              </div>

              <div className="flex flex-col gap-3">
                {verifiedRoles.map(({ label, icon: Icon, tone, role }) => (
                  <motion.button
                    key={label}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    className={`glass-button glass-${tone} flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5`}
                  >
                    <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                    {label} account
                    <span className="ml-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#668184]">
                      <ShieldCheck className="size-3" /> verified
                    </span>
                  </motion.button>
                ))}
              </div>

              <div className="my-7 flex items-center gap-4" aria-hidden="true">
                <div className="h-px flex-1 bg-[#22393c]/12" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#668184]">or</span>
                <div className="h-px flex-1 bg-[#22393c]/12" />
              </div>

              {/* ✅ NEW: One-Click Demo Login Button */}
              <motion.button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="glass-button flex w-full items-center justify-center gap-3 rounded-full border border-[#8a9a7b]/30 bg-[#8a9a7b]/10 px-5 py-4 text-sm font-semibold text-[#22393c] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-[18px] animate-spin" />
                ) : (
                  <Sparkles aria-hidden="true" className="size-[18px] text-[#8a9a7b]" strokeWidth={1.8} />
                )}
                Skip Sign-Up & Enter Demo
              </motion.button>

              <motion.button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="glass-button glass-neutral mt-3 flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm font-semibold text-[#22393c] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-[18px] animate-spin" /> : <UserCircle aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />}
                Continue as Guest
              </motion.button>
              
              <p className="mt-2 text-center text-[10px] text-[#668184]">
                Demo account comes pre-loaded with projects, AI matches, and graph data.
              </p>
            </motion.div>
          )}

          {(mode === "signin" || mode === "signup") && (
            <motion.form
              key={mode}
              onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <button
                type="button"
                onClick={() => setMode("roles")}
                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#668184] hover:text-[#22393c]"
              >
                <ArrowLeft className="size-4" /> Back to roles
              </button>

              {isVerifiedRoleSelected && mode === "signup" && (
                <p className="rounded-2xl bg-[#8a9a7b]/15 px-4 py-3 text-xs leading-relaxed text-[#22393c]">
                  {selectedRole === "admin" ? "Admin" : "Faculty"} access requires manual verification.
                  You'll get a full account now with standard access, and we'll notify you once
                  the request is approved.
                </p>
              )}

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

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setForgotSent(false) }}
                  className="self-end text-xs font-semibold text-[#668184] hover:text-[#22393c]"
                >
                  Forgot password?
                </button>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                className={`glass-button glass-${activeTone} flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-50`}
              >
                {loading ? (
                  <Loader2 className="size-[18px] animate-spin" />
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError("") }}
                className="text-center text-[11px] font-medium text-[#668184] hover:text-[#22393c]"
              >
                {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
              </button>
            </motion.form>
          )}

          {mode === "forgot" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#668184] hover:text-[#22393c]"
              >
                <ArrowLeft className="size-4" /> Back to sign in
              </button>

              {forgotSent ? (
                <p className="rounded-2xl bg-[#8a9a7b]/15 px-4 py-4 text-center text-sm text-[#22393c]">
                  If an account exists for {email}, a reset link is on its way.
                </p>
              ) : (
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="glass-button glass-neutral w-full rounded-full px-5 py-4 text-sm font-medium text-[#22393c] placeholder:text-[#668184] focus:outline-none focus:ring-2 focus:ring-[#8a9a7b]/50"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="glass-button glass-ink flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-[18px] animate-spin" /> : "Send reset link"}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-xs leading-5 text-[#668184]">
          Your campus community is waiting for you.
        </p>
      </motion.div>
    </main>
  )
}
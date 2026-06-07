"use client"

import { useEffect, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { calculateSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type LoginProfile = {
  id: string
  business_name?: string | null
  province: string | null
  industry: string | null
  phone: string | null
  description?: string | null
  smart_score?: number | string | null
  role?: string | null
}

function isMissingRoleColumnError(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("'role' column") ||
      error?.message?.includes("schema cache") ||
      error?.message?.includes("profiles' in the schema")
  )
}

function getPostLoginPath(role?: string | null): string {
  const normalizedRole = role?.trim().toLowerCase()

  if (!normalizedRole) {
    return "/dashboard/onboarding"
  }

  if (normalizedRole === "admin" || normalizedRole === "buyer") {
    return "/dashboard/executive"
  }

  if (normalizedRole === "supplier") {
    return "/dashboard"
  }

  return "/dashboard/onboarding"
}

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<"supplier" | "admin">("supplier")
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get("role") === "admin") {
      setSelectedRole("admin")
    }
  }, [])

  const heading = selectedRole === "admin" ? "Buyer login" : "Supplier login"
  const subheading =
    selectedRole === "admin"
      ? "Sign in to access the procurement dashboard and manage RFQs."
      : "Sign in to manage your profile, respond to RFQs, and track quotes."

  const handleLogin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    setLoading(true)
    setLoadingMessage("Signing in...")
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      setLoading(false)
      setLoadingMessage("")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {

      setErrorMessage(error.message)

      setLoading(false)
      setLoadingMessage("")

      return
    }

    setLoadingMessage("Checking your access...")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setErrorMessage(userError.message)
      setLoading(false)
      setLoadingMessage("")
      return
    }

    let postLoginPath = "/dashboard/onboarding"

    if (user) {
      const { data: profileWithRole, error: profileSelectError } = await supabase
        .from("profiles")
        .select("id, business_name, province, industry, phone, description, smart_score, role")
        .eq("id", user.id)
        .maybeSingle()
      let profile = profileWithRole as LoginProfile | null
      let roleColumnAvailable = true

      if (profileSelectError) {
        if (!isMissingRoleColumnError(profileSelectError)) {
          console.error(profileSelectError)
          setErrorMessage(profileSelectError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }

        roleColumnAvailable = false

        const { data: fallbackProfile, error: fallbackProfileError } =
          await supabase
            .from("profiles")
            .select("id, business_name, province, industry, phone, description, smart_score")
            .eq("id", user.id)
            .maybeSingle()

        if (fallbackProfileError) {
          console.error(fallbackProfileError)
          setErrorMessage(fallbackProfileError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }

        profile = fallbackProfile as LoginProfile | null
      }

      postLoginPath = getPostLoginPath(profile?.role)

      if (!profile) {
        const profilePayload = {
          id: user.id,
          business_name: user.user_metadata?.business_name || "Supplier",
          email: user.email,
          province: user.user_metadata?.province || "",
          industry: user.user_metadata?.industry || "",
          phone: user.user_metadata?.phone || "",
          verification_status: "Pending Review",
          ...(roleColumnAvailable ? { role: "supplier" } : {}),
        }
        const profileScore = calculateSmartScore(profilePayload)

        const { error: profileInsertError } = await supabase
          .from("profiles")
          .insert([{ ...profilePayload, smart_score: profileScore }])

        if (profileInsertError) {
          console.error(profileInsertError)
          setErrorMessage(profileInsertError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }

        postLoginPath = getPostLoginPath(roleColumnAvailable ? "supplier" : null)
      } else if (
        !profile.province ||
        !profile.industry ||
        !profile.phone ||
        (roleColumnAvailable && !profile.role)
      ) {
        const profileUpdatePayload = {
          province: profile.province || user.user_metadata?.province || "",
          industry: profile.industry || user.user_metadata?.industry || "",
          phone: profile.phone || user.user_metadata?.phone || "",
          ...(roleColumnAvailable ? { role: profile.role || "supplier" } : {}),
        }
        const profileScore = calculateSmartScore({ ...profile, ...profileUpdatePayload })

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ ...profileUpdatePayload, smart_score: profileScore })
          .eq("id", user.id)

        if (profileUpdateError) {
          console.error(profileUpdateError)
          setErrorMessage(profileUpdateError.message)
          setLoading(false)
          setLoadingMessage("")
          return
        }
      }
    }

    setLoadingMessage("Opening your workspace...")
    router.push(postLoginPath)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">

      <div className="w-full max-w-md rounded-3xl border border-panel bg-panel p-8 shadow-panel">

        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">
            Procurement portal
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-primary">
            {heading}
          </h1>
          <p className="mt-3 text-sm leading-6 text-secondary">
            {subheading}
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-panel bg-surface p-1.5">
            <button
              type="button"
              onClick={() => setSelectedRole("supplier")}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedRole === "supplier"
                  ? "bg-accent text-button"
                  : "text-secondary hover:bg-panel hover:text-primary"
              }`}
            >
              Supplier
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("admin")}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedRole === "admin"
                  ? "bg-accent text-button"
                  : "text-secondary hover:bg-panel hover:text-primary"
              }`}
            >
              Buyer / Admin
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Email address</label>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrorMessage("")
              }}
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorMessage("")
              }}
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
            <div className="mt-2 text-right">
              <a
                href="/forgot-password"
                className="text-sm font-semibold text-accent-soft transition hover:text-accent hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
              <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50"
          >
            {loading ? loadingMessage : "Login"}
          </button>

          {loading && (
            <p className="text-center text-sm font-semibold text-secondary" role="status" aria-live="polite">
              {loadingMessage}
            </p>
          )}

        </div>

      </div>

    </main>
  )
}

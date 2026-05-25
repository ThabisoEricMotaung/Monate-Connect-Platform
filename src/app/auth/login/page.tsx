"use client"

import { useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleLogin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    setLoading(true)
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {

      setErrorMessage(error.message)

      setLoading(false)

      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      console.log("USER METADATA", user.user_metadata)

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, province, industry, phone, role")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile) {
        const { error: profileInsertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              business_name: user.user_metadata?.business_name || "Supplier",
              email: user.email,
              province: user.user_metadata?.province || "",
              industry: user.user_metadata?.industry || "",
              phone: user.user_metadata?.phone || "",
              role: "supplier",
              verification_status: "Pending Review",
            },
          ])

        if (profileInsertError) {
          console.error(profileInsertError)
          setErrorMessage(profileInsertError.message)
          setLoading(false)
          return
        }
      } else if (
        !profile.province ||
        !profile.industry ||
        !profile.phone ||
        !profile.role
      ) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            province: profile.province || user.user_metadata?.province || "",
            industry: profile.industry || user.user_metadata?.industry || "",
            phone: profile.phone || user.user_metadata?.phone || "",
            role: profile.role || "supplier",
          })
          .eq("id", user.id)

        if (profileUpdateError) {
          console.error(profileUpdateError)
          setErrorMessage(profileUpdateError.message)
          setLoading(false)
          return
        }
      }
    }

    setLoading(false)
    router.push("/dashboard")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">

      <div className="w-full max-w-md rounded-3xl border border-panel bg-panel p-8 shadow-panel">

        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">
            Procurement portal
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-primary">
            Supplier login
          </h1>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Sign in to manage your profile, respond to RFQs, and track quotes.
          </p>
        </div>

        <div className="space-y-5">
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
            {loading ? "Signing in..." : "Login"}
          </button>

        </div>

      </div>

    </main>
  )
}

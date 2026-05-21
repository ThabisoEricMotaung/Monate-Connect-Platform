"use client"

import { useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {

      alert(error.message)

      setLoading(false)

      return
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
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

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
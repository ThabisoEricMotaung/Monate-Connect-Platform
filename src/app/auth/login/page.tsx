"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {

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
    <main className="flex min-h-screen items-center justify-center bg-[#050c08] px-6 text-white">

      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#08120e] p-8 shadow-xl shadow-black/20">

        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
            Procurement portal
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white">
            Supplier login
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sign in to manage your profile, respond to RFQs, and track quotes.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300">Email address</label>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#07110d] px-5 py-4 text-white outline-none transition focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#07110d] px-5 py-4 text-white outline-none transition focus:border-green-500"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-green-500 py-4 font-semibold text-black transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

        </div>

      </div>

    </main>
  )
}
"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert("Login successful!")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071b11] px-6 text-white">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">

        <div className="mb-8 text-center">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500 text-2xl font-bold text-black">
            M
          </div>

          <h1 className="text-4xl font-bold">
            Welcome Back
          </h1>

          <p className="mt-3 text-gray-400 leading-relaxed">
            Access your supplier dashboard and procurement opportunities.
          </p>

        </div>

        <div className="space-y-5">

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none transition focus:border-green-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none transition focus:border-green-500"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-green-500 py-4 font-semibold text-black transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <p className="pt-2 text-center text-sm text-gray-500">
            Need an account?{" "}
            <Link
              href="/auth/signup"
              className="text-green-400 hover:text-green-300"
            >
              Join the network
            </Link>
          </p>

        </div>

      </div>

    </main>
  )
}
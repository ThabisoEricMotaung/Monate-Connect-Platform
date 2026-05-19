"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {

  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: businessName,
        },
      },
    })

    if (error) {

      setLoading(false)

      alert(error.message)

      return
    }

    const user = data.user

    if (user) {

      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            business_name: businessName,
            email: email,
          },
        ])

      if (profileError) {
        console.error(profileError)
      }
    }

    setLoading(false)

    alert("Account created successfully!")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050c08] px-6 text-white">

      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#08120e] p-8 shadow-xl shadow-black/20">

        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
            Supplier onboarding
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white">
            Create your account
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Register your business to access RFQs, submit quotes, and connect with procurement teams.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300">Business name</label>
            <input
              type="text"
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#07110d] px-5 py-4 text-white outline-none transition focus:border-green-500"
            />
          </div>

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
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-2xl bg-green-500 py-4 font-semibold text-black transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

        </div>

      </div>

    </main>
  )
}
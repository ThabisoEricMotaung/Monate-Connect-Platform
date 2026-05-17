"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {
  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [accountType, setAccountType] = useState("Township Supplier")
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: businessName,
          whatsapp,
          account_type: accountType,
        },
      },
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert("Account created successfully!")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071b11] px-6 text-white">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">

        <div className="mb-8 text-center">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500 text-2xl font-bold text-black">
            M
          </div>

          <h1 className="text-4xl font-bold">
            Join The Network
          </h1>

          <p className="mt-3 text-gray-400 leading-relaxed">
            Create your supplier profile and access procurement opportunities across mining, infrastructure, and township ecosystems.
          </p>

        </div>

        <div className="space-y-5">

          <input
            type="text"
            placeholder="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none transition focus:border-green-500"
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none transition focus:border-green-500"
          />

          <input
            type="text"
            placeholder="WhatsApp Number"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none transition focus:border-green-500"
          />

          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none transition focus:border-green-500"
          >
            <option className="bg-[#071b11]">Township Supplier</option>
            <option className="bg-[#071b11]">Mining Vendor</option>
            <option className="bg-[#071b11]">Infrastructure Contractor</option>
            <option className="bg-[#071b11]">Buyer / Procurement Team</option>
          </select>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none transition focus:border-green-500"
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-2xl bg-green-500 py-4 font-semibold text-black transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="pt-2 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-green-400 hover:text-green-300"
            >
              Sign in
            </Link>
          </p>

        </div>

      </div>

    </main>
  )
}
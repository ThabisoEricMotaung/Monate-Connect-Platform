"use client"

import { FormEvent, useState } from "react"

// Lower-commitment alternative to full registration: just an email address,
// for the weekly "open opportunities" digest (see
// src/app/api/opportunity-digest/subscribe and
// src/app/api/cron/opportunity-digest). Sits next to the "Register as
// Supplier" CTA for guests who aren't ready to create a full account yet.
export default function DigestSignupForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setStatus("submitting")
    try {
      const res = await fetch("/api/opportunity-digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        setStatus("error")
        return
      }
      setStatus("done")
    } catch {
      setError("Something went wrong. Please try again.")
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <p className={dark ? "text-sm font-semibold text-[#5DCAA5]" : "text-sm font-semibold text-success"}>
        You&apos;re subscribed — check your inbox.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={
            dark
              ? "w-52 rounded-md border border-[#f8f4ec]/25 bg-transparent px-3 py-2 text-sm text-[#f8f4ec] outline-none placeholder:text-[#f8f4ec]/50 focus:border-[#c8a060]"
              : "w-52 rounded-md border border-panel bg-panel px-3 py-2 text-sm text-primary outline-none placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
          }
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className={
            dark
              ? "rounded-md border border-[#f8f4ec]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f8f4ec] transition hover:border-[#f8f4ec]/50 disabled:opacity-60"
              : "rounded-md border border-panel bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-secondary transition hover:text-accent disabled:opacity-60"
          }
        >
          {status === "submitting" ? "Sending…" : "Email me weekly"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </form>
  )
}

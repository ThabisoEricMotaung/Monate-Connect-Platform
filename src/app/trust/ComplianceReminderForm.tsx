"use client"

import { FormEvent, useState } from "react"

// Public lead magnet: no account needed, just an email and a self-reported
// B-BBEE certificate expiry date. See
// src/app/api/compliance-reminder/subscribe and
// src/app/api/cron/compliance-reminders.
export default function ComplianceReminderForm() {
  const [email, setEmail] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setStatus("submitting")
    try {
      const res = await fetch("/api/compliance-reminder/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, expiryDate }),
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
      <p className="text-sm font-semibold text-success">
        You&apos;re set — we&apos;ll email you 30 days before it expires.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-48 rounded-md border border-panel bg-panel px-3 py-2 text-sm text-primary outline-none placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
        <input
          type="date"
          required
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          aria-label="B-BBEE certificate expiry date"
          className="rounded-md border border-panel bg-panel px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-md border border-panel bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-secondary transition hover:text-accent disabled:opacity-60"
        >
          {status === "submitting" ? "Saving…" : "Remind me"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </form>
  )
}

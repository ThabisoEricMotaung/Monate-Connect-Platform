"use client"

import { useCallback, useEffect, useState } from "react"
import type { MiningProjectReference } from "@/types/mining"

type PendingReference = MiningProjectReference & {
  supplier: { business_name: string | null; full_name: string | null; email: string | null } | null
}

function formatDate(value: string | null) {
  if (!value) return "Ongoing"
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

export default function MiningReferenceReview() {
  const [references, setReferences] = useState<PendingReference[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const response = await fetch("/api/admin/mining/project-references", { cache: "no-store" })
    const payload = (await response.json().catch(() => null)) as { project_references?: PendingReference[]; error?: string } | null
    if (!response.ok) setError(payload?.error ?? "Could not load pending project references.")
    else setReferences(payload?.project_references ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function review(referenceId: string, action: "verify" | "reject") {
    setReviewingId(referenceId)
    setError(null)
    const response = await fetch(`/api/admin/mining/project-references/${referenceId}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    setReviewingId(null)
    if (!response.ok) {
      setError(payload?.error ?? `Could not ${action} the reference.`)
      return
    }
    setReferences((current) => current.filter((reference) => reference.id !== referenceId))
  }

  return (
    <section className="mx-auto max-w-6xl text-[#22281f]">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a9834a]">Mining verification</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#1a3a2a]">Project references</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#555555]">Review supplier-submitted mining experience. Verification queues fresh qualification results for that supplier.</p>
      </div>

      {error && <p role="alert" className="mb-5 rounded-md border border-[#b3583f]/30 bg-[#fff7f5] px-4 py-3 text-sm text-[#9a4633]">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white shadow-sm">
        {loading ? <p className="p-7 text-sm text-[#6b7568]">Loading pending references…</p> : references.length === 0 ? <div className="p-8 text-center"><h2 className="font-semibold text-[#1a3a2a]">No pending references</h2><p className="mt-1 text-sm text-[#6b7568]">New supplier submissions will appear here.</p></div> : (
          <div className="divide-y divide-[#ebebeb]">
            {references.map((reference) => {
              const supplierName = reference.supplier?.business_name || reference.supplier?.full_name || reference.supplier?.email || "Unknown supplier"
              const busy = reviewingId === reference.id
              return <article key={reference.id} className="p-5 sm:p-7"><div className="flex flex-col justify-between gap-5 lg:flex-row"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold text-[#1a3a2a]">{reference.mine_name}</h2><span className="rounded-full border border-[#c08a2e]/30 bg-[#fff8e8] px-2.5 py-1 text-xs font-bold text-[#8a641f]">Pending</span></div><p className="mt-1 text-sm font-semibold text-[#a9834a]">{supplierName}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#555555]">{reference.project_description}</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">Period</dt><dd className="mt-1">{formatDate(reference.start_date)} – {formatDate(reference.end_date)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">Role</dt><dd className="mt-1">{reference.role_performed || "Not supplied"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">Contact</dt><dd className="mt-1 break-words">{reference.contact_name || "Not supplied"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">Contact details</dt><dd className="mt-1 break-words">{[reference.contact_phone, reference.contact_email].filter(Boolean).join(" · ") || "Not supplied"}</dd></div></dl></div><div className="flex shrink-0 gap-3 lg:flex-col"><button type="button" disabled={busy} onClick={() => review(reference.id, "verify")} className="min-h-11 flex-1 cursor-pointer rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#244f39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a060] disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none">{busy ? "Reviewing…" : "Verify"}</button><button type="button" disabled={busy} onClick={() => review(reference.id, "reject")} className="min-h-11 flex-1 cursor-pointer rounded-md border border-[#b3583f]/40 bg-white px-5 py-2.5 text-sm font-bold text-[#9a4633] transition hover:bg-[#fff7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b3583f] disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none">Reject</button></div></div></article>
            })}
          </div>
        )}
      </div>
    </section>
  )
}

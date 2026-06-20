"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type RfqRow = {
  id: string
  title: string | null
  status: string | null
  created_at: string | null
}

type Metrics = {
  activeRfqs: number
  quotesReceived: number
}

function statusBadgeClass(status: string | null): string {
  const s = (status ?? "").toLowerCase()
  if (s === "open") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
  if (s === "evaluation") return "border-sky-500/25 bg-sky-500/10 text-sky-300"
  if (s === "awarded") return "border-accent/25 bg-accent/10 text-accent"
  if (s === "closed") return "border-panel bg-surface text-secondary"
  return "border-panel bg-surface text-secondary"
}

export default function BuyerHomePage() {
  const [metrics, setMetrics] = useState<Metrics>({ activeRfqs: 0, quotesReceived: 0 })
  const [recentRfqs, setRecentRfqs] = useState<RfqRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      if (!supabase) return

      const [rfqResult, quoteResult, recentResult] = await Promise.all([
        supabase.from("rfqs").select("id, status"),
        supabase.from("quotes").select("id, status"),
        supabase
          .from("rfqs")
          .select("id, title, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      if (cancelled) return

      const rfqs = (rfqResult.data ?? []) as { status: string | null }[]
      const quotes = (quoteResult.data ?? []) as { status: string | null }[]

      setMetrics({
        activeRfqs: rfqs.filter((r) =>
          ["open", "evaluation"].includes(String(r.status ?? "").toLowerCase()),
        ).length,
        quotesReceived: quotes.length,
      })

      setRecentRfqs((recentResult.data ?? []) as RfqRow[])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <div className="relative mb-8 overflow-hidden border-b border-panel pb-6">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.15]"
          style={{
            background: "url('https://design.canva.ai/GB320ny3MyEuntW') center / cover no-repeat",
            borderRadius: "inherit",
          }}
        />
        <div className="relative z-[1]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            Buyer workspace
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">Overview</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
            Manage your procurement activities, track RFQs, and review supplier quotes.
          </p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="break-words text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
            Active RFQs
          </p>
          <p className="mt-2 break-words text-4xl font-bold text-heading">
            {loading ? "—" : metrics.activeRfqs}
          </p>
          <p className="mt-1 break-words text-xs text-muted">Open &amp; under evaluation</p>
        </div>

        <div className="overflow-hidden rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="break-words text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
            Quotes received
          </p>
          <p className="mt-2 break-words text-4xl font-bold text-heading">
            {loading ? "—" : metrics.quotesReceived}
          </p>
          <p className="mt-1 break-words text-xs text-muted">Total across all RFQs</p>
        </div>

        <div className="flex items-center justify-center overflow-hidden rounded-md border border-accent/30 bg-accent/5 p-6">
          <Link
            href="/dashboard/admin/rfqs/new"
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-3 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
          >
            <span className="text-base leading-none">+</span>
            Create RFQ
          </Link>
        </div>
      </div>

      {/* Recent RFQs */}
      <section>
        <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
            Recent RFQs
          </h2>
          <Link
            href="/dashboard/admin/rfqs"
            className="text-xs font-semibold text-accent transition hover:text-accent-strong"
          >
            View all &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="rounded-md border border-panel bg-card p-8 text-center text-sm text-secondary shadow-panel">
            Loading&hellip;
          </div>
        ) : recentRfqs.length === 0 ? (
          <div className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
            <p className="text-sm font-semibold text-heading">No RFQs yet</p>
            <p className="mt-2 text-sm text-secondary">
              Create your first RFQ to start receiving quotes from verified suppliers.
            </p>
            <Link
              href="/dashboard/admin/rfqs/new"
              className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
            >
              Create new RFQ &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-panel shadow-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel bg-card text-left text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="hidden px-5 py-3 sm:table-cell">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-panel bg-card">
                {recentRfqs.map((rfq) => (
                  <tr key={rfq.id} className="transition hover:bg-surface">
                    <td className="px-5 py-4 font-semibold text-primary">
                      <span className="line-clamp-2 break-words">
                        {rfq.title ?? "Untitled RFQ"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold capitalize ${statusBadgeClass(rfq.status)}`}
                      >
                        {rfq.status ?? "Draft"}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 text-secondary sm:table-cell">
                      {rfq.created_at
                        ? new Date(rfq.created_at).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/admin/rfqs/${rfq.id}`}
                        className="text-xs font-semibold text-accent transition hover:text-accent-strong"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

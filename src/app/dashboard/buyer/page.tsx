"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { formatRand } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import ProvinceMap from "../intelligence/regions/province-map"

type RfqRow = {
  id: string
  title: string | null
  status: string | null
  category: string | null
  province: string | null
  region: string | null
  budget: string | number | null
  deadline: string | null
  created_at: string | null
}

type Metrics = {
  activeRfqs: number
  quotesReceived: number
}

type PipelineStage = "Draft" | "Open" | "Evaluation" | "Awarded" | "Closed"

const stageOrder: PipelineStage[] = ["Draft", "Open", "Evaluation", "Awarded", "Closed"]

const stageDescriptions: Record<PipelineStage, string> = {
  Draft: "Saved but not yet published",
  Open: "Published, accepting quotes",
  Evaluation: "Deadline passed, under review",
  Awarded: "Selected supplier, PO issued",
  Closed: "Completed or cancelled",
}

function normalizeStatus(status: string | null): string {
  return String(status ?? "").trim().toLowerCase()
}

function daysUntil(value: string | null): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function stageForRfq(rfq: RfqRow): PipelineStage {
  const status = normalizeStatus(rfq.status)

  if (["draft"].includes(status)) return "Draft"
  if (["awarded", "po issued"].includes(status)) return "Awarded"
  if (["closed", "completed", "cancelled", "canceled"].includes(status)) return "Closed"
  if (["evaluation", "under review", "review"].includes(status)) return "Evaluation"

  // Status alone isn't authoritative for "open" rows: nothing automatically
  // moves an RFQ out of "open" once its closing date passes, so a deadline
  // check here catches RFQs still marked open in the database that have
  // genuinely stopped accepting quotes.
  const remaining = daysUntil(rfq.deadline)
  if (remaining != null && remaining < 0) return "Evaluation"

  if (["open", "published", "active"].includes(status)) return "Open"

  return "Open"
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
  const [pipelineRfqs, setPipelineRfqs] = useState<RfqRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      if (!supabase) return

      const [rfqResult, quoteResult, recentResult, pipelineResult] = await Promise.all([
        supabase.from("rfqs").select("id, status"),
        supabase.from("quotes").select("id, status"),
        supabase
          .from("rfqs")
          .select("id, title, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("rfqs")
          .select("id, title, status, category, province, region, budget, deadline, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
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

      setPipelineRfqs((pipelineResult.data ?? []) as RfqRow[])

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
            href="/dashboard/buyer/rfqs/new"
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-3 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
          >
            <span className="text-base leading-none">+</span>
            Create RFQ
          </Link>
        </div>
      </div>

      {/* Procurement pipeline */}
      <section className="mb-8 overflow-hidden rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="mb-5 flex flex-col items-start gap-3 border-b border-panel pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-secondary">RFQ stages</p>
            <h2 className="mt-2 text-xl font-semibold text-heading">Procurement pipeline</h2>
          </div>
          <Link href="/dashboard/buyer/rfqs" className="text-sm font-semibold text-accent transition hover:text-accent-strong">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Loading&hellip;</p>
        ) : (
          <div className="pb-2 md:overflow-x-auto">
            <div className="flex w-full flex-col gap-3 md:min-w-[1040px] md:flex-row">
              {stageOrder.map((stage) => {
                const rfqsInStage = pipelineRfqs.filter((rfq) => stageForRfq(rfq) === stage)
                return (
                  <div key={stage} className="w-full overflow-hidden rounded-md border border-panel bg-panel p-3 md:flex-1">
                    <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-heading">{stage}</p>
                        <p className="mt-1 break-words text-[0.68rem] leading-5 text-muted">
                          {stageDescriptions[stage]}
                        </p>
                      </div>
                      <span className="rounded-full border border-panel bg-card px-2 py-0.5 text-xs font-bold text-secondary">
                        {rfqsInStage.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {rfqsInStage.slice(0, 3).map((rfq) => {
                        const remaining = daysUntil(rfq.deadline)
                        return (
                          <Link
                            key={rfq.id}
                            href={`/dashboard/buyer/rfqs/${rfq.id}`}
                            className="block overflow-hidden rounded-md border border-panel bg-card p-3 transition hover:border-accent/50"
                          >
                            <p className="break-words text-sm font-semibold leading-5 text-heading">
                              {rfq.title ?? `RFQ-${rfq.id}`}
                            </p>
                            <p className="mt-2 break-words text-[0.68rem] text-secondary">
                              {rfq.category ?? "No industry"} · {rfq.province ?? rfq.region ?? "No province"}
                            </p>
                            <p className="mt-2 break-words text-xs font-semibold text-heading">
                              {formatRand(rfq.budget)}
                            </p>
                            {stage === "Open" && remaining != null && (
                              <p className={`mt-1 text-[0.68rem] font-semibold ${remaining <= 3 ? "text-warning" : "text-muted"}`}>
                                {remaining >= 0 ? `${remaining} days left` : "Deadline passed"}
                              </p>
                            )}
                          </Link>
                        )
                      })}
                      {rfqsInStage.length === 0 && (
                        <p className="px-1 py-2 text-xs text-muted">No RFQs in this stage</p>
                      )}
                      {rfqsInStage.length > 3 && (
                        <p className="px-1 pt-1 text-xs font-semibold text-muted">
                          + {rfqsInStage.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Recent RFQs */}
      <section>
        <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
            Recent RFQs
          </h2>
          <Link
            href="/dashboard/buyer/rfqs"
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
              href="/dashboard/buyer/rfqs/new"
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
                        href={`/dashboard/buyer/rfqs/${rfq.id}`}
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

      <div className="mt-6">
        <ProvinceMap />
      </div>
    </div>
  )
}

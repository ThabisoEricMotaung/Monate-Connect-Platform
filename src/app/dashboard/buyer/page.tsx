"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { formatRand } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import RFQCopilotHero from "@/components/thuso/RFQCopilotHero"
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
  dueSoon: number
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

// Supabase/PostgREST caps unpaginated responses at a per-project default
// (1000 rows on this project). rfqs now routinely exceeds that once the
// eTenders sync has run (406 drafts alone), so plain queries silently
// truncate — and since they're ordered newest-first, a truncated page can
// end up all-drafts, making Open/Evaluation/Awarded look empty even when
// they're not. This pages through with .range() until a page comes back
// short.
const FETCH_PAGE_SIZE = 1000

async function readAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery(from, from + FETCH_PAGE_SIZE - 1)

    if (error) {
      console.warn(error.message)
      break
    }

    const rows = (data ?? []) as T[]
    allRows.push(...rows)

    if (rows.length < FETCH_PAGE_SIZE) break
    from += FETCH_PAGE_SIZE
  }

  return allRows
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
  const [metrics, setMetrics] = useState<Metrics>({ activeRfqs: 0, quotesReceived: 0, dueSoon: 0 })
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
      const client = supabase

      // Get current user to filter RFQs
      const { data: { user } } = await client.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setUTCHours(0, 0, 0, 0)
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const [activeRfqsResult, quotesTodayResult, dueSoonResult, recentResult, pipelineRows] = await Promise.all([
        client
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("buyer_user_id", user.id)
          .or("status.ilike.open,status.ilike.active")
          .gt("closing_date", now.toISOString()),
        client
          .from("tender_responses")
          .select("id, rfqs!inner(id)", { count: "exact", head: true })
          .eq("rfqs.buyer_user_id", user.id)
          .gte("created_at", todayStart.toISOString()),
        client
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("buyer_user_id", user.id)
          .gte("closing_date", now.toISOString())
          .lte("closing_date", sevenDaysFromNow.toISOString()),
        client
          .from("rfqs")
          .select("id, title, status, created_at")
          .eq("buyer_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        readAllRows<RfqRow>((from, to) =>
          client
            .from("rfqs")
            .select("id, title, status, category, province, region, budget, deadline, created_at")
            .eq("buyer_user_id", user.id)
            .order("created_at", { ascending: false })
            .range(from, to),
        ),
      ])

      if (cancelled) return

      setMetrics({
        activeRfqs: activeRfqsResult.count ?? 0,
        quotesReceived: quotesTodayResult.count ?? 0,
        dueSoon: dueSoonResult.count ?? 0,
      })

      setPipelineRfqs(pipelineRows)

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

      <RFQCopilotHero
        activeRfqCount={metrics.activeRfqs}
        quotesReceivedTodayCount={metrics.quotesReceived}
        dueSoonCount={metrics.dueSoon}
        loading={loading}
        browseAllHref="/dashboard/buyer/rfqs"
        viewQuotesHref="/dashboard/buyer/quotes"
        createRfqHref="/dashboard/buyer/rfqs/new"
      />

      {/* Thuso AI Assistant for RFQ Management */}
      <section className="mb-8 rounded-3xl border border-[#1E3A2B]/20 bg-gradient-to-br from-[#1E3A2B]/3 via-white to-[#F4F0E7]/40 overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Left Content */}
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#A67832] font-semibold">AI RFQ MANAGEMENT</p>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#1E3A2B] leading-tight">
              Thuso RFQ Workspace
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-8 text-[#33463A]">
              Get AI-powered insights on supplier bids, compliance scoring, risk analysis, and negotiation strategies. Streamline your procurement decisions.
            </p>

            {/* Feature Grid */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E3A2B]/10">
                  <svg className="h-5 w-5 text-[#1E3A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[#1E3A2B]">Analyze supplier bids</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E3A2B]/10">
                  <svg className="h-5 w-5 text-[#1E3A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[#1E3A2B]">Evaluate compliance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E3A2B]/10">
                  <svg className="h-5 w-5 text-[#1E3A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[#1E3A2B]">Assess risk & value</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E3A2B]/10">
                  <svg className="h-5 w-5 text-[#1E3A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m0 0l-2-1m2 1v2.5M14 4l-2 1m0 0l-2-1m2 1v2.5" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[#1E3A2B]">Strengthen negotiation</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <Link
                href="/dashboard/buyer/workspace"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E3A2B] px-8 py-3.5 font-semibold text-white transition-all hover:bg-[#294D39] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A2B]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Open Workspace
              </Link>
            </div>
          </div>

          {/* Right Side - Visual Element */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A2B]/5 to-[#A67832]/5 rounded-2xl" />
            <div className="relative rounded-2xl border border-[#1E3A2B]/10 bg-white p-6 shadow-xl">
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-4 w-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-[#6F6A61]">Requirements reviewed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-4 w-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-[#6F6A61]">Compliance scored</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-4 w-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-[#6F6A61]">Strategy optimized</span>
                </div>
              </div>
              <div className="rounded-lg bg-[#1E3A2B]/5 px-3 py-2">
                <p className="text-xs font-medium text-[#1E3A2B]">Better procurement decisions, faster.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                        <Link
                          href="/dashboard/buyer/rfqs"
                          className="block px-1 pt-1 text-xs font-semibold text-accent transition hover:text-accent-strong"
                        >
                          + {rfqsInStage.length - 3} more &rarr;
                        </Link>
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

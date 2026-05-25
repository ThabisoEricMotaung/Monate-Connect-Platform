"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import {
  calculateRFQMatchScore,
  isRFQIndustryMatch,
  isRFQLocalMatch,
  type RFQMatchScore,
} from "@/lib/rfqMatch"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  title: string
  description: string | null
  region: string | null
  province: string | null
  category: string | null
  budget: string | null
  status: string
  deadline: string | null
  created_at: string | null
}

type SupplierProfile = {
  province: string | null
  industry: string | null
}

const statusStyles: Record<string, string> = {
  Open: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Draft: "border-panel bg-panel text-secondary",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  "Under Review": "border-sky-500/25 bg-sky-500/10 text-sky-200",
  Closed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Awarded: "border-success/30 bg-success-soft text-success",
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatRand(amount: string | null): string {
  if (!amount) return "-"

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`
}

function scoreTone(score: number): string {
  if (score >= 80) return "border-success bg-success-soft text-success"
  if (score >= 50) return "border-sky-500/30 bg-sky-500/10 text-sky-700"
  if (score >= 20) return "border-warning bg-warning-soft text-warning"
  return "border-panel bg-panel text-secondary"
}

function scoreBar(score: number): string {
  if (score >= 80) return "bg-success"
  if (score >= 50) return "bg-sky-500"
  if (score >= 20) return "bg-warning"
  return "bg-muted"
}

function RFQCard({
  rfq,
  matchScore,
  hasLocalMatch,
  hasIndustryMatch,
}: {
  rfq: RFQ
  matchScore: RFQMatchScore
  hasLocalMatch: boolean
  hasIndustryMatch: boolean
}) {
  const displayStatus = getRFQDisplayStatus(rfq.status, rfq.deadline)

  return (
    <article className="rounded-md border border-panel bg-card p-6 shadow-panel transition-colors hover:border-accent/60 hover:bg-surface">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
              RFQ #{rfq.id}
            </p>
            {hasLocalMatch && (
              <span className="inline-flex rounded-md border border-accent-soft bg-accent-soft px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-heading">
                Local Match
              </span>
            )}
            {hasIndustryMatch && (
              <span className="inline-flex rounded-md border border-success bg-success-soft px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-success">
                Industry Match
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-heading">
            {rfq.title}
          </h2>
          {rfq.description && (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
              {rfq.description}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <div className="flex flex-col gap-2 sm:items-end">
            <span
              className={"inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] " + (statusStyles[displayStatus] ?? "border-panel bg-panel text-secondary")}
            >
              {displayStatus}
            </span>
            <span
              className={`inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${scoreTone(matchScore.score)}`}
            >
              {matchScore.score}% - {matchScore.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-panel bg-panel p-4">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Region</p>
          <p className="mt-2 text-sm font-semibold text-heading">{rfq.region || rfq.province || "-"}</p>
        </div>
        <div className="rounded-md border border-panel bg-panel p-4">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Category</p>
          <p className="mt-2 text-sm font-semibold text-heading">{rfq.category || "-"}</p>
        </div>
        <div className="rounded-md border border-panel bg-panel p-4">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Budget (ZAR)</p>
          <p className="mt-2 text-sm font-semibold text-heading">{formatRand(rfq.budget)}</p>
        </div>
        <div className="rounded-md border border-panel bg-panel p-4">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Deadline</p>
          <p className="mt-2 text-sm font-semibold text-heading">{formatDeadline(rfq.deadline)}</p>
        </div>
        <div className="rounded-md border border-panel bg-panel p-4">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Deadline Status</p>
          <p className="mt-2 text-sm font-semibold text-heading">{displayStatus}</p>
        </div>
        <div className="rounded-md border border-panel bg-panel p-4 sm:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Match Score</p>
            <p className="text-sm font-semibold text-heading">
              {matchScore.score}% - {matchScore.label}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
            <div
              className={`h-full rounded-full ${scoreBar(matchScore.score)}`}
              style={{ width: `${matchScore.score}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-panel pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Review procurement specifications and submit your competitive quote for consideration.
        </p>
        <Link
          href={"/dashboard/rfqs/" + rfq.id}
          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
        >
          View RFQ
        </Link>
      </div>
    </article>
  )
}

function RFQListSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-2.5 w-16 animate-pulse rounded bg-panel" />
              <div className="h-5 w-72 animate-pulse rounded bg-panel" />
              <div className="h-3.5 w-96 animate-pulse rounded bg-panel" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-md bg-panel" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="rounded-md border border-panel bg-panel p-4">
                <div className="h-2 w-14 animate-pulse rounded bg-surface" />
                <div className="mt-3 h-4 w-20 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-panel pt-4">
            <div className="h-3.5 w-80 animate-pulse rounded bg-panel" />
            <div className="h-8 w-28 animate-pulse rounded-md bg-panel" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [profile, setProfile] = useState<SupplierProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadSupplierRFQs() {
      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      if (userData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("province, industry")
          .eq("id", userData.user.id)
          .maybeSingle()

        if (profileError) {
          setError(profileError.message)
          setLoading(false)
          return
        }

        setProfile((profileData ?? null) as SupplierProfile | null)
      }

      const { data, error: rfqError } = await supabase
        .from("rfqs")
        .select("*")
        .order("id", { ascending: false })

      if (rfqError) {
        setError(rfqError.message)
        setLoading(false)
        return
      }

      setRfqs((data ?? []) as RFQ[])
      setLoading(false)
    }

    loadSupplierRFQs()
  }, [])

  const scoredRFQs = useMemo(
    () =>
      rfqs
        .map((rfq) => ({
          rfq,
          matchScore: calculateRFQMatchScore(profile, rfq),
          hasLocalMatch: isRFQLocalMatch(profile, rfq),
          hasIndustryMatch: isRFQIndustryMatch(profile, rfq),
        }))
        .sort(
          (a, b) =>
            b.matchScore.score - a.matchScore.score ||
            new Date(b.rfq.created_at ?? 0).getTime() -
              new Date(a.rfq.created_at ?? 0).getTime()
        ),
    [profile, rfqs]
  )

  const recommendedRFQs = scoredRFQs.filter(
    (item) => item.matchScore.score >= 20
  )
  const otherRFQs = scoredRFQs.filter((item) => item.matchScore.score < 20)

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accent">
              Procurement opportunities
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-heading">
              RFQ Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
              Browse active requests for quotations from mining, infrastructure,
              municipal, and industrial procurement buyers.
            </p>
          </div>
          <Link
            href="/dashboard/admin/rfqs/new"
            className="mt-1 inline-flex shrink-0 items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
          >
            Create RFQ
          </Link>
        </div>
      </div>

      {loading && <RFQListSkeleton />}

      {!loading && error && (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-6">
          <p className="text-sm font-medium text-rose-200">Failed to load RFQs</p>
          <p className="mt-1 text-xs text-rose-200/70">{error}</p>
        </div>
      )}

      {!loading && !error && rfqs.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-panel bg-panel">
            <svg
              className="h-5 w-5 text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-heading">No RFQs available yet.</p>
          <p className="mt-1 text-xs text-muted">
            Active procurement requests will appear here once published by an administrator.
          </p>
        </div>
      )}

      {!loading && !error && rfqs.length > 0 && (
        <div className="space-y-8">
          {recommendedRFQs.length > 0 && (
            <section>
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                  Recommended for your business
                </p>
              </div>
              <div className="space-y-5">
                {recommendedRFQs.map((item) => (
                  <RFQCard key={item.rfq.id} {...item} />
                ))}
              </div>
            </section>
          )}

          {otherRFQs.length > 0 && (
            <section>
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
                  Other opportunities
                </p>
              </div>
              <div className="space-y-5">
                {otherRFQs.map((item) => (
                  <RFQCard key={item.rfq.id} {...item} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

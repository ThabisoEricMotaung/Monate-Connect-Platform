"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import { getCurrentProfile } from "@/lib/auth"
import {
  getSupplierScores,
  type SupplierIntelligenceRecord,
} from "@/lib/intelligence"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(level: "Low" | "Medium" | "High") {
  if (level === "Low") return "text-success border-success/30 bg-success/10"
  if (level === "Medium") return "text-warning border-warning/30 bg-warning/10"
  return "text-rose-600 border-rose-500/30 bg-rose-500/10"
}

function scoreColor(score: number) {
  if (score >= 70) return "bg-success"
  if (score >= 40) return "bg-warning"
  return "bg-rose-500"
}

function smartScoreTextColor(tone: SupplierIntelligenceRecord["smartScore"]["tone"]) {
  if (tone === "gold") return "text-amber-700"
  if (tone === "green") return "text-success"
  if (tone === "blue") return "text-blue-700"
  if (tone === "orange") return "text-warning"
  return "text-rose-700"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RateBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[0.68rem] text-secondary">{label}</span>
        <span className="text-[0.68rem] font-bold tabular-nums text-heading">
          {value}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function SupplierRow({
  record,
  rank,
}: {
  record: SupplierIntelligenceRecord
  rank: number
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="enterprise-card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface/60"
        aria-expanded={expanded}
      >
        {/* Rank */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-panel bg-surface text-xs font-bold text-muted">
          {rank}
        </span>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-heading">
            {record.supplierName}
          </p>
          <p className="truncate text-xs text-muted">
            {[record.province, record.industry].filter(Boolean).join(" · ") || "No location/industry"}
          </p>
        </div>

        {/* Score */}
        <div className="hidden shrink-0 flex-col items-center sm:flex">
          <span
            className={`text-xl font-bold tabular-nums leading-none ${smartScoreTextColor(record.smartScore.tone)}`}
          >
            {record.smartScore.score}
          </span>
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">
            SmartScore
          </span>
        </div>

        {/* Risk badge */}
        <span
          className={`hidden shrink-0 rounded-full border px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider md:inline-flex ${riskColor(record.riskLevel)}`}
        >
          {record.riskLevel} Risk
        </span>

        {/* Verification */}
        {record.verificationStatus === "Verified" && (
          <span className="hidden shrink-0 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-success lg:inline-flex">
            Verified
          </span>
        )}

        {/* Expand icon */}
        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-panel px-5 pb-5 pt-4">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Rates */}
            <div className="space-y-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                Performance Rates
              </p>
              <RateBar label="Response Rate" value={record.responseRate} />
              <RateBar label="Award Rate" value={record.awardRate} />
              <RateBar label="Contract Completion" value={record.completionRate} />
              <RateBar label="Invoice Compliance" value={record.invoiceCompliance} />
              <RateBar label="Payment Reliability" value={record.paymentReliabilityRate} />
            </div>

            {/* Score breakdown */}
            <div className="space-y-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                SmartScore
              </p>
              <div className="flex items-center gap-4">
                <SmartScoreCircle
                  score={record.smartScore}
                  label="Trust Score"
                  size="sm"
                  compact
                  className="shrink-0 bg-panel"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${riskColor(record.riskLevel)}`}>
                      {record.riskLevel} Risk
                    </span>
                  </div>
                  {record.verificationStatus === "Verified" && (
                    <span className="inline-flex rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-success">
                      Verified Supplier
                    </span>
                  )}
                  <p className="text-xs text-muted">
                    Procurement trust score from verification, readiness,
                    response activity, awarded work, and contract completion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-panel bg-card px-4 py-3 shadow-panel">
      <p className="text-[0.63rem] font-bold uppercase tracking-[0.22em] text-secondary">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="enterprise-card !p-4 space-y-2">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-pulse rounded-full bg-panel" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-40 animate-pulse rounded bg-panel" />
          <div className="h-2.5 w-24 animate-pulse rounded bg-panel" />
        </div>
        <div className="h-6 w-12 animate-pulse rounded-full bg-panel" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplierIntelligencePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [records, setRecords] = useState<SupplierIntelligenceRecord[]>([])
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<"All" | "Low" | "Medium" | "High">("All")

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()
      if (profile?.role !== "admin" && profile?.role !== "buyer") {
        router.replace("/dashboard")
        return
      }
      try {
        const data = await getSupplierScores()
        setRecords(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load supplier scores")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !search ||
        r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        (r.province?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (r.industry?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchRisk = riskFilter === "All" || r.riskLevel === riskFilter
      return matchSearch && matchRisk
    })
  }, [records, search, riskFilter])

  const stats = useMemo(() => ({
    total: records.length,
    low: records.filter((r) => r.riskLevel === "Low").length,
    medium: records.filter((r) => r.riskLevel === "Medium").length,
    high: records.filter((r) => r.riskLevel === "High").length,
  }), [records])

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Intelligence</p>
        <h1 className="enterprise-page-title">Supplier Intelligence</h1>
        <p className="enterprise-page-description">
          Per-supplier performance scores computed from response behaviour, award
          history, contract completion, and invoice compliance.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Failed to load supplier data</p>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary stats */}
          <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatChip label="Total Suppliers" value={stats.total} tone="text-heading" />
            <StatChip label="Low Risk" value={stats.low} tone="text-success" />
            <StatChip label="Medium Risk" value={stats.medium} tone="text-warning" />
            <StatChip label="High Risk" value={stats.high} tone="text-rose-600" />
          </section>

          {/* Filters */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, province, or industry…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="enterprise-input pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              {(["All", "Low", "Medium", "High"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskFilter(level)}
                  className={[
                    "rounded-lg border px-3.5 py-2 text-xs font-bold transition",
                    riskFilter === level
                      ? "border-accent bg-accent text-button"
                      : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
                  ].join(" ")}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier list */}
          {filtered.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-panel bg-card">
              <p className="text-sm text-muted">
                {records.length === 0
                  ? "No supplier data available"
                  : "No suppliers match your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((record, i) => (
                <SupplierRow key={record.supplierId} record={record} rank={i + 1} />
              ))}
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}
    </div>
  )
}

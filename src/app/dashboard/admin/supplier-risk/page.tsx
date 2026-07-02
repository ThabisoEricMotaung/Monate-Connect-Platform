"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  getSupplierRiskAssessments,
  getRiskSummary,
  RISK_FACTORS,
  type RiskLevel,
  type RiskFactor,
  type SupplierRiskRecord,
} from "@/lib/supplierRisk"
import { saveSupplier } from "@/lib/savedSuppliers"
import { createDecisionItem } from "@/lib/decisionBoard"

// --- Constants ----------------------------------------------------------------

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
]

const VERIFICATION_STATUSES = ["Verified", "Under Review", "Pending Review", "Unverified"]

// --- Helpers ------------------------------------------------------------------

function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case "Critical": return "border-rose-600/40 bg-rose-600/10 text-rose-700"
    case "High":     return "border-rose-500/35 bg-rose-500/8 text-rose-600"
    case "Medium":   return "border-warning/40 bg-warning/10 text-warning"
    case "Low":      return "border-success/40 bg-success/10 text-success"
  }
}

function riskLevelBg(level: RiskLevel): string {
  switch (level) {
    case "Critical": return "border-rose-600/25 bg-rose-600/5"
    case "High":     return "border-rose-500/20 bg-rose-500/3"
    case "Medium":   return "border-warning/20 bg-warning/3"
    case "Low":      return ""
  }
}

function riskScoreBar(score: number): string {
  if (score >= 75) return "bg-rose-600"
  if (score >= 45) return "bg-rose-500"
  if (score >= 20) return "bg-warning"
  return "bg-success"
}

function severityDot(severity: RiskFactor["severity"]): string {
  switch (severity) {
    case "critical": return "bg-rose-600"
    case "high":     return "bg-rose-500"
    case "medium":   return "bg-warning"
    case "low":      return "bg-muted"
  }
}

function severityBadge(severity: RiskFactor["severity"]): string {
  switch (severity) {
    case "critical": return "border-rose-600/35 bg-rose-600/10 text-rose-700"
    case "high":     return "border-rose-500/30 bg-rose-500/8 text-rose-600"
    case "medium":   return "border-warning/35 bg-warning/10 text-warning"
    case "low":      return "border-panel bg-surface text-muted"
  }
}

function categoryIcon(cat: RiskFactor["category"]): string {
  switch (cat) {
    case "compliance":   return "ðŸ“‹"
    case "finance":      return "💳"
    case "verification": return "ðŸ”’"
    case "performance":  return "ðŸ“Š"
    case "activity":     return "⏱"
  }
}

function verificationBadge(status: string | null): string {
  switch (status) {
    case "Verified":      return "border-success/40 bg-success/10 text-success"
    case "Under Review":  return "border-sky-500/35 bg-sky-500/10 text-sky-700"
    case "Pending Review":return "border-warning/35 bg-warning/10 text-warning"
    default:              return "border-panel bg-surface text-muted"
  }
}

function fmtDate(d: string | null): string {
  if (!d) return "Never"
  return new Date(d).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

// --- Summary card -------------------------------------------------------------

function SummaryCard({
  level,
  count,
  active,
  onClick,
}: {
  level: RiskLevel | "All"
  count: number
  active: boolean
  onClick: () => void
}) {
  const colors: Record<string, string> = {
    Critical: "text-rose-700 border-rose-600/30 bg-rose-600/8",
    High:     "text-rose-600 border-rose-500/25 bg-rose-500/5",
    Medium:   "text-warning  border-warning/30  bg-warning/8",
    Low:      "text-success  border-success/30  bg-success/8",
    All:      "text-heading  border-panel        bg-card",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-1.5 rounded-md border p-4 text-center shadow-panel transition",
        colors[level] ?? colors.All,
        active ? "ring-2 ring-accent ring-offset-1" : "hover:shadow-md",
      ].join(" ")}
    >
      <span className="text-3xl font-bold tabular-nums">{count}</span>
      <span className="text-[0.62rem] font-bold uppercase tracking-wider opacity-80">{level} Risk</span>
    </button>
  )
}

// --- Risk factor pill ---------------------------------------------------------

function RiskFactorPill({ factor }: { factor: RiskFactor }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6rem] font-bold ${severityBadge(factor.severity)}`}
      title={factor.description}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${severityDot(factor.severity)}`} aria-hidden="true" />
      {categoryIcon(factor.category)} {factor.label}
    </span>
  )
}

// --- Supplier risk card -------------------------------------------------------

function RiskCard({
  record,
  rank,
}: {
  record: SupplierRiskRecord
  rank: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [watchlistMsg, setWatchlistMsg] = useState("")
  const [escalateMsg, setEscalateMsg] = useState("")

  const messageLink = `/dashboard/messages?receiver_id=${record.supplierId}&subject=${encodeURIComponent("Compliance Update Request")}`
  const profileLink = `/dashboard/suppliers/${record.supplierId}`

  async function handleEscalateToBoard() {
    try {
      await createDecisionItem({
        item_type: "supplier_risk",
        entity_id: record.supplierId,
        title: `${record.riskLevel} Risk Supplier: ${record.supplierName}`,
        description: `Risk score: ${record.riskScore}/100. Triggered factors: ${record.triggeredFactors.map((f) => f.label).join(", ")}.`,
        priority: record.riskLevel === "Critical" ? "Critical" : record.riskLevel === "High" ? "High" : "Normal",
      })
      setEscalateMsg("Escalated ✓")
      setTimeout(() => setEscalateMsg(""), 3000)
    } catch {
      setEscalateMsg("Failed")
      setTimeout(() => setEscalateMsg(""), 3000)
    }
  }

  async function handleSaveToWatchlist() {
    setSaving(true)
    try {
      await saveSupplier(record.supplierId)
      setWatchlistMsg("Added ✓")
      setTimeout(() => setWatchlistMsg(""), 3000)
    } catch {
      setWatchlistMsg("Failed")
      setTimeout(() => setWatchlistMsg(""), 3000)
    } finally {
      setSaving(false)
    }
  }

  const criticalCount = record.triggeredFactors.filter((f) => f.severity === "critical").length
  const highCount     = record.triggeredFactors.filter((f) => f.severity === "high").length
  const mediumCount   = record.triggeredFactors.filter((f) => f.severity === "medium").length

  return (
    <div
      className={[
        "overflow-hidden rounded-md border bg-card shadow-panel transition",
        riskLevelBg(record.riskLevel),
        expanded ? "shadow-md" : "",
      ].join(" ")}
    >
      {/* -- Card header -- */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-surface/40"
        aria-expanded={expanded}
      >
        {/* Rank badge */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-panel bg-surface text-xs font-bold text-muted">
          {rank}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-heading">{record.supplierName}</span>
            {/* Risk level badge */}
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${riskLevelColor(record.riskLevel)}`}>
              {record.riskLevel} Risk
            </span>
            {/* Verification badge */}
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${verificationBadge(record.verificationStatus)}`}>
              {record.verificationStatus ?? "Not Verified"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {[record.province, record.industry].filter(Boolean).join(" · ") || "No location or industry"}
            {record.lastActivityDate && (
              <> · Last active {fmtDate(record.lastActivityDate)}</>
            )}
          </p>
          {/* Risk factor summary pills — show top 4 */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {record.triggeredFactors.slice(0, 4).map((f) => (
              <RiskFactorPill key={f.id} factor={f} />
            ))}
            {record.triggeredFactors.length > 4 && (
              <span className="inline-flex items-center rounded-full border border-panel bg-surface px-2 py-0.5 text-[0.58rem] font-semibold text-muted">
                +{record.triggeredFactors.length - 4} more
              </span>
            )}
            {record.triggeredFactors.length === 0 && (
              <span className="inline-flex items-center gap-1 text-[0.65rem] text-success">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                No risk factors detected
              </span>
            )}
          </div>
        </div>

        {/* Risk score ring (right side) */}
        <div className="hidden shrink-0 flex-col items-center gap-1 sm:flex">
          <div className="relative" style={{ width: 52, height: 52 }}>
            <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="20" fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle
                cx="26" cy="26" r="20"
                fill="none"
                stroke={record.riskScore >= 75 ? "#dc2626" : record.riskScore >= 45 ? "#ef4444" : record.riskScore >= 20 ? "var(--warning)" : "var(--success)"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - record.riskScore / 100)}
                transform="rotate(-90 26 26)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-bold tabular-nums text-heading">{record.riskScore}</span>
            </div>
          </div>
          <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted">Risk</span>
        </div>

        {/* Factor counts */}
        <div className="hidden shrink-0 flex-col items-end gap-0.5 text-right lg:flex">
          {criticalCount > 0 && <span className="text-[0.62rem] font-bold text-rose-700">{criticalCount} critical</span>}
          {highCount > 0 && <span className="text-[0.62rem] font-bold text-rose-600">{highCount} high</span>}
          {mediumCount > 0 && <span className="text-[0.62rem] text-warning">{mediumCount} medium</span>}
        </div>

        {/* Expand arrow */}
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* -- Expanded detail -- */}
      {expanded && (
        <div className="border-t border-panel px-5 pb-5 pt-4">
          <div className="grid gap-5 lg:grid-cols-2">

            {/* Risk factors list */}
            <div>
              <p className="mb-3 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-accent">
                Risk Factors ({record.triggeredFactors.length})
              </p>
              {record.triggeredFactors.length === 0 ? (
                <p className="text-sm text-success">No risk factors detected. Profile is in good standing.</p>
              ) : (
                <div className="space-y-2">
                  {record.triggeredFactors.map((factor) => (
                    <div
                      key={factor.id}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2.5 ${severityBadge(factor.severity)}`}
                    >
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityDot(factor.severity)}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[0.65rem] font-bold">{categoryIcon(factor.category)} {factor.label}</span>
                          <span className={`rounded-full border px-1.5 py-px text-[0.55rem] font-bold uppercase ${severityBadge(factor.severity)}`}>
                            {factor.severity}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[0.67rem] leading-relaxed opacity-80">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: risk score bar + recommended actions + buttons */}
            <div className="space-y-5">
              {/* Risk score bar */}
              <div>
                <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-secondary">
                  Risk Score: {record.riskScore}/100
                </p>
                <div className="h-2.5 overflow-hidden rounded-full bg-panel">
                  <div
                    className={`h-full rounded-full transition-all ${riskScoreBar(record.riskScore)}`}
                    style={{ width: `${record.riskScore}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[0.58rem] text-muted">
                  <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
                </div>
              </div>

              {/* Recommended actions */}
              <div>
                <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-accent">
                  Recommended Actions
                </p>
                <ul className="space-y-1.5">
                  {record.recommendedActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-secondary">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={profileLink}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 py-2 text-xs font-bold text-button transition hover:bg-accent-strong"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  View Supplier
                </Link>

                <Link
                  href={messageLink}
                  className="inline-flex items-center gap-1.5 rounded-md border border-panel bg-surface px-3.5 py-2 text-xs font-bold text-secondary transition hover:border-accent hover:text-accent"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  Message
                </Link>

                {record.triggeredFactors.some((f) => f.category === "compliance") && (
                  <Link
                    href={messageLink + "&compliance=true"}
                    className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3.5 py-2 text-xs font-bold text-warning transition hover:bg-warning/20"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Request Compliance Update
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSaveToWatchlist}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md border border-panel bg-surface px-3.5 py-2 text-xs font-bold text-secondary transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  {watchlistMsg || (saving ? "Saving…" : "Add to Watchlist")}
                </button>

                {(record.riskLevel === "Critical" || record.riskLevel === "High") && (
                  <button
                    type="button"
                    onClick={handleEscalateToBoard}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/35 bg-rose-500/8 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-500/15"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {escalateMsg || "Escalate to Board"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Skeleton -----------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="flex items-start gap-4">
        <div className="h-8 w-8 animate-pulse rounded-full bg-panel" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-panel" />
          <div className="h-3 w-32 animate-pulse rounded bg-panel" />
          <div className="flex gap-2">
            <div className="h-5 w-20 animate-pulse rounded-full bg-panel" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-panel" />
          </div>
        </div>
        <div className="h-12 w-12 animate-pulse rounded-full bg-panel" />
      </div>
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

export default function SupplierRiskPage() {
  const router = useRouter()
  const [records, setRecords] = useState<SupplierRiskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "All">("All")
  const [provinceFilter, setProvinceFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [verificationFilter, setVerificationFilter] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      try {
        const data = await getSupplierRiskAssessments()
        setRecords(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load risk data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const summary = useMemo(() => getRiskSummary(records), [records])

  // Derive unique industry values from loaded data
  const industries = useMemo(() => {
    const set = new Set(records.map((r) => r.industry).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [records])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (riskFilter !== "All" && r.riskLevel !== riskFilter) return false
      if (provinceFilter && r.province !== provinceFilter) return false
      if (industryFilter && r.industry !== industryFilter) return false
      if (verificationFilter && r.verificationStatus !== verificationFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.supplierName.toLowerCase().includes(q) &&
          !(r.province ?? "").toLowerCase().includes(q) &&
          !(r.industry ?? "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [records, riskFilter, provinceFilter, industryFilter, verificationFilter, search])

  const inputCls =
    "rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

  return (
    <div>
      {/* -- Header -- */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Risk Management</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Supplier Risk & Early Warning</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
          Proactively identify suppliers with compliance gaps, finance risks, and performance
          concerns before they affect procurement outcomes.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* -- Summary cards -- */}
      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard
            level="All"
            count={summary.total}
            active={riskFilter === "All"}
            onClick={() => setRiskFilter("All")}
          />
          <SummaryCard
            level="Critical"
            count={summary.critical}
            active={riskFilter === "Critical"}
            onClick={() => setRiskFilter("Critical")}
          />
          <SummaryCard
            level="High"
            count={summary.high}
            active={riskFilter === "High"}
            onClick={() => setRiskFilter("High")}
          />
          <SummaryCard
            level="Medium"
            count={summary.medium}
            active={riskFilter === "Medium"}
            onClick={() => setRiskFilter("Medium")}
          />
          <SummaryCard
            level="Low"
            count={summary.low}
            active={riskFilter === "Low"}
            onClick={() => setRiskFilter("Low")}
          />
        </div>
      )}

      {/* -- Risk factor legend -- */}
      {!loading && records.length > 0 && (
        <details className="mb-5 rounded-md border border-panel bg-card p-4 shadow-panel">
          <summary className="cursor-pointer text-[0.68rem] font-bold uppercase tracking-[0.2em] text-secondary">
            Risk Factor Reference ({RISK_FACTORS.length} factors tracked)
          </summary>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {RISK_FACTORS.map((f) => (
              <div key={f.id} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${severityDot(f.severity)}`} aria-hidden="true" />
                <div>
                  <span className="font-semibold text-heading">{f.label}</span>
                  <span className={`ml-1.5 rounded-full border px-1.5 py-px text-[0.55rem] font-bold uppercase ${severityBadge(f.severity)}`}>{f.severity}</span>
                  <p className="text-muted leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* -- Filters -- */}
      {!loading && records.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, province, industry…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} w-full pl-10`}
            />
          </div>

          <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className={inputCls}>
            <option value="">All provinces</option>
            {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className={inputCls}>
            <option value="">All industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>

          <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className={inputCls}>
            <option value="">All verification statuses</option>
            {VERIFICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* -- Risk level filter tabs -- */}
      {!loading && records.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {(["All", "Critical", "High", "Medium", "Low"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setRiskFilter(level)}
              className={[
                "rounded-md border px-4 py-2 text-xs font-semibold transition",
                riskFilter === level
                  ? "border-accent bg-accent text-button"
                  : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
              ].join(" ")}
            >
              {level}
              {level !== "All" && (
                <span className="ml-1.5 opacity-70">
                  ({level === "Critical" ? summary.critical : level === "High" ? summary.high : level === "Medium" ? summary.medium : summary.low})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* -- Loading -- */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* -- Empty states -- */}
      {!loading && records.length === 0 && !error && (
        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-panel bg-card shadow-panel">
          <svg className="h-12 w-12 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-heading">No supplier profiles found</p>
          <p className="mt-1 text-xs text-muted">
            Supplier risk assessments will appear here once profiles are registered.
          </p>
        </div>
      )}

      {!loading && records.length > 0 && filtered.length === 0 && (
        <div className="flex min-h-[160px] items-center justify-center rounded-md border border-panel bg-card shadow-panel">
          <p className="text-sm text-muted">No suppliers match the selected filters.</p>
        </div>
      )}

      {/* -- Risk card list -- */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((record, idx) => (
            <RiskCard key={record.supplierId} record={record} rank={idx + 1} />
          ))}
        </div>
      )}

      {/* -- Footer -- */}
      {!loading && records.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-panel bg-card px-5 py-3 shadow-panel">
          <p className="text-xs text-muted">
            Showing {filtered.length} of {records.length} supplier{records.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted">
            Risk scores are computed locally from platform data · No external API
          </p>
        </div>
      )}
    </div>
  )
}

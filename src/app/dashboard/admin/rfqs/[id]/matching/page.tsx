"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { createMatchAlertDrafts, type MatchAlertResult } from "@/lib/matchAlerts"
import { saveSupplier, unsaveSupplier, isSupplierSaved } from "@/lib/savedSuppliers"
import {
  getRecommendedSuppliersForRFQ,
  type MatchLabel,
  type RFQForMatching,
  type SupplierMatchResult,
} from "@/lib/supplierMatching"

// --- Helpers ------------------------------------------------------------------

const LABEL_ORDER: MatchLabel[] = [
  "Excellent Match",
  "Strong Match",
  "Possible Match",
  "Weak Match",
]

function formatWhatsApp(phone: string | null): string | null {
  if (!phone) return null
  const clean = phone.replace(/\D/g, "")
  const norm = clean.startsWith("0") ? `27${clean.slice(1)}` : clean
  return norm.length >= 10 ? norm : null
}

function labelBadgeClass(label: MatchLabel): string {
  switch (label) {
    case "Excellent Match":
      return "border-success/40 bg-success/10 text-success"
    case "Strong Match":
      return "border-accent/40 bg-accent/10 text-accent-strong"
    case "Possible Match":
      return "border-warning/40 bg-warning/10 text-warning"
    case "Weak Match":
      return "border-panel bg-panel text-muted"
  }
}

function scoreRingColor(score: number): string {
  if (score >= 85) return "var(--success)"
  if (score >= 70) return "#315A78"
  if (score >= 50) return "var(--warning)"
  return "#94a3b8"
}

function BreakdownPip({
  label,
  earned,
  max,
}: {
  label: string
  earned: number
  max: number
}) {
  const filled = earned > 0
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[0.68rem] ${filled ? "text-heading" : "text-muted"}`}>
        {label}
      </span>
      <span
        className={`text-[0.68rem] font-bold tabular-nums ${
          filled ? "text-success" : "text-muted"
        }`}
      >
        +{earned}/{max}
      </span>
    </div>
  )
}

// --- SupplierCard -------------------------------------------------------------

function SupplierCard({
  result,
  rfqId,
  rfqTitle,
  selected,
  onToggleSelected,
}: {
  result: SupplierMatchResult
  rfqId: number
  rfqTitle: string | null
  selected: boolean
  onToggleSelected: () => void
}) {
  const { supplier, stats, score, label, reasons, scoreBreakdown } = result
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    isSupplierSaved(supplier.id)
      .then(setSaved)
      .catch(() => {})
  }, [supplier.id])

  async function toggleSave() {
    setSaving(true)
    try {
      if (saved) {
        await unsaveSupplier(supplier.id)
        setSaved(false)
      } else {
        await saveSupplier(supplier.id)
        setSaved(true)
      }
    } catch {
      // silently fail — user still sees the optimistic state toggle
    } finally {
      setSaving(false)
    }
  }

  const whatsappNum = formatWhatsApp(supplier.phone)
  const whatsappLink = whatsappNum
    ? `https://wa.me/${whatsappNum}?text=${encodeURIComponent(
        `Hi ${supplier.business_name ?? "there"}, we are reviewing your profile for ${rfqTitle ?? `RFQ-${rfqId}`}. Please confirm your availability.`
      )}`
    : null

  const messageLink = `/dashboard/messages?receiver_id=${supplier.id}&rfq_id=${rfqId}&subject=${encodeURIComponent(
    `RFQ-${rfqId} supplier enquiry`
  )}`

  const profileLink = `/dashboard/suppliers/${supplier.id}`

  const circ = 2 * Math.PI * 28
  const offset = circ - (score / 100) * circ
  const ringColor = scoreRingColor(score)

  return (
    <div className="enterprise-card flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-panel bg-surface px-3.5 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-secondary">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            className="h-4 w-4 rounded border-panel accent-accent"
          />
          Select for alert
        </label>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Draft only
        </span>
      </div>

      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Score ring */}
        <div
          className="relative shrink-0"
          style={{ width: 72, height: 72 }}
          aria-label={`Match score ${score}`}
        >
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
            <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="7" />
            <circle
              cx="36" cy="36" r="28"
              fill="none"
              stroke={ringColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 36 36)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold leading-none tabular-nums text-heading">
              {score}
            </span>
          </div>
        </div>

        {/* Name + meta + badge */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h3 className="text-sm font-bold text-heading leading-snug">
              {supplier.business_name ?? "Unnamed Supplier"}
            </h3>
            {stats.hasQuotedThisRFQ && (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-accent-strong">
                Already Quoted
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {[supplier.province, supplier.industry].filter(Boolean).join(" · ") ||
              "No location or industry set"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${labelBadgeClass(label)}`}
            >
              {label}
            </span>
            {supplier.verification_status === "Verified" && (
              <span className="inline-flex rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.63rem] font-bold text-success">
                Verified
              </span>
            )}
            {supplier.bbbee_level && (
              <span className="inline-flex rounded-full border border-panel bg-surface px-2 py-0.5 text-[0.63rem] font-semibold text-secondary">
                B-BBEE L{supplier.bbbee_level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score breakdown — toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-panel bg-surface px-3.5 py-2.5 text-left transition hover:bg-panel"
        aria-expanded={expanded}
      >
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-secondary">
          Score Breakdown
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-1.5 rounded-lg border border-panel bg-surface px-4 py-3">
          <BreakdownPip label="Province match" earned={scoreBreakdown.provinceMatch} max={25} />
          <BreakdownPip label="Industry / category" earned={scoreBreakdown.industryMatch} max={25} />
          <BreakdownPip label="Verified status" earned={scoreBreakdown.verificationBonus} max={15} />
          <BreakdownPip label="Readiness score ≥ 80" earned={scoreBreakdown.readinessBonus} max={15} />
          <BreakdownPip label="Compliance documents" earned={scoreBreakdown.complianceBonus} max={10} />
          <BreakdownPip label="Award / completion history" earned={scoreBreakdown.historyBonus} max={10} />
          <div className="mt-2 border-t border-panel pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                Total
              </span>
              <span className="text-sm font-bold tabular-nums text-heading">{score}/100</span>
            </div>
          </div>
        </div>
      )}

      {/* Reasons */}
      <ul className="space-y-1.5">
        {reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-secondary">
            <span
              className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                i === 0 ? "bg-accent" : "bg-panel"
              }`}
              aria-hidden="true"
            />
            {reason}
          </li>
        ))}
      </ul>

      {/* Activity mini-row */}
      <div className="flex items-center gap-4 rounded-lg border border-panel bg-surface px-4 py-2.5">
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-heading">
            {stats.totalQuotes}
          </span>
          <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted">
            Quotes
          </span>
        </div>
        <div className="h-6 w-px bg-panel" aria-hidden="true" />
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-success">
            {stats.awardedQuotes}
          </span>
          <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted">
            Awarded
          </span>
        </div>
        <div className="h-6 w-px bg-panel" aria-hidden="true" />
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums text-heading">
            {stats.completedContracts}
          </span>
          <span className="text-[0.58rem] font-bold uppercase tracking-wider text-muted">
            Completed
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={profileLink}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent px-3.5 py-2 text-xs font-bold text-button transition hover:bg-accent-strong"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          View Profile
        </Link>

        <Link
          href={messageLink}
          className="inline-flex items-center gap-1.5 rounded-lg border border-panel bg-surface px-3.5 py-2 text-xs font-bold text-secondary transition hover:border-accent hover:text-accent"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Message
        </Link>

        {whatsappLink ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3.5 py-2 text-xs font-bold text-success transition hover:bg-success/20"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-panel bg-panel px-3.5 py-2 text-xs font-semibold text-muted opacity-60"
            title="No phone number on record"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            No WhatsApp
          </button>
        )}

        <button
          type="button"
          onClick={toggleSave}
          disabled={saving}
          className={[
            "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
            saved
              ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
              : "border-panel bg-surface text-secondary hover:border-accent hover:text-accent",
          ].join(" ")}
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          {saving ? "Saving…" : saved ? "Saved" : "Save Supplier"}
        </button>
      </div>
    </div>
  )
}

// --- Skeleton -----------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="enterprise-card space-y-4">
      <div className="flex items-start gap-4">
        <div className="h-[72px] w-[72px] animate-pulse rounded-full bg-panel" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-40 animate-pulse rounded bg-panel" />
          <div className="h-3 w-28 animate-pulse rounded bg-panel" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-panel" />
        </div>
      </div>
      <div className="h-10 animate-pulse rounded-lg bg-panel" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-panel" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-panel" />
        ))}
      </div>
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

type FilterTab = "All" | MatchLabel

export default function SupplierMatchingPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rfqId = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rfq, setRfq] = useState<RFQForMatching | null>(null)
  const [results, setResults] = useState<SupplierMatchResult[]>([])
  const [activeTab, setActiveTab] = useState<FilterTab>("All")
  const [showWeak, setShowWeak] = useState(false)
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([])
  const [alerting, setAlerting] = useState(false)
  const [alertSuccess, setAlertSuccess] = useState("")
  const [alertError, setAlertError] = useState("")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) {
        router.replace("/dashboard")
        return
      }
      if (!Number.isFinite(rfqId)) {
        setError("Invalid RFQ reference.")
        setLoading(false)
        return
      }
      try {
        const { rfq: loadedRfq, results: loadedResults } =
          await getRecommendedSuppliersForRFQ(rfqId)
        setRfq(loadedRfq)
        setResults(loadedResults)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load matching data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [rfqId, router])

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of results) counts[r.label] = (counts[r.label] ?? 0) + 1
    return counts
  }, [results])

  const filtered = useMemo(() => {
    let list = activeTab === "All" ? results : results.filter((r) => r.label === activeTab)
    if (!showWeak) list = list.filter((r) => r.label !== "Weak Match")
    return list
  }, [results, activeTab, showWeak])

  const selectedResults = useMemo(
    () => results.filter((result) => selectedSupplierIds.includes(result.supplier.id)),
    [results, selectedSupplierIds]
  )

  const strongResults = useMemo(
    () => results.filter((result) => result.label === "Excellent Match" || result.label === "Strong Match"),
    [results]
  )

  const tabs: FilterTab[] = ["All", ...LABEL_ORDER]

  function toggleSelectedSupplier(supplierId: string) {
    setSelectedSupplierIds((current) =>
      current.includes(supplierId)
        ? current.filter((id) => id !== supplierId)
        : [...current, supplierId]
    )
  }

  function summarizeAlertResult(result: MatchAlertResult): string {
    return `${result.notificationsCreated} notification(s) and ${result.whatsappDraftsCreated} WhatsApp draft(s) created.`
  }

  async function notifyResults(targetResults: SupplierMatchResult[]) {
    if (!rfq || targetResults.length === 0) {
      setAlertError("Select at least one supplier match to notify.")
      setAlertSuccess("")
      return
    }

    setAlerting(true)
    setAlertError("")
    setAlertSuccess("")

    try {
      const result = await createMatchAlertDrafts(
        targetResults.map((match) => ({
          supplier: match.supplier,
          rfq: {
            id: rfq.id,
            title: rfq.title,
            deadline: rfq.deadline,
          },
          matchScore: match.score,
        }))
      )

      if (result.errors.length > 0) {
        setAlertError(result.errors.join(" "))
      }
      setAlertSuccess(summarizeAlertResult(result))
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : "Failed to create match alerts.")
    } finally {
      setAlerting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <div className="mb-3 flex items-center gap-2">
          <Link
            href={`/dashboard/admin/rfqs/${rfqId}/quotes`}
            className="text-xs font-semibold text-accent transition hover:text-accent-strong"
          >
            ← Back to Quotes
          </Link>
        </div>
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          AI Supplier Matching
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Recommended Suppliers
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
          Suppliers ranked by compatibility with this RFQ — scored on province
          alignment, industry fit, verification status, readiness, compliance
          health, and procurement history.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Matching failed</p>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        </div>
      )}

      {alertError && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Match alert workflow</p>
          <p className="mt-1 text-xs text-rose-600">{alertError}</p>
        </div>
      )}

      {alertSuccess && (
        <div className="mb-6 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">Draft alerts created</p>
          <p className="mt-1 text-xs text-success">{alertSuccess}</p>
        </div>
      )}

      {!loading && rfq && (
        <>
          {/* RFQ summary */}
          <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
              Matching for RFQ
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading">
              {rfq.title ?? `RFQ-${rfq.id}`}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Province", value: rfq.province ?? "—" },
                { label: "Category", value: rfq.category ?? "—" },
                { label: "Budget", value: rfq.budget ?? "—" },
                { label: "Status", value: rfq.status ?? "—" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-panel bg-panel p-3.5"
                >
                  <p className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-secondary">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-heading">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Stats bar */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              {LABEL_ORDER.map((label) => {
                const count = labelCounts[label] ?? 0
                if (count === 0) return null
                return (
                  <div
                    key={label}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${labelBadgeClass(label)}`}
                  >
                    <span>{count}</span>
                    <span className="font-normal">{label}</span>
                  </div>
                )
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-secondary">
                <input
                  type="checkbox"
                  checked={showWeak}
                  onChange={(e) => setShowWeak(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-panel accent-accent"
                />
                Show weak matches
              </label>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-panel bg-card px-4 py-3 shadow-panel">
            <p className="text-xs font-semibold text-secondary">
              {selectedResults.length} selected &middot; WhatsApp remains draft-only
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => notifyResults(selectedResults)}
                disabled={alerting || selectedResults.length === 0}
                className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-bold text-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                Notify Selected
              </button>
              <button
                type="button"
                onClick={() => notifyResults(strongResults)}
                disabled={alerting || strongResults.length === 0}
                className="rounded-md border border-panel bg-surface px-3 py-2 text-xs font-bold text-secondary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Notify All Strong Matches
              </button>
              <button
                type="button"
                onClick={() => notifyResults(selectedResults.length > 0 ? selectedResults : strongResults)}
                disabled={alerting || (selectedResults.length === 0 && strongResults.length === 0)}
                className="rounded-md border border-success bg-success-soft px-3 py-2 text-xs font-bold text-success disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create WhatsApp Drafts
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const count = tab === "All" ? results.length : (labelCounts[tab] ?? 0)
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "rounded-md border px-3.5 py-2 text-xs font-semibold transition",
                    activeTab === tab
                      ? "border-accent bg-accent text-button"
                      : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
                  ].join(" ")}
                >
                  {tab} ({count})
                </button>
              )
            })}
          </div>

          {/* Cards grid */}
          {filtered.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-md border border-panel bg-card shadow-panel">
              <div className="text-center">
                <p className="text-sm font-semibold text-heading">
                  {results.length === 0
                    ? "No supplier profiles found in the system"
                    : "No suppliers match the selected filter"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {results.length === 0
                    ? "Suppliers need to register before matching can be performed."
                    : "Try selecting a different match tier or enabling weak matches."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((result) => (
                <SupplierCard
                  key={result.supplier.id}
                  result={result}
                  rfqId={rfqId}
                  rfqTitle={rfq.title}
                  selected={selectedSupplierIds.includes(result.supplier.id)}
                  onToggleSelected={() => toggleSelectedSupplier(result.supplier.id)}
                />
              ))}
            </div>
          )}

          {/* Footer note */}
          <p className="mt-6 text-center text-[0.68rem] text-muted">
            Showing {filtered.length} of {results.length} supplier
            {results.length !== 1 ? "s" : ""} · Scores computed locally from
            platform data — no external AI API called
          </p>
        </>
      )}

      {loading && (
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-md bg-panel" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}
    </div>
  )
}

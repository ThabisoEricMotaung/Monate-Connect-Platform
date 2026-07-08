"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { requireAdminOrBuyer } from "@/lib/auth"
import { getComplianceStatus } from "@/lib/complianceStatus"
import { displayIndustry } from "@/lib/industries"
import { calculateSupplierSmartScore, type SmartScoreResult } from "@/lib/smartScore"
import { isVerifiedStatus } from "@/lib/supplierStatus"
import { supabase } from "@/lib/supabase"
import {
  applySupplierDocumentsToProfiles,
  fetchSupplierDocumentsByProfileIds,
  type SupplierDocument,
} from "@/lib/supplierDocuments"

// --- Types --------------------------------------------------------------------

type RiskLevel = "Critical" | "High Risk" | "Medium Risk" | "Low Risk"

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  cidb_grade: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  supplier_documents?: SupplierDocument[]
  tax_expiry_date: string | null
  bbbee_expiry_date: string | null
  csd_expiry_date: string | null
  cidb_expiry_date: string | null
}

type RiskAssessment = {
  level: RiskLevel
  score: number
  missingFields: string[]
  missingDocs: string[]
  expiredDocs: string[]
  expiringDocs: string[]
}

type AssessedSupplier = {
  profile: SupplierProfile
  risk: RiskAssessment
  readiness: SmartScoreResult
}

// --- Constants ----------------------------------------------------------------

const RISK_ORDER: RiskLevel[] = ["Critical", "High Risk", "Medium Risk", "Low Risk"]

const RISK_BADGE: Record<RiskLevel, string> = {
  Critical:
    "border-rose-600/40 bg-rose-600/10 text-rose-700",
  "High Risk":
    "border-rose-500/30 bg-rose-500/10 text-rose-600",
  "Medium Risk":
    "border-warning bg-warning-soft text-warning",
  "Low Risk":
    "border-success bg-success-soft text-success",
}

const RISK_SUMMARY_CARD: Record<
  RiskLevel,
  { border: string; bg: string; value: string }
> = {
  Critical: {
    border: "border-rose-600/30",
    bg: "bg-rose-600/10",
    value: "text-rose-700",
  },
  "High Risk": {
    border: "border-rose-500/25",
    bg: "bg-rose-500/10",
    value: "text-rose-600",
  },
  "Medium Risk": {
    border: "border-warning/30",
    bg: "bg-warning-soft",
    value: "text-warning",
  },
  "Low Risk": {
    border: "border-success/30",
    bg: "bg-success-soft",
    value: "text-success",
  },
}

const VERIFICATION_BADGE: Record<string, string> = {
  Verified: "border-success bg-success-soft text-success",
  "Under Review": "border-warning bg-warning-soft text-warning",
  "Pending Review": "border-warning bg-warning-soft text-warning",
  Pending: "border-warning bg-warning-soft text-warning",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-700",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"

// --- Risk calculation ---------------------------------------------------------
//
// Scoring:
//   Critical data fields missing  +2 each  (CSD, BBBEE, Tax Status)
//   Important fields missing       +1 each  (Company Reg, CIDB Grade)
//   Missing documents              +1 each, capped at 3
//   Expired compliance date        +3 each
//   Expiring soon (≤30 days)       +1 each
//   Not verified                   +2
//
// Risk levels:  0–2 Low  |  3–6 Medium  |  7–11 High  |  12+ Critical

function hasVal(v: string | null | undefined): boolean {
  return Boolean(v?.trim())
}

function assessRisk(profile: SupplierProfile): RiskAssessment {
  const missingFields: string[] = []
  const missingDocs: string[] = []
  const expiredDocs: string[] = []
  const expiringDocs: string[] = []
  let score = 0

  // Critical data fields
  if (!hasVal(profile.csd_number)) {
    missingFields.push("CSD Number")
    score += 2
  }
  if (!hasVal(profile.bbbee_level)) {
    missingFields.push("B-BBEE Level")
    score += 2
  }
  if (!hasVal(profile.tax_status)) {
    missingFields.push("Tax Status")
    score += 2
  }

  // Important fields
  if (!hasVal(profile.company_registration)) {
    missingFields.push("Company Registration")
    score += 1
  }
  if (!hasVal(profile.cidb_grade)) {
    missingFields.push("CIDB Grade")
    score += 1
  }

  // Missing documents
  const docChecks = [
    { label: "CSD Document", url: profile.csd_document_url },
    { label: "B-BBEE Certificate", url: profile.bbbee_document_url },
    { label: "Tax Certificate", url: profile.tax_document_url },
    { label: "Registration Document", url: profile.company_registration_url },
    { label: "CIDB Document", url: profile.cidb_document_url },
    { label: "Capability Statement", url: profile.capability_statement_url },
  ]
  for (const doc of docChecks) {
    if (!hasVal(doc.url)) missingDocs.push(doc.label)
  }
  score += Math.min(missingDocs.length, 3)

  // Compliance expiry checks
  const expiryChecks = [
    { label: "Tax Clearance", date: profile.tax_expiry_date },
    { label: "B-BBEE Certificate", date: profile.bbbee_expiry_date },
    { label: "CSD Registration", date: profile.csd_expiry_date },
    { label: "CIDB Certificate", date: profile.cidb_expiry_date },
  ]
  for (const { label, date } of expiryChecks) {
    if (date) {
      const { status } = getComplianceStatus(date)
      if (status === "expired") {
        expiredDocs.push(label)
        score += 3
      } else if (status === "expiring_soon") {
        expiringDocs.push(label)
        score += 1
      }
    }
  }

  // Verification gap
  if (!isVerifiedStatus(profile.verification_status)) score += 2

  const level: RiskLevel =
    score >= 12
      ? "Critical"
      : score >= 7
        ? "High Risk"
        : score >= 3
          ? "Medium Risk"
          : "Low Risk"

  return { level, score, missingFields, missingDocs, expiredDocs, expiringDocs }
}

// --- Sub-components -----------------------------------------------------------

function SummaryCard({
  level,
  count,
  total,
}: {
  level: RiskLevel
  count: number
  total: number
}) {
  const s = RISK_SUMMARY_CARD[level]
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div
      className={[
        "rounded-md border p-5 shadow-panel",
        s.border,
        s.bg,
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
          RISK_BADGE[level],
        ].join(" ")}
      >
        {level}
      </span>
      <p
        className={[
          "mt-3 text-3xl font-semibold tabular-nums",
          s.value,
        ].join(" ")}
      >
        {count}
      </p>
      <p className="mt-1 text-xs text-muted">
        {pct}% of all suppliers
      </p>
    </div>
  )
}

function IssueChips({
  label,
  items,
  chipCls,
  labelCls,
  max = 4,
}: {
  label: string
  items: string[]
  chipCls: string
  labelCls: string
  max?: number
}) {
  if (items.length === 0) return null
  const shown = items.slice(0, max)
  const rest = items.length - max

  return (
    <div>
      <p
        className={[
          "mb-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.22em]",
          labelCls,
        ].join(" ")}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <span
            key={item}
            className={[
              "inline-flex rounded border px-2 py-0.5 text-[0.62rem] font-semibold",
              chipCls,
            ].join(" ")}
          >
            {item}
          </span>
        ))}
        {rest > 0 && (
          <span className="inline-flex rounded border border-panel bg-panel px-2 py-0.5 text-[0.62rem] font-semibold text-muted">
            +{rest} more
          </span>
        )}
      </div>
    </div>
  )
}

function ReadinessBar({ score, label }: { score: number; label: string }) {
  const bar =
    score <= 39
      ? "bg-rose-500"
      : score <= 69
        ? "bg-warning"
        : score <= 89
          ? "bg-sky-500"
          : "bg-success"
  const text =
    score <= 39
      ? "text-rose-600"
      : score <= 69
        ? "text-warning"
        : score <= 89
          ? "text-sky-600"
          : "text-success"

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[0.64rem] uppercase tracking-[0.22em] text-secondary">
          Readiness
        </p>
        <span className={["text-xs font-semibold tabular-nums", text].join(" ")}>
          {score}/100 — {label}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel">
        <div
          className={["h-full rounded-full transition-all", bar].join(" ")}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function SupplierRiskCard({ assessed }: { assessed: AssessedSupplier }) {
  const { profile, risk, readiness } = assessed
  const name = profile.business_name || "Unnamed Supplier"
  const hasIssues =
    risk.expiredDocs.length > 0 ||
    risk.expiringDocs.length > 0 ||
    risk.missingFields.length > 0 ||
    risk.missingDocs.length > 0

  return (
    <article className="flex flex-col rounded-md border border-panel bg-card shadow-panel">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-panel p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.64rem] uppercase tracking-[0.28em] text-secondary">
            Supplier
          </p>
          <h2 className="mt-1.5 truncate text-lg font-semibold leading-snug text-heading">
            {name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.province && (
              <span className="inline-flex rounded border border-panel bg-panel px-2 py-0.5 text-[0.68rem] text-secondary">
                {profile.province}
              </span>
            )}
            {displayIndustry(profile.industry) && (
              <span className="inline-flex rounded border border-panel bg-panel px-2 py-0.5 text-[0.68rem] text-secondary">
                {displayIndustry(profile.industry)}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span
            className={[
              "inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]",
              RISK_BADGE[risk.level],
            ].join(" ")}
          >
            {risk.level}
          </span>
          <span
            className={[
              "inline-flex rounded-md border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
              VERIFICATION_BADGE[profile.verification_status ?? ""] ??
                "border-panel bg-panel text-secondary",
            ].join(" ")}
          >
            {profile.verification_status || "Pending"}
          </span>
          <span className="text-[0.65rem] text-muted">
            Risk score: {risk.score}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 p-5">
        <ReadinessBar score={readiness.score} label={readiness.label} />

        {hasIssues ? (
          <div className="space-y-3">
            <IssueChips
              label="Expired Documents"
              items={risk.expiredDocs}
              chipCls="border-rose-500/30 bg-rose-500/10 text-rose-700"
              labelCls="text-rose-600"
            />
            <IssueChips
              label="Expiring Soon"
              items={risk.expiringDocs}
              chipCls="border-warning/35 bg-warning-soft text-warning"
              labelCls="text-warning"
            />
            <IssueChips
              label="Missing Data Fields"
              items={risk.missingFields}
              chipCls="border-panel bg-surface text-secondary"
              labelCls="text-secondary"
            />
            <IssueChips
              label="Missing Documents"
              items={risk.missingDocs}
              chipCls="border-panel bg-surface text-secondary"
              labelCls="text-secondary"
              max={3}
            />
          </div>
        ) : (
          <div className="rounded-md border border-success/25 bg-success-soft px-4 py-3">
            <p className="text-xs font-semibold text-success">
              No compliance issues detected.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t border-panel px-5 py-4">
        <Link
          href={`/dashboard/suppliers/${profile.id}`}
          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
        >
          View Profile
        </Link>
        <Link
          href={`/dashboard/messages?receiver_id=${profile.id}&subject=${encodeURIComponent("Compliance Review — " + name)}`}
          className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
        >
          Message Supplier
        </Link>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-panel pb-4">
        <div className="space-y-2">
          <div className="h-2 w-20 animate-pulse rounded bg-panel" />
          <div className="h-5 w-48 animate-pulse rounded bg-panel" />
          <div className="flex gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-panel" />
            <div className="h-4 w-20 animate-pulse rounded bg-panel" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-6 w-20 animate-pulse rounded-md bg-panel" />
          <div className="h-5 w-16 animate-pulse rounded-md bg-panel" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-1.5 animate-pulse rounded-full bg-panel" />
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-panel" />
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 w-20 animate-pulse rounded bg-panel" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main page ----------------------------------------------------------------

export default function ComplianceRiskPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<SupplierProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "">("")
  const [provinceFilter, setProvinceFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [verificationFilter, setVerificationFilter] = useState("")

  useEffect(() => {
    async function load() {
      const auth = await requireAdminOrBuyer()
      if (!auth) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select(
          "id, business_name, province, industry, phone, verification_status, " +
            "csd_number, bbbee_level, tax_status, company_registration, cidb_grade, " +
            "csd_document_url, bbbee_document_url, tax_document_url, " +
            "company_registration_url, cidb_document_url, capability_statement_url, " +
            "tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date"
        )
        .order("business_name", { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const profileRows = (data ?? []) as unknown as SupplierProfile[]
      const documents = await fetchSupplierDocumentsByProfileIds(profileRows.map((profile) => profile.id))
      if (documents.error) {
        setError(documents.error)
        setLoading(false)
        return
      }

      setProfiles(applySupplierDocumentsToProfiles(profileRows, documents.documentsByProfile))
      setLoading(false)
    }

    load()
  }, [router])

  // Assess every supplier once; sort Critical → Low Risk, then by readiness ascending
  const assessed = useMemo<AssessedSupplier[]>(() => {
    return profiles
      .map((profile) => ({
        profile,
        risk: assessRisk(profile),
        readiness: calculateSupplierSmartScore(profile),
      }))
      .sort((a, b) => {
        const levelDiff =
          RISK_ORDER.indexOf(a.risk.level) - RISK_ORDER.indexOf(b.risk.level)
        return levelDiff !== 0 ? levelDiff : a.readiness.score - b.readiness.score
      })
  }, [profiles])

  const summary = useMemo(() => {
    const counts: Record<RiskLevel, number> = {
      Critical: 0,
      "High Risk": 0,
      "Medium Risk": 0,
      "Low Risk": 0,
    }
    for (const { risk } of assessed) counts[risk.level]++
    return counts
  }, [assessed])

  const provinceOptions = useMemo(
    () =>
      Array.from(
        new Set(profiles.map((p) => p.province).filter(Boolean))
      ).sort() as string[],
    [profiles]
  )
  const industryOptions = useMemo(
    () =>
      Array.from(
        new Set(profiles.map((p) => displayIndustry(p.industry)).filter(Boolean))
      ).sort() as string[],
    [profiles]
  )
  const verificationOptions = useMemo(
    () =>
      Array.from(
        new Set(profiles.map((p) => p.verification_status).filter(Boolean))
      ).sort() as string[],
    [profiles]
  )

  const filtered = useMemo(() => {
    return assessed.filter(({ profile, risk }) => {
      if (riskFilter && risk.level !== riskFilter) return false
      if (provinceFilter && profile.province !== provinceFilter) return false
      if (industryFilter && displayIndustry(profile.industry) !== industryFilter) return false
      if (verificationFilter && profile.verification_status !== verificationFilter)
        return false
      return true
    })
  }, [assessed, riskFilter, provinceFilter, industryFilter, verificationFilter])

  const isFiltered =
    Boolean(riskFilter) ||
    Boolean(provinceFilter) ||
    Boolean(industryFilter) ||
    Boolean(verificationFilter)

  function clearFilters() {
    setRiskFilter("")
    setProvinceFilter("")
    setIndustryFilter("")
    setVerificationFilter("")
  }

  return (
    <div>
      {/* -- Page header -- */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement Intelligence
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier Compliance Risk
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Identify and prioritise suppliers with compliance gaps, expired
          documents, or incomplete verification before issuing purchase orders
          or awarding quotes.
        </p>
      </div>

      {/* -- Error -- */}
      {error && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Failed to load compliance data
          </p>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* -- Loading -- */}
      {loading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-md border border-panel bg-card shadow-panel"
              />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* -- Dashboard -- */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* Summary cards */}
          <section
            aria-label="Risk summary"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {RISK_ORDER.map((level) => (
              <SummaryCard
                key={level}
                level={level}
                count={summary[level]}
                total={assessed.length}
              />
            ))}
          </section>

          {/* Filters */}
          <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="risk-filter"
                  className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
                >
                  Risk Level
                </label>
                <select
                  id="risk-filter"
                  value={riskFilter}
                  onChange={(e) =>
                    setRiskFilter(e.target.value as RiskLevel | "")
                  }
                  className={filterClass}
                >
                  <option value="">All risk levels</option>
                  {RISK_ORDER.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="province-filter"
                  className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
                >
                  Province
                </label>
                <select
                  id="province-filter"
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className={filterClass}
                >
                  <option value="">All provinces</option>
                  {provinceOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="industry-filter"
                  className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
                >
                  Industry
                </label>
                <select
                  id="industry-filter"
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className={filterClass}
                >
                  <option value="">All industries</option>
                  {industryOptions.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="verification-filter"
                  className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
                >
                  Verification
                </label>
                <select
                  id="verification-filter"
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className={filterClass}
                >
                  <option value="">All statuses</option>
                  {verificationOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-xs font-semibold text-accent transition hover:text-accent-strong"
              >
                Clear all filters
              </button>
            )}
          </section>

          {/* Results count */}
          {assessed.length > 0 && (
            <p className="text-xs text-muted">
              Showing {filtered.length} of {assessed.length} supplier
              {assessed.length !== 1 ? "s" : ""}
              {isFiltered ? " (filtered)" : ""}
            </p>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
              <p className="text-sm font-semibold text-heading">
                {isFiltered
                  ? "No suppliers match these filters."
                  : "No suppliers found."}
              </p>
              <p className="mt-2 text-xs text-muted">
                {isFiltered
                  ? "Adjust the filters above to view compliance risk data."
                  : "Supplier profiles will appear here once created."}
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center justify-center rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Supplier cards */}
          {filtered.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              {filtered.map((a) => (
                <SupplierRiskCard key={a.profile.id} assessed={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

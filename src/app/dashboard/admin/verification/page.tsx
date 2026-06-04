"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import SaveSupplierControl from "@/components/suppliers/SaveSupplierControl"
import { logActivity } from "@/lib/activity"
import { logAuditAction } from "@/lib/audit"
import { requireAdminOrBuyer } from "@/lib/auth"
import { getComplianceStatus, hasComplianceWarning } from "@/lib/complianceStatus"
import { createNotification } from "@/lib/notifications"
import {
  calculateSupplierPerformance,
  type SupplierPerformanceReview,
} from "@/lib/supplierPerformance"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

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
  created_at: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  tax_expiry_date: string | null
  bbbee_expiry_date: string | null
  csd_expiry_date: string | null
  cidb_expiry_date: string | null
}

type SupplierReview = SupplierPerformanceReview & {
  supplier_id: string | null
}

type ComplianceIssue = {
  doc: string
  status: ReturnType<typeof getComplianceStatus>
}

type ExpiringEntry = {
  profile: SupplierProfile
  issues: ComplianceIssue[]
}

const statusStyles: Record<string, string> = {
  Verified: "border-success bg-success-soft text-success",
  "Under Review": "border-warning bg-warning-soft text-warning",
  "Pending Review": "border-warning bg-warning-soft text-warning",
  Pending: "border-warning bg-warning-soft text-warning",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-700",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function statusBadgeClass(status: string | null): string {
  return statusStyles[status || ""] ?? "border-panel bg-panel text-secondary"
}

function ReadinessScore({
  profile,
  reviews,
}: {
  profile: SupplierProfile
  reviews: SupplierPerformanceReview[]
}) {
  const performance = calculateSupplierPerformance(reviews)
  const smartScore = calculateSupplierSmartScore(profile, {
    reviewCount: performance.reviewCount,
    averageRating: performance.averageScore,
    recentActivityCount: performance.reviewCount,
  })

  return (
    <SmartScoreCircle
      score={smartScore}
      label="Supplier SmartScore"
      size="sm"
      compact
      className="max-w-none bg-panel"
    />
  )
}

function performanceTone(score: number | null): string {
  if (score === null) return "border-panel bg-card text-muted"
  if (score < 2.5) return "border-rose-500/30 bg-rose-500/10 text-rose-700"
  if (score < 3.5) return "border-warning bg-warning-soft text-warning"
  if (score < 4.5) return "border-sky-500/30 bg-sky-500/10 text-sky-700"
  return "border-success bg-success-soft text-success"
}

function performanceBar(score: number | null): string {
  if (score === null) return "bg-muted"
  if (score < 2.5) return "bg-rose-500"
  if (score < 3.5) return "bg-warning"
  if (score < 4.5) return "bg-sky-500"
  return "bg-success"
}

function PerformanceScore({ reviews }: { reviews: SupplierPerformanceReview[] }) {
  const performance = calculateSupplierPerformance(reviews)
  const width = performance.averageScore
    ? `${(performance.averageScore / 5) * 100}%`
    : "0%"

  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Performance Score
          </p>
          <p className="mt-2 text-lg font-semibold text-heading">
            {performance.averageScore === null
              ? "Not rated"
              : `${performance.averageScore}/5`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {performance.reviewCount} review
            {performance.reviewCount !== 1 ? "s" : ""}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${performanceTone(performance.averageScore)}`}
        >
          {performance.label}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
        <div
          className={`h-full rounded-full ${performanceBar(performance.averageScore)}`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

function getProfileExpiryIssues(profile: SupplierProfile): ComplianceIssue[] {
  const checks = [
    { doc: "Tax Clearance", date: profile.tax_expiry_date },
    { doc: "B-BBEE Certificate", date: profile.bbbee_expiry_date },
    { doc: "CSD Registration", date: profile.csd_expiry_date },
    { doc: "CIDB Certificate", date: profile.cidb_expiry_date },
  ]
  return checks
    .map(({ doc, date }) => ({ doc, status: getComplianceStatus(date) }))
    .filter(({ status }) => status.status === "expired" || status.status === "expiring_soon")
}

export default function AdminVerificationPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<SupplierProfile[]>([])
  const [provinceFilter, setProvinceFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [reviewsBySupplier, setReviewsBySupplier] = useState<
    Record<string, SupplierPerformanceReview[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadProfiles() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, business_name, province, industry, phone, verification_status, csd_number, bbbee_level, tax_status, company_registration, cidb_grade, created_at, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url, tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date")
        .order("created_at", { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      const { data: reviewData, error: reviewError } = await supabase
        .from("supplier_reviews")
        .select("supplier_id, rating, delivery_score, price_score, compliance_score, communication_score, quality_score")

      if (reviewError) {
        setErrorMessage(reviewError.message)
        setLoading(false)
        return
      }

      const groupedReviews = ((reviewData ?? []) as SupplierReview[]).reduce<
        Record<string, SupplierPerformanceReview[]>
      >((reviews, review) => {
        if (!review.supplier_id) return reviews

        reviews[review.supplier_id] = [
          ...(reviews[review.supplier_id] ?? []),
          review,
        ]

        return reviews
      }, {})

      setProfiles((data ?? []) as SupplierProfile[])
      setReviewsBySupplier(groupedReviews)
      setLoading(false)
    }

    loadProfiles()
  }, [router])

  const provinceOptions = useMemo(
    () => Array.from(new Set(profiles.map((p) => p.province).filter(Boolean))).sort() as string[],
    [profiles]
  )

  const industryOptions = useMemo(
    () => Array.from(new Set(profiles.map((p) => p.industry).filter(Boolean))).sort() as string[],
    [profiles]
  )

  const statusOptions = useMemo(
    () => Array.from(new Set(profiles.map((p) => p.verification_status).filter(Boolean))).sort() as string[],
    [profiles]
  )

  const expiringCompliance = useMemo<ExpiringEntry[]>(() => {
    return profiles
      .filter((profile) =>
        hasComplianceWarning([
          profile.tax_expiry_date,
          profile.bbbee_expiry_date,
          profile.csd_expiry_date,
          profile.cidb_expiry_date,
        ])
      )
      .map((profile) => ({
        profile,
        issues: getProfileExpiryIssues(profile),
      }))
  }, [profiles])

  const filteredProfiles = profiles.filter((profile) => {
    const provinceMatches = !provinceFilter || profile.province === provinceFilter
    const industryMatches = !industryFilter || profile.industry === industryFilter
    const statusMatches = !statusFilter || profile.verification_status === statusFilter

    return provinceMatches && industryMatches && statusMatches
  })

  async function updateVerificationStatus(profileId: string, verificationStatus: string) {
    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    setUpdatingId(profileId)
    setErrorMessage("")
    setSuccessMessage("")

    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: verificationStatus })
      .eq("id", profileId)

    setUpdatingId("")

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const updatedProfile = profiles.find((profile) => profile.id === profileId)

    try {
      await logAuditAction({
        action: "supplier.verification_updated",
        entity_type: "supplier_profile",
        entity_id: profileId,
        old_values: {
          verification_status: updatedProfile?.verification_status ?? null,
        },
        new_values: {
          verification_status: verificationStatus,
        },
        metadata: {
          business_name: updatedProfile?.business_name ?? null,
        },
      })
      await logActivity({
        action: "supplier.verification_updated",
        entity_type: "supplier_profile",
        entity_id: profileId,
        metadata: {
          business_name: updatedProfile?.business_name ?? null,
          previous_status: updatedProfile?.verification_status ?? null,
          new_status: verificationStatus,
        },
      })
    } catch (activityError) {
      console.warn("Supplier verification audit/activity logging failed:", activityError)
    }

    if (verificationStatus === "Verified" || verificationStatus === "Rejected") {
      await createNotification({
        recipientId: profileId,
        type:
          verificationStatus === "Verified"
            ? "Verification Approved"
            : "Verification Rejected",
        title:
          verificationStatus === "Verified"
            ? "Verification approved"
            : "Verification rejected",
        message:
          verificationStatus === "Verified"
            ? "Your supplier verification has been approved."
            : "Your supplier verification has been rejected. Review your profile for next steps.",
        link: "/dashboard/profile",
        metadata: {
          previous_status: updatedProfile?.verification_status ?? null,
          new_status: verificationStatus,
        },
      })
    }

    setProfiles((currentProfiles) =>
      currentProfiles.map((profile) =>
        profile.id === profileId
          ? { ...profile, verification_status: verificationStatus }
          : profile
      )
    )
    setSuccessMessage(`Supplier status updated to ${verificationStatus}.`)
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Supplier Compliance
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier Verification Review
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review supplier compliance profiles, inspect submitted registration details,
          and manage verification decisions from a structured enterprise workspace.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Verification update failed</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      {/* Compliance Expiring Soon warning section */}
      {!loading && expiringCompliance.length > 0 && (
        <section className="mb-8 rounded-md border border-warning/40 bg-warning-soft p-5 shadow-panel">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-warning">
                Compliance Alert
              </p>
              <h2 className="mt-1 text-lg font-semibold text-heading">
                Compliance Expiring Soon
              </h2>
            </div>
            <span className="inline-flex w-fit rounded-md border border-warning bg-warning-soft px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-warning">
              {expiringCompliance.length} supplier{expiringCompliance.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="mb-4 max-w-2xl text-sm text-secondary">
            The following suppliers have compliance documents that are expired or
            expiring within 30 days. Contact them to prevent procurement disruptions.
          </p>
          <div className="space-y-3">
            {expiringCompliance.map(({ profile, issues }) => (
              <div
                key={profile.id}
                className="rounded-md border border-panel bg-card p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {profile.business_name || "Supplier"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {profile.province || "-"} &middot; {profile.industry || "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {issues.map(({ doc, status }) => (
                      <span
                        key={doc}
                        className={`inline-flex rounded-md border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${status.badgeClass}`}
                      >
                        {doc}: {status.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-panel pt-3">
                  <Link
                    href={`/dashboard/suppliers/${profile.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-button transition hover:bg-accent-strong"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="province-filter" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Province
            </label>
            <select
              id="province-filter"
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All provinces</option>
              {provinceOptions.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="industry-filter" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Industry
            </label>
            <select
              id="industry-filter"
              value={industryFilter}
              onChange={(event) => setIndustryFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All industries</option>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Verification Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-md border border-panel bg-card p-6 shadow-panel">
              <div className="h-4 w-56 animate-pulse rounded bg-panel" />
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[0, 1, 2, 3].map((field) => (
                  <div key={field} className="h-16 animate-pulse rounded-md bg-panel" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No supplier profiles found.</p>
          <p className="mt-2 text-xs text-muted">
            Supplier profiles will appear here after suppliers register and login.
          </p>
        </div>
      )}

      {!loading && profiles.length > 0 && filteredProfiles.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No suppliers match these filters.</p>
          <p className="mt-2 text-xs text-muted">
            Adjust province, industry, or verification status to broaden the review queue.
          </p>
        </div>
      )}

      {!loading && filteredProfiles.length > 0 && (
        <div className="space-y-5">
          {filteredProfiles.map((profile) => {
            const complianceIssues = getProfileExpiryIssues(profile)
            const hasIssues = complianceIssues.length > 0

            return (
              <article
                key={profile.id}
                className="rounded-md border border-panel bg-card p-6 shadow-panel"
              >
                <div className="flex flex-col gap-4 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                      Supplier Profile
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-heading">
                      {profile.business_name || "Supplier"}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Created {formatDate(profile.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(profile.verification_status)}`}
                    >
                      {profile.verification_status || "Pending Review"}
                    </span>
                    {hasIssues && (
                      <span className="inline-flex w-fit rounded-md border border-warning bg-warning-soft px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-warning">
                        Compliance Alert
                      </span>
                    )}
                  </div>
                </div>

                {hasIssues && (
                  <div className="mt-4 flex flex-wrap gap-2 rounded-md border border-warning/30 bg-warning-soft px-4 py-3">
                    {complianceIssues.map(({ doc, status }) => (
                      <span
                        key={doc}
                        className={`inline-flex rounded-md border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${status.badgeClass}`}
                      >
                        {doc}: {status.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="md:col-span-2 xl:col-span-4">
                    <ReadinessScore
                      profile={profile}
                      reviews={reviewsBySupplier[profile.id] ?? []}
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <PerformanceScore
                      reviews={reviewsBySupplier[profile.id] ?? []}
                    />
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Province</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{profile.province || "-"}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Industry</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{profile.industry || "-"}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">CSD Number</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{profile.csd_number || "-"}</p>
                    {profile.csd_expiry_date && (
                      <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${getComplianceStatus(profile.csd_expiry_date).badgeClass}`}>
                        {getComplianceStatus(profile.csd_expiry_date).label}
                      </span>
                    )}
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">B-BBEE Level</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{profile.bbbee_level || "-"}</p>
                    {profile.bbbee_expiry_date && (
                      <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${getComplianceStatus(profile.bbbee_expiry_date).badgeClass}`}>
                        {getComplianceStatus(profile.bbbee_expiry_date).label}
                      </span>
                    )}
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Tax Status</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{profile.tax_status || "-"}</p>
                    {profile.tax_expiry_date && (
                      <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${getComplianceStatus(profile.tax_expiry_date).badgeClass}`}>
                        {getComplianceStatus(profile.tax_expiry_date).label}
                      </span>
                    )}
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Company Registration</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{profile.company_registration || "-"}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">CIDB Grade</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{profile.cidb_grade || "-"}</p>
                    {profile.cidb_expiry_date && (
                      <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${getComplianceStatus(profile.cidb_expiry_date).badgeClass}`}>
                        {getComplianceStatus(profile.cidb_expiry_date).label}
                      </span>
                    )}
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Created At</p>
                    <p className="mt-2 text-sm font-semibold text-heading">{formatDate(profile.created_at)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-panel pt-5">
                  <SaveSupplierControl supplierId={profile.id} compact />
                  <button
                    type="button"
                    disabled={updatingId === profile.id}
                    onClick={() => updateVerificationStatus(profile.id, "Verified")}
                    className="rounded-md border border-success bg-success px-4 py-2 text-sm font-semibold text-button transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Verify Supplier
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === profile.id}
                    onClick={() => updateVerificationStatus(profile.id, "Rejected")}
                    className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject Supplier
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === profile.id}
                    onClick={() => updateVerificationStatus(profile.id, "Pending Review")}
                    className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Pending
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

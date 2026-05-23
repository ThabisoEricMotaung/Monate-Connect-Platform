"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  cidb_grade: string | null
  created_at: string | null
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

export default function AdminVerificationPage() {
  const [profiles, setProfiles] = useState<SupplierProfile[]>([])
  const [provinceFilter, setProvinceFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadProfiles() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, business_name, province, industry, verification_status, csd_number, bbbee_level, tax_status, company_registration, cidb_grade, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setProfiles((data ?? []) as SupplierProfile[])
      setLoading(false)
    }

    loadProfiles()
  }, [])

  const provinceOptions = useMemo(
    () => Array.from(new Set(profiles.map((profile) => profile.province).filter(Boolean))).sort() as string[],
    [profiles]
  )

  const industryOptions = useMemo(
    () => Array.from(new Set(profiles.map((profile) => profile.industry).filter(Boolean))).sort() as string[],
    [profiles]
  )

  const statusOptions = useMemo(
    () => Array.from(new Set(profiles.map((profile) => profile.verification_status).filter(Boolean))).sort() as string[],
    [profiles]
  )

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
          {filteredProfiles.map((profile) => (
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
                <span
                  className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(profile.verification_status)}`}
                >
                  {profile.verification_status || "Pending Review"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">B-BBEE Level</p>
                  <p className="mt-2 text-sm font-semibold text-heading">{profile.bbbee_level || "-"}</p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Tax Status</p>
                  <p className="mt-2 text-sm font-semibold text-heading">{profile.tax_status || "-"}</p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Company Registration</p>
                  <p className="mt-2 text-sm font-semibold text-heading">{profile.company_registration || "-"}</p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">CIDB Grade</p>
                  <p className="mt-2 text-sm font-semibold text-heading">{profile.cidb_grade || "-"}</p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Created At</p>
                  <p className="mt-2 text-sm font-semibold text-heading">{formatDate(profile.created_at)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-panel pt-5">
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
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import SaveSupplierControl from "@/components/suppliers/SaveSupplierControl"
import {
  calculateSupplierPerformance,
  type SupplierPerformanceReview,
} from "@/lib/supplierPerformance"
import { calculateSupplierScore } from "@/lib/supplierScore"
import { supabase } from "@/lib/supabase"

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  email: string | null
  verification_status: string | null
  created_at: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
}

type SupplierReview = SupplierPerformanceReview & {
  supplier_id: string | null
}

const statusStyles: Record<string, string> = {
  Verified: "border-success bg-success-soft text-success",
  "Under Review": "border-warning bg-warning-soft text-warning",
  "Pending Review": "border-warning bg-warning-soft text-warning",
  Pending: "border-warning bg-warning-soft text-warning",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-700",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

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

function normalize(value: string | null): string {
  return (value ?? "").toLowerCase().trim()
}

function scoreTone(score: number): string {
  if (score <= 39) return "border-rose-500/30 bg-rose-500/10 text-rose-700"
  if (score <= 69) return "border-warning bg-warning-soft text-warning"
  if (score <= 89) return "border-sky-500/30 bg-sky-500/10 text-sky-700"
  return "border-success bg-success-soft text-success"
}

function scoreBar(score: number): string {
  if (score <= 39) return "bg-rose-500"
  if (score <= 69) return "bg-warning"
  if (score <= 89) return "bg-sky-500"
  return "bg-success"
}

function ReadinessScore({ supplier }: { supplier: SupplierProfile }) {
  const readiness = calculateSupplierScore(supplier)

  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Readiness Score
          </p>
          <p className="mt-2 text-sm font-semibold text-heading">
            {readiness.score}/100
          </p>
        </div>
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${scoreTone(readiness.score)}`}
        >
          {readiness.label}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
        <div
          className={`h-full rounded-full ${scoreBar(readiness.score)}`}
          style={{ width: `${readiness.score}%` }}
        />
      </div>
    </div>
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Performance Score
          </p>
          <p className="mt-2 text-sm font-semibold text-heading">
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
          className={`inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${performanceTone(performance.averageScore)}`}
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

function formatWhatsAppPhone(phone: string | null): string | null {
  const cleanedPhone = (phone ?? "")
    .replace(/\s/g, "")
    .replace(/\+/g, "")
    .replace(/[^\d]/g, "")

  if (!cleanedPhone) return null

  return cleanedPhone.startsWith("0")
    ? `27${cleanedPhone.slice(1)}`
    : cleanedPhone
}

function createWhatsAppLink(phone: string | null, message: string): string | null {
  const formattedPhone = formatWhatsAppPhone(phone)

  if (!formattedPhone) return null

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
}

export default function SuppliersDirectoryPage() {
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([])
  const [search, setSearch] = useState("")
  const [provinceFilter, setProvinceFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [reviewsBySupplier, setReviewsBySupplier] = useState<
    Record<string, SupplierPerformanceReview[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadSuppliers() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, business_name, province, industry, phone, email, verification_status, created_at, csd_number, bbbee_level, tax_status, company_registration, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url")
        .order("business_name", { ascending: true })

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

      setSuppliers((data ?? []) as SupplierProfile[])
      setReviewsBySupplier(groupedReviews)
      setLoading(false)
    }

    loadSuppliers()
  }, [])

  const provinceOptions = useMemo(
    () =>
      Array.from(
        new Set(suppliers.map((supplier) => supplier.province).filter(Boolean))
      ).sort() as string[],
    [suppliers]
  )

  const industryOptions = useMemo(
    () =>
      Array.from(
        new Set(suppliers.map((supplier) => supplier.industry).filter(Boolean))
      ).sort() as string[],
    [suppliers]
  )

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          suppliers
            .map((supplier) => supplier.verification_status)
            .filter(Boolean)
        )
      ).sort() as string[],
    [suppliers]
  )

  const filteredSuppliers = useMemo(() => {
    const searchNeedle = normalize(search)

    return suppliers.filter((supplier) => {
      const searchMatches =
        !searchNeedle ||
        normalize(supplier.business_name).includes(searchNeedle)
      const provinceMatches =
        !provinceFilter || supplier.province === provinceFilter
      const industryMatches =
        !industryFilter || supplier.industry === industryFilter
      const statusMatches =
        !statusFilter || supplier.verification_status === statusFilter

      return searchMatches && provinceMatches && industryMatches && statusMatches
    })
  }, [industryFilter, provinceFilter, search, statusFilter, suppliers])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement / Supplier Network
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier Directory
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Search and review registered suppliers by region, industry, and
          verification readiness for procurement engagement.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Supplier directory failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label
              htmlFor="supplier-search"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Business Name
            </label>
            <input
              id="supplier-search"
              type="search"
              placeholder="Search supplier"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={filterClass}
            />
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
            <label
              htmlFor="industry-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
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
            <label
              htmlFor="status-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Verification
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
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-md border border-panel bg-card p-6 shadow-panel"
            >
              <div className="h-4 w-56 animate-pulse rounded bg-panel" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((__, fieldIndex) => (
                  <div
                    key={fieldIndex}
                    className="h-14 animate-pulse rounded-md bg-panel"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && suppliers.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No suppliers found.
          </p>
          <p className="mt-2 text-xs text-muted">
            Registered suppliers will appear here after profile creation.
          </p>
        </div>
      )}

      {!loading && suppliers.length > 0 && filteredSuppliers.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No suppliers match these filters.
          </p>
          <p className="mt-2 text-xs text-muted">
            Adjust the business name, province, industry, or verification status.
          </p>
        </div>
      )}

      {!loading && filteredSuppliers.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredSuppliers.map((supplier) => {
            const businessName = supplier.business_name || "Supplier Profile"
            const whatsappLink = createWhatsAppLink(
              supplier.phone,
              `Hi ${businessName}, we found your supplier profile on Monate Vendor Network and would like to discuss procurement opportunities.`
            )

            return (
              <article
                key={supplier.id}
                className="rounded-md border border-panel bg-card p-6 shadow-panel"
              >
                <div className="flex flex-col gap-4 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                      Supplier
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-heading">
                      {businessName}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Registered {formatDate(supplier.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(supplier.verification_status)}`}
                  >
                    {supplier.verification_status || "Pending Review"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Province
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {supplier.province || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Industry
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {supplier.industry || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Phone
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {supplier.phone || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Email
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-heading">
                      {supplier.email || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <ReadinessScore supplier={supplier} />
                </div>
                <div className="mt-3">
                  <PerformanceScore
                    reviews={reviewsBySupplier[supplier.id] ?? []}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-panel pt-5">
                  <SaveSupplierControl supplierId={supplier.id} compact />
                  <Link
                    href={`/dashboard/suppliers/${supplier.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
                  >
                    View Profile
                  </Link>
                  {whatsappLink ? (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md border border-success bg-success-soft px-5 py-2.5 text-sm font-semibold text-success transition hover:bg-success/10"
                    >
                      Contact on WhatsApp
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-not-allowed items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-muted opacity-70"
                    >
                      No WhatsApp number
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

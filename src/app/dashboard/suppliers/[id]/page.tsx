import Link from "next/link"
import { notFound } from "next/navigation"
import SaveSupplierControl from "@/components/suppliers/SaveSupplierControl"
import { getComplianceStatus } from "@/lib/complianceStatus"
import {
  calculateSupplierPerformance,
  type SupplierPerformanceReview,
} from "@/lib/supplierPerformance"
import { calculateSupplierScore } from "@/lib/supplierScore"
import { supabase } from "@/lib/supabase"

type Props = {
  params: Promise<{
    id: string
  }>
}

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  email: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  cidb_grade: string | null
  verification_notes: string | null
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

const statusStyles: Record<string, string> = {
  Verified: "border-success bg-success-soft text-success",
  "Under Review": "border-warning bg-warning-soft text-warning",
  "Pending Review": "border-warning bg-warning-soft text-warning",
  Pending: "border-warning bg-warning-soft text-warning",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-700",
}

function statusBadgeClass(status: string | null): string {
  return statusStyles[status || ""] ?? "border-panel bg-panel text-secondary"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Readiness Score
          </p>
          <p className="mt-2 text-2xl font-semibold text-heading">
            {readiness.score}/100
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${scoreTone(readiness.score)}`}
        >
          {readiness.label}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-card">
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

function PerformanceScore({
  reviews,
}: {
  reviews: SupplierPerformanceReview[]
}) {
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
          <p className="mt-2 text-2xl font-semibold text-heading">
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
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-card">
        <div
          className={`h-full rounded-full ${performanceBar(performance.averageScore)}`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

function valueOrDash(value: string | null): string {
  return value || "-"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
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

export default async function DashboardSupplierDetailPage({ params }: Props) {
  const { id } = await params

  if (!supabase) {
    notFound()
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, business_name, province, industry, phone, email, verification_status, csd_number, bbbee_level, tax_status, company_registration, cidb_grade, verification_notes, created_at, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url, tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date")
    .eq("id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  const { data: reviewData } = await supabase
    .from("supplier_reviews")
    .select("rating, delivery_score, price_score, compliance_score, communication_score, quality_score")
    .eq("supplier_id", id)

  const supplier = data as SupplierProfile
  const reviews = (reviewData ?? []) as SupplierPerformanceReview[]
  const businessName = supplier.business_name || "Supplier Profile"
  const whatsappLink = createWhatsAppLink(
    supplier.phone,
    `Hi ${businessName}, we found your supplier profile on Monate Vendor Network and would like to discuss procurement opportunities.`
  )
  const documents = [
    { label: "CSD Document", url: supplier.csd_document_url },
    { label: "B-BBEE Certificate", url: supplier.bbbee_document_url },
    { label: "Tax Clearance Document", url: supplier.tax_document_url },
    { label: "Company Registration Document", url: supplier.company_registration_url },
    { label: "CIDB Certificate", url: supplier.cidb_document_url },
    { label: "Capability Statement", url: supplier.capability_statement_url },
  ].filter((document) => Boolean(document.url))

  const complianceItems = [
    {
      label: "CSD Number",
      value: supplier.csd_number,
      expiryDate: supplier.csd_expiry_date,
    },
    {
      label: "B-BBEE Level",
      value: supplier.bbbee_level,
      expiryDate: supplier.bbbee_expiry_date,
    },
    {
      label: "Tax Status",
      value: supplier.tax_status,
      expiryDate: supplier.tax_expiry_date,
    },
    {
      label: "Company Registration",
      value: supplier.company_registration,
      expiryDate: null,
    },
    {
      label: "CIDB Grade",
      value: supplier.cidb_grade,
      expiryDate: supplier.cidb_expiry_date,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Supplier Directory
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-heading">
              {businessName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
              Review supplier business details, contact information, compliance
              credentials, and uploaded verification documents.
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(supplier.verification_status)}`}
          >
            {supplier.verification_status || "Pending Review"}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel lg:col-span-2">
          <div className="border-b border-panel pb-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Business Info
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Supplier profile
            </h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                Business Name
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {valueOrDash(supplier.business_name)}
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                Industry
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {valueOrDash(supplier.industry)}
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                Province
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {valueOrDash(supplier.province)}
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                Created At
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {formatDate(supplier.created_at)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="border-b border-panel pb-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Verification Status
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Procurement readiness
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <ReadinessScore supplier={supplier} />
            <PerformanceScore reviews={reviews} />
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                Current State
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {supplier.verification_status || "Pending Review"}
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                Primary Category
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {valueOrDash(supplier.industry)}
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                Operating Region
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {valueOrDash(supplier.province)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="border-b border-panel pb-4">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            Contact Info
          </p>
          <h2 className="mt-2 text-xl font-semibold text-heading">
            Primary contact
          </h2>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-panel bg-panel p-4">
            <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
              Email
            </p>
            <p className="mt-2 break-words text-sm font-semibold text-heading">
              {valueOrDash(supplier.email)}
            </p>
          </div>
          <div className="rounded-md border border-panel bg-panel p-4">
            <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
              Phone
            </p>
            <p className="mt-2 text-sm font-semibold text-heading">
              {valueOrDash(supplier.phone)}
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-panel pt-5">
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
      </section>

      <section className="mt-5 rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="border-b border-panel pb-4">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            Compliance Info
          </p>
          <h2 className="mt-2 text-xl font-semibold text-heading">
            Verification credentials
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {complianceItems.map(({ label, value, expiryDate }) => {
            const cs = expiryDate !== null ? getComplianceStatus(expiryDate) : null
            return (
              <div key={label} className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  {label}
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {valueOrDash(value)}
                </p>
                {cs && (
                  <span
                    className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] ${cs.badgeClass}`}
                  >
                    {cs.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 rounded-md border border-panel bg-panel p-4">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Verification Notes
          </p>
          <p className="mt-2 text-sm leading-7 text-heading">
            {valueOrDash(supplier.verification_notes)}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="border-b border-panel pb-4">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            Document Links
          </p>
          <h2 className="mt-2 text-xl font-semibold text-heading">
            Uploaded compliance documents
          </h2>
        </div>

        {documents.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {documents.map((document) => (
              <a
                key={document.label}
                href={document.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
              >
                {document.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-panel bg-panel p-5">
            <p className="text-sm text-secondary">
              No compliance documents have been uploaded for this supplier yet.
            </p>
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
        <SaveSupplierControl supplierId={supplier.id} compact />
        <Link
          href={`/dashboard/messages?receiver_id=${supplier.id}&subject=${encodeURIComponent(`Message ${businessName}`)}`}
          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
        >
          Message Supplier
        </Link>
        <Link
          href="/dashboard/suppliers"
          className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
        >
          Back to Supplier Directory
        </Link>
      </div>
    </div>
  )
}

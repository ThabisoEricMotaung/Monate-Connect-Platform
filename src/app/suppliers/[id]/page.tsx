import Link from "next/link"
import { notFound } from "next/navigation"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type Props = {
  params: Promise<{ id: string }>
}

type SupplierProfile = {
  id: string
  business_name: string | null
  description: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  cidb_grade: string | null
  verification_notes: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  smart_score?: number | string | null
  created_at?: string | null
  updated_at?: string | null
}

function maskCSD(csd: string | null): string {
  if (!csd?.trim()) return "-"
  if (csd.length <= 4) return csd
  return csd.slice(0, 4) + "*".repeat(Math.min(csd.length - 4, 6))
}

function valueOrDash(value: string | null): string {
  return value?.trim() || "-"
}

function formatYearsActive(createdAt: string | null | undefined): string {
  if (!createdAt) return "-"
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return "-"
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (years < 1) return "< 1 year"
  return years + " year" + (years === 1 ? "" : "s")
}

function getInitials(name: string | null): string {
  if (!name?.trim()) return "??"
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function normalizeTax(v: string | null | undefined): boolean {
  const n = (v ?? "").trim().toLowerCase()
  return n.includes("valid") || n.includes("verified") || n.includes("clear")
}

function ComplianceBadge({ label, status }: { label: string; status: "verified" | "pending" | "none" }) {
  const styles: Record<string, string> = {
    verified: "border-success/30 bg-success-soft text-success",
    pending: "border-warning bg-warning-soft text-warning",
    none: "border-panel bg-panel text-muted",
  }
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] " + styles[status]}>
      {status === "verified" && (
        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
        </svg>
      )}
      {label}
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-panel bg-panel p-4 text-center">
      <p className="text-2xl font-bold text-heading">{value}</p>
      <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
    </div>
  )
}

export default async function SupplierProfilePage({ params }: Props) {
  const { id } = await params

  if (!supabase) notFound()

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,business_name,description,province,industry,verification_status,csd_number,bbbee_level,tax_status,company_registration,cidb_grade,verification_notes,csd_document_url,bbbee_document_url,tax_document_url,company_registration_url,cidb_document_url,capability_statement_url,smart_score,created_at,updated_at"
    )
    .eq("id", id)
    .eq("verification_status", "Verified")
    .single()

  if (error || !data) notFound()

  const supplier = data as SupplierProfile
  const smartScore = calculateSupplierSmartScore(supplier)
  const initials = getInitials(supplier.business_name)
  const taxVerified = normalizeTax(supplier.tax_status)
  const taxStatus = taxVerified ? "verified" : supplier.tax_status?.trim() ? "pending" : "none"

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link href="/suppliers"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Back to directory
          </Link>

          {/* Header card */}
          <div className="mb-6 rounded-xl border border-panel bg-card p-6 shadow-panel">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent ring-4 ring-accent/10">
                  {initials}
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Verified supplier</p>
                  <h1 className="mt-1 text-2xl font-bold text-heading">
                    {supplier.business_name ?? "Supplier profile"}
                  </h1>
                  <p className="mt-0.5 text-sm text-secondary">
                    {supplier.industry ?? "General procurement"}
                    {supplier.province ? " · " + supplier.province : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {supplier.csd_number && <ComplianceBadge label="CSD verified" status="verified" />}
                    {supplier.bbbee_level && <ComplianceBadge label={"BBBEE " + supplier.bbbee_level} status="verified" />}
                    {supplier.tax_status && <ComplianceBadge label="Tax clearance" status={taxStatus} />}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <a href="/auth/login?next=/suppliers"
                  className="masthead__btn-primary whitespace-nowrap text-sm">
                  Invite to RFQ
                </a>
                <a href="/auth/login?next=/suppliers"
                  className="masthead__btn-secondary whitespace-nowrap text-sm">
                  Shortlist supplier
                </a>
              </div>
            </div>
            {supplier.description && (
              <div className="mt-5 border-t border-panel pt-5">
                <p className="text-sm leading-relaxed text-secondary">{supplier.description}</p>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Compliance */}
              <section className="rounded-xl border border-panel bg-card p-6 shadow-panel">
                <div className="mb-4 border-b border-panel pb-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Compliance</p>
                  <h2 className="mt-1 text-lg font-bold text-heading">Verification credentials</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">CSD number</p>
                    <p className="mt-1.5 text-sm font-semibold text-heading">{maskCSD(supplier.csd_number)}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">BBBEE level</p>
                    <p className="mt-1.5 text-sm font-semibold text-heading">{valueOrDash(supplier.bbbee_level)}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">Tax clearance</p>
                    <p className="mt-1.5 text-sm font-semibold text-heading">{valueOrDash(supplier.tax_status)}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">Company registration</p>
                    <p className="mt-1.5 text-sm font-semibold text-heading">{valueOrDash(supplier.company_registration)}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">CIDB grade</p>
                    <p className="mt-1.5 text-sm font-semibold text-heading">{valueOrDash(supplier.cidb_grade)}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">Province</p>
                    <p className="mt-1.5 text-sm font-semibold text-heading">{valueOrDash(supplier.province)}</p>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="rounded-xl border border-panel bg-card p-6 shadow-panel">
                <div className="mb-4 border-b border-panel pb-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Performance</p>
                  <h2 className="mt-1 text-lg font-bold text-heading">Procurement statistics</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <StatCard label="RFQs won" value="---" />
                  <StatCard label="Quote rate" value="---" />
                  <StatCard label="Buyer rating" value="---" />
                  <StatCard label="Years active" value={formatYearsActive(supplier.created_at)} />
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <SmartScoreCircle score={smartScore} label="Supplier SmartScore" className="w-full max-w-none" />
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">Contact</p>
                <h3 className="mt-1.5 text-sm font-bold text-heading">Contact through AiForm Procure</h3>
                <p className="mt-2 text-sm text-secondary">
                  Contact details are shared privately after an RFQ invitation is accepted.
                </p>
                <a href="/auth/login?next=/suppliers"
                  className="mt-4 block w-full masthead__btn-primary text-center text-sm">
                  Sign in to contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}

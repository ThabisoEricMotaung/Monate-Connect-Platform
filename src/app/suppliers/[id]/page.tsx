import Link from "next/link"
import { notFound } from "next/navigation"
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

function valueOrDash(value: string | null): string {
  return value || "-"
}

export default async function SupplierDetailPage({ params }: Props) {
  const { id } = await params

  if (!supabase) {
    notFound()
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, business_name, province, industry, phone, email, verification_status, csd_number, bbbee_level, tax_status, company_registration, cidb_grade, verification_notes")
    .eq("id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  const supplier = data as SupplierProfile

  return (
    <main className="min-h-screen bg-page px-6 py-10 text-primary">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-panel pb-6">
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Supplier Network
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-heading">
                {supplier.business_name || "Supplier Profile"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
                Review supplier contact details, compliance credentials, and procurement readiness.
              </p>
            </div>
            <span
              className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${statusBadgeClass(supplier.verification_status)}`}
            >
              {supplier.verification_status || "Pending Review"}
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel lg:col-span-2">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Contact Section
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                Business Contact Details
              </h2>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Email</p>
                <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.email)}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Phone</p>
                <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.phone)}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Province</p>
                <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.province)}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Industry</p>
                <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.industry)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Procurement Readiness
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                Supplier Status
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Verification</p>
                <p className="mt-2 text-sm font-semibold text-heading">{supplier.verification_status || "Pending Review"}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Primary Category</p>
                <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.industry)}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Operating Region</p>
                <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.province)}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="border-b border-panel pb-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Compliance Section
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Verification Credentials
            </h2>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">CSD Number</p>
              <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.csd_number)}</p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">B-BBEE Level</p>
              <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.bbbee_level)}</p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Tax Status</p>
              <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.tax_status)}</p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Company Registration</p>
              <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.company_registration)}</p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">CIDB Grade</p>
              <p className="mt-2 text-sm font-semibold text-heading">{valueOrDash(supplier.cidb_grade)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-panel bg-panel p-4">
            <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Verification Notes</p>
            <p className="mt-2 text-sm leading-7 text-heading">{valueOrDash(supplier.verification_notes)}</p>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
          <Link
            href="/#suppliers"
            className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
          >
            Back to Suppliers
          </Link>
        </div>
      </div>
    </main>
  )
}

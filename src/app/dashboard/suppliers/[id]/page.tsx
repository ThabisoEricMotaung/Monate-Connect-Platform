import Link from "next/link"
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
  smart_score?: number | string | null
  created_at?: string | null
  updated_at?: string | null
}

function valueOrDash(value: string | null | undefined): string {
  return value?.trim() || "-"
}

function initials(name: string | null): string {
  if (!name?.trim()) return "??"
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function statusClass(status: string | null): string {
  const normalized = (status ?? "").toLowerCase()

  if (normalized.includes("verified")) {
    return "border-success bg-success-soft text-success"
  }

  if (normalized.includes("reject")) {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700"
  }

  return "border-warning bg-warning-soft text-warning"
}

function NotFoundState() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Supplier directory
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier not found
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          This supplier profile may have been removed, is still pending verification, or is not available to your workspace.
        </p>
      </div>

      <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">
          We could not find a supplier profile for this reference.
        </p>
        <Link
          href="/dashboard/suppliers"
          className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
        >
          Back to directory
        </Link>
      </section>
    </div>
  )
}

export default async function DashboardSupplierProfilePage({ params }: Props) {
  const { id } = await params

  if (!supabase) return <NotFoundState />

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,business_name,description,province,industry,verification_status,csd_number,bbbee_level,tax_status,company_registration,cidb_grade,smart_score,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return <NotFoundState />

  const supplier = data as SupplierProfile
  const score = calculateSupplierSmartScore(supplier)

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <Link
          href="/dashboard/suppliers"
          className="text-sm font-semibold text-accent transition hover:text-accent-strong"
        >
          Back to directory
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-button">
              {initials(supplier.business_name)}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Supplier profile
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-heading">
                {supplier.business_name ?? "Supplier profile"}
              </h1>
              <p className="mt-2 text-sm text-secondary">
                {valueOrDash(supplier.industry)}
                {supplier.province ? " - " + supplier.province : ""}
              </p>
            </div>
          </div>

          <span className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusClass(supplier.verification_status)}`}>
            {supplier.verification_status || "Pending Review"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Overview
            </p>
            <p className="mt-3 text-sm leading-7 text-secondary">
              {supplier.description || "No supplier description has been added yet."}
            </p>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Compliance
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["CSD number", supplier.csd_number],
                ["BBBEE level", supplier.bbbee_level],
                ["Tax status", supplier.tax_status],
                ["Company registration", supplier.company_registration],
                ["CIDB grade", supplier.cidb_grade],
                ["Province", supplier.province],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {valueOrDash(value)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <SmartScoreCircle
            score={score}
            label="Supplier SmartScore"
            className="w-full max-w-none"
          />
          <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Quick action
            </p>
            <Link
              href={`/dashboard/messages?receiver_role=supplier&supplier_id=${supplier.id}&subject=${encodeURIComponent(`Supplier profile: ${supplier.business_name ?? supplier.id}`)}`}
              className="mt-4 flex w-full justify-center rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
            >
              Message supplier
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

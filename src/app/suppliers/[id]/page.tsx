import Image from "next/image"
import Link from "next/link"
import { ProfileImage, initialsFromName } from "@/components/ProfileImage"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

type Props = {
  params: Promise<{ id: string }>
}

type PublicSupplierProfile = {
  id: string
  full_name: string | null
  preferred_name: string | null
  email: string | null
  avatar_url: string | null
  company_logo_url: string | null
  business_name: string | null
  province: string | null
  provinces: string[] | null
  industry: string | null
  bbbee_level: string | null
  cidb_grade: string | null
  smart_score: number | string | null
  csd_verified: boolean | null
  bbbee_verified: boolean | null
  tax_verified: boolean | null
  banking_verified: boolean | null
  bank_verified: boolean | null
  director_verified: boolean | null
  website: string | null
  description: string | null
  employee_count: number | string | null
  linkedin_url: string | null
  founded_year: number | string | null
  created_at: string | null
}

const FOREST = "#1a3a2a"
const GOLD = "#c8a060"
const COVER_GRADIENTS = [
  ["#1a3a2a", "#2d5a3d"],
  ["#c8a060", "#a67c3a"],
  ["#2d4a6b", "#1a2f45"],
  ["#6b3a2d", "#4a2419"],
  ["#1a4a4a", "#0d2d2d"],
  ["#4a3a6b", "#2d2145"],
] as const

async function getSupplier(id: string): Promise<PublicSupplierProfile> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) notFound()

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })

  const baseSelect =
    "id,full_name,preferred_name,email,business_name,province,provinces,industry,bbbee_level,cidb_grade,smart_score,csd_verified,bbbee_verified,tax_verified,banking_verified,bank_verified,director_verified,website,description,employee_count,linkedin_url,founded_year,created_at"
  let { data, error } = await supabase
    .from("profiles")
    .select(`${baseSelect},avatar_url,company_logo_url`)
    .eq("id", id)
    .maybeSingle()

  if (error?.code === "42703") {
    const retry = await supabase
      .from("profiles")
      .select(baseSelect)
      .eq("id", id)
      .maybeSingle()
    data = retry.data ? { ...retry.data, avatar_url: null, company_logo_url: null } : null
    error = retry.error
  }

  if (error || !data) notFound()

  return data as PublicSupplierProfile
}

function asNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function formatScore(value: number | string | null | undefined): string {
  const score = asNumber(value)
  if (score === null) return "-"
  return String(Math.round(Math.min(100, Math.max(0, score))))
}

function coverGradient(name: string | null | undefined): string {
  const firstLetter = name?.trim().charAt(0).toUpperCase() || "S"
  const [from, to] = COVER_GRADIENTS[firstLetter.charCodeAt(0) % COVER_GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

function valueOrDash(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

function primaryProvince(supplier: PublicSupplierProfile): string {
  return supplier.province?.trim() || supplier.provinces?.find(Boolean)?.trim() || "National"
}

function externalHref(value: string | null | undefined): string | null {
  const href = value?.trim()
  if (!href) return null
  return /^https?:\/\//i.test(href) ? href : `https://${href}`
}

function ExternalLinkIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

function VerificationMark({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
        active ? "bg-[#E1F5EE] text-[#085041]" : "bg-stone-100 text-stone-400",
      ].join(" ")}
      aria-label={active ? "Verified" : "Not verified"}
    >
      {active ? <span aria-hidden="true">&#10003;</span> : <span aria-hidden="true">-</span>}
    </span>
  )
}

function VerificationRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-3 last:border-b-0">
      <span className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-stone-600">{label}</span>
      <VerificationMark active={active} />
    </div>
  )
}

function VerificationPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em]",
        active ? "bg-[#E1F5EE] text-[#085041]" : "bg-stone-100 text-stone-500",
      ].join(" ")}
    >
      {label}
    </span>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-[#fbf8f1] p-4">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#1f2f28]">{value}</p>
    </div>
  )
}

export default async function SupplierProfilePage({ params }: Props) {
  const { id } = await params
  const supplier = await getSupplier(id)
  const websiteHref = externalHref(supplier.website)
  const linkedinHref = externalHref(supplier.linkedin_url)
  const bankVerified = Boolean(supplier.banking_verified || supplier.bank_verified)
  const supplierName = supplier.business_name?.trim() || "Supplier profile"
  const contactName =
    supplier.preferred_name?.trim() ||
    supplier.full_name?.trim() ||
    supplier.email?.trim() ||
    "Supplier contact"

  return (
    <main className="min-h-screen bg-[#f8f4ec] text-[#1f2f28]">
      <header className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a3a2a] transition hover:text-[#8c6a2f]"
          >
            <span aria-hidden="true">&larr;</span>
            Supplier Directory
          </Link>

          <div className="mt-5 overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="relative h-[180px]">
              {supplier.company_logo_url ? (
                <Image
                  src={supplier.company_logo_url}
                  alt={`${supplierName} cover image`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 1152px) 1152px, 100vw"
                />
              ) : (
                <div className="h-full w-full" style={{ background: coverGradient(supplierName) }} />
              )}
              <div className="absolute bottom-0 left-6 translate-y-1/2">
                <ProfileImage
                  src={supplier.avatar_url}
                  alt={`${contactName} avatar`}
                  className="h-24 w-24 rounded-full border-[3px] border-white object-cover shadow-lg"
                  fallbackClassName="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#E7F8F2] text-2xl font-bold text-[#085041] shadow-lg"
                  fallbackText={initialsFromName(contactName, "S")}
                  seedName={contactName}
                />
              </div>
            </div>

            <div className="px-6 pb-6 pt-14">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                    <span aria-hidden="true">&#10003;</span> Verified Supplier
                  </p>
                  <h1 className="mt-2 font-display text-[28px] font-medium leading-tight text-[#1a3a2a] sm:text-4xl">
                    {supplierName}
                  </h1>
                  <p className="mt-2 text-sm text-stone-600">
                    {[supplier.industry, primaryProvince(supplier)].filter(Boolean).join(" | ")}
                  </p>
                </div>
                <div className="w-fit rounded-lg border bg-white px-4 py-3 text-center" style={{ borderColor: GOLD }}>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>SmartScore</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#1a3a2a]">{formatScore(supplier.smart_score)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <VerificationPill label="CSD" active={Boolean(supplier.csd_verified)} />
                <VerificationPill label="BBBEE" active={Boolean(supplier.bbbee_verified)} />
                <VerificationPill label="Tax" active={Boolean(supplier.tax_verified)} />
                <VerificationPill label="Banking" active={bankVerified} />
                <VerificationPill label="Director" active={Boolean(supplier.director_verified)} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Overview</h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">
              {supplier.description?.trim() || "No description provided."}
            </p>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Supplier details</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Industry" value={valueOrDash(supplier.industry)} />
              <DetailItem label="Province" value={primaryProvince(supplier)} />
              <DetailItem label="Founded year" value={valueOrDash(supplier.founded_year)} />
              <DetailItem label="Employee count" value={valueOrDash(supplier.employee_count)} />
            </div>
          </div>

          {(websiteHref || linkedinHref) && (
            <div className="rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Links</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#c8a060]/50 bg-[#f8f4ec] px-4 py-2 text-sm font-semibold text-[#1a3a2a] transition hover:border-[#c8a060] hover:bg-[#fffaf0]"
                  >
                    Website
                    <ExternalLinkIcon />
                  </a>
                )}
                {linkedinHref && (
                  <a
                    href={linkedinHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#c8a060]/50 bg-[#f8f4ec] px-4 py-2 text-sm font-semibold text-[#1a3a2a] transition hover:border-[#c8a060] hover:bg-[#fffaf0]"
                  >
                    LinkedIn
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border bg-white p-5 text-center" style={{ borderColor: GOLD }}>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
              SmartScore
            </p>
            <p className="mt-3 font-display text-6xl font-medium leading-none text-[#1a3a2a]">{formatScore(supplier.smart_score)}</p>
            <p className="mt-3 text-sm leading-6 text-stone-600">Independently verified by AiForm Procure</p>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Verification steps</h2>
            <div className="mt-3">
              <VerificationRow label="CSD" active={Boolean(supplier.csd_verified)} />
              <VerificationRow label="BBBEE" active={Boolean(supplier.bbbee_verified)} />
              <VerificationRow label="TAX" active={Boolean(supplier.tax_verified)} />
              <VerificationRow label="BANKING" active={bankVerified} />
              <VerificationRow label="DIRECTOR" active={Boolean(supplier.director_verified)} />
            </div>
          </div>

          {(supplier.bbbee_level || supplier.cidb_grade) && (
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-display text-xl font-medium text-[#1a3a2a]">Credentials</h2>
              <div className="mt-4 space-y-3">
                {supplier.bbbee_level && <DetailItem label="BBBEE Level" value={supplier.bbbee_level} />}
                {supplier.cidb_grade && <DetailItem label="CIDB Grade" value={supplier.cidb_grade} />}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <Link
              href="/auth/login"
              className="block rounded-lg px-4 py-3 text-center text-sm font-bold transition hover:brightness-105"
              style={{ backgroundColor: GOLD, color: FOREST }}
            >
              Send RFQ
            </Link>
            <p className="mt-3 text-center text-xs leading-5 text-stone-500">Login as a buyer to send this supplier an RFQ</p>
          </div>
        </aside>
      </div>
    </main>
  )
}

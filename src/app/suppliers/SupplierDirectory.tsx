"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import BackLink from "@/components/BackLink"
import { ProfileImage, initialsFromName } from "@/components/ProfileImage"
import { displayIndustry } from "@/lib/industries"
import { supabase } from "@/lib/supabase"

export type PublicSupplierDirectoryRow = {
  id: string
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
  company_logo_url: string | null
}

type ViewMode = "grid" | "list"

const FOREST = "#1a3a2a"
const GOLD = "#c8a060"
const CREAM = "#f8f4ec"
const TEAL = "#5DCAA5"

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
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

function levelValue(value: string | null | undefined): string {
  const match = (value ?? "").match(/(?:level|l)\s*(\d)/i)
  return match ? `L${match[1]}` : (value ?? "").trim()
}

function supplierProvinces(supplier: PublicSupplierDirectoryRow): string[] {
  const values = [supplier.province, ...(supplier.provinces ?? [])]
    .map((value) => value?.trim())
    .filter(Boolean) as string[]
  return Array.from(new Set(values))
}

function primaryProvince(supplier: PublicSupplierDirectoryRow): string {
  return supplier.province?.trim() || supplier.provinces?.find(Boolean)?.trim() || "National"
}

function matchesProvince(supplier: PublicSupplierDirectoryRow, province: string): boolean {
  return supplierProvinces(supplier).some((item) => item === province)
}

function verificationItems(supplier: PublicSupplierDirectoryRow) {
  return [
    ["CSD", Boolean(supplier.csd_verified)],
    ["BBBEE", Boolean(supplier.bbbee_verified)],
    ["TAX", Boolean(supplier.tax_verified)],
    ["BANK", Boolean(supplier.banking_verified || supplier.bank_verified)],
    ["DIR", Boolean(supplier.director_verified)],
  ] as const
}

function BuildingStoreIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01" />
      <path d="M12 10h.01" />
      <path d="M15 10h.01" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

function VerificationBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.08em]",
        active ? "bg-[#E1F5EE] text-[#085041]" : "bg-stone-100 text-stone-500",
      ].join(" ")}
    >
      {label}
    </span>
  )
}

function InfoPill({ children, tint = "neutral" }: { children: React.ReactNode; tint?: "teal" | "neutral" }) {
  return (
    <span className={["rounded-full px-3 py-1 text-[0.72rem] font-medium", tint === "teal" ? "bg-[#E7F8F2] text-[#085041]" : "bg-stone-100 text-stone-600"].join(" ")}>
      {children}
    </span>
  )
}

function ScoreBadge({ score }: { score: number | string | null }) {
  return (
    <div className="min-w-[68px] rounded-lg border bg-white px-3 py-2 text-center" style={{ borderColor: GOLD }}>
      <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Score</p>
      <p className="mt-0.5 text-[19px] font-medium leading-none text-[#1f2f28] tabular-nums">{formatScore(score)}</p>
    </div>
  )
}

function SupplierCard({ supplier }: { supplier: PublicSupplierDirectoryRow }) {
  const province = primaryProvince(supplier)
  const bbbee = levelValue(supplier.bbbee_level)

  return (
    <article className="flex min-h-[248px] flex-col rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <ProfileImage
            src={supplier.company_logo_url}
            alt={`${supplier.business_name || "Supplier"} logo`}
            className="h-12 w-12 rounded-xl border border-stone-200 bg-white object-contain p-1"
            fallbackClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E7F8F2] text-sm font-bold text-[#085041]"
            fallbackText={initialsFromName(supplier.business_name, "S")}
            seedName={supplier.business_name}
          />
          <div className="min-w-0">
            <p className="mb-1 text-[0.68rem] font-semibold" style={{ color: TEAL }}>&#10003; Verified</p>
            <h2 className="font-display text-[15px] font-medium leading-snug text-[#1f2f28]">
              {supplier.business_name || "Verified supplier"}
            </h2>
          </div>
        </div>
        <ScoreBadge score={supplier.smart_score} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {displayIndustry(supplier.industry) && <InfoPill tint="teal">{displayIndustry(supplier.industry)}</InfoPill>}
        <InfoPill>{province}</InfoPill>
        {bbbee && <InfoPill>{bbbee}</InfoPill>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {verificationItems(supplier).map(([label, active]) => (
          <VerificationBadge key={label} label={label} active={active} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-stone-200 pt-4">
        <p className="text-xs text-stone-500">
          {[supplier.founded_year ? `Since ${supplier.founded_year}` : null, supplier.employee_count ? `${supplier.employee_count} employees` : null].filter(Boolean).join(" | ") || "Supplier profile"}
        </p>
        <Link
          href={`/suppliers/${supplier.id}`}
          className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold text-[#1a3a2a] transition hover:border-[#c8a060] hover:text-[#8c6a2f]"
        >
          View profile &rarr;
        </Link>
      </div>
    </article>
  )
}

function SupplierList({ suppliers }: { suppliers: PublicSupplierDirectoryRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-5 py-3" style={{ backgroundColor: FOREST }}>
        <h2 className="font-display text-base italic text-[#f8f4ec]">Verified Supplier Directory</h2>
        <p className="text-xs font-semibold text-[#f8f4ec]/80">{suppliers.length} verified suppliers</p>
      </div>
      <div className="divide-y divide-stone-200">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto_150px] md:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <ProfileImage
                src={supplier.company_logo_url}
                alt={`${supplier.business_name || "Supplier"} logo`}
                className="h-10 w-10 rounded-xl border border-stone-200 bg-white object-contain p-1"
                fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F8F2] text-xs font-bold text-[#085041]"
                fallbackText={initialsFromName(supplier.business_name, "S")}
                seedName={supplier.business_name}
              />
              <div className="min-w-0">
                <h3 className="font-display text-[14px] font-medium leading-snug text-[#1f2f28]">
                  {supplier.business_name || "Verified supplier"}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {[displayIndustry(supplier.industry), primaryProvince(supplier), levelValue(supplier.bbbee_level)].filter(Boolean).join(" | ")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {verificationItems(supplier).map(([label, active]) => (
                <VerificationBadge key={label} label={label} active={active} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <div className="text-center">
                <p className="text-lg font-medium tabular-nums text-[#1f2f28]">{formatScore(supplier.smart_score)}</p>
                <p className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Score</p>
              </div>
              <Link href={`/suppliers/${supplier.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold text-[#1a3a2a] hover:border-[#c8a060] hover:text-[#8c6a2f]">
                View &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[248px] animate-pulse rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-stone-200" />
              <div className="h-5 w-40 rounded bg-stone-200" />
            </div>
            <div className="h-14 w-16 rounded bg-stone-200" />
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-7 w-24 rounded-full bg-stone-200" />
            <div className="h-7 w-20 rounded-full bg-stone-200" />
          </div>
          <div className="mt-5 h-7 w-full rounded bg-stone-100" />
          <div className="mt-12 h-px bg-stone-200" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <div className="mb-5 rounded-full border border-stone-200 bg-white p-5 text-[#1a3a2a]">
        <BuildingStoreIcon />
      </div>
      <h2 className="font-display text-2xl font-semibold text-[#1f2f28]">No verified suppliers yet</h2>
      <p className="mt-3 text-sm leading-6 text-stone-600">Suppliers appear here once they complete verification.</p>
      <Link href="/auth/signup" className="mt-6 rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-5 py-3 text-sm font-semibold text-[#f8f4ec] transition hover:bg-[#10251b]">
        Register as a supplier &rarr;
      </Link>
    </div>
  )
}

export default function SupplierDirectory({
  suppliers,
  errorMessage = "",
}: {
  suppliers: PublicSupplierDirectoryRow[]
  errorMessage?: string
}) {
  const [query, setQuery] = useState("")
  const [province, setProvince] = useState("")
  const [industry, setIndustry] = useState("")
  const [bbbee, setBbee] = useState("")
  const [view, setView] = useState<ViewMode>("grid")
  const [hydrated, setHydrated] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem("sp-view")
    if (stored === "list" || stored === "grid") setView(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
  }, [])

  function changeView(nextView: ViewMode) {
    setView(nextView)
    window.localStorage.setItem("sp-view", nextView)
  }

  const provinces = useMemo(() => {
    return Array.from(new Set(suppliers.flatMap(supplierProvinces))).sort((a, b) => a.localeCompare(b))
  }, [suppliers])

  const industries = useMemo(() => {
    return Array.from(new Set(suppliers.map((supplier) => displayIndustry(supplier.industry)).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))
  }, [suppliers])

  const filtered = useMemo(() => {
    const search = normalize(query)

    return suppliers.filter((supplier) => {
      const searchHit =
        !search ||
        normalize(supplier.business_name).includes(search) ||
        normalize(displayIndustry(supplier.industry)).includes(search) ||
        normalize(primaryProvince(supplier)).includes(search) ||
        supplierProvinces(supplier).some((item) => normalize(item).includes(search))

      if (!searchHit) return false
      if (province && !matchesProvince(supplier, province)) return false
      if (industry && displayIndustry(supplier.industry) !== industry) return false
      if (bbbee && levelValue(supplier.bbbee_level) !== bbbee) return false
      return true
    })
  }, [bbbee, industry, province, query, suppliers])

  const showSkeleton = !hydrated

  return (
    <main className="min-h-screen" style={{ backgroundColor: CREAM }}>
      <nav
        aria-label="Site navigation"
        className="border-b px-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: FOREST, borderBottomColor: "rgba(200,160,96,0.15)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 py-2.5">
          <Link
            href="/"
            className="text-xs font-medium transition-opacity hover:opacity-100"
            style={{ color: "rgba(248,244,236,0.7)" }}
          >
            ← Home
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="ml-auto text-xs font-medium transition-opacity hover:opacity-100"
              style={{ color: "rgba(248,244,236,0.7)" }}
            >
              Go to Dashboard →
            </Link>
          ) : null}
        </div>
      </nav>

      <section className="px-4 py-12 sm:px-6 lg:px-8" style={{ backgroundColor: FOREST }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-4">
            <BackLink className="text-[#f8f4ec]/70 hover:text-[#f8f4ec]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: GOLD }}>AiForm Procure</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-[#f8f4ec] md:text-6xl">
            Verified Supplier Directory
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/auth/signup" className="rounded-md bg-[#c8a060] px-5 py-2.5 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#b8902e]">
              Register as a supplier
            </Link>
            <Link href="/contact" className="rounded-md border border-[#c8a060]/50 px-5 py-2.5 text-sm font-semibold text-[#f8f4ec] transition hover:border-[#c8a060] hover:text-[#c8a060]">
              Get in touch
            </Link>
          </div>
          <div className="mt-8 max-w-4xl">
            <label htmlFor="supplier-search" className="sr-only">Search suppliers</label>
            <input
              id="supplier-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by supplier, industry, or province"
              className="w-full rounded-lg border bg-black/15 px-5 py-4 text-base text-[#f8f4ec] outline-none placeholder:text-[#f8f4ec]/55 focus:ring-2 focus:ring-[#c8a060]/35"
              style={{ borderColor: "rgba(200,160,96,0.55)" }}
            />
          </div>
          {errorMessage && (
            <div className="mt-5 rounded-md border border-[#c8a060]/60 bg-[#f8f4ec] px-4 py-3 text-sm font-semibold text-[#1a3a2a]">
              Supplier directory is temporarily unavailable. The issue has been logged for review.
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-stone-200 px-4 py-4 sm:px-6 lg:px-8" style={{ backgroundColor: CREAM }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <select value={province} onChange={(event) => setProvince(event.target.value)} className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-[#c8a060]">
              <option value="">All provinces</option>
              {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={industry} onChange={(event) => setIndustry(event.target.value)} className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-[#c8a060]">
              <option value="">All industries</option>
              {industries.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={bbbee} onChange={(event) => setBbee(event.target.value)} className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-[#c8a060]">
              <option value="">All BBBEE levels</option>
              {["L1", "L2", "L3", "L4"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3 lg:min-w-[250px] lg:justify-end">
            <p className="text-sm font-semibold text-stone-700">{filtered.length} verified suppliers</p>
            <div className="flex rounded-md border border-stone-300 bg-white p-1">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => changeView("grid")}
                className={`rounded p-2 transition ${view === "grid" ? "bg-[#1a3a2a] text-[#f8f4ec]" : "text-stone-500 hover:bg-stone-100"}`}
              >
                <GridIcon />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => changeView("list")}
                className={`rounded p-2 transition ${view === "list" ? "bg-[#1a3a2a] text-[#f8f4ec]" : "text-stone-500 hover:bg-stone-100"}`}
              >
                <ListIcon />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showSkeleton ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : view === "grid" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)}
          </div>
        ) : (
          <SupplierList suppliers={filtered} />
        )}
      </section>
    </main>
  )
}

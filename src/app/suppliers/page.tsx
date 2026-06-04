"use client"

import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { useEffect, useMemo, useState } from "react"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import { getSmartScoreLevel, type SmartScoreLevel } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type PublicSupplier = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  smart_score?: number | string | null
  readiness_score?: number | string | null
}

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function numberValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b))
}

function supplierLevel(supplier: PublicSupplier): SmartScoreLevel | "Unscored" {
  const score = numberValue(supplier.smart_score)
  return score === null ? "Unscored" : getSmartScoreLevel(score).label
}

async function fetchVerifiedSuppliers(): Promise<PublicSupplier[]> {
  if (!supabase) return []

  const safeColumns =
    "id,business_name,province,industry,verification_status,smart_score,readiness_score"
  const basicColumns = "id,business_name,province,industry,verification_status"

  const first = await supabase
    .from("profiles")
    .select(safeColumns)
    .eq("verification_status", "Verified")
    .order("business_name")

  if (!first.error) return (first.data ?? []) as PublicSupplier[]

  const fallback = await supabase
    .from("profiles")
    .select(basicColumns)
    .eq("verification_status", "Verified")
    .order("business_name")

  if (fallback.error) {
    console.warn("Public supplier marketplace failed to load:", fallback.error.message)
    return []
  }

  return (fallback.data ?? []) as PublicSupplier[]
}

export default function PublicSupplierMarketplacePage() {
  const [suppliers, setSuppliers] = useState<PublicSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [province, setProvince] = useState("")
  const [industry, setIndustry] = useState("")
  const [level, setLevel] = useState("")

  useEffect(() => {
    async function load() {
      const data = await fetchVerifiedSuppliers()
      setSuppliers(data)
      setLoading(false)
    }

    load()
  }, [])

  const provinceOptions = useMemo(() => unique(suppliers.map((supplier) => supplier.province)), [suppliers])
  const industryOptions = useMemo(() => unique(suppliers.map((supplier) => supplier.industry)), [suppliers])
  const levelOptions = useMemo(() => unique(suppliers.map((supplier) => supplierLevel(supplier))), [suppliers])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return suppliers.filter((supplier) => {
      if (query && !(supplier.business_name ?? "").toLowerCase().includes(query)) return false
      if (province && supplier.province !== province) return false
      if (industry && supplier.industry !== industry) return false
      if (level && supplierLevel(supplier) !== level) return false
      return true
    })
  }, [suppliers, search, province, industry, level])

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-t border-heading py-10">
            <p className="newspaper-kicker">Public Marketplace &middot; Verified Suppliers</p>
            <h1 className="newspaper-headline mt-5">Supplier marketplace preview</h1>
            <p className="newspaper-body mt-6 max-w-3xl">
              Preview verified suppliers across South African procurement categories without
              exposing private contact, banking, or compliance document information.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/signup" className="masthead__btn-primary">
                Register as Supplier
              </Link>
              <Link href="/auth/login" className="masthead__btn-secondary">
                Access Supplier Portal
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              Marketplace Value
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-heading">
              Verified discovery, safer shortlisting
            </h2>
            <p className="mt-4 text-sm leading-7 text-secondary">
              Buyers can understand supplier capability by province, sector, verification status,
              and readiness signals before deeper procurement engagement.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-3xl font-bold text-heading">{suppliers.length}</p>
                <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                  verified suppliers
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supplier name"
              className={inputClass}
            />
            <select value={province} onChange={(event) => setProvince(event.target.value)} className={inputClass}>
              <option value="">All provinces</option>
              {provinceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClass}>
              <option value="">All industries</option>
              {industryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={level} onChange={(event) => setLevel(event.target.value)} className={inputClass}>
              <option value="">All SmartScore levels</option>
              {levelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-panel bg-card p-12 text-center shadow-panel">
            <p className="text-lg font-semibold text-heading">No verified suppliers available yet.</p>
            <p className="mt-2 text-sm text-secondary">
              Verified suppliers will appear here once marketplace profiles are approved.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((supplier) => {
              const smartScore = numberValue(supplier.smart_score)
              const readiness = numberValue(supplier.readiness_score)

              return (
                <article key={supplier.id} className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                        Verified Supplier
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-heading">
                        {supplier.business_name || "Verified supplier"}
                      </h2>
                    </div>
                    <span className="rounded-full border border-success/35 bg-success-soft px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-success">
                      Verified
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-panel bg-panel p-3">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Province</p>
                      <p className="mt-1 text-sm font-semibold text-heading">{supplier.province || "-"}</p>
                    </div>
                    <div className="rounded-md border border-panel bg-panel p-3">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Industry</p>
                      <p className="mt-1 text-sm font-semibold text-heading">{supplier.industry || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                    {smartScore !== null ? (
                      <SmartScoreCircle score={smartScore} size="sm" compact className="mx-auto sm:mx-0" />
                    ) : (
                      <div className="rounded-md border border-panel bg-panel p-4 text-center">
                        <p className="text-sm font-semibold text-heading">SmartScore pending</p>
                      </div>
                    )}
                    <div className="rounded-md border border-panel bg-panel p-4">
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Readiness Score</p>
                      <p className="mt-2 text-2xl font-bold text-heading">
                        {readiness === null ? "Pending" : `${Math.round(readiness)}%`}
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        Public-safe marketplace readiness signal.
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

"use client"

import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type PublicRFQ = {
  id: number
  title: string | null
  province: string | null
  category: string | null
  budget: string | number | null
  deadline: string | null
  status: string | null
  description: string | null
}

const PUBLIC_STATUSES = ["Open", "Closing Soon"]

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const statusStyles: Record<string, string> = {
  Open: "border-success/35 bg-success-soft text-success",
  "Closing Soon": "border-warning/35 bg-warning/10 text-warning",
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b))
}

function formatBudget(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "Not disclosed"
  if (typeof value === "number") return `R${value.toLocaleString("en-ZA")}`
  return value
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function shortDescription(value: string | null): string {
  if (!value?.trim()) return "Public opportunity details will be available to registered suppliers through the supplier portal."
  const clean = value.replace(/\s+/g, " ").trim()
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean
}

async function fetchPublicRFQs(): Promise<PublicRFQ[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from("rfqs")
    .select("id,title,province,category,budget,deadline,status,description")
    .in("status", PUBLIC_STATUSES)
    .order("deadline", { ascending: true, nullsFirst: false })

  if (error) {
    console.warn("Public RFQ marketplace failed to load:", error.message)
    return []
  }

  return (data ?? []) as PublicRFQ[]
}

export default function PublicOpportunitiesPage() {
  const [rfqs, setRfqs] = useState<PublicRFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [province, setProvince] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    async function load() {
      const data = await fetchPublicRFQs()
      setRfqs(data)
      setLoading(false)
    }

    load()
  }, [])

  const provinceOptions = useMemo(() => unique(rfqs.map((rfq) => rfq.province)), [rfqs])
  const categoryOptions = useMemo(() => unique(rfqs.map((rfq) => rfq.category)), [rfqs])
  const statusOptions = useMemo(() => unique(rfqs.map((rfq) => rfq.status)), [rfqs])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rfqs.filter((rfq) => {
      if (query && !(rfq.title ?? "").toLowerCase().includes(query)) return false
      if (province && rfq.province !== province) return false
      if (category && rfq.category !== category) return false
      if (status && rfq.status !== status) return false
      return true
    })
  }, [rfqs, search, province, category, status])

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-t border-heading py-10">
            <p className="newspaper-kicker">Public Opportunities &middot; Active RFQs</p>
            <h1 className="newspaper-headline mt-5">Procurement opportunities preview</h1>
            <p className="newspaper-body mt-6 max-w-3xl">
              Browse active public RFQ opportunities across South African procurement categories.
              Registered suppliers can log in to access full submission workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/signup" className="masthead__btn-primary">
                Register as Supplier
              </Link>
              <Link href="/auth/login" className="masthead__btn-secondary">
                Supplier Login
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              Public RFQ Access
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-heading">
              Preview opportunities, submit securely
            </h2>
            <p className="mt-4 text-sm leading-7 text-secondary">
              This public page shows safe summary information only. Quote submission,
              attachments, supplier questions, evaluations, and award workflows remain inside
              the authenticated supplier portal.
            </p>
            <div className="mt-5 rounded-md border border-panel bg-panel p-4">
              <p className="text-3xl font-bold text-heading">{rfqs.length}</p>
              <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                active public opportunities
              </p>
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
              placeholder="Search RFQ title"
              className={inputClass}
            />
            <select value={province} onChange={(event) => setProvince(event.target.value)} className={inputClass}>
              <option value="">All provinces</option>
              {provinceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
              <option value="">All categories</option>
              {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-panel bg-card p-12 text-center shadow-panel">
            <p className="text-lg font-semibold text-heading">No active public opportunities available yet.</p>
            <p className="mt-2 text-sm text-secondary">
              Open and closing-soon RFQs will appear here when buyers publish public opportunities.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((rfq) => (
              <article key={rfq.id} className="rounded-md border border-panel bg-card p-6 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                      RFQ-{rfq.id}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-heading">{rfq.title || "Untitled RFQ"}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusStyles[rfq.status ?? ""] ?? "border-panel bg-panel text-secondary"}`}>
                    {rfq.status || "Open"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-secondary">
                  {shortDescription(rfq.description)}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Province</p>
                    <p className="mt-1 text-sm font-semibold text-heading">{rfq.province || "-"}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Category</p>
                    <p className="mt-1 text-sm font-semibold text-heading">{rfq.category || "-"}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Budget</p>
                    <p className="mt-1 text-sm font-semibold text-heading">{formatBudget(rfq.budget)}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Deadline</p>
                    <p className="mt-1 text-sm font-semibold text-heading">{formatDate(rfq.deadline)}</p>
                  </div>
                </div>

                <Link
                  href="/auth/login"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
                >
                  Login to Submit Quote
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

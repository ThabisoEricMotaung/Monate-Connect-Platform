"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type RfqRow = {
  id: number
  title: string | null
  category: string | null
  province: string | null
  region: string | null
  budget: string | number | null
  deadline: string | null
  status: string | null
  created_at: string | null
}

type QuoteRow = {
  id: number
  rfq_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | number | null
  status: string | null
  created_at: string | null
}

type ContractRow = {
  id: number
  supplier_id: string | null
  supplier_name: string | null
  contract_value: string | number | null
  end_date: string | null
  status: string | null
  created_at: string | null
}

type PurchaseOrderRow = {
  id: number
  rfq_id: number | null
  quote_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | number | null
  title: string | null
  status: string | null
  generated_at: string | null
}

type InvoiceRow = {
  id: number
  supplier_id: string | null
  amount: string | number | null
  total_amount: string | number | null
  status: string | null
  created_at: string | null
}

type SupplierProfile = {
  id: string
  business_name: string | null
  industry: string | null
  bbbee_level: string | null
  verification_status: string | null
}

type BuyerProfile = {
  id: string
  business_name: string | null
  email: string | null
}

type DashboardData = {
  buyer: BuyerProfile | null
  rfqs: RfqRow[]
  quotes: QuoteRow[]
  contracts: ContractRow[]
  purchaseOrders: PurchaseOrderRow[]
  invoices: InvoiceRow[]
  suppliers: SupplierProfile[]
}

type PipelineStage = "Draft" | "Open" | "Evaluation" | "Awarded" | "Closed"

const emptyData: DashboardData = {
  buyer: null,
  rfqs: [],
  quotes: [],
  contracts: [],
  purchaseOrders: [],
  invoices: [],
  suppliers: [],
}

const stageDescriptions: Record<PipelineStage, string> = {
  Draft: "RFQs saved but not yet published",
  Open: "Published RFQs accepting quotes",
  Evaluation: "Deadline passed, under review",
  Awarded: "Selected supplier, PO issued",
  Closed: "Completed or cancelled",
}

const stageOrder: PipelineStage[] = ["Draft", "Open", "Evaluation", "Awarded", "Closed"]

const barColors = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-slate-500",
]

function normalizeStatus(status: string | null): string {
  return String(status ?? "").trim().toLowerCase()
}

function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (!value) return 0

  const normalized = String(value)
    .replace(/[Rr]/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

function formatSpend(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `R ${Math.round(value / 1_000).toLocaleString("en-ZA")}k`

  return `R ${Math.round(value).toLocaleString("en-ZA")}`
}

function formatCurrency(value: string | number | null | undefined): string {
  return `R ${Math.round(parseMoney(value)).toLocaleString("en-ZA")}`
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function daysUntil(value: string | null): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"

  return "Good evening"
}

function firstName(profile: BuyerProfile | null): string {
  const source = profile?.business_name || profile?.email || "Procurement team"
  return source.split(/\s|@/).filter(Boolean)[0] ?? "Procurement team"
}

function stageForRfq(rfq: RfqRow): PipelineStage {
  const status = normalizeStatus(rfq.status)

  if (["draft"].includes(status)) return "Draft"
  if (["open", "published", "active"].includes(status)) return "Open"
  if (["evaluation", "under review", "review"].includes(status)) return "Evaluation"
  if (["awarded", "po issued"].includes(status)) return "Awarded"
  if (["closed", "completed", "cancelled", "canceled"].includes(status)) return "Closed"

  const remaining = daysUntil(rfq.deadline)
  if (remaining != null && remaining < 0) return "Evaluation"

  return "Open"
}

function relativeDate(value: string | null): string {
  if (!value) return "Recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"

  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"

  return `${days} days ago`
}

function supplierTone(industry: string | null): string {
  const value = normalizeStatus(industry)
  if (value.includes("construction")) return "bg-amber-500/15 text-amber-700"
  if (value.includes("technology")) return "bg-sky-500/15 text-sky-700"
  if (value.includes("professional")) return "bg-violet-500/15 text-violet-700"
  if (value.includes("logistics")) return "bg-emerald-500/15 text-emerald-700"

  return "bg-panel text-heading"
}

function initials(value: string | null): string {
  const source = value || "Supplier"
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S"
}

async function readRows<T>(query: PromiseLike<{ data: unknown; error: { message?: string } | null }>): Promise<T[]> {
  const { data, error } = await query

  if (error) {
    console.warn(error.message)
    return []
  }

  return (data ?? []) as T[]
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const [buyer, rfqs, quotes, contracts, purchaseOrders, invoices] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, business_name, email")
          .eq("id", profile.id)
          .maybeSingle()
          .then((result) => (result.error ? null : (result.data as BuyerProfile | null))),
        readRows<RfqRow>(
          supabase
            .from("rfqs")
            .select("id, title, category, province, region, budget, deadline, status, created_at")
            .order("created_at", { ascending: false }),
        ),
        readRows<QuoteRow>(
          supabase
            .from("quotes")
            .select("id, rfq_id, supplier_id, supplier_name, amount, status, created_at")
            .order("created_at", { ascending: false }),
        ),
        readRows<ContractRow>(
          supabase
            .from("contracts")
            .select("id, supplier_id, supplier_name, contract_value, end_date, status, created_at")
            .order("created_at", { ascending: false }),
        ),
        readRows<PurchaseOrderRow>(
          supabase
            .from("purchase_orders")
            .select("id, rfq_id, quote_id, supplier_id, supplier_name, amount, title, status, generated_at")
            .order("generated_at", { ascending: false }),
        ),
        readRows<InvoiceRow>(
          supabase
            .from("invoices")
            .select("id, supplier_id, amount, total_amount, status, created_at")
            .order("created_at", { ascending: false }),
        ),
      ])

      const supplierIds = Array.from(
        new Set(
          [
            ...quotes.map((quote) => quote.supplier_id),
            ...contracts.map((contract) => contract.supplier_id),
            ...purchaseOrders.map((purchaseOrder) => purchaseOrder.supplier_id),
            ...invoices.map((invoice) => invoice.supplier_id),
          ].filter((id): id is string => Boolean(id)),
        ),
      )

      const suppliers =
        supplierIds.length > 0
          ? await readRows<SupplierProfile>(
              supabase
                .from("profiles")
                .select("id, business_name, industry, bbbee_level, verification_status")
                .in("id", supplierIds),
            )
          : []

      if (!cancelled) {
        setDashboardData({
          buyer,
          rfqs,
          quotes,
          contracts,
          purchaseOrders,
          invoices,
          suppliers,
        })
        setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [router])

  const derived = useMemo(() => {
    const rfqById = new Map(dashboardData.rfqs.map((rfq) => [rfq.id, rfq]))
    const supplierById = new Map(dashboardData.suppliers.map((supplier) => [supplier.id, supplier]))
    const quoteCountByRfq = new Map<number, number>()
    const awardedQuoteByRfq = new Map<number, QuoteRow>()

    dashboardData.quotes.forEach((quote) => {
      if (quote.rfq_id != null) {
        quoteCountByRfq.set(quote.rfq_id, (quoteCountByRfq.get(quote.rfq_id) ?? 0) + 1)
      }
      if (quote.rfq_id != null && ["awarded", "approved"].includes(normalizeStatus(quote.status))) {
        awardedQuoteByRfq.set(quote.rfq_id, quote)
      }
    })

    const activeRfqs = dashboardData.rfqs.filter((rfq) =>
      ["open", "evaluation"].includes(stageForRfq(rfq).toLowerCase()),
    )
    const urgentRfqs = activeRfqs.filter((rfq) => {
      const days = daysUntil(rfq.deadline)
      return days != null && days >= 0 && days <= 3
    })
    const activeRfqIds = new Set(activeRfqs.map((rfq) => rfq.id))
    const openQuotes = dashboardData.quotes.filter((quote) =>
      quote.rfq_id != null ? activeRfqIds.has(quote.rfq_id) : true,
    )
    const awaitingQuotes = dashboardData.quotes.filter((quote) =>
      ["", "pending", "under review"].includes(normalizeStatus(quote.status)),
    )
    const activeContracts = dashboardData.contracts.filter((contract) =>
      ["active", "expiring soon"].includes(normalizeStatus(contract.status)),
    )
    const expiringContracts = activeContracts.filter((contract) => {
      const days = daysUntil(contract.end_date)
      return days != null && days >= 0 && days <= 30
    })

    const currentYear = new Date().getFullYear()
    const ytdSpend = dashboardData.purchaseOrders
      .filter((purchaseOrder) => {
        const date = purchaseOrder.generated_at ? new Date(purchaseOrder.generated_at) : null
        return date && !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear
      })
      .reduce((sum, purchaseOrder) => sum + parseMoney(purchaseOrder.amount), 0)
    const previousYtdSpend = dashboardData.purchaseOrders
      .filter((purchaseOrder) => {
        const date = purchaseOrder.generated_at ? new Date(purchaseOrder.generated_at) : null
        return date && !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear - 1
      })
      .reduce((sum, purchaseOrder) => sum + parseMoney(purchaseOrder.amount), 0)
    const spendChange =
      previousYtdSpend > 0
        ? Math.round(((ytdSpend - previousYtdSpend) / previousYtdSpend) * 100)
        : ytdSpend > 0
          ? 100
          : 0

    const pipeline = stageOrder.map((stage) => ({
      stage,
      rfqs: dashboardData.rfqs.filter((rfq) => stageForRfq(rfq) === stage),
    }))

    const spendByCategoryMap = new Map<string, number>()
    dashboardData.purchaseOrders.forEach((purchaseOrder) => {
      const rfq = purchaseOrder.rfq_id != null ? rfqById.get(purchaseOrder.rfq_id) : undefined
      const category = rfq?.category || "Uncategorised"
      spendByCategoryMap.set(
        category,
        (spendByCategoryMap.get(category) ?? 0) + parseMoney(purchaseOrder.amount),
      )
    })
    const spendByCategory = Array.from(spendByCategoryMap.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    const largestCategory = spendByCategory[0]?.value ?? 1

    const spendBuckets = dashboardData.purchaseOrders.reduce(
      (buckets, purchaseOrder) => {
        const supplier = purchaseOrder.supplier_id ? supplierById.get(purchaseOrder.supplier_id) : null
        const level = String(supplier?.bbbee_level ?? "").match(/\d+/)?.[0]
        const amount = parseMoney(purchaseOrder.amount)

        if (level && Number(level) >= 1 && Number(level) <= 4) buckets.levelOneToFour += amount
        else if (level && Number(level) >= 5 && Number(level) <= 8) buckets.levelFiveToEight += amount
        else buckets.unrated += amount

        return buckets
      },
      { levelOneToFour: 0, levelFiveToEight: 0, unrated: 0 },
    )
    const totalBucketSpend =
      spendBuckets.levelOneToFour + spendBuckets.levelFiveToEight + spendBuckets.unrated
    const levelOneToFourPercent =
      totalBucketSpend > 0 ? Math.round((spendBuckets.levelOneToFour / totalBucketSpend) * 100) : 0

    const recentActivity = [
      ...urgentRfqs.map((rfq) => ({
        tone: "warn",
        entity: rfq.title ?? `RFQ-${rfq.id}`,
        text: "is closing soon and may need shortlist attention.",
        date: rfq.deadline,
      })),
      ...dashboardData.quotes.slice(0, 4).map((quote) => ({
        tone: "info",
        entity: quote.supplier_name ?? "A supplier",
        text: `submitted a quote for ${quote.rfq_id ? rfqById.get(quote.rfq_id)?.title ?? `RFQ-${quote.rfq_id}` : "an RFQ"}.`,
        date: quote.created_at,
      })),
      ...dashboardData.purchaseOrders.slice(0, 3).map((purchaseOrder) => ({
        tone: "success",
        entity: purchaseOrder.title ?? `PO-${purchaseOrder.id}`,
        text: "has a purchase order issued.",
        date: purchaseOrder.generated_at,
      })),
      ...dashboardData.contracts.slice(0, 3).map((contract) => ({
        tone: "success",
        entity: contract.supplier_name ?? `Contract-${contract.id}`,
        text: "has a contract record active in procurement.",
        date: contract.created_at,
      })),
      ...dashboardData.invoices.slice(0, 3).map((invoice) => ({
        tone: "info",
        entity: `Invoice-${invoice.id}`,
        text: "was received for procurement review.",
        date: invoice.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
      .slice(0, 5)

    return {
      rfqById,
      supplierById,
      quoteCountByRfq,
      awardedQuoteByRfq,
      activeRfqs,
      urgentRfqs,
      openQuotes,
      awaitingQuotes,
      activeContracts,
      expiringContracts,
      ytdSpend,
      spendChange,
      pipeline,
      spendByCategory,
      largestCategory,
      spendBuckets,
      totalBucketSpend,
      levelOneToFourPercent,
      recentActivity,
    }
  }, [dashboardData])

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-panel pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Admin / Procurement Control
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {greeting()}, {firstName(dashboardData.buyer)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
            Here&apos;s your procurement activity at a glance.
          </p>
        </div>
        <Link
          href="/dashboard/admin/rfqs/new"
          className="inline-flex rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-button shadow-sm transition hover:bg-accent-strong"
        >
          New RFQ
        </Link>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Dashboard failed to load</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Active RFQs",
                value: derived.activeRfqs.length,
                sub:
                  derived.urgentRfqs.length > 0
                    ? `${derived.urgentRfqs.length} closing in ${Math.min(
                        ...derived.urgentRfqs.map((rfq) => daysUntil(rfq.deadline) ?? 0),
                      )} days`
                    : "No urgent deadlines",
                tone: derived.urgentRfqs.length > 0 ? "text-warning" : "text-muted",
              },
              {
                label: "Quotes received",
                value: derived.openQuotes.length,
                sub:
                  derived.awaitingQuotes.length > 0
                    ? `${derived.awaitingQuotes.length} awaiting review`
                    : "No quotes awaiting review",
                tone: derived.awaitingQuotes.length > 0 ? "text-warning" : "text-muted",
              },
              {
                label: "Active contracts",
                value: derived.activeContracts.length,
                sub:
                  derived.expiringContracts.length > 0
                    ? `${derived.expiringContracts.length} expiring soon`
                    : "All in good standing",
                tone: derived.expiringContracts.length > 0 ? "text-warning" : "text-success",
              },
              {
                label: "YTD spend",
                value: formatSpend(derived.ytdSpend),
                sub: `${derived.spendChange >= 0 ? "+" : ""}${derived.spendChange}% vs last year`,
                tone: derived.spendChange >= 0 ? "text-success" : "text-warning",
              },
            ].map((card) => (
              <article key={card.label} className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-secondary">
                  {card.label}
                </p>
                <p className="mt-4 text-3xl font-bold text-heading">{card.value}</p>
                <p className={`mt-2 text-xs font-semibold ${card.tone}`}>{card.sub}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-panel pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">
                  Procurement pipeline
                </p>
                <h2 className="mt-2 text-xl font-semibold text-heading">Procurement pipeline</h2>
              </div>
              <Link href="/dashboard/admin/rfqs" className="text-sm font-semibold text-accent transition hover:text-accent-strong">
                View all
              </Link>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[1040px] grid-cols-5 gap-3">
                {derived.pipeline.map(({ stage, rfqs }) => (
                  <div key={stage} className="rounded-md border border-panel bg-panel p-3">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-heading">{stage}</p>
                        <p className="mt-1 text-[0.68rem] leading-5 text-muted">
                          {stageDescriptions[stage]}
                        </p>
                      </div>
                      <span className="rounded-full border border-panel bg-card px-2 py-0.5 text-xs font-bold text-secondary">
                        {rfqs.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {rfqs.slice(0, 3).map((rfq) => {
                        const quoteCount = derived.quoteCountByRfq.get(rfq.id) ?? 0
                        const awardedQuote = derived.awardedQuoteByRfq.get(rfq.id)
                        const remaining = daysUntil(rfq.deadline)

                        return (
                          <Link
                            key={rfq.id}
                            href={`/dashboard/admin/rfqs/${rfq.id}`}
                            className="block rounded-md border border-panel bg-card p-3 transition hover:border-accent/50"
                          >
                            <p className="line-clamp-2 text-sm font-semibold leading-5 text-heading">
                              {rfq.title ?? `RFQ-${rfq.id}`}
                            </p>
                            <p className="mt-2 text-[0.68rem] text-secondary">
                              {rfq.category ?? "No industry"} · {rfq.province ?? rfq.region ?? "No province"}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-heading">
                              {formatCurrency(rfq.budget)}
                            </p>
                            {stage === "Open" && remaining != null && (
                              <p className={`mt-1 text-[0.68rem] font-semibold ${remaining <= 3 ? "text-warning" : "text-muted"}`}>
                                {remaining >= 0 ? `${remaining} days left` : "Deadline passed"}
                              </p>
                            )}
                            {stage === "Evaluation" && (
                              <p className="mt-1 text-[0.68rem] text-muted">
                                {quoteCount} quote{quoteCount !== 1 ? "s" : ""} received
                              </p>
                            )}
                            {stage === "Awarded" && awardedQuote && (
                              <p className="mt-1 text-[0.68rem] text-success">
                                {awardedQuote.supplier_name ?? "Supplier"} · {formatCurrency(awardedQuote.amount)}
                              </p>
                            )}
                            {stage === "Closed" && (
                              <p className="mt-1 text-[0.68rem] text-muted">
                                Completed {formatDate(rfq.deadline)}
                              </p>
                            )}
                          </Link>
                        )
                      })}
                      {rfqs.length > 3 && (
                        <p className="px-1 pt-1 text-xs font-semibold text-muted">
                          + {rfqs.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-panel pb-4">
                <h2 className="text-lg font-semibold text-heading">Quotes awaiting review</h2>
                <Link href="/dashboard/admin/quotes" className="text-sm font-semibold text-accent transition hover:text-accent-strong">
                  Review all
                </Link>
              </div>

              {derived.awaitingQuotes.length === 0 ? (
                <p className="text-sm text-muted">All quotes reviewed. No action needed.</p>
              ) : (
                <div className="space-y-3">
                  {derived.awaitingQuotes.slice(0, 4).map((quote) => {
                    const supplier = quote.supplier_id ? derived.supplierById.get(quote.supplier_id) : undefined
                    const rfq = quote.rfq_id != null ? derived.rfqById.get(quote.rfq_id) : undefined
                    const status = normalizeStatus(quote.status)
                    const pill =
                      status === "shortlisted"
                        ? "Shortlisted"
                        : status === "under review"
                          ? "Review"
                          : "Pending"
                    const score =
                      supplier?.verification_status?.toLowerCase().includes("verified")
                        ? 82
                        : supplier?.bbbee_level
                          ? 74
                          : 61

                    return (
                      <article key={quote.id} className="flex items-center gap-3 rounded-md border border-panel bg-panel p-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${supplierTone(supplier?.industry ?? null)}`}>
                          {initials(quote.supplier_name ?? supplier?.business_name ?? null)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-heading">
                            {quote.supplier_name ?? supplier?.business_name ?? "Supplier pending"}
                          </p>
                          <p className="mt-1 truncate text-[0.68rem] text-muted">
                            {rfq?.title ?? (quote.rfq_id ? `RFQ-${quote.rfq_id}` : "RFQ pending")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-heading">{formatCurrency(quote.amount)}</p>
                          <p className="mt-1 text-[0.62rem] text-muted">SmartScore {score}</p>
                        </div>
                        <span
                          className={`rounded-md border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${
                            pill === "Shortlisted"
                              ? "border-success bg-success-soft text-success"
                              : pill === "Review"
                                ? "border-sky-500/25 bg-sky-500/10 text-sky-700"
                                : "border-warning bg-warning-soft text-warning"
                          }`}
                        >
                          {pill}
                        </span>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-panel pb-4">
                <h2 className="text-lg font-semibold text-heading">YTD spend by category</h2>
                <Link href="/dashboard/admin/reports/spend" className="text-sm font-semibold text-accent transition hover:text-accent-strong">
                  Full report
                </Link>
              </div>

              {derived.spendByCategory.length === 0 ? (
                <p className="text-sm text-muted">No spend has been recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {derived.spendByCategory.map((row, index) => (
                    <div key={row.category}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="truncate text-xs font-semibold text-heading">{row.category}</p>
                        <p className="text-xs font-bold text-heading">{formatSpend(row.value)}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-panel">
                        <div
                          className={`h-full rounded-full ${barColors[index % barColors.length]}`}
                          style={{ width: `${Math.max(6, (row.value / derived.largestCategory) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-panel pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
                      BBBEE spend split
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Level 1-4",
                          value: derived.spendBuckets.levelOneToFour,
                          percent: derived.levelOneToFourPercent,
                          tone: derived.levelOneToFourPercent >= 60 ? "text-success" : "text-warning",
                        },
                        {
                          label: "Level 5-8",
                          value: derived.spendBuckets.levelFiveToEight,
                          percent:
                            derived.totalBucketSpend > 0
                              ? Math.round((derived.spendBuckets.levelFiveToEight / derived.totalBucketSpend) * 100)
                              : 0,
                          tone: "text-heading",
                        },
                        {
                          label: "Unrated",
                          value: derived.spendBuckets.unrated,
                          percent:
                            derived.totalBucketSpend > 0
                              ? Math.round((derived.spendBuckets.unrated / derived.totalBucketSpend) * 100)
                              : 0,
                          tone: "text-heading",
                        },
                      ].map((bucket) => (
                        <div key={bucket.label} className="rounded-md border border-panel bg-panel p-3">
                          <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                            {bucket.label}
                          </p>
                          <p className={`mt-2 text-lg font-bold ${bucket.tone}`}>{bucket.percent}%</p>
                          <p className="mt-1 text-[0.68rem] text-secondary">{formatSpend(bucket.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-panel pb-4">
              <h2 className="text-lg font-semibold text-heading">Recent activity</h2>
              <Link href="/dashboard/admin/activity" className="text-sm font-semibold text-accent transition hover:text-accent-strong">
                View all
              </Link>
            </div>

            {derived.recentActivity.length === 0 ? (
              <p className="text-sm text-muted">No procurement activity yet.</p>
            ) : (
              <div className="space-y-3">
                {derived.recentActivity.map((item, index) => (
                  <article key={`${item.entity}-${index}`} className="flex items-start gap-3 rounded-md border border-panel bg-panel p-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        item.tone === "success"
                          ? "bg-success"
                          : item.tone === "warn"
                            ? "bg-warning"
                            : "bg-sky-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-secondary">
                        <span className="font-semibold text-heading">{item.entity}</span> {item.text}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted">{relativeDate(item.date)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { getCurrentProfile } from "@/lib/auth"
import { getComplianceStatus } from "@/lib/complianceStatus"
import { supabase } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────────────────────

type DateRange = "7d" | "30d" | "90d" | "all"

type RFQ = {
  id: number
  province: string | null
  category: string | null
  status: string | null
  created_at: string | null
}

type Quote = {
  id: number
  status: string | null
  created_at: string | null
  supplier_id: string | null
}

type SupplierProfile = {
  id: string
  verification_status: string | null
  tax_expiry_date: string | null
  bbbee_expiry_date: string | null
  csd_expiry_date: string | null
  cidb_expiry_date: string | null
}

type PurchaseOrder = {
  id: number
  status: string | null
  generated_at: string | null
}

type DistItem = { label: string; count: number }
type TrendPoint = { period: string; Quotes: number }

// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_RANGES: Array<{ value: DateRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
]

const PALETTE = [
  "#3b6fe8",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#6366f1",
]

const STATUS_COLOR: Record<string, string> = {
  Verified: "#22c55e",
  Awarded: "#22c55e",
  Approved: "#22c55e",
  Issued: "#6366f1",
  Generated: "#0ea5e9",
  Open: "#3b6fe8",
  Shortlisted: "#6366f1",
  "Under Review": "#0ea5e9",
  "Pending Review": "#f59e0b",
  Pending: "#f59e0b",
  Rejected: "#ef4444",
  Cancelled: "#ef4444",
  Closed: "#94a3b8",
}

const TICK = "#94a3b8"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cutoffFor(range: DateRange): Date | null {
  if (range === "all") return null
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function inRange(dateStr: string | null, cutoff: Date | null): boolean {
  if (!cutoff) return true
  if (!dateStr) return false
  return new Date(dateStr) >= cutoff
}

function countBy(values: string[]): DistItem[] {
  const m = new Map<string, number>()
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1)
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

function norm(v: string | null, fallback = "Unassigned"): string {
  return v?.trim() || fallback
}

function buildTrend(quotes: Quote[], range: DateRange): TrendPoint[] {
  const now = new Date()

  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (days - 1 - i))
      const prefix = d.toISOString().split("T")[0]
      return {
        period: d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" }),
        Quotes: quotes.filter((q) => q.created_at?.startsWith(prefix)).length,
      }
    })
  }

  if (range === "90d") {
    return Array.from({ length: 13 }, (_, i) => {
      const wEnd = new Date(now)
      wEnd.setDate(wEnd.getDate() - (12 - i) * 7)
      const wStart = new Date(wEnd)
      wStart.setDate(wEnd.getDate() - 6)
      return {
        period: wEnd.toLocaleDateString("en-ZA", { month: "short", day: "numeric" }),
        Quotes: quotes.filter((q) => {
          if (!q.created_at) return false
          const d = new Date(q.created_at)
          return d >= wStart && d <= wEnd
        }).length,
      }
    })
  }

  // All time — monthly
  const map = new Map<string, TrendPoint>()
  for (const q of quotes) {
    if (!q.created_at) continue
    const d = new Date(q.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const period = d.toLocaleDateString("en-ZA", { year: "2-digit", month: "short" })
    const entry = map.get(key) ?? { period, Quotes: 0 }
    entry.Quotes++
    map.set(key, entry)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v)
}

function doExport(params: {
  rangeLabel: string
  kpis: {
    totalRFQs: number
    totalQuotes: number
    verifiedSuppliers: number
    purchaseOrders: number
    awardedRFQs: number
    activeSuppliers: number
  }
  rfqsByProvince: DistItem[]
  rfqsByCategory: DistItem[]
  suppliersByStatus: DistItem[]
  quotesByStatus: DistItem[]
  compliance: {
    expired: number
    expiringSoon: number
    valid: number
    unknown: number
    total: number
  }
}) {
  const p = (s: string, n = 30) => s.padEnd(n)
  const section = (items: DistItem[]) =>
    items.length ? items.map((r) => `  ${p(r.label)}${r.count}`).join("\n") : "  No data"

  const content = [
    "══════════════════════════════════════════════════════",
    "  AiForm Procure — PROCUREMENT ANALYTICS",
    "══════════════════════════════════════════════════════",
    `  Generated:  ${new Date().toLocaleString("en-ZA")}`,
    `  Range:      ${params.rangeLabel}`,
    "──────────────────────────────────────────────────────",
    "",
    "KEY PERFORMANCE INDICATORS",
    `  ${p("Total RFQs")}${params.kpis.totalRFQs}`,
    `  ${p("Total Quotes")}${params.kpis.totalQuotes}`,
    `  ${p("Verified Suppliers")}${params.kpis.verifiedSuppliers}`,
    `  ${p("Purchase Orders Issued")}${params.kpis.purchaseOrders}`,
    `  ${p("Awarded RFQs")}${params.kpis.awardedRFQs}`,
    `  ${p("Active Suppliers")}${params.kpis.activeSuppliers}`,
    "",
    "RFQs BY PROVINCE",
    section(params.rfqsByProvince),
    "",
    "RFQs BY CATEGORY",
    section(params.rfqsByCategory),
    "",
    "SUPPLIER VERIFICATION STATUS",
    section(params.suppliersByStatus),
    "",
    "QUOTE STATUS DISTRIBUTION",
    section(params.quotesByStatus),
    "",
    "COMPLIANCE READINESS",
    `  ${p("Total documents tracked")}${params.compliance.total}`,
    `  ${p("Expired")}${params.compliance.expired}`,
    `  ${p("Expiring soon (<=30 days)")}${params.compliance.expiringSoon}`,
    `  ${p("Valid")}${params.compliance.valid}`,
    `  ${p("Not configured")}${params.compliance.unknown}`,
    "",
    "──────────────────────────────────────────────────────",
    "  AiForm Procure  |  Enterprise Procurement Platform",
    "══════════════════════════════════════════════════════",
  ].join("\n")

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `monate-analytics-${new Date().toISOString().split("T")[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string
  value: number
  sub?: string
  tone?: "green" | "amber" | "red" | "blue" | "default"
}) {
  const valueClass =
    tone === "green"
      ? "text-success"
      : tone === "amber"
        ? "text-warning"
        : tone === "red"
          ? "text-rose-600"
          : tone === "blue"
            ? "text-sky-600"
            : "text-heading"

  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">{label}</p>
      <p className={["mt-2 text-3xl font-semibold tabular-nums", valueClass].join(" ")}>
        {value.toLocaleString("en-ZA")}
      </p>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  empty,
  children,
  className = "",
}: {
  title: string
  subtitle?: string
  empty?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={["rounded-md border border-panel bg-card p-5 shadow-panel", className].join(" ")}>
      <div className="mb-4 border-b border-panel pb-3">
        {subtitle && (
          <p className="text-[0.65rem] uppercase tracking-[0.24em] text-accent">{subtitle}</p>
        )}
        <h3 className="mt-1 text-sm font-semibold text-heading">{title}</h3>
      </div>
      {empty ? (
        <div className="flex h-36 items-center justify-center">
          <p className="text-xs text-muted">No data available for this range</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-panel bg-card px-3 py-2 shadow-panel">
      {label && <p className="mb-1 text-xs font-semibold text-heading">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-xs" style={{ color: p.color }}>
          {p.name}:{" "}
          <span className="font-semibold">{p.value.toLocaleString("en-ZA")}</span>
        </p>
      ))}
    </div>
  )
}

function DonutLegend({
  items,
}: {
  items: DistItem[]
}) {
  return (
    <div className="flex flex-col justify-center gap-2.5">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: STATUS_COLOR[item.label] ?? PALETTE[i % PALETTE.length],
            }}
          />
          <span className="min-w-0 flex-1 truncate text-xs text-secondary">
            {item.label}
          </span>
          <span className="shrink-0 text-xs font-semibold text-heading tabular-nums">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="h-2.5 w-28 animate-pulse rounded bg-panel" />
      <div className="mt-3 h-9 w-14 animate-pulse rounded bg-panel" />
      <div className="mt-2 h-2 w-16 animate-pulse rounded bg-panel" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="mb-4 h-3 w-36 animate-pulse rounded bg-panel" />
      <div className="h-48 animate-pulse rounded-md bg-panel" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateRange, setDateRange] = useState<DateRange>("30d")

  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [profiles, setProfiles] = useState<SupplierProfile[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()
      if (profile?.role !== "admin" && profile?.role !== "buyer") {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const [rfqRes, quoteRes, profileRes, poRes] = await Promise.all([
        supabase
          .from("rfqs")
          .select("id, province, category, status, created_at"),
        supabase
          .from("quotes")
          .select("id, status, created_at, supplier_id"),
        supabase
          .from("profiles")
          .select(
            "id, verification_status, tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date"
          ),
        supabase
          .from("purchase_orders")
          .select("id, status, generated_at"),
      ])

      const firstError =
        rfqRes.error?.message ||
        quoteRes.error?.message ||
        profileRes.error?.message ||
        poRes.error?.message

      if (firstError) {
        setError(firstError)
        setLoading(false)
        return
      }

      setRfqs((rfqRes.data ?? []) as RFQ[])
      setQuotes((quoteRes.data ?? []) as Quote[])
      setProfiles((profileRes.data ?? []) as SupplierProfile[])
      setPurchaseOrders((poRes.data ?? []) as PurchaseOrder[])
      setLoading(false)
    }

    load()
  }, [router])

  // Derived / filtered
  const cutoff = useMemo(() => cutoffFor(dateRange), [dateRange])
  const rangeLabel =
    DATE_RANGES.find((r) => r.value === dateRange)?.label ?? "All time"

  const filteredRFQs = useMemo(
    () => rfqs.filter((r) => inRange(r.created_at, cutoff)),
    [rfqs, cutoff]
  )
  const filteredQuotes = useMemo(
    () => quotes.filter((q) => inRange(q.created_at, cutoff)),
    [quotes, cutoff]
  )
  const filteredPOs = useMemo(
    () => purchaseOrders.filter((p) => inRange(p.generated_at, cutoff)),
    [purchaseOrders, cutoff]
  )

  const kpis = useMemo(() => {
    const activeIds = new Set(
      filteredQuotes.map((q) => q.supplier_id).filter(Boolean)
    )
    return {
      totalRFQs: filteredRFQs.length,
      totalQuotes: filteredQuotes.length,
      verifiedSuppliers: profiles.filter(
        (p) => p.verification_status === "Verified"
      ).length,
      purchaseOrders: filteredPOs.length,
      awardedRFQs: filteredRFQs.filter((r) => r.status === "Awarded").length,
      activeSuppliers: activeIds.size,
    }
  }, [filteredRFQs, filteredQuotes, profiles, filteredPOs])

  const rfqsByProvince = useMemo(
    () => countBy(filteredRFQs.map((r) => norm(r.province))),
    [filteredRFQs]
  )
  const rfqsByCategory = useMemo(
    () => countBy(filteredRFQs.map((r) => norm(r.category))),
    [filteredRFQs]
  )
  const rfqStatusDist = useMemo(
    () => countBy(filteredRFQs.map((r) => norm(r.status, "Unknown"))),
    [filteredRFQs]
  )
  const suppliersByStatus = useMemo(
    () =>
      countBy(profiles.map((p) => norm(p.verification_status, "Unknown"))),
    [profiles]
  )
  const quotesByStatus = useMemo(
    () => countBy(filteredQuotes.map((q) => norm(q.status, "Unknown"))),
    [filteredQuotes]
  )
  const trendData = useMemo(
    () => buildTrend(filteredQuotes, dateRange),
    [filteredQuotes, dateRange]
  )

  const compliance = useMemo(() => {
    let expired = 0,
      expiringSoon = 0,
      valid = 0,
      unknown = 0
    for (const p of profiles) {
      for (const date of [
        p.tax_expiry_date,
        p.bbbee_expiry_date,
        p.csd_expiry_date,
        p.cidb_expiry_date,
      ]) {
        if (!date) {
          unknown++
          continue
        }
        const { status } = getComplianceStatus(date)
        if (status === "expired") expired++
        else if (status === "expiring_soon") expiringSoon++
        else if (status === "valid") valid++
        else unknown++
      }
    }
    return {
      expired,
      expiringSoon,
      valid,
      unknown,
      total: expired + expiringSoon + valid + unknown,
    }
  }, [profiles])

  function handleExport() {
    doExport({
      rangeLabel,
      kpis,
      rfqsByProvince,
      rfqsByCategory,
      suppliersByStatus,
      quotesByStatus,
      compliance,
    })
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement Intelligence
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-heading">
              Analytics Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
              Executive procurement intelligence — RFQ velocity, supplier
              readiness, quote pipeline health, and compliance coverage across
              the vendor network.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-panel bg-panel px-4 py-2.5 text-sm font-semibold text-heading shadow-panel transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export Procurement Summary
          </button>
        </div>
      </div>

      {/* ── Date range filter ── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
          Range:
        </span>
        {DATE_RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setDateRange(r.value)}
            className={[
              "rounded-md border px-3.5 py-1.5 text-xs font-semibold transition",
              dateRange === r.value
                ? "border-accent bg-accent text-button"
                : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
            ].join(" ")}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Analytics failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonChart key={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Dashboard ── */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* KPI cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Total RFQs" value={kpis.totalRFQs} sub={rangeLabel} />
            <KpiCard
              label="Total Quotes"
              value={kpis.totalQuotes}
              sub={rangeLabel}
              tone="blue"
            />
            <KpiCard
              label="Verified Suppliers"
              value={kpis.verifiedSuppliers}
              tone="green"
              sub="All time"
            />
            <KpiCard
              label="Purchase Orders"
              value={kpis.purchaseOrders}
              sub={rangeLabel}
              tone="blue"
            />
            <KpiCard
              label="Awarded RFQs"
              value={kpis.awardedRFQs}
              sub={rangeLabel}
              tone="green"
            />
            <KpiCard
              label="Active Suppliers"
              value={kpis.activeSuppliers}
              sub="By quote submission"
              tone="blue"
            />
          </section>

          {/* Quote activity trend — full width */}
          <ChartCard
            title="Quote Submission Trend"
            subtitle="Activity over time"
            empty={!mounted || trendData.length === 0}
          >
            {mounted && (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="quoteGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b6fe8" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#3b6fe8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: TICK }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: TICK }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="Quotes"
                    stroke="#3b6fe8"
                    strokeWidth={2}
                    fill="url(#quoteGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Distribution charts */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* RFQs by Province */}
            <ChartCard
              title="RFQs by Province"
              subtitle="Geographic demand"
              empty={!mounted || rfqsByProvince.length === 0}
            >
              {mounted && (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, rfqsByProvince.length * 34)}
                >
                  <BarChart
                    layout="vertical"
                    data={rfqsByProvince}
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar
                      dataKey="count"
                      name="RFQs"
                      fill="#3b6fe8"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* RFQs by Category */}
            <ChartCard
              title="RFQs by Category"
              subtitle="Procurement categories"
              empty={!mounted || rfqsByCategory.length === 0}
            >
              {mounted && (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, rfqsByCategory.length * 34)}
                >
                  <BarChart
                    layout="vertical"
                    data={rfqsByCategory}
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar
                      dataKey="count"
                      name="RFQs"
                      fill="#22c55e"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Supplier verification — donut */}
            <ChartCard
              title="Supplier Verification"
              subtitle="Verification distribution"
              empty={!mounted || suppliersByStatus.length === 0}
            >
              {mounted && (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <div className="shrink-0" style={{ width: 172, height: 172 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={suppliersByStatus}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={2}
                        >
                          {suppliersByStatus.map((item, i) => (
                            <Cell
                              key={item.label}
                              fill={
                                STATUS_COLOR[item.label] ??
                                PALETTE[i % PALETTE.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <DonutLegend items={suppliersByStatus} />
                </div>
              )}
            </ChartCard>

            {/* Award status — donut */}
            <ChartCard
              title="Award Status Distribution"
              subtitle="Quote pipeline"
              empty={!mounted || quotesByStatus.length === 0}
            >
              {mounted && (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <div className="shrink-0" style={{ width: 172, height: 172 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={quotesByStatus}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={2}
                        >
                          {quotesByStatus.map((item, i) => (
                            <Cell
                              key={item.label}
                              fill={
                                STATUS_COLOR[item.label] ??
                                PALETTE[i % PALETTE.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <DonutLegend items={quotesByStatus} />
                </div>
              )}
            </ChartCard>

            {/* RFQ status breakdown */}
            <ChartCard
              title="RFQ Pipeline Status"
              subtitle="Pipeline health"
              empty={!mounted || rfqStatusDist.length === 0}
            >
              {mounted && (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, rfqStatusDist.length * 34)}
                >
                  <BarChart
                    layout="vertical"
                    data={rfqStatusDist}
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="RFQs" radius={[0, 4, 4, 0]}>
                      {rfqStatusDist.map((item, i) => (
                        <Cell
                          key={item.label}
                          fill={
                            STATUS_COLOR[item.label] ??
                            PALETTE[i % PALETTE.length]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Compliance readiness */}
            <ChartCard
              title="Compliance Readiness Summary"
              subtitle="Document expiry coverage"
            >
              <div className="space-y-4">
                {[
                  {
                    label: "Valid documents",
                    value: compliance.valid,
                    cls: "text-success",
                    bar: "bg-success",
                  },
                  {
                    label: "Expiring soon (30 days)",
                    value: compliance.expiringSoon,
                    cls: "text-warning",
                    bar: "bg-warning",
                  },
                  {
                    label: "Expired documents",
                    value: compliance.expired,
                    cls: "text-rose-600",
                    bar: "bg-rose-500",
                  },
                  {
                    label: "Not configured",
                    value: compliance.unknown,
                    cls: "text-muted",
                    bar: "bg-muted",
                  },
                ].map((row) => {
                  const pct =
                    compliance.total > 0
                      ? Math.round((row.value / compliance.total) * 100)
                      : 0
                  return (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-xs text-secondary">{row.label}</span>
                        <span className={["shrink-0 text-xs font-semibold tabular-nums", row.cls].join(" ")}>
                          {row.value}{" "}
                          <span className="font-normal text-muted">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-panel">
                        <div
                          className={["h-full rounded-full transition-all", row.bar].join(" ")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <p className="pt-1 text-xs text-muted">
                  {compliance.total} documents tracked across{" "}
                  {profiles.length} registered profiles
                </p>
              </div>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  )
}

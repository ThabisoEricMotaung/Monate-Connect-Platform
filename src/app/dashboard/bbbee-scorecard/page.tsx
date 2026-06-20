"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatRand, parseMoney } from "@/lib/format"
import { supabase } from "@/lib/supabase"

type SupplierProfile = {
  id: string
  business_name: string | null
  full_name: string | null
  email: string | null
  bbbee_level: string | null
  bbbee_document_url: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
}

type PurchaseOrderRow = {
  id: number
  supplier_id: string | null
  supplier_name: string | null
  amount: string | number | null
  generated_at: string | null
  status: string | null
}

type ContractRow = {
  id: number
  supplier_id: string | null
  supplier_name: string | null
  contract_value: string | number | null
  created_at: string | null
  status: string | null
}

type ScorecardData = {
  suppliers: SupplierProfile[]
  purchaseOrders: PurchaseOrderRow[]
  contracts: ContractRow[]
  errors: string[]
}

type SpendSplit = {
  label: "Level 1-4" | "Level 5-8" | "Unrated"
  value: number
}

type TrendRow = {
  month: string
  compliantPercent: number
}

const EMPTY_DATA: ScorecardData = {
  suppliers: [],
  purchaseOrders: [],
  contracts: [],
  errors: [],
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const LEVELS = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Level 8", "Exempt", "Unrated"]
const GREEN = "#2F8C67"
const GOLD = "#8A6A32"
const MUTED = "#8497A6"
const GRID = "rgba(188, 182, 173, 0.55)"
const TICK = "#5B6470"
const SPLIT_COLORS: Record<SpendSplit["label"], string> = {
  "Level 1-4": GREEN,
  "Level 5-8": GOLD,
  Unrated: MUTED,
}

async function readRows<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<{ rows: T[]; error: string | null }> {
  const { data, error } = await query

  if (error) {
    console.error(`BBBEE scorecard ${label} load failed:`, error)
    return { rows: [], error: `${label}: ${error.message ?? "query failed"}` }
  }

  return { rows: (data ?? []) as T[], error: null }
}

function hasValue(value: string | number | null | undefined): boolean {
  return String(value ?? "").trim().length > 0
}

function supplierName(supplier: SupplierProfile): string {
  return (
    supplier.business_name?.trim() ||
    supplier.full_name?.trim() ||
    supplier.email?.trim() ||
    "Unnamed supplier"
  )
}

function parseBbbeeLevel(value: string | null): number | null {
  const match = String(value ?? "").match(/[1-8]/)
  return match ? Number(match[0]) : null
}

function isExempt(value: string | null): boolean {
  const lower = String(value ?? "").toLowerCase()
  return lower.includes("exempt") || lower.includes("eme")
}

function levelBucket(value: string | null): string {
  const level = parseBbbeeLevel(value)
  if (level) return `Level ${level}`
  return isExempt(value) ? "Exempt" : "Unrated"
}

function splitBucket(value: string | null): SpendSplit["label"] {
  const level = parseBbbeeLevel(value)
  if (level && level >= 1 && level <= 4) return "Level 1-4"
  if (level && level >= 5 && level <= 8) return "Level 5-8"
  return "Unrated"
}

function isLevelOneToFour(value: string | null): boolean {
  const level = parseBbbeeLevel(value)
  return Boolean(level && level >= 1 && level <= 4)
}

function monthIndex(value: string | null): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== new Date().getFullYear()) return null
  return date.getMonth()
}

function loadScorecardData(): Promise<ScorecardData> {
  if (!supabase) {
    return Promise.resolve({
      ...EMPTY_DATA,
      errors: ["Supabase environment variables are not configured."],
    })
  }

  return Promise.all([
    readRows<SupplierProfile>(
      "profiles",
      supabase
        .from("profiles")
        .select("id, business_name, full_name, email, bbbee_level, bbbee_document_url, province, industry, verification_status")
        .eq("role", "supplier"),
    ),
    readRows<PurchaseOrderRow>(
      "purchase_orders",
      supabase
        .from("purchase_orders")
        .select("id, supplier_id, supplier_name, amount, generated_at, status")
        .order("generated_at", { ascending: true }),
    ),
    readRows<ContractRow>(
      "contracts",
      supabase
        .from("contracts")
        .select("id, supplier_id, supplier_name, contract_value, created_at, status")
        .order("created_at", { ascending: true }),
    ),
  ]).then(([suppliers, purchaseOrders, contracts]) => ({
    suppliers: suppliers.rows,
    purchaseOrders: purchaseOrders.rows,
    contracts: contracts.rows,
    errors: [suppliers.error, purchaseOrders.error, contracts.error].filter(Boolean) as string[],
  }))
}

function ChartTip({
  active,
  payload,
  label,
  percent,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
  percent?: boolean
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-panel bg-card px-3 py-2 shadow-panel">
      {label && <p className="mb-1 text-xs font-semibold text-heading">{label}</p>}
      {payload.map((item) => (
        <p key={item.name ?? "value"} className="text-xs" style={{ color: item.color ?? GREEN }}>
          {item.name ?? "Value"}:{" "}
          <span className="font-semibold">
            {percent ? `${Number(item.value ?? 0)}%` : formatRand(item.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-secondary">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold text-heading">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </article>
  )
}

function EmptyState({ message = "No BBBEE scorecard data available yet." }: { message?: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-panel bg-surface px-6 py-10 text-center">
      <p className="text-sm font-semibold text-muted">{message}</p>
    </div>
  )
}

export default function BbbeeScorecardPage() {
  const [data, setData] = useState<ScorecardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("All")
  const [provinceFilter, setProvinceFilter] = useState("All")

  useEffect(() => {
    let cancelled = false

    loadScorecardData()
      .then((nextData) => {
        if (!cancelled) setData(nextData)
      })
      .catch((error) => {
        console.error("BBBEE scorecard load failed:", error)
        if (!cancelled) {
          setData({
            ...EMPTY_DATA,
            errors: ["BBBEE scorecard data could not be loaded."],
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const viewModel = useMemo(() => {
    const supplierById = new Map(data.suppliers.map((supplier) => [supplier.id, supplier]))
    const totalSpend = data.purchaseOrders.reduce((sum, po) => sum + parseMoney(po.amount), 0)
    const spendSplitMap = new Map<SpendSplit["label"], number>([
      ["Level 1-4", 0],
      ["Level 5-8", 0],
      ["Unrated", 0],
    ])
    const levelSpendMap = new Map<string, number>(LEVELS.map((level) => [level, 0]))
    const trendBuckets = MONTHS.map(() => ({ total: 0, compliant: 0 }))

    data.purchaseOrders.forEach((po) => {
      const supplier = po.supplier_id ? supplierById.get(po.supplier_id) : undefined
      const level = supplier?.bbbee_level ?? null
      const amount = parseMoney(po.amount)
      const split = splitBucket(level)
      const bucket = levelBucket(level)
      const month = monthIndex(po.generated_at)

      spendSplitMap.set(split, (spendSplitMap.get(split) ?? 0) + amount)
      levelSpendMap.set(bucket, (levelSpendMap.get(bucket) ?? 0) + amount)

      if (month != null) {
        trendBuckets[month].total += amount
        if (isLevelOneToFour(level)) trendBuckets[month].compliant += amount
      }
    })

    const levelOneToFourSpend = spendSplitMap.get("Level 1-4") ?? 0
    const provinces = Array.from(new Set(data.suppliers.map((supplier) => supplier.province?.trim()).filter(Boolean) as string[])).sort()
    const levels = Array.from(new Set(data.suppliers.map((supplier) => levelBucket(supplier.bbbee_level)))).sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b))

    return {
      totalSpend,
      compliantSpend: levelOneToFourSpend,
      compliantPercent: totalSpend > 0 ? Math.round((levelOneToFourSpend / totalSpend) * 100) : 0,
      levelOneToFourSuppliers: data.suppliers.filter((supplier) => isLevelOneToFour(supplier.bbbee_level)).length,
      exemptSuppliers: data.suppliers.filter((supplier) => isExempt(supplier.bbbee_level)).length,
      spendSplit: Array.from(spendSplitMap.entries()).map(([label, value]) => ({ label, value })),
      levelSpend: Array.from(levelSpendMap.entries()).map(([level, spend]) => ({ level, spend })),
      trend: trendBuckets.map<TrendRow>((row, index) => ({
        month: MONTHS[index],
        compliantPercent: row.total > 0 ? Math.round((row.compliant / row.total) * 100) : 0,
      })),
      provinces,
      levels,
      supportingContracts: data.contracts.length,
    }
  }, [data])

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return data.suppliers
      .filter((supplier) => {
        const name = supplierName(supplier).toLowerCase()
        const level = levelBucket(supplier.bbbee_level)
        const province = supplier.province?.trim() || "Unassigned"

        return (
          (!q || name.includes(q)) &&
          (levelFilter === "All" || level === levelFilter) &&
          (provinceFilter === "All" || province === provinceFilter)
        )
      })
      .sort((a, b) => supplierName(a).localeCompare(supplierName(b)))
  }, [data.suppliers, levelFilter, provinceFilter, search])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement Intelligence
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">BBBEE Scorecard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Track BBBEE supplier coverage, compliant spend, and procurement transformation performance.
        </p>
      </div>

      {data.errors.length > 0 && (
        <div className="mb-6 rounded-md border border-warning/35 bg-warning-soft px-5 py-4">
          <p className="text-sm font-semibold text-warning">Some BBBEE records could not be loaded</p>
          <p className="mt-1 text-xs leading-5 text-secondary">{data.errors.join(" ")}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
          ))}
        </div>
      ) : data.suppliers.length === 0 && data.purchaseOrders.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="BBBEE-compliant spend"
              value={formatRand(viewModel.compliantSpend)}
              detail="PO spend with Level 1-4 suppliers"
            />
            <SummaryCard
              label="Compliant spend share"
              value={`${viewModel.compliantPercent}%`}
              detail={`${formatRand(viewModel.totalSpend)} total PO spend loaded`}
            />
            <SummaryCard
              label="Level 1-4 suppliers"
              value={viewModel.levelOneToFourSuppliers.toLocaleString("en-ZA")}
              detail="Suppliers in the network"
            />
            <SummaryCard
              label="Exempt suppliers"
              value={viewModel.exemptSuppliers.toLocaleString("en-ZA")}
              detail="Exempt micro-enterprise suppliers"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  BBBEE spend split
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">Level 1-4 vs Level 5-8 vs Unrated</h2>
              </div>
              {viewModel.spendSplit.every((row) => row.value === 0) ? (
                <EmptyState message="No purchase order spend available for BBBEE split yet." />
              ) : (
                <div className="grid gap-5 md:grid-cols-[1fr_0.8fr]">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={viewModel.spendSplit}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={3}
                        >
                          {viewModel.spendSplit.map((row) => (
                            <Cell key={row.label} fill={SPLIT_COLORS[row.label]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    {viewModel.spendSplit.map((row) => (
                      <div key={row.label} className="rounded-md border border-panel bg-surface px-4 py-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 font-semibold text-secondary">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SPLIT_COLORS[row.label] }} />
                            {row.label}
                          </span>
                          <span className="font-bold tabular-nums text-heading">{formatRand(row.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  BBBEE level value
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">Spend by BBBEE level</h2>
              </div>
              {viewModel.levelSpend.every((row) => row.spend === 0) ? (
                <EmptyState message="No spend by BBBEE level available yet." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={viewModel.levelSpend} margin={{ top: 8, right: 14, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="level" tick={{ fill: TICK, fontSize: 10 }} interval={0} />
                    <YAxis tick={{ fill: TICK, fontSize: 11 }} tickFormatter={(value) => formatRand(Number(value))} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="spend" name="Spend" fill={GREEN} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="mb-4 border-b border-panel pb-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Compliance trend
              </p>
              <h2 className="mt-1 text-lg font-semibold text-heading">Monthly BBBEE-compliant spend percentage</h2>
            </div>
            {viewModel.trend.every((row) => row.compliantPercent === 0) ? (
              <EmptyState message="No current-year BBBEE spend trend available yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={viewModel.trend} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: TICK, fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: TICK, fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<ChartTip percent />} />
                  <Line
                    type="monotone"
                    dataKey="compliantPercent"
                    name="Compliant spend"
                    stroke={GOLD}
                    strokeWidth={3}
                    dot={{ r: 3, fill: GREEN, stroke: GREEN }}
                    activeDot={{ r: 5, fill: GOLD, stroke: GOLD }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="mt-6 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
            <div className="border-b border-panel px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                    Supplier network
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-heading">BBBEE supplier directory</h2>
                  <p className="mt-1 text-xs text-muted">
                    {viewModel.supportingContracts.toLocaleString("en-ZA")} contracts loaded as supporting records
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-3 lg:max-w-3xl">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by supplier name"
                    className="rounded-md border border-panel bg-panel px-3 py-2 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                  <select
                    value={levelFilter}
                    onChange={(event) => setLevelFilter(event.target.value)}
                    className="rounded-md border border-panel bg-panel px-3 py-2 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                  >
                    <option value="All">All levels</option>
                    {viewModel.levels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <select
                    value={provinceFilter}
                    onChange={(event) => setProvinceFilter(event.target.value)}
                    className="rounded-md border border-panel bg-panel px-3 py-2 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                  >
                    <option value="All">All provinces</option>
                    {viewModel.provinces.map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {filteredSuppliers.length === 0 ? (
              <div className="p-5">
                <EmptyState message="No suppliers match the current BBBEE filters." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-panel bg-panel text-left text-[0.68rem] uppercase tracking-[0.18em] text-secondary">
                    <tr>
                      <th className="px-5 py-3">Supplier name</th>
                      <th className="px-5 py-3">BBBEE level</th>
                      <th className="px-5 py-3">Province</th>
                      <th className="px-5 py-3">Industry</th>
                      <th className="px-5 py-3">Verification</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-panel">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="transition hover:bg-surface">
                        <td className="px-5 py-4 font-semibold text-heading">{supplierName(supplier)}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-md border border-panel bg-surface px-2.5 py-1 text-xs font-semibold text-secondary">
                            {levelBucket(supplier.bbbee_level)}
                          </span>
                          {hasValue(supplier.bbbee_document_url) && (
                            <p className="mt-1 text-xs font-semibold text-success">Certificate uploaded</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-secondary">{supplier.province || "Unassigned"}</td>
                        <td className="px-5 py-4 text-secondary">{supplier.industry || "-"}</td>
                        <td className="px-5 py-4 text-secondary">{supplier.verification_status || "Incomplete"}</td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/suppliers/${supplier.id}`}
                            className="text-xs font-semibold text-accent transition hover:text-accent-strong"
                          >
                            View profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

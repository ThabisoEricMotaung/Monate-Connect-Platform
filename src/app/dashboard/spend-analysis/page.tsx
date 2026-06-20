"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatRand, parseMoney } from "@/lib/format"
import { supabase } from "@/lib/supabase"

type PurchaseOrderRow = {
  id: number
  rfq_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | number | null
  status: string | null
  generated_at: string | null
  title: string | null
}

type ContractRow = {
  id: number
  rfq_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  contract_value: string | number | null
  status: string | null
  created_at: string | null
}

type InvoiceRow = {
  id: number
  purchase_order_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | number | null
  total_amount: string | number | null
  status: string | null
  created_at: string | null
}

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
}

type SpendData = {
  purchaseOrders: PurchaseOrderRow[]
  contracts: ContractRow[]
  invoices: InvoiceRow[]
  suppliers: SupplierProfile[]
  errors: string[]
}

type CategorySpend = {
  category: string
  spend: number
  percent: number
}

type MonthlySpend = {
  month: string
  spend: number
}

type SupplierSpend = {
  supplier: string
  spend: number
  purchaseOrders: number
  lastActivity: string | null
}

type ProvinceSpend = {
  province: string
  spend: number
  percent: number
}

const EMPTY_DATA: SpendData = {
  purchaseOrders: [],
  contracts: [],
  invoices: [],
  suppliers: [],
  errors: [],
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const GREEN = "#2d4a35"
const GOLD = "#B07D2A"
const GRID = "rgba(188, 182, 173, 0.55)"
const TICK = "#5B6470"

async function readRows<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<{ rows: T[]; error: string | null }> {
  const { data, error } = await query

  if (error) {
    console.error(`Spend analysis ${label} load failed:`, error)
    return { rows: [], error: `${label}: ${error.message ?? "query failed"}` }
  }

  return { rows: (data ?? []) as T[], error: null }
}

function label(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback
}

function dateValue(value: string | null): number {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

function formatMillions(value: number): string {
  return `R ${(value / 1_000_000).toFixed(1)}m`
}

function currentYearDate(value: string | null): boolean {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getFullYear() === new Date().getFullYear()
}

function getSupplierKey(po: PurchaseOrderRow): string {
  return po.supplier_id || po.supplier_name || "Unassigned supplier"
}

function getSupplierName(po: PurchaseOrderRow, supplierById: Map<string, SupplierProfile>): string {
  if (po.supplier_id) {
    const supplier = supplierById.get(po.supplier_id)
    if (supplier?.business_name) return supplier.business_name
  }

  return label(po.supplier_name, "Unassigned supplier")
}

function loadSpendData(): Promise<SpendData> {
  if (!supabase) {
    return Promise.resolve({
      ...EMPTY_DATA,
      errors: ["Supabase environment variables are not configured."],
    })
  }

  return Promise.all([
    readRows<PurchaseOrderRow>(
      "purchase_orders",
      supabase
        .from("purchase_orders")
        .select("id, rfq_id, supplier_id, supplier_name, amount, status, generated_at, title")
        .order("generated_at", { ascending: true }),
    ),
    readRows<ContractRow>(
      "contracts",
      supabase
        .from("contracts")
        .select("id, rfq_id, supplier_id, supplier_name, contract_value, status, created_at")
        .order("created_at", { ascending: true }),
    ),
    readRows<InvoiceRow>(
      "invoices",
      supabase
        .from("invoices")
        .select("id, purchase_order_id, supplier_id, supplier_name, amount, total_amount, status, created_at")
        .order("created_at", { ascending: true }),
    ),
    readRows<SupplierProfile>(
      "profiles",
      supabase
        .from("profiles")
        .select("id, business_name, province, industry")
        .eq("role", "supplier"),
    ),
  ]).then(([purchaseOrders, contracts, invoices, suppliers]) => ({
    purchaseOrders: purchaseOrders.rows,
    contracts: contracts.rows,
    invoices: invoices.rows,
    suppliers: suppliers.rows,
    errors: [purchaseOrders.error, contracts.error, invoices.error, suppliers.error].filter(Boolean) as string[],
  }))
}

function buildCategorySpend(
  purchaseOrders: PurchaseOrderRow[],
  supplierById: Map<string, SupplierProfile>,
  totalSpend: number,
): CategorySpend[] {
  const rows = new Map<string, number>()

  purchaseOrders.forEach((po) => {
    const supplierIndustry = po.supplier_id ? supplierById.get(po.supplier_id)?.industry : null
    const category = label(supplierIndustry, "Uncategorised")
    rows.set(category, (rows.get(category) ?? 0) + parseMoney(po.amount))
  })

  return Array.from(rows.entries())
    .map(([category, spend]) => ({
      category,
      spend,
      percent: totalSpend > 0 ? Math.round((spend / totalSpend) * 100) : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
}

function buildMonthlySpend(purchaseOrders: PurchaseOrderRow[]): MonthlySpend[] {
  const year = new Date().getFullYear()
  const rows = MONTHS.map((month) => ({ month, spend: 0 }))

  purchaseOrders.forEach((po) => {
    if (!po.generated_at) return
    const date = new Date(po.generated_at)
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return
    rows[date.getMonth()].spend += parseMoney(po.amount)
  })

  return rows
}

function buildSupplierSpend(
  purchaseOrders: PurchaseOrderRow[],
  supplierById: Map<string, SupplierProfile>,
): SupplierSpend[] {
  const rows = new Map<string, SupplierSpend>()

  purchaseOrders.forEach((po) => {
    const key = getSupplierKey(po)
    const row = rows.get(key) ?? {
      supplier: getSupplierName(po, supplierById),
      spend: 0,
      purchaseOrders: 0,
      lastActivity: null,
    }

    row.spend += parseMoney(po.amount)
    row.purchaseOrders += 1
    if (dateValue(po.generated_at) > dateValue(row.lastActivity)) row.lastActivity = po.generated_at
    rows.set(key, row)
  })

  return Array.from(rows.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
}

function buildProvinceSpend(
  purchaseOrders: PurchaseOrderRow[],
  supplierById: Map<string, SupplierProfile>,
  totalSpend: number,
): ProvinceSpend[] {
  const rows = new Map<string, number>()

  purchaseOrders.forEach((po) => {
    const supplierProvince = po.supplier_id ? supplierById.get(po.supplier_id)?.province : null
    const province = label(supplierProvince, "Unassigned")
    rows.set(province, (rows.get(province) ?? 0) + parseMoney(po.amount))
  })

  return Array.from(rows.entries())
    .map(([province, spend]) => ({
      province,
      spend,
      percent: totalSpend > 0 ? Math.round((spend / totalSpend) * 100) : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 9)
}

function ChartTip({
  active,
  payload,
  label: tipLabel,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-panel bg-card px-3 py-2 shadow-panel">
      {tipLabel && <p className="mb-1 text-xs font-semibold text-heading">{tipLabel}</p>}
      {payload.map((item) => (
        <p key={item.name ?? "value"} className="text-xs" style={{ color: item.color ?? GREEN }}>
          {item.name ?? "Spend"}: <span className="font-semibold">{formatRand(item.value ?? 0)}</span>
        </p>
      ))}
    </div>
  )
}

function SummaryCard({ label: title, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-secondary">{title}</p>
      <p className="mt-3 break-words text-2xl font-bold text-heading">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-panel bg-surface px-6 py-10 text-center">
      <p className="text-sm font-semibold text-muted">
        No spend data available yet — data will appear once purchase orders are recorded.
      </p>
    </div>
  )
}

export default function SpendAnalysisPage() {
  const [data, setData] = useState<SpendData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    loadSpendData()
      .then((nextData) => {
        if (!cancelled) setData(nextData)
      })
      .catch((error) => {
        console.error("Spend analysis load failed:", error)
        if (!cancelled) {
          setData({
            ...EMPTY_DATA,
            errors: ["Spend analysis data could not be loaded."],
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
    const ytdPurchaseOrders = data.purchaseOrders.filter((po) => currentYearDate(po.generated_at))
    const totalYtdSpend = ytdPurchaseOrders.reduce((sum, po) => sum + parseMoney(po.amount), 0)
    const suppliersPaid = new Set(ytdPurchaseOrders.map(getSupplierKey).filter(Boolean)).size
    const averagePoValue = ytdPurchaseOrders.length > 0 ? totalYtdSpend / ytdPurchaseOrders.length : 0
    const largestPo = ytdPurchaseOrders.reduce<PurchaseOrderRow | null>(
      (largest, po) => (parseMoney(po.amount) > parseMoney(largest?.amount) ? po : largest),
      null,
    )

    return {
      totalYtdSpend,
      suppliersPaid,
      averagePoValue,
      largestPo,
      categorySpend: buildCategorySpend(ytdPurchaseOrders, supplierById, totalYtdSpend),
      monthlySpend: buildMonthlySpend(data.purchaseOrders),
      supplierSpend: buildSupplierSpend(ytdPurchaseOrders, supplierById),
      provinceSpend: buildProvinceSpend(ytdPurchaseOrders, supplierById, totalYtdSpend),
      supportingRecords: data.contracts.length + data.invoices.length,
    }
  }, [data])

  const hasSpendData = viewModel.totalYtdSpend > 0 || data.purchaseOrders.length > 0
  const largestSupplier = viewModel.largestPo
    ? label(viewModel.largestPo.supplier_name, "Unassigned supplier")
    : "No purchase orders"

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement Intelligence
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Spend Analysis</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Track purchase order spend by category, month, supplier, and province using existing procurement records.
        </p>
      </div>

      {data.errors.length > 0 && (
        <div className="mb-6 rounded-md border border-warning/35 bg-warning-soft px-5 py-4">
          <p className="text-sm font-semibold text-warning">Some spend records could not be loaded</p>
          <p className="mt-1 text-xs leading-5 text-secondary">{data.errors.join(" ")}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
          ))}
        </div>
      ) : !hasSpendData ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total YTD spend"
              value={formatRand(viewModel.totalYtdSpend)}
              detail={`${data.purchaseOrders.length.toLocaleString("en-ZA")} purchase orders loaded`}
            />
            <SummaryCard
              label="Suppliers paid"
              value={viewModel.suppliersPaid.toLocaleString("en-ZA")}
              detail="Unique suppliers with YTD purchase orders"
            />
            <SummaryCard
              label="Average PO value"
              value={formatRand(viewModel.averagePoValue)}
              detail="Mean value across current-year purchase orders"
            />
            <SummaryCard
              label="Largest procurement"
              value={formatRand(viewModel.largestPo?.amount ?? 0)}
              detail={largestSupplier}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Category mix
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">Spend by category</h2>
              </div>
              {viewModel.categorySpend.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={viewModel.categorySpend}
                      layout="vertical"
                      margin={{ top: 8, right: 20, bottom: 8, left: 28 }}
                    >
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: TICK, fontSize: 11 }}
                        tickFormatter={(value) => formatRand(Number(value))}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={120}
                        tick={{ fill: TICK, fontSize: 11 }}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="spend" name="Spend" fill={GREEN} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {viewModel.categorySpend.map((row, index) => (
                      <div key={row.category} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-secondary">
                          {index + 1}. {row.category}
                        </span>
                        <span className="font-bold text-heading">
                          {formatRand(row.spend)} - {row.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Current year
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">Spend over time</h2>
              </div>
              {viewModel.monthlySpend.every((row) => row.spend === 0) ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={viewModel.monthlySpend} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fill: TICK, fontSize: 11 }} />
                    <YAxis tick={{ fill: TICK, fontSize: 11 }} tickFormatter={(value) => formatMillions(Number(value))} />
                    <Tooltip content={<ChartTip />} />
                    <Line
                      type="monotone"
                      dataKey="spend"
                      name="Spend"
                      stroke={GOLD}
                      strokeWidth={3}
                      dot={{ r: 3, fill: GREEN, stroke: GREEN }}
                      activeDot={{ r: 5, fill: GOLD, stroke: GOLD }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
            <div className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
              <div className="border-b border-panel px-5 py-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Supplier ranking
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">Top suppliers by spend</h2>
              </div>
              {viewModel.supplierSpend.length === 0 ? (
                <div className="p-5">
                  <EmptyState />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-panel bg-panel text-left text-[0.68rem] uppercase tracking-[0.18em] text-secondary">
                      <tr>
                        <th className="px-5 py-3">Supplier name</th>
                        <th className="px-5 py-3 text-right">Total spend</th>
                        <th className="px-5 py-3 text-right">POs</th>
                        <th className="px-5 py-3">Last activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel">
                      {viewModel.supplierSpend.map((row) => (
                        <tr key={row.supplier} className="transition hover:bg-surface">
                          <td className="px-5 py-4 font-semibold text-heading">{row.supplier}</td>
                          <td className="px-5 py-4 text-right font-bold tabular-nums text-heading">
                            {formatRand(row.spend)}
                          </td>
                          <td className="px-5 py-4 text-right tabular-nums text-secondary">
                            {row.purchaseOrders}
                          </td>
                          <td className="px-5 py-4 text-secondary">{formatDate(row.lastActivity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Geography
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">Spend by province</h2>
              </div>
              {viewModel.provinceSpend.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-4">
                  {viewModel.provinceSpend.map((row, index) => (
                    <div key={row.province}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-secondary">{row.province}</span>
                        <span className="font-bold text-heading">
                          {formatRand(row.spend)} - {row.percent}%
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-panel">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(row.percent, row.spend > 0 ? 4 : 0)}%`,
                            background: index % 2 === 0 ? GREEN : GOLD,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <p className="mt-5 text-xs leading-5 text-muted">
            Supporting records loaded: {viewModel.supportingRecords.toLocaleString("en-ZA")} contracts and invoices.
          </p>
        </>
      )}
    </div>
  )
}

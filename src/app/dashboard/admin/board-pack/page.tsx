"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type BoardPackFilters = {
  dateFrom: string
  dateTo: string
  province: string
  category: string
  supplier: string
  status: string
}

type BoardPackData = {
  rfqs: Record<string, unknown>[]
  quotes: Record<string, unknown>[]
  suppliers: Record<string, unknown>[]
  purchaseOrders: Record<string, unknown>[]
  contracts: Record<string, unknown>[]
  invoices: Record<string, unknown>[]
  payments: Record<string, unknown>[]
  auditLogs: Record<string, unknown>[]
  supplierScoreHistory: Record<string, unknown>[]
  procurementOverrides: Record<string, unknown>[]
  decisionBoardItems: Record<string, unknown>[]
  missingTables: string[]
  errors: string[]
}

type FetchResult = {
  rows: Record<string, unknown>[]
  missing: boolean
  error: string | null
}

type Kpi = {
  label: string
  value: string
  caption: string
}

const EMPTY_FILTERS: BoardPackFilters = {
  dateFrom: "",
  dateTo: "",
  province: "",
  category: "",
  supplier: "",
  status: "",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const tableCellClass = "px-4 py-3 text-left text-xs text-secondary"
const tableHeadClass =
  "px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted"

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("does not exist") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
}

function text(value: unknown): string {
  return String(value ?? "").trim()
}

function rowValue(row: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = text(row[field])
    if (value) return value
  }
  return ""
}

function parseMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (!value) return 0

  let normalized = String(value).replace(/[Rr]/g, "").replace(/\s/g, "").trim()
  const hasComma = normalized.includes(",")
  const hasDot = normalized.includes(".")

  if (hasComma && hasDot) {
    normalized = normalized.replace(/,/g, "")
  } else if (hasComma) {
    const parts = normalized.split(",")
    const last = parts[parts.length - 1]
    normalized =
      parts.length === 2 && last.length > 0 && last.length <= 2
        ? `${parts[0]}.${last}`
        : normalized.replace(/,/g, "")
  }

  const parsed = Number(normalized.replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatZAR(value: number): string {
  if (value >= 1_000_000_000) return `R${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}K`
  return `R${Math.round(value).toLocaleString("en-ZA")}`
}

function formatDate(value: unknown): string {
  const raw = text(value)
  if (!raw) return "-"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(value: unknown): string {
  const raw = text(value)
  if (!raw) return "-"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getDate(row: Record<string, unknown>): Date | null {
  const value = rowValue(row, ["created_at", "issue_date", "start_date", "end_date", "due_date", "payment_date"])
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function inDateRange(row: Record<string, unknown>, filters: BoardPackFilters): boolean {
  if (!filters.dateFrom && !filters.dateTo) return true
  const date = getDate(row)
  if (!date) return false

  if (filters.dateFrom && date < new Date(filters.dateFrom)) return false
  if (filters.dateTo) {
    const end = new Date(filters.dateTo)
    end.setHours(23, 59, 59, 999)
    if (date > end) return false
  }

  return true
}

function matchesFilter(row: Record<string, unknown>, filters: BoardPackFilters): boolean {
  if (!inDateRange(row, filters)) return false

  if (filters.province) {
    const province = rowValue(row, ["province", "supplier_province"])
    if (province !== filters.province) return false
  }

  if (filters.category) {
    const category = rowValue(row, ["category", "industry", "sector"])
    if (category !== filters.category) return false
  }

  if (filters.status) {
    const status = rowValue(row, ["status", "verification_status", "decision_status", "action"])
    if (status !== filters.status) return false
  }

  if (filters.supplier) {
    const supplier = rowValue(row, ["supplier_name", "business_name", "supplier_id", "id", "user_email"])
    if (supplier !== filters.supplier) return false
  }

  return true
}

function filterRows(rows: Record<string, unknown>[], filters: BoardPackFilters): Record<string, unknown>[] {
  return rows.filter((row) => matchesFilter(row, filters))
}

function uniqueOptions(rows: Record<string, unknown>[], fields: string[]): string[] {
  const options = new Set<string>()
  rows.forEach((row) => {
    fields.forEach((field) => {
      const value = text(row[field])
      if (value) options.add(value)
    })
  })
  return Array.from(options).sort((a, b) => a.localeCompare(b))
}

function latestScoreForSupplier(
  supplierId: string,
  scoreHistory: Record<string, unknown>[]
): number | null {
  const rows = scoreHistory
    .filter((row) => text(row.supplier_id) === supplierId || text(row.profile_id) === supplierId)
    .sort((a, b) => {
      const left = new Date(text(a.created_at)).getTime()
      const right = new Date(text(b.created_at)).getTime()
      return right - left
    })

  const score = parseMoney(rows[0]?.score ?? rows[0]?.smart_score)
  if (score <= 0) return null
  return score > 100 ? Math.round(score / 10) : score
}

function supplierRiskLevel(
  supplier: Record<string, unknown>,
  scoreHistory: Record<string, unknown>[]
): "Low" | "Medium" | "High" | "Critical" {
  const score = latestScoreForSupplier(text(supplier.id), scoreHistory)
  const verification = text(supplier.verification_status).toLowerCase()

  if (score !== null) {
    if (score < 40) return "Critical"
    if (score < 60) return "High"
    if (score < 75) return "Medium"
    return "Low"
  }

  if (verification.includes("rejected") || verification.includes("suspended")) return "Critical"
  if (!verification || verification.includes("pending")) return "High"
  if (verification.includes("verified") || verification.includes("approved")) return "Low"
  return "Medium"
}

function statusCount(rows: Record<string, unknown>[], statusField = "status"): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const status = text(row[statusField]) || "Unspecified"
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})
}

function topRows(rows: Record<string, unknown>[], limit = 5): Record<string, unknown>[] {
  return rows.slice(0, limit)
}

async function safeFetch(
  table: string,
  columns = "*"
): Promise<FetchResult> {
  if (!supabase) return { rows: [], missing: false, error: "Supabase is not configured." }

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .limit(500)

  if (!error) {
    const rows = ((data ?? []) as unknown as Record<string, unknown>[]).sort((a, b) => {
      const left = getDate(a)?.getTime() ?? 0
      const right = getDate(b)?.getTime() ?? 0
      return right - left
    })
    return { rows, missing: false, error: null }
  }

  if (isMissingTableError(error)) {
    return { rows: [], missing: true, error: `${table}: ${error.message ?? "table unavailable"}` }
  }

  return { rows: [], missing: false, error: `${table}: ${error.message ?? "query failed"}` }
}

async function fetchBoardPackData(): Promise<BoardPackData> {
  const [
    rfqs,
    quotes,
    suppliers,
    purchaseOrders,
    contracts,
    invoices,
    payments,
    auditLogs,
    supplierScoreHistory,
    procurementOverrides,
    decisionBoardItems,
  ] = await Promise.all([
    safeFetch("rfqs"),
    safeFetch("quotes"),
    safeFetch("profiles"),
    safeFetch("purchase_orders"),
    safeFetch("contracts"),
    safeFetch("invoices"),
    safeFetch("payments"),
    safeFetch("audit_logs"),
    safeFetch("supplier_score_history"),
    safeFetch("procurement_overrides"),
    safeFetch("decision_board_items"),
  ])

  const results = [
    ["rfqs", rfqs],
    ["quotes", quotes],
    ["profiles", suppliers],
    ["purchase_orders", purchaseOrders],
    ["contracts", contracts],
    ["invoices", invoices],
    ["payments", payments],
    ["audit_logs", auditLogs],
    ["supplier_score_history", supplierScoreHistory],
    ["procurement_overrides", procurementOverrides],
    ["decision_board_items", decisionBoardItems],
  ] as const

  return {
    rfqs: rfqs.rows,
    quotes: quotes.rows,
    suppliers: suppliers.rows,
    purchaseOrders: purchaseOrders.rows,
    contracts: contracts.rows,
    invoices: invoices.rows,
    payments: payments.rows,
    auditLogs: auditLogs.rows,
    supplierScoreHistory: supplierScoreHistory.rows,
    procurementOverrides: procurementOverrides.rows,
    decisionBoardItems: decisionBoardItems.rows,
    missingTables: results.filter(([, result]) => result.missing).map(([table]) => table),
    errors: results
      .filter(([, result]) => result.error && !result.missing)
      .map(([, result]) => result.error as string),
  }
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: ReactNode
}) {
  return (
    <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <div className="border-b border-panel pb-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-heading">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function StatusList({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts)
  if (entries.length === 0) return <p className="text-sm text-muted">No records available.</p>

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {entries.map(([label, count]) => (
        <div key={label} className="rounded-md border border-panel bg-panel p-4">
          <p className="text-2xl font-bold text-heading">{count}</p>
          <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
        </div>
      ))}
    </div>
  )
}

function SimpleTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; format?: (value: unknown, row: Record<string, unknown>) => string }[]
  rows: Record<string, unknown>[]
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-panel bg-panel p-8 text-center">
        <p className="text-sm font-semibold text-heading">No records available for this section.</p>
        <p className="mt-1 text-xs text-muted">Adjust filters or generate the board pack after data is available.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-panel">
      <table className="min-w-full divide-y divide-panel">
        <thead className="bg-panel">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={tableHeadClass}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-panel bg-card">
          {rows.map((row, index) => (
            <tr key={`${text(row.id) || index}-${index}`}>
              {columns.map((column) => (
                <td key={column.key} className={tableCellClass}>
                  {column.format ? column.format(row[column.key], row) : text(row[column.key]) || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function BoardPackPage() {
  const router = useRouter()
  const [data, setData] = useState<BoardPackData | null>(null)
  const [filters, setFilters] = useState<BoardPackFilters>(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) {
        router.replace("/dashboard")
        return
      }

      try {
        const loaded = await fetchBoardPackData()
        setData(loaded)
        if (loaded.errors.length > 0) setError(loaded.errors.join(" | "))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Board pack data failed to load.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const filtered = useMemo(() => {
    const empty: BoardPackData = {
      rfqs: [],
      quotes: [],
      suppliers: [],
      purchaseOrders: [],
      contracts: [],
      invoices: [],
      payments: [],
      auditLogs: [],
      supplierScoreHistory: [],
      procurementOverrides: [],
      decisionBoardItems: [],
      missingTables: [],
      errors: [],
    }

    if (!data) return empty

    return {
      ...data,
      rfqs: filterRows(data.rfqs, filters),
      quotes: filterRows(data.quotes, filters),
      suppliers: filterRows(data.suppliers, filters),
      purchaseOrders: filterRows(data.purchaseOrders, filters),
      contracts: filterRows(data.contracts, filters),
      invoices: filterRows(data.invoices, filters),
      payments: filterRows(data.payments, filters),
      auditLogs: filterRows(data.auditLogs, filters),
      supplierScoreHistory: filterRows(data.supplierScoreHistory, filters),
      procurementOverrides: filterRows(data.procurementOverrides, filters),
      decisionBoardItems: filterRows(data.decisionBoardItems, filters),
    }
  }, [data, filters])

  const allFilterRows = useMemo(() => {
    if (!data) return []
    return [
      ...data.rfqs,
      ...data.quotes,
      ...data.suppliers,
      ...data.purchaseOrders,
      ...data.contracts,
      ...data.invoices,
      ...data.payments,
      ...data.auditLogs,
      ...data.procurementOverrides,
      ...data.decisionBoardItems,
    ]
  }, [data])

  const kpis = useMemo<Kpi[]>(() => {
    const contractValue = filtered.contracts.reduce((sum, row) => sum + parseMoney(row.contract_value), 0)
    const poValue = filtered.purchaseOrders.reduce((sum, row) => sum + parseMoney(row.amount), 0)
    const totalPaid = filtered.payments
      .filter((row) => text(row.status).toLowerCase() === "paid")
      .reduce((sum, row) => sum + parseMoney(row.amount), 0)
    const outstandingInvoices = filtered.invoices
      .filter((row) => !["paid", "rejected"].includes(text(row.status).toLowerCase()))
      .reduce((sum, row) => sum + parseMoney(row.total_amount ?? row.total ?? row.amount), 0)
    const activeContracts = filtered.contracts.filter((row) =>
      ["active", "renewed", "in progress"].includes(text(row.status).toLowerCase())
    ).length
    const highRiskSuppliers = filtered.suppliers.filter((supplier) =>
      ["High", "Critical"].includes(supplierRiskLevel(supplier, filtered.supplierScoreHistory))
    ).length
    const pendingDecisions = filtered.decisionBoardItems.filter((row) =>
      ["", "pending", "more info requested"].includes(text(row.decision_status).toLowerCase())
    ).length
    const verifiedSuppliers = filtered.suppliers.filter((row) =>
      ["verified", "approved"].some((status) => text(row.verification_status).toLowerCase().includes(status))
    ).length

    return [
      { label: "Total Procurement Value", value: formatZAR(contractValue || poValue), caption: "Contracts preferred, PO value as fallback" },
      { label: "Total Paid", value: formatZAR(totalPaid), caption: "Settled payment records" },
      { label: "Outstanding Invoices", value: formatZAR(outstandingInvoices), caption: "Open invoice liability" },
      { label: "Active Contracts", value: activeContracts.toLocaleString("en-ZA"), caption: "Active or renewed agreements" },
      { label: "High Risk Suppliers", value: highRiskSuppliers.toLocaleString("en-ZA"), caption: "High or critical risk posture" },
      { label: "Pending Decisions", value: pendingDecisions.toLocaleString("en-ZA"), caption: "Decision board items awaiting action" },
      { label: "Verified Suppliers", value: verifiedSuppliers.toLocaleString("en-ZA"), caption: "Approved supplier profiles" },
    ]
  }, [filtered])

  const supplierRiskCounts = useMemo(() => {
    return filtered.suppliers.reduce<Record<string, number>>((acc, supplier) => {
      const level = supplierRiskLevel(supplier, filtered.supplierScoreHistory)
      acc[level] = (acc[level] ?? 0) + 1
      return acc
    }, {})
  }, [filtered.suppliers, filtered.supplierScoreHistory])

  const awardedSuppliers = useMemo(() => {
    const awards = filtered.quotes.filter((quote) => text(quote.status).toLowerCase() === "awarded")
    const valueBySupplier = new Map<string, { supplier_name: string; awards: number; value: number }>()

    awards.forEach((quote) => {
      const supplier = rowValue(quote, ["supplier_name", "supplier_id"]) || "Unknown supplier"
      const current = valueBySupplier.get(supplier) ?? { supplier_name: supplier, awards: 0, value: 0 }
      current.awards += 1
      current.value += parseMoney(quote.amount)
      valueBySupplier.set(supplier, current)
    })

    return Array.from(valueBySupplier.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [filtered.quotes])

  const recommendedActions = useMemo(() => {
    const actions: string[] = []
    const pendingDecisions = filtered.decisionBoardItems.filter((row) =>
      ["", "pending", "more info requested"].includes(text(row.decision_status).toLowerCase())
    ).length
    const openOverrides = filtered.procurementOverrides.filter((row) =>
      ["", "requested", "pending"].includes(text(row.status).toLowerCase())
    ).length
    const outstandingInvoices = filtered.invoices.filter((row) =>
      !["paid", "rejected"].includes(text(row.status).toLowerCase())
    ).length
    const highRiskSuppliers = filtered.suppliers.filter((supplier) =>
      ["High", "Critical"].includes(supplierRiskLevel(supplier, filtered.supplierScoreHistory))
    ).length

    if (pendingDecisions > 0) actions.push(`Resolve ${pendingDecisions} pending decision board item${pendingDecisions === 1 ? "" : "s"} before the next award cycle.`)
    if (openOverrides > 0) actions.push(`Review ${openOverrides} open override request${openOverrides === 1 ? "" : "s"} and document management rationale.`)
    if (outstandingInvoices > 0) actions.push(`Prioritise invoice review for ${outstandingInvoices} outstanding invoice${outstandingInvoices === 1 ? "" : "s"}.`)
    if (highRiskSuppliers > 0) actions.push(`Request remediation plans for ${highRiskSuppliers} high risk supplier${highRiskSuppliers === 1 ? "" : "s"}.`)
    if (filtered.contracts.length === 0) actions.push("Confirm contract records are being captured for awarded procurement activity.")
    if (actions.length === 0) actions.push("No urgent management actions detected from the selected reporting data.")
    return actions
  }, [filtered])

  const provinceOptions = useMemo(() => uniqueOptions(allFilterRows, ["province", "supplier_province"]), [allFilterRows])
  const categoryOptions = useMemo(() => uniqueOptions(allFilterRows, ["category", "industry", "sector"]), [allFilterRows])
  const supplierOptions = useMemo(() => uniqueOptions(allFilterRows, ["supplier_name", "business_name", "supplier_id", "user_email"]), [allFilterRows])
  const statusOptions = useMemo(() => uniqueOptions(allFilterRows, ["status", "verification_status", "decision_status", "action"]), [allFilterRows])

  function updateFilter(key: keyof BoardPackFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function generateBoardPack() {
    setGenerating(true)
    setGeneratedAt(new Date().toISOString())
    window.setTimeout(() => setGenerating(false), 250)
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Executive Reporting</p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">Board Pack / Executive Procurement Report</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
            Generate an executive-ready procurement pack for management meetings, board committees,
            and audit reviews using live procurement workflow data.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generateBoardPack}
            disabled={generating}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate Board Pack"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-warning/30 bg-warning/8 px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-warning">Some report data could not be loaded.</p>
          <p className="mt-1 text-xs text-secondary">{error}</p>
        </div>
      )}

      {data?.missingTables.length ? (
        <div className="mb-5 rounded-md border border-accent/25 bg-accent/5 px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-accent">Unavailable data sources</p>
          <p className="mt-1 text-xs text-secondary">
            Missing or unavailable tables: {data.missingTables.join(", ")}. The board pack will continue with available data.
          </p>
        </div>
      ) : null}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel print:hidden">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Date From</span>
            <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} className={filterClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Date To</span>
            <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} className={filterClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Province</span>
            <select value={filters.province} onChange={(event) => updateFilter("province", event.target.value)} className={filterClass}>
              <option value="">All provinces</option>
              {provinceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Category</span>
            <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className={filterClass}>
              <option value="">All categories</option>
              {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Supplier</span>
            <select value={filters.supplier} onChange={(event) => updateFilter("supplier", event.target.value)} className={filterClass}>
              <option value="">All suppliers</option>
              {supplierOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Status</span>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className={filterClass}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {generatedAt ? `Board pack generated ${formatDateTime(generatedAt)}.` : "Set filters, then generate the board pack for the meeting pack view."}
          </p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="rounded-md border border-panel bg-panel px-4 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent"
          >
            Reset Filters
          </button>
        </div>
      </section>

      <div className="print-document space-y-6">
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Executive Procurement Pack</p>
              <h2 className="mt-2 text-2xl font-semibold text-heading">Management Report</h2>
              <p className="mt-2 text-sm leading-7 text-secondary">
                Reporting period: {filters.dateFrom || "Start"} to {filters.dateTo || "Current"}.
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel px-4 py-3 text-right">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Generated</p>
              <p className="mt-1 text-sm font-semibold text-heading">{generatedAt ? formatDateTime(generatedAt) : "Not generated"}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-md border border-panel bg-card p-4 shadow-panel">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">{kpi.label}</p>
              <p className="mt-3 text-2xl font-bold text-heading">{kpi.value}</p>
              <p className="mt-1 text-[0.68rem] text-secondary">{kpi.caption}</p>
            </div>
          ))}
        </section>

        <Section title="Executive Summary" eyebrow="Section 1">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-sm font-semibold text-heading">Procurement pipeline</p>
              <p className="mt-2 text-xs leading-6 text-secondary">
                {filtered.rfqs.length} RFQs, {filtered.quotes.length} quotes, {filtered.purchaseOrders.length} purchase orders,
                and {filtered.contracts.length} contracts are represented in the selected reporting scope.
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-sm font-semibold text-heading">Financial position</p>
              <p className="mt-2 text-xs leading-6 text-secondary">
                Paid value is {kpis[1].value}, while open supplier invoice exposure is {kpis[2].value}.
              </p>
            </div>
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-sm font-semibold text-heading">Governance focus</p>
              <p className="mt-2 text-xs leading-6 text-secondary">
                {filtered.procurementOverrides.length} override records and {filtered.decisionBoardItems.length} decision board records
                are available for audit committee review.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Procurement Spend Overview" eyebrow="Section 2">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Contract Value", value: formatZAR(filtered.contracts.reduce((sum, row) => sum + parseMoney(row.contract_value), 0)) },
              { label: "PO Value", value: formatZAR(filtered.purchaseOrders.reduce((sum, row) => sum + parseMoney(row.amount), 0)) },
              { label: "Invoice Value", value: formatZAR(filtered.invoices.reduce((sum, row) => sum + parseMoney(row.total_amount ?? row.amount), 0)) },
              { label: "Payment Value", value: formatZAR(filtered.payments.reduce((sum, row) => sum + parseMoney(row.amount), 0)) },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-heading">{item.value}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="RFQ Activity" eyebrow="Section 3">
          <StatusList counts={statusCount(filtered.rfqs)} />
          <div className="mt-5">
            <SimpleTable
              rows={topRows(filtered.rfqs)}
              columns={[
                { key: "id", label: "RFQ ID" },
                { key: "title", label: "Title" },
                { key: "province", label: "Province" },
                { key: "category", label: "Category" },
                { key: "status", label: "Status" },
                { key: "created_at", label: "Created", format: formatDate },
              ]}
            />
          </div>
        </Section>

        <Section title="Awarded Suppliers" eyebrow="Section 4">
          <SimpleTable
            rows={awardedSuppliers}
            columns={[
              { key: "supplier_name", label: "Supplier" },
              { key: "awards", label: "Awards" },
              { key: "value", label: "Award Value", format: (value) => formatZAR(parseMoney(value)) },
            ]}
          />
        </Section>

        <Section title="Supplier Risk Summary" eyebrow="Section 5">
          <StatusList counts={supplierRiskCounts} />
          <div className="mt-5">
            <SimpleTable
              rows={topRows(filtered.suppliers)}
              columns={[
                { key: "business_name", label: "Supplier" },
                { key: "province", label: "Province" },
                { key: "industry", label: "Industry" },
                { key: "verification_status", label: "Verification" },
                { key: "risk", label: "Risk", format: (_value, row) => supplierRiskLevel(row, filtered.supplierScoreHistory) },
              ]}
            />
          </div>
        </Section>

        <Section title="Contract Status Summary" eyebrow="Section 6">
          <StatusList counts={statusCount(filtered.contracts)} />
          <div className="mt-5">
            <SimpleTable
              rows={topRows(filtered.contracts)}
              columns={[
                { key: "contract_number", label: "Contract" },
                { key: "supplier_name", label: "Supplier" },
                { key: "contract_value", label: "Value", format: (value) => formatZAR(parseMoney(value)) },
                { key: "end_date", label: "End Date", format: formatDate },
                { key: "status", label: "Status" },
              ]}
            />
          </div>
        </Section>

        <Section title="Invoice & Payment Summary" eyebrow="Section 7">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold text-heading">Invoice Status</p>
              <StatusList counts={statusCount(filtered.invoices)} />
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-heading">Payment Status</p>
              <StatusList counts={statusCount(filtered.payments)} />
            </div>
          </div>
        </Section>

        <Section title="Exceptions / Overrides" eyebrow="Section 8">
          <SimpleTable
            rows={topRows(filtered.procurementOverrides)}
            columns={[
              { key: "created_at", label: "Date", format: formatDateTime },
              { key: "entity_type", label: "Entity" },
              { key: "entity_id", label: "Entity ID" },
              { key: "status", label: "Status" },
              { key: "blocked_reason", label: "Blocked Reason" },
            ]}
          />
        </Section>

        <Section title="Audit Trail Highlights" eyebrow="Section 9">
          <SimpleTable
            rows={topRows(filtered.auditLogs, 8)}
            columns={[
              { key: "created_at", label: "Date", format: formatDateTime },
              { key: "user_email", label: "User" },
              { key: "action", label: "Action" },
              { key: "entity_type", label: "Entity" },
              { key: "entity_id", label: "Entity ID" },
            ]}
          />
        </Section>

        <Section title="Recommended Management Actions" eyebrow="Section 10">
          <div className="space-y-3">
            {recommendedActions.map((action, index) => (
              <div key={action} className="flex gap-3 rounded-md border border-panel bg-panel p-4">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-button">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-secondary">{action}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

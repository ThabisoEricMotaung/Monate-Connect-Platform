"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type ReportType =
  | "RFQ Report"
  | "Quote Report"
  | "Supplier Report"
  | "Contract Report"
  | "Invoice Report"
  | "Payment Report"
  | "Compliance Risk Report"
  | "SmartScore Report"
  | "Audit Trail Report"

type ReportRow = Record<string, unknown>

type ReportConfig = {
  type: ReportType
  table: string
  description: string
  columns: string[]
  dateFields: string[]
  provinceField?: string
  categoryField?: string
  statusField?: string
  supplierField?: string
  riskField?: string
}

type ReportFilters = {
  dateFrom: string
  dateTo: string
  province: string
  category: string
  status: string
  supplier: string
  riskLevel: string
}

const REPORTS: ReportConfig[] = [
  {
    type: "RFQ Report",
    table: "rfqs",
    description: "Operational view of RFQ publishing, categories, provinces, deadlines, and status.",
    columns: ["id", "title", "province", "category", "budget", "deadline", "status", "created_at"],
    dateFields: ["created_at", "deadline"],
    provinceField: "province",
    categoryField: "category",
    statusField: "status",
  },
  {
    type: "Quote Report",
    table: "quotes",
    description: "Supplier quote submissions, values, timelines, RFQ references, and award status.",
    columns: ["id", "rfq_id", "supplier_name", "amount", "timeline", "status", "created_at"],
    dateFields: ["created_at"],
    statusField: "status",
    supplierField: "supplier_name",
  },
  {
    type: "Supplier Report",
    table: "profiles",
    description: "Supplier directory export with location, industry, verification, and contact details.",
    columns: ["id", "business_name", "province", "industry", "email", "phone", "verification_status", "created_at"],
    dateFields: ["created_at", "updated_at"],
    provinceField: "province",
    categoryField: "industry",
    statusField: "verification_status",
    supplierField: "business_name",
  },
  {
    type: "Contract Report",
    table: "contracts",
    description: "Contract lifecycle, supplier references, values, renewal dates, and expiry status.",
    columns: ["id", "contract_number", "supplier_name", "rfq_id", "purchase_order_id", "contract_value", "start_date", "end_date", "renewal_date", "status"],
    dateFields: ["created_at", "start_date", "end_date", "renewal_date"],
    statusField: "status",
    supplierField: "supplier_name",
  },
  {
    type: "Invoice Report",
    table: "invoices",
    description: "Invoice statuses, contract links, purchase order references, due dates, and values.",
    columns: ["id", "invoice_number", "supplier_name", "contract_id", "purchase_order_id", "amount", "vat_amount", "total_amount", "due_date", "status", "created_at"],
    dateFields: ["created_at", "due_date"],
    statusField: "status",
    supplierField: "supplier_name",
  },
  {
    type: "Payment Report",
    table: "payments",
    description: "Payment tracking by invoice, supplier, method, reference, status, and payment date.",
    columns: ["id", "payment_number", "invoice_id", "supplier_name", "amount", "payment_method", "reference_number", "payment_date", "status", "created_at"],
    dateFields: ["created_at", "payment_date"],
    statusField: "status",
    supplierField: "supplier_name",
  },
  {
    type: "Compliance Risk Report",
    table: "profiles",
    description: "Supplier compliance posture based on verification status and expiring compliance dates.",
    columns: ["id", "business_name", "province", "industry", "verification_status", "tax_expiry_date", "bbbee_expiry_date", "csd_expiry_date", "cidb_expiry_date", "risk_level"],
    dateFields: ["created_at", "updated_at"],
    provinceField: "province",
    categoryField: "industry",
    statusField: "verification_status",
    supplierField: "business_name",
    riskField: "risk_level",
  },
  {
    type: "SmartScore Report",
    table: "profiles",
    description: "Supplier trust, readiness, and reputation score report generated from profile data.",
    columns: ["id", "business_name", "province", "industry", "verification_status", "smart_score", "smart_score_level", "risk_level"],
    dateFields: ["created_at", "updated_at"],
    provinceField: "province",
    categoryField: "industry",
    statusField: "verification_status",
    supplierField: "business_name",
    riskField: "risk_level",
  },
  {
    type: "Audit Trail Report",
    table: "audit_logs",
    description: "Governance traceability export of user actions, entities, metadata, and timestamps.",
    columns: ["id", "created_at", "user_email", "action", "entity_type", "entity_id", "metadata"],
    dateFields: ["created_at"],
    statusField: "action",
    categoryField: "entity_type",
    supplierField: "user_email",
  },
]

const EMPTY_FILTERS: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  province: "",
  category: "",
  status: "",
  supplier: "",
  riskLevel: "",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("does not exist") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim()
}

function formatCell(value: unknown): string {
  if (value == null || value === "") return "-"
  if (typeof value === "object") return JSON.stringify(value)

  const text = String(value)
  const date = new Date(text)
  if (
    /^\d{4}-\d{2}-\d{2}/.test(text) &&
    !Number.isNaN(date.getTime())
  ) {
    return date.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return text
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const text = normalizeText(value).replace(/[Rr\s,]/g, "")
  const numericValue = Number(text)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function getReportDate(row: ReportRow, fields: string[]): Date | null {
  for (const field of fields) {
    const value = normalizeText(row[field])
    if (!value) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }

  return null
}

function isDateWithinRange(row: ReportRow, config: ReportConfig, filters: ReportFilters): boolean {
  if (!filters.dateFrom && !filters.dateTo) return true

  const rowDate = getReportDate(row, config.dateFields)
  if (!rowDate) return false

  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom)
    if (rowDate < fromDate) return false
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo)
    toDate.setHours(23, 59, 59, 999)
    if (rowDate > toDate) return false
  }

  return true
}

function getComplianceRisk(row: ReportRow): string {
  const status = normalizeText(row.verification_status).toLowerCase()
  const expiryFields = ["tax_expiry_date", "bbbee_expiry_date", "csd_expiry_date", "cidb_expiry_date"]
  const expiringCount = expiryFields.filter((field) => {
    const value = normalizeText(row[field])
    if (!value) return false
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return false
    const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days <= 30
  }).length

  if (status.includes("rejected") || expiringCount >= 3) return "Critical"
  if (!status.includes("verified") || expiringCount >= 2) return "High"
  if (expiringCount === 1 || status.includes("review")) return "Medium"
  return "Low"
}

function addComputedFields(type: ReportType, row: ReportRow): ReportRow {
  if (type === "Compliance Risk Report") {
    return {
      ...row,
      risk_level: getComplianceRisk(row),
    }
  }

  if (type === "SmartScore Report") {
    const score = calculateSupplierSmartScore(row)
    return {
      ...row,
      smart_score: score.score,
      smart_score_level: score.label,
      risk_level:
        score.score <= 399
          ? "High"
          : score.score <= 599
            ? "Medium"
            : "Low",
    }
  }

  return row
}

function csvEscape(value: unknown): string {
  const text = formatCell(value).replace(/"/g, "\"\"")
  return `"${text}"`
}

function createCSV(columns: string[], rows: ReportRow[]): string {
  return [
    columns.map(csvEscape).join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n")
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function uniqueOptions(rows: ReportRow[], field?: string): string[] {
  if (!field) return []

  return Array.from(
    new Set(rows.map((row) => normalizeText(row[field])).filter(Boolean))
  ).sort()
}

function matchesFilter(row: ReportRow, field: string | undefined, value: string): boolean {
  if (!value || !field) return true
  return normalizeText(row[field]) === value
}

function reportFileName(reportType: ReportType): string {
  return `${reportType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-heading">{value}</p>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  )
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<ReportType>("RFQ Report")
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS)
  const [errorMessage, setErrorMessage] = useState("")

  const config = REPORTS.find((report) => report.type === selectedType) ?? REPORTS[0]

  useEffect(() => {
    async function gate() {
      const profile = await requireAdminOrBuyer()
      if (!profile) router.replace("/dashboard")
    }

    gate()
  }, [router])

  useEffect(() => {
    async function loadReport() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setRows([])
        setLoading(false)
        return
      }

      setLoading(true)
      setErrorMessage("")
      setFilters(EMPTY_FILTERS)

      let query = supabase.from(config.table).select("*")

      if (config.table === "profiles") {
        query = query.eq("role", "supplier")
      }

      const { data, error } = await query.limit(1000)

      if (error) {
        setRows([])
        setErrorMessage(
          isMissingTableError(error)
            ? `${config.table} table is not available yet. This report will load once the table exists.`
            : error.message
        )
        setLoading(false)
        return
      }

      setRows(((data ?? []) as ReportRow[]).map((row) => addComputedFields(config.type, row)))
      setLoading(false)
    }

    loadReport()
  }, [config.table, config.type])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      return (
        isDateWithinRange(row, config, filters) &&
        matchesFilter(row, config.provinceField, filters.province) &&
        matchesFilter(row, config.categoryField, filters.category) &&
        matchesFilter(row, config.statusField, filters.status) &&
        matchesFilter(row, config.supplierField, filters.supplier) &&
        matchesFilter(row, config.riskField, filters.riskLevel)
      )
    })
  }, [config, filters, rows])

  const options = useMemo(
    () => ({
      provinces: uniqueOptions(rows, config.provinceField),
      categories: uniqueOptions(rows, config.categoryField),
      statuses: uniqueOptions(rows, config.statusField),
      suppliers: uniqueOptions(rows, config.supplierField),
      risks: uniqueOptions(rows, config.riskField),
    }),
    [config, rows]
  )

  const summary = useMemo(() => {
    const amountFields = ["total_amount", "amount", "contract_value", "budget"]
    const totalValue = filteredRows.reduce((sum, row) => {
      const field = amountFields.find((candidate) => row[candidate] != null)
      return sum + parseAmount(field ? row[field] : null)
    }, 0)
    const statuses = new Set(
      filteredRows
        .map((row) => normalizeText(row[config.statusField ?? "status"]))
        .filter(Boolean)
    )
    const suppliers = new Set(
      filteredRows
        .map((row) => normalizeText(row[config.supplierField ?? "supplier_name"]))
        .filter(Boolean)
    )

    return {
      records: filteredRows.length,
      statuses: statuses.size,
      suppliers: suppliers.size,
      totalValue,
    }
  }, [config.statusField, config.supplierField, filteredRows])

  function updateFilter(key: keyof ReportFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function exportCSV() {
    downloadCSV(reportFileName(config.type), createCSV(config.columns, filteredRows))
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Reporting
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Data Export & Reporting Centre
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Generate operational reports, preview procurement data, export CSV
          files, and print governance-ready report snapshots.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-warning bg-warning-soft px-5 py-4">
          <p className="text-sm font-semibold text-warning">Report notice</p>
          <p className="mt-1 text-xs text-warning">{errorMessage}</p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Records" value={summary.records} hint="Rows matching the active filters" />
        <SummaryCard label="Statuses" value={summary.statuses} hint="Distinct status/action values" />
        <SummaryCard label="Suppliers" value={summary.suppliers} hint="Distinct supplier/user values" />
        <SummaryCard
          label="Value"
          value={`R${summary.totalValue.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`}
          hint="Best-effort sum from value columns"
        />
      </section>

      <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label htmlFor="report-type" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Report Type
            </label>
            <select
              id="report-type"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as ReportType)}
              className={filterClass}
            >
              {REPORTS.map((report) => (
                <option key={report.type} value={report.type}>
                  {report.type}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Scope
            </p>
            <p className="mt-2 text-sm leading-7 text-secondary">{config.description}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label htmlFor="report-date-from" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Date From
            </label>
            <input
              id="report-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
              className={filterClass}
            />
          </div>
          <div>
            <label htmlFor="report-date-to" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Date To
            </label>
            <input
              id="report-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
              className={filterClass}
            />
          </div>
          <div>
            <label htmlFor="report-province" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Province
            </label>
            <select
              id="report-province"
              value={filters.province}
              onChange={(event) => updateFilter("province", event.target.value)}
              disabled={options.provinces.length === 0}
              className={filterClass}
            >
              <option value="">All provinces</option>
              {options.provinces.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-category" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Category
            </label>
            <select
              id="report-category"
              value={filters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
              disabled={options.categories.length === 0}
              className={filterClass}
            >
              <option value="">All categories</option>
              {options.categories.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-status" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Status
            </label>
            <select
              id="report-status"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              disabled={options.statuses.length === 0}
              className={filterClass}
            >
              <option value="">All statuses</option>
              {options.statuses.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-risk" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Risk Level
            </label>
            <select
              id="report-risk"
              value={filters.riskLevel}
              onChange={(event) => updateFilter("riskLevel", event.target.value)}
              disabled={options.risks.length === 0}
              className={filterClass}
            >
              <option value="">All risk levels</option>
              {options.risks.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label htmlFor="report-supplier" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Supplier / User
            </label>
            <select
              id="report-supplier"
              value={filters.supplier}
              onChange={(event) => updateFilter("supplier", event.target.value)}
              disabled={options.suppliers.length === 0}
              className={filterClass}
            >
              <option value="">All suppliers/users</option>
              {options.suppliers.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3 xl:items-end xl:justify-end">
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
            >
              Clear Filters
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredRows.length === 0}
              className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-success bg-success-soft px-5 py-2.5 text-sm font-semibold text-success transition hover:bg-success/10"
            >
              Print Report
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-panel bg-card shadow-panel">
        <div className="border-b border-panel px-5 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            Preview Table
          </p>
          <h2 className="mt-2 text-lg font-semibold text-heading">
            {config.type}
          </h2>
        </div>

        {loading ? (
          <div className="h-72 animate-pulse bg-panel" />
        ) : rows.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-sm font-semibold text-heading">No report data available.</p>
            <p className="mt-2 text-xs text-muted">
              This table may be empty or not available in the current Supabase schema.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-sm font-semibold text-heading">No rows match these filters.</p>
            <p className="mt-2 text-xs text-muted">Clear or adjust filters to broaden the report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {config.columns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary"
                    >
                      {column.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-panel">
                {filteredRows.slice(0, 100).map((row, index) => (
                  <tr key={`${config.type}-${index}`} className="align-top hover:bg-surface">
                    {config.columns.map((column) => (
                      <td key={column} className="max-w-[280px] px-4 py-3 text-secondary">
                        <span className="line-clamp-3 break-words">
                          {formatCell(row[column])}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredRows.length > 100 && (
          <div className="border-t border-panel px-5 py-3 text-xs text-muted">
            Showing first 100 rows in preview. CSV export includes all {filteredRows.length} filtered rows.
          </div>
        )}
      </section>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type HealthStatus = "Healthy" | "Empty" | "Missing" | "Error"

type TableHealth = {
  table: string
  exists: boolean
  count: number | null
  lastCreatedAt: string | null
  status: HealthStatus
  error: string | null
}

type TableRows = Record<string, Record<string, unknown>[]>

type WorkflowCheck = {
  label: string
  description: string
  count: number
  severity: "Warning" | "Critical"
  samples: string[]
}

const TABLES = [
  "profiles",
  "rfqs",
  "quotes",
  "purchase_orders",
  "contracts",
  "invoices",
  "payments",
  "messages",
  "rfq_questions",
  "audit_logs",
  "notifications",
  "supplier_bank_details",
  "buyer_profiles",
  "workflow_rules",
  "decision_board_items",
  "approval_matrix",
  "delegation_authority",
  "procurement_overrides",
]

const statusStyles: Record<HealthStatus, string> = {
  Healthy: "border-success/35 bg-success-soft text-success",
  Empty: "border-warning/35 bg-warning/10 text-warning",
  Missing: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Error: "border-rose-600/35 bg-rose-600/10 text-rose-700",
}

const severityStyles: Record<WorkflowCheck["severity"], string> = {
  Warning: "border-warning/35 bg-warning/10 text-warning",
  Critical: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

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

function lower(value: unknown): string {
  return text(value).toLowerCase()
}

function rowId(row: Record<string, unknown>, fallback: string): string {
  return text(row.id) || text(row.uuid) || fallback
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function hasComplianceDocs(profile: Record<string, unknown>): boolean {
  const docFields = [
    "tax_document_url",
    "tax_clearance_url",
    "tax_clearance_document_url",
    "bbbee_document_url",
    "bbbee_certificate_url",
    "csd_document_url",
    "csd_report_url",
  ]

  return docFields.some((field) => Boolean(text(profile[field])))
}

async function getTableHealth(table: string): Promise<TableHealth> {
  if (!supabase) {
    return {
      table,
      exists: false,
      count: null,
      lastCreatedAt: null,
      status: "Error",
      error: "Supabase is not configured.",
    }
  }

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })

  if (error) {
    return {
      table,
      exists: !isMissingTableError(error),
      count: null,
      lastCreatedAt: null,
      status: isMissingTableError(error) ? "Missing" : "Error",
      error: error.message ?? "Table check failed.",
    }
  }

  let lastCreatedAt: string | null = null
  const { data: lastRow, error: dateError } = await supabase
    .from(table)
    .select("created_at")
    .not("created_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!dateError && lastRow) {
    lastCreatedAt = text((lastRow as { created_at?: string | null }).created_at) || null
  }

  return {
    table,
    exists: true,
    count: count ?? 0,
    lastCreatedAt,
    status: count && count > 0 ? "Healthy" : "Empty",
    error: dateError && !isMissingTableError(dateError) ? "No created_at field or no created rows." : null,
  }
}

async function getRows(table: string): Promise<Record<string, unknown>[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .limit(1000)

  if (error) return []
  return (data ?? []) as Record<string, unknown>[]
}

async function loadDiagnostics(): Promise<{ tables: TableHealth[]; rows: TableRows }> {
  const [tables, rowPairs] = await Promise.all([
    Promise.all(TABLES.map((table) => getTableHealth(table))),
    Promise.all(TABLES.map(async (table) => [table, await getRows(table)] as const)),
  ])

  return {
    tables,
    rows: Object.fromEntries(rowPairs),
  }
}

function createWorkflowChecks(rows: TableRows): WorkflowCheck[] {
  const rfqs = rows.rfqs ?? []
  const quotes = rows.quotes ?? []
  const purchaseOrders = rows.purchase_orders ?? []
  const contracts = rows.contracts ?? []
  const invoices = rows.invoices ?? []
  const payments = rows.payments ?? []
  const profiles = rows.profiles ?? []
  const bankDetails = rows.supplier_bank_details ?? []

  const quoteRfqIds = new Set(quotes.map((quote) => text(quote.rfq_id)).filter(Boolean))
  const poQuoteIds = new Set(purchaseOrders.map((po) => text(po.quote_id)).filter(Boolean))
  const poIdsWithContracts = new Set(contracts.map((contract) => text(contract.purchase_order_id)).filter(Boolean))
  const contractIdsWithInvoices = new Set(invoices.map((invoice) => text(invoice.contract_id)).filter(Boolean))
  const invoiceIdsWithPayments = new Set(payments.map((payment) => text(payment.invoice_id)).filter(Boolean))
  const profileIds = new Set(profiles.map((profile) => text(profile.id)).filter(Boolean))
  const bankingSupplierIds = new Set(bankDetails.map((bank) => text(bank.supplier_id)).filter(Boolean))

  const rfqsWithoutQuotes = rfqs.filter((rfq) => !quoteRfqIds.has(text(rfq.id)))
  const awardedQuotesWithoutPOs = quotes.filter((quote) => {
    const awarded = lower(quote.status) === "awarded"
    return awarded && !poQuoteIds.has(text(quote.id))
  })
  const posWithoutContracts = purchaseOrders.filter((po) => !poIdsWithContracts.has(text(po.id)))
  const contractsWithoutInvoices = contracts.filter((contract) => !contractIdsWithInvoices.has(text(contract.id)))
  const approvedInvoicesWithoutPayments = invoices.filter((invoice) => {
    const approved = lower(invoice.status) === "approved"
    return approved && !invoiceIdsWithPayments.has(text(invoice.id))
  })

  const supplierIdsFromWorkflow = new Set<string>()
  quotes.forEach((quote) => { if (text(quote.supplier_id)) supplierIdsFromWorkflow.add(text(quote.supplier_id)) })
  purchaseOrders.forEach((po) => { if (text(po.supplier_id)) supplierIdsFromWorkflow.add(text(po.supplier_id)) })
  contracts.forEach((contract) => { if (text(contract.supplier_id)) supplierIdsFromWorkflow.add(text(contract.supplier_id)) })
  invoices.forEach((invoice) => { if (text(invoice.supplier_id)) supplierIdsFromWorkflow.add(text(invoice.supplier_id)) })
  payments.forEach((payment) => { if (text(payment.supplier_id)) supplierIdsFromWorkflow.add(text(payment.supplier_id)) })

  const suppliersWithoutProfiles = Array.from(supplierIdsFromWorkflow).filter((supplierId) => !profileIds.has(supplierId))
  const supplierProfiles = profiles.filter((profile) => lower(profile.role) === "supplier" || Boolean(text(profile.business_name)))
  const suppliersWithoutBanking = supplierProfiles.filter((profile) => !bankingSupplierIds.has(text(profile.id)))
  const verifiedSuppliersMissingDocs = supplierProfiles.filter((profile) => {
    const verified = lower(profile.verification_status).includes("verified") || lower(profile.verification_status).includes("approved")
    return verified && !hasComplianceDocs(profile)
  })

  return [
    {
      label: "RFQs without quotes",
      description: "Published or captured RFQs with no quote submissions.",
      count: rfqsWithoutQuotes.length,
      severity: "Warning",
      samples: rfqsWithoutQuotes.slice(0, 5).map((row, index) => `RFQ ${rowId(row, String(index + 1))}: ${text(row.title) || "Untitled"}`),
    },
    {
      label: "Awarded quotes without purchase orders",
      description: "Awarded quote records that have not produced a purchase order.",
      count: awardedQuotesWithoutPOs.length,
      severity: "Critical",
      samples: awardedQuotesWithoutPOs.slice(0, 5).map((row, index) => `Quote ${rowId(row, String(index + 1))}: ${text(row.supplier_name) || text(row.supplier_id) || "Unknown supplier"}`),
    },
    {
      label: "Purchase orders without contracts",
      description: "Purchase orders that do not yet have a linked contract record.",
      count: posWithoutContracts.length,
      severity: "Warning",
      samples: posWithoutContracts.slice(0, 5).map((row, index) => `PO ${text(row.po_number) || text(row.purchase_order_number) || rowId(row, String(index + 1))}`),
    },
    {
      label: "Contracts without invoices",
      description: "Contracts with no linked supplier invoice record.",
      count: contractsWithoutInvoices.length,
      severity: "Warning",
      samples: contractsWithoutInvoices.slice(0, 5).map((row, index) => `Contract ${text(row.contract_number) || rowId(row, String(index + 1))}`),
    },
    {
      label: "Approved invoices without payments",
      description: "Approved invoices with no linked payment record.",
      count: approvedInvoicesWithoutPayments.length,
      severity: "Critical",
      samples: approvedInvoicesWithoutPayments.slice(0, 5).map((row, index) => `Invoice ${text(row.invoice_number) || rowId(row, String(index + 1))}`),
    },
    {
      label: "Suppliers without profiles",
      description: "Supplier UUIDs referenced in workflow records but missing from profiles.",
      count: suppliersWithoutProfiles.length,
      severity: "Critical",
      samples: suppliersWithoutProfiles.slice(0, 5),
    },
    {
      label: "Suppliers without banking details",
      description: "Supplier profiles without captured banking detail records.",
      count: suppliersWithoutBanking.length,
      severity: "Warning",
      samples: suppliersWithoutBanking.slice(0, 5).map((row, index) => text(row.business_name) || text(row.email) || `Supplier ${index + 1}`),
    },
    {
      label: "Verified suppliers missing compliance docs",
      description: "Verified suppliers that appear to be missing tax, BBBEE, or CSD document references.",
      count: verifiedSuppliersMissingDocs.length,
      severity: "Critical",
      samples: verifiedSuppliersMissingDocs.slice(0, 5).map((row, index) => text(row.business_name) || text(row.email) || `Supplier ${index + 1}`),
    },
  ]
}

function StatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusStyles[status]}`}>
      {status}
    </span>
  )
}

function KpiCard({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-heading">{value.toLocaleString("en-ZA")}</p>
      <p className="mt-1 text-xs text-secondary">{caption}</p>
    </div>
  )
}

export default function SystemHealthPage() {
  const router = useRouter()
  const [tables, setTables] = useState<TableHealth[]>([])
  const [rows, setRows] = useState<TableRows>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  async function runChecks() {
    setRefreshing(true)
    setError("")
    try {
      const diagnostics = await loadDiagnostics()
      setTables(diagnostics.tables)
      setRows(diagnostics.rows)
      setLastChecked(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : "System health checks failed.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) {
        router.replace("/dashboard")
        return
      }

      await runChecks()
    }

    load()
  }, [router])

  const workflowChecks = useMemo(() => createWorkflowChecks(rows), [rows])
  const workflowGapCount = workflowChecks.reduce((sum, check) => sum + check.count, 0)
  const dataWarningCount = workflowChecks.filter((check) => check.count > 0).length +
    tables.filter((table) => table.status === "Empty" || table.status === "Error").length

  const summary = useMemo(() => ({
    healthy: tables.filter((table) => table.status === "Healthy").length,
    missing: tables.filter((table) => table.status === "Missing").length,
    gaps: workflowGapCount,
    warnings: dataWarningCount,
  }), [tables, workflowGapCount, dataWarningCount])

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Diagnostics</p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">System Health &amp; Data Integrity Centre</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
            Check database table availability, record freshness, and procurement workflow continuity
            across the enterprise platform.
          </p>
          <p className="mt-2 text-xs text-muted">
            Last checked: {formatDate(lastChecked)}
          </p>
        </div>
        <button
          type="button"
          onClick={runChecks}
          disabled={refreshing}
          className="inline-flex w-fit items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-60"
        >
          {refreshing ? "Running checks..." : "Run Health Checks"}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Healthy Tables" value={summary.healthy} caption="Tables with active records" />
        <KpiCard label="Missing Tables" value={summary.missing} caption="Unavailable or not migrated" />
        <KpiCard label="Workflow Gaps" value={summary.gaps} caption="Broken lifecycle links" />
        <KpiCard label="Data Warnings" value={summary.warnings} caption="Empty/error tables and warning groups" />
      </section>

      <section className="mb-6 rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="mb-5 border-b border-panel pb-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Database Integrity</p>
          <h2 className="mt-2 text-xl font-semibold text-heading">Table Health Checks</h2>
        </div>

        <div className="overflow-x-auto rounded-md border border-panel">
          <table className="min-w-full divide-y divide-panel">
            <thead className="bg-panel">
              <tr>
                <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Table</th>
                <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Exists</th>
                <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Record Count</th>
                <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Last Created</th>
                <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Status</th>
                <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Diagnostic Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel bg-card">
              {tables.map((table) => (
                <tr key={table.table}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-heading">{table.table}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{table.exists ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{table.count?.toLocaleString("en-ZA") ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{formatDate(table.lastCreatedAt)}</td>
                  <td className="px-4 py-3"><StatusBadge status={table.status} /></td>
                  <td className="max-w-md px-4 py-3 text-xs leading-5 text-secondary">
                    {table.error ?? (table.status === "Healthy" ? "Operational." : table.status === "Empty" ? "Table exists but contains no records." : "-")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="mb-5 border-b border-panel pb-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Workflow Integrity</p>
          <h2 className="mt-2 text-xl font-semibold text-heading">Procurement Lifecycle Checks</h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {workflowChecks.map((check) => (
            <div key={check.label} className="rounded-md border border-panel bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-heading">{check.label}</p>
                  <p className="mt-1 text-xs leading-5 text-secondary">{check.description}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${severityStyles[check.severity]}`}>
                  {check.count.toLocaleString("en-ZA")} {check.severity}
                </span>
              </div>
              {check.samples.length > 0 ? (
                <div className="mt-4 rounded-md border border-panel bg-card px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Sample records</p>
                  <ul className="mt-2 space-y-1">
                    {check.samples.map((sample) => (
                      <li key={sample} className="text-xs text-secondary">{sample}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-md border border-success/25 bg-success-soft px-4 py-3 text-xs font-semibold text-success">
                  No gaps detected for this workflow check.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

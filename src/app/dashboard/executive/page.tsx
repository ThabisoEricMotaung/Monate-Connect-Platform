"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { isVerifiedStatus } from "@/lib/supplierStatus"
import { supabase } from "@/lib/supabase"
import {
  applySupplierDocumentsToProfiles,
  fetchSupplierDocumentsByProfileIds,
  type SupplierDocument,
} from "@/lib/supplierDocuments"

type RfqRow = {
  id: number
  status: string | null
  budget: string | number | null
  province: string | null
  created_at: string | null
}

type ContractRow = {
  id: number
  status: string | null
  contract_value: string | number | null
  supplier_id: string | null
  supplier_name: string | null
  created_at: string | null
}

type PurchaseOrderRow = {
  id: number
  amount: string | number | null
  supplier_id: string | null
  supplier_name: string | null
  created_at: string | null
  issue_date: string | null
}

type InvoiceRow = {
  id: number
  status: string | null
  amount: string | number | null
  total_amount: string | number | null
  supplier_id: string | null
  created_at: string | null
}

type QuoteRow = {
  id: number
  status: string | null
  supplier_id: string | null
}

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  email: string | null
  role: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  cidb_grade: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  supplier_documents?: SupplierDocument[]
  updated_at: string | null
}

type TrendRow = {
  month: string
  rfqs: number
  contracts: number
  purchaseOrders: number
  invoices: number
}

type ProvinceRow = {
  province: string
  rfqs: number
  contracts: number
  value: number
}

type SupplierRow = {
  supplierId: string
  supplier: string
  smartScore: number
  awards: number
  contracts: number
  procurementValue: number
}

type RiskSummary = {
  low: number
  medium: number
  high: number
  critical: number
}

type CommandCentreData = {
  rfqs: RfqRow[]
  contracts: ContractRow[]
  purchaseOrders: PurchaseOrderRow[]
  invoices: InvoiceRow[]
  quotes: QuoteRow[]
  suppliers: SupplierProfile[]
  missingTables: string[]
}

const MOCK_TREND: TrendRow[] = [
  { month: "Jan 26", rfqs: 1200000, contracts: 850000, purchaseOrders: 640000, invoices: 420000 },
  { month: "Feb 26", rfqs: 1500000, contracts: 1100000, purchaseOrders: 720000, invoices: 560000 },
  { month: "Mar 26", rfqs: 1340000, contracts: 1260000, purchaseOrders: 900000, invoices: 610000 },
  { month: "Apr 26", rfqs: 1900000, contracts: 1410000, purchaseOrders: 1020000, invoices: 780000 },
  { month: "May 26", rfqs: 2100000, contracts: 1650000, purchaseOrders: 1250000, invoices: 940000 },
  { month: "Jun 26", rfqs: 1840000, contracts: 1720000, purchaseOrders: 1380000, invoices: 1010000 },
]

const MOCK_PROVINCES: ProvinceRow[] = [
  { province: "Gauteng", rfqs: 18, contracts: 9, value: 4200000 },
  { province: "Western Cape", rfqs: 11, contracts: 5, value: 2300000 },
  { province: "KwaZulu-Natal", rfqs: 9, contracts: 4, value: 1750000 },
]

const MOCK_SUPPLIERS: SupplierRow[] = [
  { supplierId: "mock-1", supplier: "TNT Kano", smartScore: 842, awards: 4, contracts: 3, procurementValue: 3200000 },
  { supplierId: "mock-2", supplier: "Metsi Works", smartScore: 781, awards: 3, contracts: 2, procurementValue: 1900000 },
  { supplierId: "mock-3", supplier: "North Star Facilities", smartScore: 716, awards: 2, contracts: 2, procurementValue: 1250000 },
]

function parseMoney(value: string | number | null | undefined): number {
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

function formatNumber(value: number): string {
  return value.toLocaleString("en-ZA")
}

function monthKey(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-")
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "en-ZA",
    { month: "short", year: "2-digit" }
  )
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("does not exist") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
}

async function resolveRows<T>(
  table: string,
  query: PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>
): Promise<{ rows: T[]; missing: boolean; error: string | null }> {
  const { data, error } = await query

  if (!error) {
    return { rows: (data ?? []) as T[], missing: false, error: null }
  }

  if (isMissingTableError(error)) {
    return { rows: [], missing: true, error: `${table}: ${error.message ?? "table unavailable"}` }
  }

  console.error(`Executive Command Centre ${table} load failed:`, error)
  return { rows: [], missing: false, error: `${table}: ${error.message ?? "query failed"}` }
}

async function loadCommandCentreData(): Promise<CommandCentreData & { errors: string[] }> {
  if (!supabase) {
    return {
      rfqs: [],
      contracts: [],
      purchaseOrders: [],
      invoices: [],
      quotes: [],
      suppliers: [],
      missingTables: ["Supabase"],
      errors: ["Supabase environment variables are not configured."],
    }
  }

  const [rfqs, contracts, purchaseOrders, invoices, quotes, suppliers] =
    await Promise.all([
      resolveRows<RfqRow>(
        "rfqs",
        supabase
          .from("rfqs")
          .select("id, status, budget, province, created_at")
          .order("created_at", { ascending: true })
      ),
      resolveRows<ContractRow>(
        "contracts",
        supabase
          .from("contracts")
          .select("id, status, contract_value, supplier_id, supplier_name, created_at")
          .order("created_at", { ascending: true })
      ),
      resolveRows<PurchaseOrderRow>(
        "purchase_orders",
        supabase
          .from("purchase_orders")
          .select("id, amount, supplier_id, supplier_name, issue_date, created_at")
          .order("created_at", { ascending: true })
      ),
      resolveRows<InvoiceRow>(
        "invoices",
        supabase
          .from("invoices")
          .select("id, status, amount, total_amount, supplier_id, created_at")
          .order("created_at", { ascending: true })
      ),
      resolveRows<QuoteRow>(
        "quotes",
        supabase.from("quotes").select("id, status, supplier_id")
      ),
      resolveRows<SupplierProfile>(
        "profiles",
        supabase
          .from("profiles")
          .select(
            "id, business_name, province, industry, phone, email, role, " +
              "verification_status, csd_number, bbbee_level, tax_status, " +
              "company_registration, cidb_grade, csd_document_url, " +
              "bbbee_document_url, tax_document_url, company_registration_url, " +
              "cidb_document_url, capability_statement_url, updated_at"
          )
          .eq("role", "supplier")
      ),
    ])

  const results = [rfqs, contracts, purchaseOrders, invoices, quotes, suppliers]

  const documentResult = await fetchSupplierDocumentsByProfileIds(suppliers.rows.map((supplier) => supplier.id))
  const hydratedSuppliers = applySupplierDocumentsToProfiles(suppliers.rows, documentResult.documentsByProfile)

  return {
    rfqs: rfqs.rows,
    contracts: contracts.rows,
    purchaseOrders: purchaseOrders.rows,
    invoices: invoices.rows,
    quotes: quotes.rows,
    suppliers: hydratedSuppliers,
    missingTables: results
      .map((result, index) =>
        result.missing
          ? ["rfqs", "contracts", "purchase_orders", "invoices", "quotes", "profiles"][index]
          : null
      )
      .filter(Boolean) as string[],
    errors: [...results.map((result) => result.error), documentResult.error].filter(Boolean) as string[],
  }
}

function buildTrend(data: CommandCentreData): TrendRow[] {
  const monthMap = new Map<string, TrendRow>()
  const ensureMonth = (key: string) => {
    const existing = monthMap.get(key)
    if (existing) return existing

    const row = {
      month: monthLabel(key),
      rfqs: 0,
      contracts: 0,
      purchaseOrders: 0,
      invoices: 0,
    }
    monthMap.set(key, row)
    return row
  }

  for (const rfq of data.rfqs) {
    const key = monthKey(rfq.created_at)
    if (key) ensureMonth(key).rfqs += parseMoney(rfq.budget)
  }

  for (const contract of data.contracts) {
    const key = monthKey(contract.created_at)
    if (key) ensureMonth(key).contracts += parseMoney(contract.contract_value)
  }

  for (const purchaseOrder of data.purchaseOrders) {
    const key = monthKey(purchaseOrder.issue_date ?? purchaseOrder.created_at)
    if (key) ensureMonth(key).purchaseOrders += parseMoney(purchaseOrder.amount)
  }

  for (const invoice of data.invoices) {
    const key = monthKey(invoice.created_at)
    if (key) ensureMonth(key).invoices += parseMoney(invoice.total_amount ?? invoice.amount)
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, row]) => row)
}

function buildRiskSummary(suppliers: SupplierProfile[]): RiskSummary {
  return suppliers.reduce<RiskSummary>(
    (summary, supplier) => {
      const smartScore = calculateSupplierSmartScore(supplier)

      if (smartScore.score < 30) summary.critical += 1
      else if (smartScore.score <= 39) summary.high += 1
      else if (smartScore.score <= 59) summary.medium += 1
      else summary.low += 1

      return summary
    },
    { low: 0, medium: 0, high: 0, critical: 0 }
  )
}

function buildProvincialActivity(data: CommandCentreData): ProvinceRow[] {
  const provinceBySupplier = new Map(
    data.suppliers.map((supplier) => [
      supplier.id,
      supplier.province?.trim() || "Unassigned",
    ])
  )
  const provinces = new Map<string, ProvinceRow>()
  const ensureProvince = (province: string) => {
    const label = province.trim() || "Unassigned"
    const existing = provinces.get(label)
    if (existing) return existing

    const row = { province: label, rfqs: 0, contracts: 0, value: 0 }
    provinces.set(label, row)
    return row
  }

  for (const rfq of data.rfqs) {
    const row = ensureProvince(rfq.province ?? "Unassigned")
    row.rfqs += 1
    row.value += parseMoney(rfq.budget)
  }

  for (const contract of data.contracts) {
    const row = ensureProvince(
      contract.supplier_id
        ? provinceBySupplier.get(contract.supplier_id) ?? "Unassigned"
        : "Unassigned"
    )
    row.contracts += 1
    row.value += parseMoney(contract.contract_value)
  }

  return Array.from(provinces.values())
    .sort((a, b) => b.value - a.value || b.rfqs - a.rfqs)
    .slice(0, 9)
}

function buildTopSuppliers(data: CommandCentreData): SupplierRow[] {
  const suppliers = data.suppliers.length > 0 ? data.suppliers : []

  return suppliers
    .map((supplier) => {
      const awards = data.quotes.filter(
        (quote) =>
          quote.supplier_id === supplier.id &&
          ["Awarded", "Approved"].includes(String(quote.status ?? ""))
      ).length
      const contracts = data.contracts.filter(
        (contract) => contract.supplier_id === supplier.id
      )
      const purchaseOrders = data.purchaseOrders.filter(
        (purchaseOrder) => purchaseOrder.supplier_id === supplier.id
      )
      const procurementValue =
        contracts.reduce(
          (sum, contract) => sum + parseMoney(contract.contract_value),
          0
        ) +
        purchaseOrders.reduce(
          (sum, purchaseOrder) => sum + parseMoney(purchaseOrder.amount),
          0
        )
      const smartScore = calculateSupplierSmartScore(supplier, {
        awardedQuotes: awards,
        completedContracts: contracts.filter(
          (contract) => contract.status === "Completed"
        ).length,
        recentActivityCount: awards + contracts.length + purchaseOrders.length,
      })

      return {
        supplierId: supplier.id,
        supplier: supplier.business_name || "Unnamed Supplier",
        smartScore: smartScore.score,
        awards,
        contracts: contracts.length,
        procurementValue,
      }
    })
    .sort(
      (a, b) =>
        b.procurementValue - a.procurementValue ||
        b.smartScore - a.smartScore ||
        b.awards - a.awards
    )
    .slice(0, 8)
}

function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint: string
  tone?: "default" | "success" | "warning" | "accent"
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "accent"
          ? "text-accent"
          : "text-heading"

  return (
    <article className="enterprise-card">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">
        {label}
      </p>
      <p className={`mt-4 text-3xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
    </article>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-md border border-panel bg-panel p-6 text-center">
      <p className="max-w-sm text-sm leading-6 text-muted">{message}</p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-md border border-panel bg-card" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-md border border-panel bg-card" />
    </div>
  )
}

export default function ExecutiveCommandCentrePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [data, setData] = useState<CommandCentreData | null>(null)

  useEffect(() => {
    async function load() {
      if (supabase) {
        const profile = await getCurrentProfile()

        if (!hasAdminOrBuyerAccess(profile)) {
          router.replace("/dashboard")
          return
        }
      }

      const loaded = await loadCommandCentreData()
      setData(loaded)
      setErrors(loaded.errors)
      setLoading(false)
    }

    load().catch((error) => {
      console.error("Executive Command Centre load failed:", error)
      setErrors([error instanceof Error ? error.message : "Command centre data failed to load."])
      setData({
        rfqs: [],
        contracts: [],
        purchaseOrders: [],
        invoices: [],
        quotes: [],
        suppliers: [],
        missingTables: ["unknown"],
      })
      setLoading(false)
    })
  }, [router])

  const viewModel = useMemo(() => {
    if (!data) return null

    const totalProcurementValue =
      data.contracts.reduce(
        (sum, contract) => sum + parseMoney(contract.contract_value),
        0
      ) +
      data.purchaseOrders.reduce(
        (sum, purchaseOrder) => sum + parseMoney(purchaseOrder.amount),
        0
      )
    const activeRFQs = data.rfqs.filter((rfq) =>
      ["open", "active", "published"].includes(String(rfq.status ?? "").trim().toLowerCase())
    ).length
    const activeContracts = data.contracts.filter((contract) =>
      ["Active", "In Progress"].includes(String(contract.status ?? ""))
    ).length
    const approvedInvoices = data.invoices.filter((invoice) =>
      ["Approved", "Paid"].includes(String(invoice.status ?? ""))
    ).length
    const outstandingLiabilities = data.invoices
      .filter(
        (invoice) =>
          !["Paid", "Rejected", "Cancelled"].includes(String(invoice.status ?? ""))
      )
      .reduce(
        (sum, invoice) => sum + parseMoney(invoice.total_amount ?? invoice.amount),
        0
      )
    const verifiedSuppliers = data.suppliers.filter(
      (supplier) => isVerifiedStatus(supplier.verification_status)
    ).length

    const trend = buildTrend(data)
    const riskSummary = buildRiskSummary(data.suppliers)
    const provinces = buildProvincialActivity(data)
    const topSuppliers = buildTopSuppliers(data)
    const useMock = data.missingTables.length > 0

    return {
      kpis: {
        totalProcurementValue,
        activeRFQs,
        activeContracts,
        approvedInvoices,
        outstandingLiabilities,
        verifiedSuppliers,
      },
      trend: trend.length > 0 ? trend : useMock ? MOCK_TREND : [],
      riskSummary,
      provinces:
        provinces.length > 0 ? provinces : useMock ? MOCK_PROVINCES : [],
      topSuppliers:
        topSuppliers.length > 0 ? topSuppliers : useMock ? MOCK_SUPPLIERS : [],
      useMock,
    }
  }, [data])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Executive Control</p>
        <h1 className="enterprise-page-title">Executive Command Centre</h1>
        <p className="enterprise-page-description">
          A board-level view of procurement value, supplier risk, provincial
          activity, and top supplier performance across the AiForm Procure
          network.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 rounded-md border border-warning/35 bg-warning-soft px-5 py-4">
          <p className="text-sm font-semibold text-warning">
            Some command centre data is unavailable
          </p>
          <p className="mt-1 text-xs leading-5 text-secondary">
            {errors.slice(0, 3).join(" | ")}
          </p>
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && viewModel && (
        <div className="space-y-6">
          {viewModel.useMock && (
            <div className="rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
                Preview mode
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                One or more procurement tables are unavailable, so chart and
                table sections use mock data where live rows could not be built.
              </p>
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="Total Procurement Value"
              value={formatZAR(viewModel.kpis.totalProcurementValue)}
              hint="Contracts plus issued purchase order exposure"
              tone="accent"
            />
            <KpiCard
              label="Active RFQs"
              value={formatNumber(viewModel.kpis.activeRFQs)}
              hint="RFQs currently open or published"
            />
            <KpiCard
              label="Active Contracts"
              value={formatNumber(viewModel.kpis.activeContracts)}
              hint="Contracts in active delivery"
              tone="success"
            />
            <KpiCard
              label="Approved Invoices"
              value={formatNumber(viewModel.kpis.approvedInvoices)}
              hint="Approved or already paid invoice records"
              tone="success"
            />
            <KpiCard
              label="Outstanding Liabilities"
              value={formatZAR(viewModel.kpis.outstandingLiabilities)}
              hint="Invoice value not yet paid, rejected, or cancelled"
              tone="warning"
            />
            <KpiCard
              label="Verified Suppliers"
              value={formatNumber(viewModel.kpis.verifiedSuppliers)}
              hint="Suppliers with verified profile status"
              tone="success"
            />
          </section>

          <section className="enterprise-card">
            <div className="mb-5 border-b border-panel pb-4">
              <p className="enterprise-section-label">Spend Trend</p>
              <h2 className="text-lg font-semibold text-heading">
                Procurement Spend Trend
              </h2>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Monthly value generated from RFQs, contracts, purchase orders,
                and invoices.
              </p>
            </div>
            {viewModel.trend.length === 0 ? (
              <EmptyState message="No dated procurement records are available yet for monthly spend analysis." />
            ) : (
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={viewModel.trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={formatZAR} />
                    <Tooltip
                      formatter={(value) => formatZAR(Number(value))}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--foreground)",
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="rfqs" name="RFQs" stroke="#2563eb" fill="#2563eb22" />
                    <Area type="monotone" dataKey="contracts" name="Contracts" stroke="#16a34a" fill="#16a34a22" />
                    <Area type="monotone" dataKey="purchaseOrders" name="Purchase Orders" stroke="#d97706" fill="#d9770622" />
                    <Area type="monotone" dataKey="invoices" name="Invoices" stroke="#7c3aed" fill="#7c3aed22" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="enterprise-card">
              <div className="mb-5 border-b border-panel pb-4">
                <p className="enterprise-section-label">Supplier Risk</p>
                <h2 className="text-lg font-semibold text-heading">
                  Supplier Risk Overview
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Low Risk", viewModel.riskSummary.low, "border-success/30 bg-success-soft text-success"],
                  ["Medium Risk", viewModel.riskSummary.medium, "border-warning/35 bg-warning-soft text-warning"],
                  ["High Risk", viewModel.riskSummary.high, "border-rose-500/25 bg-rose-500/10 text-rose-700"],
                  ["Critical", viewModel.riskSummary.critical, "border-rose-700/35 bg-rose-700/10 text-rose-800"],
                ].map(([label, value, className]) => (
                  <div key={label} className={`rounded-md border p-4 ${className}`}>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em]">
                      {label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tabular-nums">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="enterprise-card">
              <div className="mb-5 border-b border-panel pb-4">
                <p className="enterprise-section-label">Provincial Activity</p>
                <h2 className="text-lg font-semibold text-heading">
                  RFQs and Contracts by Province
                </h2>
              </div>
              {viewModel.provinces.length === 0 ? (
                <EmptyState message="No provincial RFQ or contract records are available yet." />
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={viewModel.provinces} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="province" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="rfqs" name="RFQs" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="contracts" name="Contracts" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          <section className="enterprise-card">
            <div className="mb-5 border-b border-panel pb-4">
              <p className="enterprise-section-label">Supplier Performance</p>
              <h2 className="text-lg font-semibold text-heading">
                Top Suppliers
              </h2>
            </div>
            {viewModel.topSuppliers.length === 0 ? (
              <EmptyState message="No supplier award or contract activity is available yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-panel text-sm">
                  <thead>
                    <tr className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-secondary">
                      <th className="px-3 py-3 font-semibold">Supplier</th>
                      <th className="px-3 py-3 font-semibold">SmartScore</th>
                      <th className="px-3 py-3 font-semibold">Awards</th>
                      <th className="px-3 py-3 font-semibold">Contracts</th>
                      <th className="px-3 py-3 font-semibold">Procurement Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-panel">
                    {viewModel.topSuppliers.map((supplier) => (
                      <tr key={supplier.supplierId}>
                        <td className="px-3 py-4 font-semibold text-heading">
                          {supplier.supplier}
                        </td>
                        <td className="px-3 py-4 tabular-nums text-accent">
                          {supplier.smartScore}
                        </td>
                        <td className="px-3 py-4 tabular-nums text-secondary">
                          {supplier.awards}
                        </td>
                        <td className="px-3 py-4 tabular-nums text-secondary">
                          {supplier.contracts}
                        </td>
                        <td className="px-3 py-4 font-semibold tabular-nums text-heading">
                          {formatZAR(supplier.procurementValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

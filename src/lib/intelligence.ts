import { supabase } from "./supabase"
import { displayIndustry } from "./industries"
import {
  calculateSupplierSmartScore,
  type SmartScoreResult,
  type SupplierSmartScoreActivity,
} from "./smartScore"
import { isVerifiedStatus } from "./supplierStatus"
import {
  applySupplierDocumentsToProfiles,
  fetchSupplierDocumentsByProfileIds,
  type SupplierDocument,
} from "./supplierDocuments"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCurrency(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (!value) return 0
  let v = String(value).replace(/[Rr]/g, "").replace(/\s/g, "").trim()
  const hasComma = v.includes(",")
  const hasDot = v.includes(".")
  if (hasComma && hasDot) v = v.replace(/,/g, "")
  else if (hasComma) {
    const parts = v.split(",")
    const last = parts[parts.length - 1]
    v = parts.length === 2 && last.length > 0 && last.length <= 2
      ? `${parts[0].replace(/,/g, "")}.${last}`
      : v.replace(/,/g, "")
  }
  v = v.replace(/[^\d.]/g, "")
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function monthKey(dateStr: string | null): string {
  if (!dateStr) return "Unknown"
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return "Unknown"
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string): string {
  if (key === "Unknown") return "Unknown"
  const [y, m] = key.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString("en-ZA", { year: "2-digit", month: "short" })
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExecutiveMetrics = {
  totalProcurementValue: number
  activeSuppliers: number
  activeRFQs: number
  awardedContracts: number
  outstandingInvoices: number
  paymentsThisMonth: number
  averageRFQValue: number
  procurementHealthScore: number
}

export type SupplierIntelligenceRecord = {
  supplierId: string
  supplierName: string
  province: string | null
  industry: string | null
  verificationStatus: string | null
  level: string
  riskRating: "Low" | "Medium" | "High" | "Critical"
  responseRate: number
  awardRate: number
  completionRate: number
  invoiceCompliance: number
  paymentReliabilityRate: number
  awards: number
  contracts: number
  completedContracts: number
  invoices: number
  approvedInvoices: number
  paidInvoices: number
  procurementValue: number
  improvementTips: string[]
  score: number
  smartScore: SmartScoreResult
  riskLevel: "Low" | "Medium" | "High"
}

export type ProcurementAnalyticsData = {
  rfqVolumeByMonth: { month: string; count: number }[]
  procurementValueByMonth: { month: string; value: number }[]
  categoryBreakdown: { category: string; count: number; value: number }[]
}

export type RegionalInsightRecord = {
  province: string
  rfqCount: number
  supplierCount: number
  totalValue: number
  activeContracts: number
}

type ActivityQuote = { supplier_id: string | null; status: string | null }
type ActivityContract = { supplier_id: string | null; status: string | null }
type ActivityInvoice = { supplier_id: string | null; status: string | null }
type ActivityPayment = { supplier_id: string | null; status: string | null }

export function buildSupplierActivityById({
  supplierIds,
  quotes,
  contracts,
  invoices,
  payments,
}: {
  supplierIds: string[]
  quotes: ActivityQuote[]
  contracts: ActivityContract[]
  invoices: ActivityInvoice[]
  payments: ActivityPayment[]
}): Record<string, SupplierSmartScoreActivity> {
  return Object.fromEntries(
    supplierIds.map((supplierId) => {
      const supplierQuotes = quotes.filter((q) => q.supplier_id === supplierId)
      const supplierContracts = contracts.filter((c) => c.supplier_id === supplierId)
      const supplierInvoices = invoices.filter((i) => i.supplier_id === supplierId)
      const supplierPayments = payments.filter((payment) => payment.supplier_id === supplierId)
      const awardedQuotes = supplierQuotes.filter((q) => q.status === "Awarded" || q.status === "Approved").length
      const completedContracts = supplierContracts.filter((c) => c.status === "Completed").length
      const approvedInvoices = supplierInvoices.filter((i) => i.status === "Approved" || i.status === "Paid").length
      const paidInvoices = supplierInvoices.filter((i) => i.status === "Paid").length
      const paidPayments = supplierPayments.filter((payment) => payment.status === "Paid").length
      const paymentReliabilityRate = approvedInvoices > 0
        ? Math.round((paidInvoices / approvedInvoices) * 100)
        : supplierPayments.length > 0
          ? Math.round((paidPayments / supplierPayments.length) * 100)
          : 0

      return [
        supplierId,
        {
          rfqResponses: supplierQuotes.length,
          awardedQuotes,
          contracts: supplierContracts.length,
          completedContracts,
          invoices: supplierInvoices.length,
          approvedInvoices,
          paidInvoices,
          payments: supplierPayments.length,
          paidPayments,
          paymentReliabilityRate,
          recentActivityCount:
            supplierQuotes.length + supplierContracts.length + supplierInvoices.length + supplierPayments.length,
        },
      ]
    }),
  )
}

// ─── getExecutiveMetrics ──────────────────────────────────────────────────────

export async function getExecutiveMetrics(): Promise<ExecutiveMetrics> {
  if (!supabase) {
    return {
      totalProcurementValue: 0, activeSuppliers: 0, activeRFQs: 0,
      awardedContracts: 0, outstandingInvoices: 0, paymentsThisMonth: 0,
      averageRFQValue: 0, procurementHealthScore: 0,
    }
  }

  const [rfqRes, quoteRes, contractRes, invoiceRes, paymentRes, profileRes] =
    await Promise.all([
      supabase.from("rfqs").select("id, status, budget, created_at"),
      supabase.from("quotes").select("id, supplier_id, status, created_at"),
      supabase.from("contracts").select("id, status, contract_value, created_at"),
      supabase.from("invoices").select("id, status, total_amount, amount, created_at"),
      supabase.from("payments").select("id, status, amount, payment_date, created_at"),
      supabase.from("profiles").select("id, role, verification_status"),
    ])

  const rfqs = (rfqRes.data ?? []) as Array<{ id: number; status: string | null; budget: string | null; created_at: string | null }>
  const quotes = (quoteRes.data ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null; created_at: string | null }>
  const contracts = (contractRes.data ?? []) as Array<{ id: number; status: string | null; contract_value: string | null; created_at: string | null }>
  const invoices = (invoiceRes.data ?? []) as Array<{ id: number; status: string | null; total_amount: string | number | null; amount: string | number | null; created_at: string | null }>
  const payments = (paymentRes.data ?? []) as Array<{ id: number; status: string | null; amount: string | number | null; payment_date: string | null; created_at: string | null }>
  const profiles = (profileRes.data ?? []) as Array<{ id: string; role: string | null; verification_status: string | null }>

  const totalProcurementValue = contracts.reduce(
    (sum, c) => sum + parseCurrency(c.contract_value), 0
  )

  const activeSupplierIds = new Set(
    quotes.map((q) => q.supplier_id).filter(Boolean) as string[]
  )
  const activeSuppliers = activeSupplierIds.size

  const activeRFQs = rfqs.filter((r) => r.status?.trim().toLowerCase() === "open").length

  const awardedContracts = contracts.filter((c) =>
    c.status === "Active" || c.status === "Completed"
  ).length

  const outstandingInvoices = invoices.filter((i) =>
    i.status !== "Paid" && i.status !== "Cancelled"
  ).length

  const paymentsThisMonth = payments
    .filter((p) => p.status === "Paid" && isThisMonth(p.payment_date ?? p.created_at))
    .reduce((sum, p) => sum + parseCurrency(p.amount), 0)

  const rfqsWithBudget = rfqs.filter((r) => r.budget && parseCurrency(r.budget) > 0)
  const averageRFQValue = rfqsWithBudget.length > 0
    ? rfqsWithBudget.reduce((sum, r) => sum + parseCurrency(r.budget), 0) / rfqsWithBudget.length
    : 0

  // Health score: weighted composite
  const closedRFQs = rfqs.filter((r) =>
    ["awarded", "closed", "cancelled"].includes(r.status?.trim().toLowerCase() ?? "")
  )
  const awardRate = closedRFQs.length > 0
    ? rfqs.filter((r) => r.status?.trim().toLowerCase() === "awarded").length / closedRFQs.length
    : 0

  const approvedInvoices = invoices.filter((i) => i.status === "Approved" || i.status === "Paid")
  const paymentRate = approvedInvoices.length > 0
    ? invoices.filter((i) => i.status === "Paid").length / approvedInvoices.length
    : 0

  const completedContracts = contracts.filter((c) => c.status === "Completed").length
  const contractCompletionRate = contracts.length > 0
    ? completedContracts / contracts.length
    : 0

  const supplierCount = profiles.filter((p) => p.role === "supplier").length
  const verifiedCount = profiles.filter((p) => isVerifiedStatus(p.verification_status)).length
  const verificationRate = supplierCount > 0 ? verifiedCount / supplierCount : 0

  const procurementHealthScore = Math.round(
    awardRate * 30 +
    paymentRate * 25 +
    contractCompletionRate * 25 +
    verificationRate * 20
  )

  return {
    totalProcurementValue,
    activeSuppliers,
    activeRFQs,
    awardedContracts,
    outstandingInvoices,
    paymentsThisMonth,
    averageRFQValue,
    procurementHealthScore,
  }
}

// ─── getSupplierScores ────────────────────────────────────────────────────────

export async function getSupplierScores(): Promise<SupplierIntelligenceRecord[]> {
  if (!supabase) return []

  const [profileRes, quoteRes, contractRes, invoiceRes, paymentRes, bankingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, business_name, province, industry, phone, email, verification_status, " +
          "csd_number, bbbee_level, tax_status, company_registration, cidb_grade, " +
          "csd_verified, bbbee_verified, tax_verified, bank_verified, banking_verified, director_verified, " +
          "csd_document_url, bbbee_document_url, tax_document_url, " +
          "company_registration_url, cidb_document_url, capability_statement_url, updated_at"
      )
      .eq("role", "supplier"),
    supabase.from("quotes").select("id, supplier_id, status"),
    supabase.from("contracts").select("id, supplier_id, status, contract_value"),
    supabase.from("invoices").select("id, supplier_id, status"),
    supabase.from("payments").select("id, supplier_id, status"),
    supabase.from("supplier_bank_details").select("supplier_id, verification_status"),
  ])

  const profileRows = (profileRes.data ?? []) as unknown as Array<{
    id: string; business_name: string | null; province: string | null
    industry: string | null; phone: string | null; email: string | null
    verification_status: string | null; csd_number: string | null
    bbbee_level: string | null; tax_status: string | null
    company_registration: string | null; cidb_grade: string | null
    csd_verified?: boolean | null; bbbee_verified?: boolean | null
    tax_verified?: boolean | null; bank_verified?: boolean | null
    banking_verified?: boolean | null; director_verified?: boolean | null
    csd_document_url: string | null; bbbee_document_url: string | null
    tax_document_url: string | null; company_registration_url: string | null
    cidb_document_url: string | null; capability_statement_url: string | null
    updated_at: string | null
    supplier_documents?: SupplierDocument[]
  }>
  const documentResult = await fetchSupplierDocumentsByProfileIds(profileRows.map((profile) => profile.id))
  const profiles = applySupplierDocumentsToProfiles(profileRows, documentResult.documentsByProfile)
  const quotes = (quoteRes.data ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null }>
  const contracts = (contractRes.data ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null; contract_value: string | number | null }>
  const invoices = (invoiceRes.data ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null }>
  const payments = (paymentRes.data ?? []) as Array<{ id: number; supplier_id: string | null; status: string | null }>
  const banking = (bankingRes.data ?? []) as Array<{ supplier_id: string | null; verification_status: string | null }>

  const totalRFQs = await supabase.from("rfqs").select("id", { count: "exact", head: true })
  const rfqTotal = totalRFQs.count ?? 1

  const activityBySupplier = buildSupplierActivityById({
    supplierIds: profiles.map((profile) => profile.id),
    quotes,
    contracts,
    invoices,
    payments,
  })

  return profiles.map((p) => {
    const supplierQuotes = quotes.filter((q) => q.supplier_id === p.id)
    const supplierContracts = contracts.filter((c) => c.supplier_id === p.id)
    const supplierInvoices = invoices.filter((i) => i.supplier_id === p.id)
    const supplierPayments = payments.filter((payment) => payment.supplier_id === p.id)
    const bankingVerified = banking.some(
      (record) =>
        record.supplier_id === p.id &&
        isVerifiedStatus(record.verification_status)
    )

    const responseRate = Math.min(100, Math.round((supplierQuotes.length / rfqTotal) * 100))

    const awardedQuotes = supplierQuotes.filter((q) =>
      q.status === "Awarded" || q.status === "Approved"
    ).length
    const awardRate = supplierQuotes.length > 0
      ? Math.round((awardedQuotes / supplierQuotes.length) * 100)
      : 0

    const completedContracts = supplierContracts.filter((c) => c.status === "Completed").length
    const completionRate = supplierContracts.length > 0
      ? Math.round((completedContracts / supplierContracts.length) * 100)
      : 0

    const approvedInvoices = supplierInvoices.filter((i) =>
      i.status === "Approved" || i.status === "Paid"
    ).length
    const paidInvoices = supplierInvoices.filter((i) => i.status === "Paid").length
    const invoiceCompliance = supplierInvoices.length > 0
      ? Math.round((approvedInvoices / supplierInvoices.length) * 100)
      : 0
    const paymentReliabilityRate = approvedInvoices > 0
      ? Math.round((paidInvoices / approvedInvoices) * 100)
      : supplierPayments.length > 0
        ? Math.round((supplierPayments.filter((payment) => payment.status === "Paid").length / supplierPayments.length) * 100)
        : 0
    const procurementValue = supplierContracts.reduce(
      (sum, contract) => sum + parseCurrency(contract.contract_value),
      0
    )

    const score = Math.round(
      (responseRate + awardRate + completionRate + invoiceCompliance + paymentReliabilityRate) / 5
    )
    const smartScore = calculateSupplierSmartScore(
      {
        ...p,
        bank_verified: bankingVerified,
      },
      activityBySupplier[p.id] ?? {}
    )

    const riskLevel: "Low" | "Medium" | "High" =
      score >= 70 ? "Low" : score >= 40 ? "Medium" : "High"
    const riskRating: "Low" | "Medium" | "High" | "Critical" =
      smartScore.score < 30
        ? "Critical"
        : smartScore.score <= 39
          ? "High"
          : smartScore.score <= 59
            ? "Medium"
            : "Low"

    return {
      supplierId: p.id,
      supplierName: p.business_name ?? "Unnamed Supplier",
      province: p.province,
      industry: displayIndustry(p.industry) || null,
      verificationStatus: p.verification_status,
      level: smartScore.label,
      riskRating,
      responseRate,
      awardRate,
      completionRate,
      invoiceCompliance,
      paymentReliabilityRate,
      awards: awardedQuotes,
      contracts: supplierContracts.length,
      completedContracts,
      invoices: supplierInvoices.length,
      approvedInvoices,
      paidInvoices,
      procurementValue,
      improvementTips: smartScore.tips,
      score,
      smartScore,
      riskLevel,
    }
  }).sort((a, b) => b.smartScore.score - a.smartScore.score)
}

// ─── getProcurementAnalytics ──────────────────────────────────────────────────

export async function getProcurementAnalytics(): Promise<ProcurementAnalyticsData> {
  if (!supabase) {
    return { rfqVolumeByMonth: [], procurementValueByMonth: [], categoryBreakdown: [] }
  }

  const [rfqRes, contractRes] = await Promise.all([
    supabase.from("rfqs").select("id, category, budget, status, created_at").order("created_at"),
    supabase.from("contracts").select("id, contract_value, created_at").order("created_at"),
  ])

  const rfqs = (rfqRes.data ?? []) as Array<{
    id: number; category: string | null; budget: string | null
    status: string | null; created_at: string | null
  }>
  const contracts = (contractRes.data ?? []) as Array<{
    id: number; contract_value: string | null; created_at: string | null
  }>

  // RFQ volume by month
  const rfqByMonth = new Map<string, number>()
  for (const r of rfqs) {
    const key = monthKey(r.created_at)
    rfqByMonth.set(key, (rfqByMonth.get(key) ?? 0) + 1)
  }
  const rfqVolumeByMonth = Array.from(rfqByMonth.entries())
    .filter(([k]) => k !== "Unknown")
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([k, count]) => ({ month: monthLabel(k), count }))

  // Procurement value by month (from contracts)
  const valueByMonth = new Map<string, number>()
  for (const c of contracts) {
    const key = monthKey(c.created_at)
    valueByMonth.set(key, (valueByMonth.get(key) ?? 0) + parseCurrency(c.contract_value))
  }
  const procurementValueByMonth = Array.from(valueByMonth.entries())
    .filter(([k]) => k !== "Unknown")
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([k, value]) => ({ month: monthLabel(k), value }))

  // Category breakdown
  const catMap = new Map<string, { count: number; value: number }>()
  for (const r of rfqs) {
    const cat = r.category?.trim() || "Uncategorised"
    const entry = catMap.get(cat) ?? { count: 0, value: 0 }
    entry.count++
    entry.value += parseCurrency(r.budget)
    catMap.set(cat, entry)
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([category, { count, value }]) => ({ category, count, value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { rfqVolumeByMonth, procurementValueByMonth, categoryBreakdown }
}

// ─── getRegionalInsights ──────────────────────────────────────────────────────

export async function getRegionalInsights(): Promise<RegionalInsightRecord[]> {
  if (!supabase) return []

  const [rfqRes, profileRes, contractRes] = await Promise.all([
    supabase.from("rfqs").select("id, province, budget"),
    supabase.from("profiles").select("id, province, role").eq("role", "supplier"),
    supabase.from("contracts").select("id, status, contract_value, supplier_id"),
  ])

  const rfqs = (rfqRes.data ?? []) as Array<{ id: number; province: string | null; budget: string | null }>
  const profiles = (profileRes.data ?? []) as Array<{ id: string; province: string | null; role: string | null }>
  const contracts = (contractRes.data ?? []) as Array<{
    id: number; status: string | null; contract_value: string | null; supplier_id: string | null
  }>

  const regionMap = new Map<string, RegionalInsightRecord>()

  const ensure = (province: string) => {
    if (!regionMap.has(province)) {
      regionMap.set(province, {
        province, rfqCount: 0, supplierCount: 0, totalValue: 0, activeContracts: 0,
      })
    }
    return regionMap.get(province)!
  }

  for (const r of rfqs) {
    const prov = r.province?.trim() || "Unassigned"
    const rec = ensure(prov)
    rec.rfqCount++
    rec.totalValue += parseCurrency(r.budget)
  }

  for (const p of profiles) {
    const prov = p.province?.trim() || "Unassigned"
    ensure(prov).supplierCount++
  }

  // Map supplier province to contracts
  const supplierProvMap = new Map<string, string>()
  for (const p of profiles) {
    if (p.id && p.province) supplierProvMap.set(p.id, p.province.trim())
  }

  for (const c of contracts) {
    if (c.status !== "Active" && c.status !== "Completed") continue
    const prov = (c.supplier_id ? supplierProvMap.get(c.supplier_id) : undefined) ?? "Unassigned"
    ensure(prov).activeContracts++
  }

  return Array.from(regionMap.values())
    .filter((r) => r.province !== "Unassigned" || r.rfqCount > 0 || r.supplierCount > 0)
    .sort((a, b) => b.rfqCount - a.rfqCount)
}

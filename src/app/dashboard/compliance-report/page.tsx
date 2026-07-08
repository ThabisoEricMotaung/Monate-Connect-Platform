"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { isVerifiedStatus } from "@/lib/supplierStatus"
import {
  applySupplierDocumentsToProfiles,
  fetchSupplierDocumentsByProfileIds,
  type SupplierDocument,
} from "@/lib/supplierDocuments"

type SupplierProfile = {
  id: string
  business_name: string | null
  full_name: string | null
  email: string | null
  verification_status: string | null
  bbbee_level: string | null
  company_registration: string | null
  tax_reference: string | null
  vat_number: string | null
  csd_number: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url?: string | null
  cidb_document_url?: string | null
  capability_statement_url?: string | null
  supplier_documents?: SupplierDocument[]
}

type ContractRow = {
  id: number
  supplier_id: string | null
  supplier_name: string | null
  status: string | null
  contract_value: string | number | null
  created_at: string | null
}

type ComplianceData = {
  suppliers: SupplierProfile[]
  contracts: ContractRow[]
  errors: string[]
}

type StatusBreakdown = {
  status: "Verified" | "Pending" | "Rejected" | "Incomplete"
  count: number
}

type CompletionRow = {
  label: string
  complete: number
  total: number
  percent: number
}

const EMPTY_DATA: ComplianceData = {
  suppliers: [],
  contracts: [],
  errors: [],
}

const GREEN = "#2F8C67"
const GOLD = "#8A6A32"
const ACCENT = "#315A78"
const RED = "#b91c1c"
const MUTED = "#8497A6"
const TICK = "#5B6470"
const STATUS_COLORS: Record<StatusBreakdown["status"], string> = {
  Verified: GREEN,
  Pending: GOLD,
  Rejected: RED,
  Incomplete: MUTED,
}

async function readRows<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<{ rows: T[]; error: string | null }> {
  const { data, error } = await query

  if (error) {
    console.error(`Compliance report ${label} load failed:`, error)
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

function normalizeStatus(status: string | null): StatusBreakdown["status"] {
  const value = String(status ?? "").trim().toLowerCase()

  if (value === "verified") return "Verified"
  if (value === "pending review" || value === "under review" || value === "pending") return "Pending"
  if (value === "rejected") return "Rejected"
  return "Incomplete"
}

function isActiveContract(status: string | null): boolean {
  const value = String(status ?? "").trim().toLowerCase()
  return ["active", "issued", "in progress", "awaiting buyer signature", "awaiting your signature", "fully signed"].includes(value)
}

function bbbeeBucket(value: string | null): string {
  const normalized = String(value ?? "").trim()
  if (!normalized) return "Unrated"

  const lower = normalized.toLowerCase()
  if (lower.includes("exempt") || lower.includes("eme")) return "Exempt"

  const level = normalized.match(/[1-8]/)?.[0]
  return level ? `Level ${level}` : "Unrated"
}

function percentage(complete: number, total: number): number {
  return total > 0 ? Math.round((complete / total) * 100) : 0
}

function missingDocuments(supplier: SupplierProfile): string[] {
  const missing: string[] = []

  if (!hasValue(supplier.csd_document_url)) missing.push("CSD certificate")
  if (!hasValue(supplier.tax_reference)) missing.push("Tax reference number")
  if (!hasValue(supplier.vat_number)) missing.push("VAT number")
  if (!hasValue(supplier.bbbee_document_url)) missing.push("BBBEE certificate")
  if (!hasValue(supplier.company_registration)) missing.push("CIPC registration")

  return missing
}

async function loadComplianceData(): Promise<ComplianceData> {
  if (!supabase) {
    return {
      ...EMPTY_DATA,
      errors: ["Supabase environment variables are not configured."],
    }
  }

  const [suppliers, contracts] = await Promise.all([
    readRows<SupplierProfile>(
      "profiles",
      supabase
        .from("profiles")
        .select(
          "id, business_name, full_name, email, verification_status, bbbee_level, company_registration, tax_reference, vat_number, csd_number, csd_document_url, bbbee_document_url, tax_document_url",
        )
        .eq("role", "supplier"),
    ),
    readRows<ContractRow>(
      "contracts",
      supabase
        .from("contracts")
        .select("id, supplier_id, supplier_name, status, contract_value, created_at")
        .order("created_at", { ascending: false }),
    ),
  ])

  const supplierIds = suppliers.rows.map((supplier) => supplier.id)
  const documents = await fetchSupplierDocumentsByProfileIds(supplierIds)

  return {
    suppliers: applySupplierDocumentsToProfiles(suppliers.rows, documents.documentsByProfile),
    contracts: contracts.rows,
    errors: [suppliers.error, contracts.error, documents.error].filter(Boolean) as string[],
  }
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-heading">{value.toLocaleString("en-ZA")}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-panel bg-surface px-6 py-10 text-center">
      <p className="text-sm font-semibold text-muted">No compliance data available yet.</p>
    </div>
  )
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-panel bg-card px-3 py-2 shadow-panel">
      {label && <p className="mb-1 text-xs font-semibold text-heading">{label}</p>}
      {payload.map((item) => (
        <p key={item.name ?? "value"} className="text-xs" style={{ color: item.color ?? GREEN }}>
          {item.name ?? "Suppliers"}:{" "}
          <span className="font-semibold">{Number(item.value ?? 0).toLocaleString("en-ZA")}</span>
        </p>
      ))}
    </div>
  )
}

export default function ComplianceReportPage() {
  const [data, setData] = useState<ComplianceData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    loadComplianceData()
      .then((nextData) => {
        if (!cancelled) setData(nextData)
      })
      .catch((error) => {
        console.error("Compliance report load failed:", error)
        if (!cancelled) {
          setData({
            ...EMPTY_DATA,
            errors: ["Compliance report data could not be loaded."],
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
    const totalSuppliers = data.suppliers.length
    const activeSupplierIds = new Set(
      data.contracts
        .filter((contract) => isActiveContract(contract.status))
        .map((contract) => contract.supplier_id)
        .filter((id): id is string => Boolean(id)),
    )
    const statusCounts = new Map<StatusBreakdown["status"], number>([
      ["Verified", 0],
      ["Pending", 0],
      ["Rejected", 0],
      ["Incomplete", 0],
    ])
    const bbbeeCounts = new Map<string, number>(
      ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Level 8", "Exempt", "Unrated"].map(
        (level) => [level, 0],
      ),
    )

    data.suppliers.forEach((supplier) => {
      const status = normalizeStatus(supplier.verification_status)
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)

      const level = bbbeeBucket(supplier.bbbee_level)
      bbbeeCounts.set(level, (bbbeeCounts.get(level) ?? 0) + 1)
    })

    const completionRows: CompletionRow[] = [
      {
        label: "CSD certificate uploaded",
        complete: data.suppliers.filter((supplier) => hasValue(supplier.csd_document_url)).length,
        total: totalSuppliers,
        percent: 0,
      },
      {
        label: "Tax reference number",
        complete: data.suppliers.filter((supplier) => hasValue(supplier.tax_reference)).length,
        total: totalSuppliers,
        percent: 0,
      },
      {
        label: "VAT number",
        complete: data.suppliers.filter((supplier) => hasValue(supplier.vat_number)).length,
        total: totalSuppliers,
        percent: 0,
      },
      {
        label: "BBBEE certificate uploaded",
        complete: data.suppliers.filter((supplier) => hasValue(supplier.bbbee_document_url)).length,
        total: totalSuppliers,
        percent: 0,
      },
    ].map((row) => ({ ...row, percent: percentage(row.complete, row.total) }))

    const nonCompliant = data.suppliers
      .map((supplier) => ({
        id: supplier.id,
        name: supplierName(supplier),
        missing: missingDocuments(supplier),
        status: supplier.verification_status || "Incomplete",
        hasActiveContracts: activeSupplierIds.has(supplier.id),
      }))
      .filter((supplier) => supplier.missing.length > 0)
      .sort((a, b) => Number(b.hasActiveContracts) - Number(a.hasActiveContracts) || b.missing.length - a.missing.length)
      .slice(0, 15)

    return {
      totalSuppliers,
      verifiedSuppliers: data.suppliers.filter((supplier) => isVerifiedStatus(supplier.verification_status)).length,
      pendingVerification: data.suppliers.filter((supplier) => supplier.verification_status === "Pending Review").length,
      bbbeeCompliant: data.suppliers.filter((supplier) => hasValue(supplier.bbbee_level)).length,
      csdRegistered: data.suppliers.filter((supplier) => hasValue(supplier.csd_number)).length,
      activeContracts: data.contracts.filter((contract) => isActiveContract(contract.status)).length,
      statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
      bbbeeLevels: Array.from(bbbeeCounts.entries()).map(([level, count]) => ({ level, count })),
      completionRows,
      nonCompliant,
    }
  }, [data])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement Intelligence
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Compliance Report</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Monitor supplier verification, BBBEE coverage, registration readiness, and missing compliance documents.
        </p>
      </div>

      {data.errors.length > 0 && (
        <div className="mb-6 rounded-md border border-warning/35 bg-warning-soft px-5 py-4">
          <p className="text-sm font-semibold text-warning">Some compliance records could not be loaded</p>
          <p className="mt-1 text-xs leading-5 text-secondary">{data.errors.join(" ")}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
          ))}
        </div>
      ) : viewModel.totalSuppliers === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Verified suppliers"
              value={viewModel.verifiedSuppliers}
              detail="verification_status = Verified"
            />
            <SummaryCard
              label="Pending verification"
              value={viewModel.pendingVerification}
              detail="verification_status = Pending Review"
            />
            <SummaryCard
              label="BBBEE compliant"
              value={viewModel.bbbeeCompliant}
              detail="Suppliers with a captured BBBEE level"
            />
            <SummaryCard
              label="CSD registered"
              value={viewModel.csdRegistered}
              detail="Suppliers with a captured CSD number"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Verification
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">Supplier verification status</h2>
              </div>
              {viewModel.statusBreakdown.every((row) => row.count === 0) ? (
                <EmptyState />
              ) : (
                <div className="grid gap-5 md:grid-cols-[1fr_0.8fr]">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={viewModel.statusBreakdown}
                          dataKey="count"
                          nameKey="status"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={3}
                        >
                          {viewModel.statusBreakdown.map((row) => (
                            <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    {viewModel.statusBreakdown.map((row) => (
                      <div key={row.status} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-secondary">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[row.status] }} />
                          {row.status}
                        </span>
                        <span className="font-bold tabular-nums text-heading">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="mb-4 border-b border-panel pb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  BBBEE
                </p>
                <h2 className="mt-1 text-lg font-semibold text-heading">BBBEE level distribution</h2>
              </div>
              {viewModel.bbbeeLevels.every((row) => row.count === 0) ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={viewModel.bbbeeLevels} margin={{ top: 8, right: 14, bottom: 8, left: 0 }}>
                    <XAxis dataKey="level" tick={{ fill: TICK, fontSize: 10 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fill: TICK, fontSize: 11 }} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Suppliers" fill={ACCENT} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="mb-5 border-b border-panel pb-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                Documents
              </p>
              <h2 className="mt-1 text-lg font-semibold text-heading">Document completion rate</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {viewModel.completionRows.map((row, index) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-secondary">{row.label}</span>
                    <span className="font-bold tabular-nums text-heading">
                      {row.percent}% · {row.complete}/{row.total}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-panel">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(row.percent, row.complete > 0 ? 4 : 0)}%`,
                        background: index % 2 === 0 ? GREEN : GOLD,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
            <div className="border-b border-panel px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-accent">
                    Supplier gaps
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-heading">Non-compliant suppliers</h2>
                </div>
                <p className="text-xs font-semibold text-muted">
                  {viewModel.activeContracts.toLocaleString("en-ZA")} active contracts loaded
                </p>
              </div>
            </div>
            {viewModel.nonCompliant.length === 0 ? (
              <div className="p-5">
                <EmptyState />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-panel bg-panel text-left text-[0.68rem] uppercase tracking-[0.18em] text-secondary">
                    <tr>
                      <th className="px-5 py-3">Supplier</th>
                      <th className="px-5 py-3">Missing documents</th>
                      <th className="px-5 py-3">Verification status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-panel">
                    {viewModel.nonCompliant.map((supplier) => (
                      <tr key={supplier.id} className="transition hover:bg-surface">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-heading">{supplier.name}</p>
                          {supplier.hasActiveContracts && (
                            <p className="mt-1 text-xs font-semibold text-warning">Active contract supplier</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-secondary">{supplier.missing.join(", ")}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-md border border-panel bg-surface px-2.5 py-1 text-xs font-semibold text-secondary">
                            {supplier.status}
                          </span>
                        </td>
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

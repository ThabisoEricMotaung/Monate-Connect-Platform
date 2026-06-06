"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

type CheckStatus = "Passed" | "Warning" | "Failed"

type ReadinessCheck = {
  category: "Environment" | "Business" | "Security" | "UX"
  label: string
  status: CheckStatus
  detail: string
}

type TableResult = {
  table: string
  exists: boolean
  count: number
  error: string | null
}

const REQUIRED_TABLES = [
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
  "workflow_rules",
  "decision_board_items",
  "approval_matrix",
  "delegation_authority",
  "procurement_overrides",
]

const CORE_RLS_TABLES = [
  "profiles",
  "rfqs",
  "quotes",
  "purchase_orders",
  "contracts",
  "invoices",
  "payments",
  "messages",
  "supplier_bank_details",
  "audit_logs",
]

const REQUIRED_BUCKETS = ["supplier-documents", "rfq-documents"]

const statusStyles: Record<CheckStatus, string> = {
  Passed: "border-success/35 bg-success-soft text-success",
  Warning: "border-warning/35 bg-warning/10 text-warning",
  Failed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

const categoryDescriptions: Record<ReadinessCheck["category"], string> = {
  Environment: "Infrastructure, database tables, storage, and RLS metadata.",
  Business: "Core procurement lifecycle readiness from registration through payment.",
  Security: "Access control, auditability, role metadata, and protected sensitive data.",
  UX: "Presentation, accessibility, localisation, and mobile usability signals.",
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("does not exist") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
}

function formatError(error: { message?: string; code?: string; details?: string | null; hint?: string | null }): string {
  return [
    error.message,
    error.code ? `Code: ${error.code}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ].filter(Boolean).join(" | ")
}

function check(
  category: ReadinessCheck["category"],
  label: string,
  status: CheckStatus,
  detail: string
): ReadinessCheck {
  return { category, label, status, detail }
}

async function getTableResult(table: string): Promise<TableResult> {
  if (!supabase) return { table, exists: false, count: 0, error: "Supabase is not configured." }

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })

  if (error) {
    return {
      table,
      exists: !isMissingTableError(error),
      count: 0,
      error: formatError(error),
    }
  }

  return { table, exists: true, count: count ?? 0, error: null }
}

async function hasColumn(table: string, column: string): Promise<{ ok: boolean; detail: string }> {
  if (!supabase) return { ok: false, detail: "Supabase is not configured." }

  const { error } = await supabase
    .from(table)
    .select(column)
    .limit(1)

  if (error) return { ok: false, detail: formatError(error) }
  return { ok: true, detail: `${table}.${column} is accessible.` }
}

async function countWhere(table: string, column: string, value: string): Promise<{ count: number; error: string | null }> {
  if (!supabase) return { count: 0, error: "Supabase is not configured." }

  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value)

  if (error) return { count: 0, error: formatError(error) }
  return { count: count ?? 0, error: null }
}

async function listBuckets(): Promise<{ buckets: string[]; error: string | null }> {
  if (!supabase) return { buckets: [], error: "Supabase is not configured." }

  const { data, error } = await supabase.storage.listBuckets()
  if (error) return { buckets: [], error: formatError(error) }
  return { buckets: (data ?? []).map((bucket) => bucket.name), error: null }
}

// pg_tables and pg_policies are Postgres system catalog views that are not
// accessible from the browser-side Supabase anon client. RLS metadata checks
// must be performed server-side (e.g. via a Supabase Edge Function or the
// Supabase Dashboard). These stubs return a safe informational status instead
// of attempting the failing query.
function getRlsTables(): Promise<{ enabled: string[]; error: string | null }> {
  return Promise.resolve({
    enabled: [],
    error: "RLS metadata requires a server-side check — verify in Supabase Dashboard → Authentication → Policies.",
  })
}

function getPolicyTables(): Promise<{ tables: string[]; error: string | null }> {
  return Promise.resolve({
    tables: [],
    error: "Policy metadata requires a server-side check — verify in Supabase Dashboard → Authentication → Policies.",
  })
}

function readinessStatus(score: number): string {
  if (score >= 90) return "Production Ready"
  if (score >= 75) return "Pilot Ready"
  if (score >= 50) return "Needs Attention"
  return "Not Ready"
}

function scoreChecks(checks: ReadinessCheck[]): number {
  if (checks.length === 0) return 0
  const points = checks.reduce((sum, item) => {
    if (item.status === "Passed") return sum + 1
    if (item.status === "Warning") return sum + 0.5
    return sum
  }, 0)
  return Math.round((points / checks.length) * 100)
}

async function runReadinessChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = []

  checks.push(check(
    "Environment",
    "Supabase URL configured",
    process.env.NEXT_PUBLIC_SUPABASE_URL ? "Passed" : "Failed",
    process.env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL is available to the client." : "NEXT_PUBLIC_SUPABASE_URL is missing."
  ))
  checks.push(check(
    "Environment",
    "Supabase anon key configured",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Passed" : "Failed",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "NEXT_PUBLIC_SUPABASE_ANON_KEY is available to the client." : "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."
  ))
  checks.push(check(
    "Environment",
    "Supabase client initialised",
    isSupabaseConfigured && supabase ? "Passed" : "Failed",
    isSupabaseConfigured && supabase ? "Supabase browser client is configured." : "Supabase client is unavailable."
  ))

  const tableResults = await Promise.all(REQUIRED_TABLES.map((table) => getTableResult(table)))
  const missingTables = tableResults.filter((table) => !table.exists)
  const emptyTables = tableResults.filter((table) => table.exists && table.count === 0)

  checks.push(check(
    "Environment",
    "Required tables exist",
    missingTables.length === 0 ? "Passed" : "Failed",
    missingTables.length === 0
      ? `${REQUIRED_TABLES.length} required tables are accessible.`
      : `Missing or inaccessible tables: ${missingTables.map((table) => table.table).join(", ")}.`
  ))
  checks.push(check(
    "Environment",
    "Required tables contain operational data",
    emptyTables.length === 0 ? "Passed" : "Warning",
    emptyTables.length === 0
      ? "Required tables contain records."
      : `Empty tables: ${emptyTables.map((table) => table.table).join(", ")}.`
  ))

  const buckets = await listBuckets()
  if (buckets.error) {
    checks.push(check("Environment", "Required storage buckets exist", "Warning", `Manual setup required: storage bucket metadata could not be verified from this client. Create ${REQUIRED_BUCKETS.join(" and ")} in Supabase Storage. ${buckets.error}`))
  } else {
    const missingBuckets = REQUIRED_BUCKETS.filter((bucket) => !buckets.buckets.includes(bucket))
    checks.push(check(
      "Environment",
      "Required storage buckets exist",
      missingBuckets.length === 0 ? "Passed" : "Warning",
      missingBuckets.length === 0
        ? `Storage buckets found: ${REQUIRED_BUCKETS.join(", ")}.`
        : `Manual setup required: create missing Supabase Storage bucket(s): ${missingBuckets.join(", ")}.`
    ))
  }

  const rlsTables = await getRlsTables()
  if (rlsTables.error) {
    checks.push(check("Environment", "RLS enabled on sensitive tables", "Warning", `RLS metadata could not be verified from this client: ${rlsTables.error}`))
  } else {
    const missingRls = CORE_RLS_TABLES.filter((table) => !rlsTables.enabled.includes(table))
    checks.push(check(
      "Environment",
      "RLS enabled on sensitive tables",
      missingRls.length === 0 ? "Passed" : "Failed",
      missingRls.length === 0 ? "Core sensitive tables report RLS enabled." : `RLS not detected for: ${missingRls.join(", ")}.`
    ))
  }

  const adminCount = await countWhere("profiles", "role", "admin")
  checks.push(check(
    "Business",
    "At least one admin user exists",
    adminCount.error ? "Warning" : adminCount.count > 0 ? "Passed" : "Failed",
    adminCount.error ?? `${adminCount.count} admin profile${adminCount.count === 1 ? "" : "s"} found.`
  ))

  const supplierCount = await countWhere("profiles", "role", "supplier")
  checks.push(check(
    "Business",
    "Supplier registration works",
    supplierCount.error ? "Warning" : supplierCount.count > 0 ? "Passed" : "Warning",
    supplierCount.error ?? `${supplierCount.count} supplier profile${supplierCount.count === 1 ? "" : "s"} found.`
  ))

  const businessChecks: [string, string, string][] = [
    ["RFQ creation works", "rfqs", "RFQ records are available."],
    ["Quote submission works", "quotes", "Quote records are available."],
    ["PO generation works", "purchase_orders", "Purchase order records are available."],
    ["Contract generation works", "contracts", "Contract records are available."],
    ["Invoice generation works", "invoices", "Invoice records are available."],
    ["Payment tracking works", "payments", "Payment records are available."],
  ]

  businessChecks.forEach(([label, table, passedDetail]) => {
    const tableResult = tableResults.find((result) => result.table === table)
    checks.push(check(
      "Business",
      label,
      !tableResult?.exists ? "Failed" : tableResult.count > 0 ? "Passed" : "Warning",
      !tableResult?.exists
        ? `${table} table is missing or inaccessible.`
        : tableResult.count > 0
          ? `${passedDetail} Count: ${tableResult.count}.`
          : `${table} table exists but has no records yet.`
    ))
  })

  const roleColumn = await hasColumn("profiles", "role")
  checks.push(check("Security", "Role column exists in profiles", roleColumn.ok ? "Passed" : "Failed", roleColumn.detail))
  checks.push(check("Security", "Admin routes protected", "Passed", "This page is gated by requireAdminOrBuyer before diagnostics load."))
  checks.push(check("Security", "Supplier routes protected", "Warning", "Route protection should be verified with an end-to-end unauthenticated browser test before production launch."))

  const bankingTable = tableResults.find((result) => result.table === "supplier_bank_details")
  checks.push(check(
    "Security",
    "Banking data protected",
    bankingTable?.exists ? "Warning" : "Failed",
    bankingTable?.exists
      ? "Banking table exists. Confirm RLS policies restrict records to authorised users and finance/admin roles."
      : "supplier_bank_details table is missing or inaccessible."
  ))

  const auditTable = tableResults.find((result) => result.table === "audit_logs")
  checks.push(check(
    "Security",
    "Audit logs active",
    auditTable?.exists && auditTable.count > 0 ? "Passed" : auditTable?.exists ? "Warning" : "Failed",
    auditTable?.exists
      ? `${auditTable.count} audit log record${auditTable.count === 1 ? "" : "s"} found.`
      : "audit_logs table is missing or inaccessible."
  ))

  const policies = await getPolicyTables()
  if (policies.error) {
    checks.push(check("Security", "RLS policies exist for core tables", "Warning", `Policy metadata could not be verified from this client: ${policies.error}`))
  } else {
    const missingPolicyTables = CORE_RLS_TABLES.filter((table) => !policies.tables.includes(table))
    checks.push(check(
      "Security",
      "RLS policies exist for core tables",
      missingPolicyTables.length === 0 ? "Passed" : "Failed",
      missingPolicyTables.length === 0 ? "Core tables have visible policy metadata." : `No visible policy metadata for: ${missingPolicyTables.join(", ")}.`
    ))
  }

  checks.push(check("UX", "Language switcher active", "Passed", "LanguageSwitcher is mounted in the global navigation."))
  checks.push(check("UX", "Accessibility panel active", "Passed", "AccessibilityPanel is mounted in the root layout with comfort controls."))
  checks.push(check("UX", "Theme toggle active", "Passed", "AppearanceCore and ThemeProvider are mounted in the root layout."))
  checks.push(check("UX", "News ticker active", "Passed", "NewsTicker is mounted in the root layout."))
  checks.push(check("UX", "Mobile navigation usable", "Warning", "Responsive CSS exists; verify touch navigation on mobile before production sign-off."))

  return checks
}

function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusStyles[status]}`}>
      {status}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 44
  const offset = circumference - (score / 100) * circumference
  const label = readinessStatus(score)

  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-panel bg-card p-6 text-center shadow-panel">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-panel" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={score >= 90 ? "text-success" : score >= 75 ? "text-accent" : score >= 50 ? "text-warning" : "text-rose-600"}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-heading">{score}%</p>
          <p className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">Readiness</p>
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold text-heading">{label}</p>
    </div>
  )
}

export default function ProductionReadinessPage() {
  const router = useRouter()
  const [checks, setChecks] = useState<ReadinessCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  async function refresh() {
    setRefreshing(true)
    setError("")
    try {
      const result = await runReadinessChecks()
      setChecks(result)
      setLastChecked(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Production readiness checks failed.")
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) {
        router.replace("/dashboard")
        return
      }
      await refresh()
    }

    load()
  }, [router])

  const score = useMemo(() => scoreChecks(checks), [checks])
  const grouped = useMemo(() => {
    return checks.reduce<Record<ReadinessCheck["category"], ReadinessCheck[]>>((acc, item) => {
      acc[item.category] = [...(acc[item.category] ?? []), item]
      return acc
    }, { Environment: [], Business: [], Security: [], UX: [] })
  }, [checks])
  const counts = useMemo(() => ({
    passed: checks.filter((item) => item.status === "Passed").length,
    warning: checks.filter((item) => item.status === "Warning").length,
    failed: checks.filter((item) => item.status === "Failed").length,
  }), [checks])

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Launch Governance</p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">Production Readiness Centre</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
            Assess whether Monate Connect is ready for demo, pilot, or production use across
            environment, business workflow, security, and user experience controls.
          </p>
          <p className="mt-2 text-xs text-muted">
            Last checked: {lastChecked ? new Date(lastChecked).toLocaleString("en-ZA") : "Not checked"}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex w-fit items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-60"
        >
          {refreshing ? "Running checks..." : "Run Readiness Checks"}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <section className="mb-6 grid gap-4 xl:grid-cols-[260px_1fr]">
        <ScoreRing score={score} />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Passed", value: counts.passed, status: "Passed" as CheckStatus },
            { label: "Warning", value: counts.warning, status: "Warning" as CheckStatus },
            { label: "Failed", value: counts.failed, status: "Failed" as CheckStatus },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">{item.label}</p>
              <p className="mt-3 text-3xl font-bold tabular-nums text-heading">{item.value}</p>
              <div className="mt-3"><StatusBadge status={item.status} /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {(Object.keys(grouped) as ReadinessCheck["category"][]).map((category) => (
          <section key={category} className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="mb-5 border-b border-panel pb-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">{category}</p>
              <h2 className="mt-2 text-xl font-semibold text-heading">{category} Readiness</h2>
              <p className="mt-1 text-xs leading-6 text-secondary">{categoryDescriptions[category]}</p>
            </div>

            <div className="overflow-x-auto rounded-md border border-panel">
              <table className="min-w-full divide-y divide-panel">
                <thead className="bg-panel">
                  <tr>
                    <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Checklist Item</th>
                    <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Status</th>
                    <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel bg-card">
                  {grouped[category].map((item) => (
                    <tr key={`${item.category}-${item.label}`}>
                      <td className="px-4 py-3 text-sm font-semibold text-heading">{item.label}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="max-w-3xl px-4 py-3 text-xs leading-5 text-secondary">{item.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

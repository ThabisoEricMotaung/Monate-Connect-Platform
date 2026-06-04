"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import {
  getExecutiveMetrics,
  type ExecutiveMetrics,
} from "@/lib/intelligence"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatZAR(value: number): string {
  if (value >= 1_000_000_000)
    return `R${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000)
    return `R${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)
    return `R${(value / 1_000).toFixed(0)}K`
  return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  format = "number",
  tone = "default",
  description,
  icon,
}: {
  label: string
  value: number
  format?: "number" | "currency" | "score"
  tone?: "green" | "amber" | "blue" | "purple" | "default"
  description?: string
  icon: string
}) {
  const display =
    format === "currency"
      ? formatZAR(value)
      : format === "score"
        ? `${value}/100`
        : value.toLocaleString("en-ZA")

  const toneClasses: Record<string, string> = {
    green: "text-success",
    amber: "text-warning",
    blue: "text-sky-600",
    purple: "text-violet-600",
    default: "text-heading",
  }

  const toneBorder: Record<string, string> = {
    green: "border-success/20",
    amber: "border-warning/20",
    blue: "border-sky-500/20",
    purple: "border-violet-500/20",
    default: "border-panel",
  }

  const toneIconBg: Record<string, string> = {
    green: "bg-success/10 text-success",
    amber: "bg-warning/10 text-warning",
    blue: "bg-sky-500/10 text-sky-600",
    purple: "bg-violet-500/10 text-violet-600",
    default: "bg-accent/10 text-accent",
  }

  return (
    <div
      className={`enterprise-card flex flex-col gap-4 ${toneBorder[tone] ?? "border-panel"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${toneIconBg[tone] ?? toneIconBg.default}`}
        >
          {icon}
        </span>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary text-right leading-tight">
          {label}
        </p>
      </div>
      <div>
        <p
          className={`text-3xl font-bold tabular-nums leading-none ${toneClasses[tone] ?? "text-heading"}`}
        >
          {display}
        </p>
        {description && (
          <p className="mt-2 text-xs leading-relaxed text-muted">{description}</p>
        )}
      </div>
    </div>
  )
}

function HealthScoreRing({ score }: { score: number }) {
  const radius = 54
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  const color =
    score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "#ef4444"
  const label =
    score >= 70
      ? "Excellent"
      : score >= 55
        ? "Good"
        : score >= 40
          ? "Fair"
          : "Needs Attention"

  return (
    <div className="enterprise-card flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative flex shrink-0 items-center justify-center" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="12"
          />
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-heading">{score}</span>
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-secondary">Score</span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Procurement Health
          </p>
          <p className="mt-1 text-xl font-bold text-heading">{label}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
            Composite score derived from award rate, payment efficiency, contract
            completion, and supplier verification coverage.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Award Rate", weight: "30%" },
            { label: "Payment Rate", weight: "25%" },
            { label: "Contract Completion", weight: "25%" },
            { label: "Supplier Verification", weight: "20%" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-panel bg-surface px-3 py-2"
            >
              <p className="text-[0.62rem] font-bold uppercase tracking-wider text-muted">
                {item.weight}
              </p>
              <p className="text-xs font-semibold text-secondary">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="enterprise-card">
      <div className="mb-4 h-10 w-10 animate-pulse rounded-xl bg-panel" />
      <div className="h-8 w-24 animate-pulse rounded bg-panel" />
      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-panel" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null)

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()
      if (profile?.role !== "admin" && profile?.role !== "buyer") {
        router.replace("/dashboard")
        return
      }
      try {
        const data = await getExecutiveMetrics()
        setMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Intelligence</p>
        <h1 className="enterprise-page-title">Executive Dashboard</h1>
        <p className="enterprise-page-description">
          High-level procurement health, financial exposure, and pipeline status
          across the full vendor network.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Failed to load metrics</p>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="h-48 animate-pulse rounded-2xl bg-panel" />
        </div>
      )}

      {!loading && !error && metrics && (
        <div className="space-y-6">
          {/* KPI grid */}
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Procurement Value"
              value={metrics.totalProcurementValue}
              format="currency"
              tone="blue"
              icon="💰"
              description="Aggregate contracted value across all active and completed contracts"
            />
            <MetricCard
              label="Active Suppliers"
              value={metrics.activeSuppliers}
              tone="green"
              icon="🏭"
              description="Suppliers with at least one quote submission in the network"
            />
            <MetricCard
              label="Active RFQs"
              value={metrics.activeRFQs}
              tone="blue"
              icon="📋"
              description="Open procurement requests currently accepting supplier quotes"
            />
            <MetricCard
              label="Awarded Contracts"
              value={metrics.awardedContracts}
              tone="green"
              icon="✅"
              description="Active and completed contracts across the procurement cycle"
            />
            <MetricCard
              label="Outstanding Invoices"
              value={metrics.outstandingInvoices}
              tone="amber"
              icon="🧾"
              description="Invoices pending review, approval, or payment processing"
            />
            <MetricCard
              label="Payments This Month"
              value={metrics.paymentsThisMonth}
              format="currency"
              tone="green"
              icon="💳"
              description="Total payment disbursements processed in the current month"
            />
            <MetricCard
              label="Average RFQ Value"
              value={metrics.averageRFQValue}
              format="currency"
              tone="purple"
              icon="📊"
              description="Mean budget value across all RFQs with declared budgets"
            />
            <MetricCard
              label="Health Score"
              value={metrics.procurementHealthScore}
              format="score"
              tone={
                metrics.procurementHealthScore >= 70
                  ? "green"
                  : metrics.procurementHealthScore >= 40
                    ? "amber"
                    : "default"
              }
              icon="🎯"
              description="Composite procurement effectiveness indicator"
            />
          </section>

          {/* Health score visualisation */}
          <section>
            <HealthScoreRing score={metrics.procurementHealthScore} />
          </section>

          {/* Summary table */}
          <section className="enterprise-card">
            <div className="mb-4 border-b border-panel pb-4">
              <p className="enterprise-section-label">Financial Exposure Summary</p>
              <h3 className="text-base font-bold text-heading">
                Key Procurement Figures
              </h3>
            </div>
            <div className="divide-y divide-panel">
              {[
                {
                  label: "Total Contracted Value",
                  value: formatZAR(metrics.totalProcurementValue),
                  note: "Sum of all contract values",
                },
                {
                  label: "Monthly Payment Outflow",
                  value: formatZAR(metrics.paymentsThisMonth),
                  note: "Paid this calendar month",
                },
                {
                  label: "Average RFQ Budget",
                  value: formatZAR(metrics.averageRFQValue),
                  note: "Mean across budgeted RFQs",
                },
                {
                  label: "Outstanding Liability",
                  value: `${metrics.outstandingInvoices} invoices`,
                  note: "Awaiting approval or payment",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-heading">{row.label}</p>
                    <p className="text-xs text-muted">{row.note}</p>
                  </div>
                  <p className="shrink-0 text-base font-bold tabular-nums text-heading">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

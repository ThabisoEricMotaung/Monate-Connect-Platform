"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import {
  getRegionalInsights,
  type RegionalInsightRecord,
} from "@/lib/intelligence"

// ─── SA Province ordering ─────────────────────────────────────────────────────

const PROVINCE_ORDER = [
  "Gauteng",
  "KwaZulu-Natal",
  "Western Cape",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "Northern Cape",
]

const PROVINCE_ABBR: Record<string, string> = {
  Gauteng: "GP",
  "KwaZulu-Natal": "KZN",
  "Western Cape": "WC",
  "Eastern Cape": "EC",
  Limpopo: "LP",
  Mpumalanga: "MP",
  "North West": "NW",
  "Free State": "FS",
  "Northern Cape": "NC",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatZAR(value: number): string {
  if (value >= 1_000_000_000) return `R${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}K`
  if (value === 0) return "R0"
  return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function activityLevel(rec: RegionalInsightRecord): "High" | "Medium" | "Low" {
  const total = rec.rfqCount + rec.supplierCount + rec.activeContracts
  if (total >= 10) return "High"
  if (total >= 4) return "Medium"
  return "Low"
}

function activityClass(level: "High" | "Medium" | "Low") {
  if (level === "High") return "text-success border-success/30 bg-success/10"
  if (level === "Medium") return "text-warning border-warning/30 bg-warning/10"
  return "text-muted border-panel bg-surface"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BarSegment({
  value,
  max,
  color,
  label,
}: {
  value: number
  max: number
  color: string
  label: string
}) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[0.65rem] text-secondary">{label}</span>
        <span className="text-[0.65rem] font-bold tabular-nums text-heading">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function ProvinceCard({
  record,
  maxRFQ,
  maxSupplier,
  maxContracts,
}: {
  record: RegionalInsightRecord
  maxRFQ: number
  maxSupplier: number
  maxContracts: number
}) {
  const level = activityLevel(record)
  const abbr = PROVINCE_ABBR[record.province] ?? record.province.slice(0, 2).toUpperCase()

  return (
    <div className="enterprise-card flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-button font-extrabold text-sm shadow-md">
            {abbr}
          </div>
          <div>
            <p className="text-sm font-bold text-heading leading-snug">{record.province}</p>
            <p className="text-xs text-muted">South Africa</p>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[0.63rem] font-bold uppercase tracking-wider ${activityClass(level)}`}
        >
          {level}
        </span>
      </div>

      {/* Value highlight */}
      {record.totalValue > 0 && (
        <div className="rounded-xl border border-accent/15 bg-accent/5 px-4 py-3">
          <p className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-accent">
            Estimated RFQ Value
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-heading">
            {formatZAR(record.totalValue)}
          </p>
        </div>
      )}

      {/* Bars */}
      <div className="space-y-3">
        <BarSegment
          label="RFQs Issued"
          value={record.rfqCount}
          max={maxRFQ}
          color="var(--accent)"
        />
        <BarSegment
          label="Active Suppliers"
          value={record.supplierCount}
          max={maxSupplier}
          color="var(--success)"
        />
        <BarSegment
          label="Active Contracts"
          value={record.activeContracts}
          max={maxContracts}
          color="var(--warning)"
        />
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-3 divide-x divide-panel border-t border-panel pt-4">
        {[
          { label: "RFQs", value: record.rfqCount },
          { label: "Suppliers", value: record.supplierCount },
          { label: "Contracts", value: record.activeContracts },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5 px-2">
            <span className="text-base font-bold tabular-nums text-heading">
              {stat.value}
            </span>
            <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="enterprise-card space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-panel" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-panel" />
          <div className="h-3 w-16 animate-pulse rounded bg-panel" />
        </div>
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-panel" />
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-2.5 w-full animate-pulse rounded bg-panel" />
            <div className="h-1.5 w-full animate-pulse rounded-full bg-panel" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegionalInsightsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [records, setRecords] = useState<RegionalInsightRecord[]>([])

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()
      if (profile?.role !== "admin" && profile?.role !== "buyer") {
        router.replace("/dashboard")
        return
      }
      try {
        const data = await getRegionalInsights()
        setRecords(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load regional data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // Sort by SA province order, putting unknowns at the end
  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      const ai = PROVINCE_ORDER.indexOf(a.province)
      const bi = PROVINCE_ORDER.indexOf(b.province)
      if (ai === -1 && bi === -1) return a.province.localeCompare(b.province)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [records])

  const maxRFQ = useMemo(() => Math.max(1, ...records.map((r) => r.rfqCount)), [records])
  const maxSupplier = useMemo(() => Math.max(1, ...records.map((r) => r.supplierCount)), [records])
  const maxContracts = useMemo(() => Math.max(1, ...records.map((r) => r.activeContracts)), [records])

  const totals = useMemo(() => ({
    rfqs: records.reduce((s, r) => s + r.rfqCount, 0),
    suppliers: records.reduce((s, r) => s + r.supplierCount, 0),
    contracts: records.reduce((s, r) => s + r.activeContracts, 0),
    value: records.reduce((s, r) => s + r.totalValue, 0),
    provinces: records.length,
  }), [records])

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Intelligence</p>
        <h1 className="enterprise-page-title">Regional Insights</h1>
        <p className="enterprise-page-description">
          Procurement activity aggregated by South African province — demand
          distribution, supplier density, contract coverage, and estimated value
          by region.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Failed to load regional data</p>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          {/* National summary */}
          <section className="mb-6 enterprise-card">
            <div className="mb-4 border-b border-panel pb-4">
              <p className="enterprise-section-label">National Overview</p>
              <h3 className="text-base font-bold text-heading">Aggregated Totals</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label: "Provinces Active", value: totals.provinces.toLocaleString("en-ZA"), icon: "🗺️" },
                { label: "Total RFQs", value: totals.rfqs.toLocaleString("en-ZA"), icon: "📋" },
                { label: "Total Suppliers", value: totals.suppliers.toLocaleString("en-ZA"), icon: "🏭" },
                { label: "Active Contracts", value: totals.contracts.toLocaleString("en-ZA"), icon: "✅" },
                { label: "Estimated Value", value: formatZAR(totals.value), icon: "💰" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-panel bg-surface p-3 text-center">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-lg font-bold tabular-nums text-heading">{item.value}</span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Province grid */}
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((record) => (
              <ProvinceCard
                key={record.province}
                record={record}
                maxRFQ={maxRFQ}
                maxSupplier={maxSupplier}
                maxContracts={maxContracts}
              />
            ))}
          </section>

          {/* Ranked table */}
          <section className="mt-6 enterprise-card">
            <div className="mb-4 border-b border-panel pb-4">
              <p className="enterprise-section-label">Province Ranking</p>
              <h3 className="text-base font-bold text-heading">
                By RFQ Volume
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-sm">
                <thead>
                  <tr className="border-b border-panel">
                    {["Rank", "Province", "RFQs", "Suppliers", "Contracts", "Est. Value", "Activity"].map(
                      (col) => (
                        <th
                          key={col}
                          className="pb-3 pr-4 text-left text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary last:pr-0"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel">
                  {[...records]
                    .sort((a, b) => b.rfqCount - a.rfqCount)
                    .map((rec, i) => {
                      const level = activityLevel(rec)
                      return (
                        <tr key={rec.province} className="transition hover:bg-surface/60">
                          <td className="py-3 pr-4 text-xs font-bold tabular-nums text-muted">
                            {i + 1}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-button text-[0.55rem] font-extrabold">
                                {PROVINCE_ABBR[rec.province] ?? "??"}
                              </span>
                              <span className="font-semibold text-heading">{rec.province}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 tabular-nums text-heading font-semibold">
                            {rec.rfqCount}
                          </td>
                          <td className="py-3 pr-4 tabular-nums text-secondary">
                            {rec.supplierCount}
                          </td>
                          <td className="py-3 pr-4 tabular-nums text-secondary">
                            {rec.activeContracts}
                          </td>
                          <td className="py-3 pr-4 tabular-nums text-secondary">
                            {rec.totalValue > 0 ? formatZAR(rec.totalValue) : "—"}
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${activityClass(level)}`}
                            >
                              {level}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-panel bg-card">
          <div className="text-center">
            <p className="text-sm font-semibold text-heading">No regional data available</p>
            <p className="mt-1 text-xs text-muted">
              Regional insights will populate once RFQs and suppliers are recorded with province data.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
    </div>
  )
}

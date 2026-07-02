"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts"
import { getCurrentProfile } from "@/lib/auth"
import {
  getProcurementAnalytics,
  type ProcurementAnalyticsData,
} from "@/lib/intelligence"

// --- Constants ----------------------------------------------------------------

const PALETTE = [
  "#315A78", "#2F8C67", "#8A6A32", "#5B6470",
  "#1E3B56", "#4A7B6A", "#6B5B42", "#3d6b8e",
  "#287a58", "#7a5c2a",
]

const TICK = "#94a3b8"

// --- Helpers ------------------------------------------------------------------

function formatZAR(value: number): string {
  if (value >= 1_000_000_000) return `R${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}K`
  return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

// --- Sub-components -----------------------------------------------------------

function ChartCard({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string
  subtitle?: string
  empty?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="enterprise-card">
      <div className="mb-5 border-b border-panel pb-4">
        {subtitle && (
          <p className="enterprise-section-label">{subtitle}</p>
        )}
        <h3 className="text-base font-bold text-heading">{title}</h3>
      </div>
      {empty ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted">No data available</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function ChartTip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  valueFormatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-panel bg-card px-4 py-2.5 shadow-panel">
      {label && <p className="mb-1.5 text-xs font-bold text-heading">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-xs" style={{ color: p.color }}>
          {p.name}:{" "}
          <span className="font-bold">
            {valueFormatter ? valueFormatter(p.value) : p.value.toLocaleString("en-ZA")}
          </span>
        </p>
      ))}
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="enterprise-card">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-panel" />
      <div className="h-52 animate-pulse rounded-xl bg-panel" />
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

export default function ProcurementAnalyticsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<ProcurementAnalyticsData | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()
      if (profile?.role?.trim().toLowerCase() !== "admin") {
        router.replace("/dashboard")
        return
      }
      try {
        const result = await getProcurementAnalytics()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const totalRFQs = data?.rfqVolumeByMonth.reduce((s, d) => s + d.count, 0) ?? 0
  const totalValue = data?.procurementValueByMonth.reduce((s, d) => s + d.value, 0) ?? 0
  const topCategory = data?.categoryBreakdown[0]?.category ?? "—"

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Intelligence</p>
        <h1 className="enterprise-page-title">Procurement Analytics</h1>
        <p className="enterprise-page-description">
          Monthly RFQ volume trends, contracted procurement value, and category
          demand distribution across the full procurement lifecycle.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Failed to load analytics</p>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="enterprise-card">
                <div className="h-3 w-24 animate-pulse rounded bg-panel" />
                <div className="mt-3 h-8 w-20 animate-pulse rounded bg-panel" />
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonChart key={i} />)}
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Summary chips */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                label: "Total RFQs (12 months)",
                value: totalRFQs.toLocaleString("en-ZA"),
                icon: "ðŸ“‹",
              },
              {
                label: "Contracted Value (12 months)",
                value: formatZAR(totalValue),
                icon: "ðŸ’°",
              },
              {
                label: "Top Category",
                value: topCategory,
                icon: "ðŸ·️",
              },
            ].map((item) => (
              <div key={item.label} className="enterprise-card flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-secondary">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-xl font-bold text-heading">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </section>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* RFQ volume by month */}
            <ChartCard
              title="RFQ Volume by Month"
              subtitle="Procurement Demand"
              empty={!mounted || data.rfqVolumeByMonth.length === 0}
            >
              {mounted && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.rfqVolumeByMonth}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={
                        <ChartTip />
                      }
                    />
                    <Bar
                      dataKey="count"
                      name="RFQs"
                      fill="#315A78"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Procurement value by month */}
            <ChartCard
              title="Procurement Value by Month"
              subtitle="Contract Value Trend"
              empty={!mounted || data.procurementValueByMonth.length === 0}
            >
              {mounted && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={data.procurementValueByMonth}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F8C67" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2F8C67" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatZAR(v)}
                    />
                    <Tooltip
                      content={
                        <ChartTip valueFormatter={formatZAR} />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Value"
                      stroke="#2F8C67"
                      strokeWidth={2}
                      fill="url(#valueGrad)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Category breakdown — full width */}
          <ChartCard
            title="Category Demand Breakdown"
            subtitle="Procurement Categories"
            empty={!mounted || data.categoryBreakdown.length === 0}
          >
            {mounted && (
              <div className="grid gap-6 lg:grid-cols-2">
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(180, data.categoryBreakdown.length * 38)}
                >
                  <BarChart
                    layout="vertical"
                    data={data.categoryBreakdown}
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 10, fill: TICK }}
                      tickLine={false}
                      axisLine={false}
                      width={130}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="RFQs" radius={[0, 4, 4, 0]}>
                      {data.categoryBreakdown.map((item, i) => (
                        <Cell
                          key={item.category}
                          fill={PALETTE[i % PALETTE.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Category legend table */}
                <div className="space-y-2">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
                    Category Summary
                  </p>
                  <div className="divide-y divide-panel">
                    {data.categoryBreakdown.map((item, i) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: PALETTE[i % PALETTE.length] }}
                          />
                          <span className="truncate text-xs text-secondary">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-xs font-bold tabular-nums text-heading">
                            {item.count}
                          </span>
                          {item.value > 0 && (
                            <span className="text-xs text-muted">
                              {formatZAR(item.value)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  )
}

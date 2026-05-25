"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  province: string | null
  region: string | null
  category: string | null
  deadline: string | null
  status: string | null
}

type Quote = {
  id: number
  status: string | null
}

type SupplierProfile = {
  id: string
  verification_status: string | null
}

type BreakdownItem = {
  label: string
  count: number
}

const statusStyles: Record<string, string> = {
  Open: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  Closed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Awarded: "border-success bg-success-soft text-success",
  Pending: "border-warning bg-warning-soft text-warning",
  "Under Review": "border-warning bg-warning-soft text-warning",
  "Pending Review": "border-warning bg-warning-soft text-warning",
  Verified: "border-success bg-success-soft text-success",
  Rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Shortlisted: "border-accent-soft bg-accent-soft text-accent-strong",
}

function normalizeStatus(status: string | null): string {
  return status?.trim() || "Unclassified"
}

function normalizeDimension(value: string | null): string {
  return value?.trim() || "Unassigned"
}

function countBy(values: string[]): BreakdownItem[] {
  const counts = new Map<string, number>()

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function isSupplierUnderReview(status: string | null): boolean {
  const normalizedStatus = normalizeStatus(status).toLowerCase()

  return (
    normalizedStatus === "under review" ||
    normalizedStatus === "pending review" ||
    normalizedStatus === "pending"
  )
}

function statusBadgeClass(status: string): string {
  return statusStyles[status] ?? "border-panel bg-panel text-secondary"
}

function SummaryPanel({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: "neutral" | "blue" | "amber" | "red" | "green"
}) {
  const toneClass = {
    neutral: "text-heading",
    blue: "text-sky-700",
    amber: "text-warning",
    red: "text-rose-700",
    green: "text-success",
  }[tone]

  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
        {label}
      </p>
      <p className={`mt-4 text-3xl font-semibold ${toneClass}`}>
        {value.toLocaleString("en-ZA")}
      </p>
    </div>
  )
}

function BreakdownTable({
  title,
  subtitle,
  rows,
}: {
  title: string
  subtitle: string
  rows: BreakdownItem[]
}) {
  return (
    <section className="rounded-md border border-panel bg-card shadow-panel">
      <div className="border-b border-panel px-5 py-4">
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
          {subtitle}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-heading">{title}</h2>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8">
          <p className="text-sm text-muted">No records available.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel bg-panel">
                <th className="px-5 py-3 text-left text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                  Segment
                </th>
                <th className="px-5 py-3 text-right text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel">
              {rows.map((row) => (
                <tr key={row.label} className="transition-colors hover:bg-surface">
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.label)}`}
                    >
                      {row.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-heading">
                    {row.count.toLocaleString("en-ZA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="rounded-md border border-panel bg-card p-5 shadow-panel"
          >
            <div className="h-3 w-28 animate-pulse rounded bg-panel" />
            <div className="mt-4 h-8 w-16 animate-pulse rounded bg-panel" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-md border border-panel bg-card p-5 shadow-panel"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-panel" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="h-10 animate-pulse rounded-md bg-panel"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [profiles, setProfiles] = useState<SupplierProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadAnalyticsData() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const [rfqResult, quoteResult, profileResult] = await Promise.all([
        supabase
          .from("rfqs")
          .select("id, province, region, category, deadline, status"),
        supabase.from("quotes").select("id, status"),
        supabase.from("profiles").select("id, verification_status"),
      ])

      if (rfqResult.error) {
        setErrorMessage(rfqResult.error.message)
        setLoading(false)
        return
      }

      if (quoteResult.error) {
        setErrorMessage(quoteResult.error.message)
        setLoading(false)
        return
      }

      if (profileResult.error) {
        setErrorMessage(profileResult.error.message)
        setLoading(false)
        return
      }

      setRfqs((rfqResult.data ?? []) as RFQ[])
      setQuotes((quoteResult.data ?? []) as Quote[])
      setProfiles((profileResult.data ?? []) as SupplierProfile[])
      setLoading(false)
    }

    loadAnalyticsData()
  }, [router])

  const analytics = useMemo(() => {
    const rfqDisplayStatuses = rfqs.map((rfq) =>
      getRFQDisplayStatus(rfq.status, rfq.deadline)
    )
    const quoteStatuses = quotes.map((quote) => normalizeStatus(quote.status))
    const supplierStatuses = profiles.map((profile) =>
      normalizeStatus(profile.verification_status)
    )

    return {
      totalRFQs: rfqs.length,
      openRFQs: rfqDisplayStatuses.filter((status) => status === "Open").length,
      closingSoonRFQs: rfqDisplayStatuses.filter(
        (status) => status === "Closing Soon"
      ).length,
      closedRFQs: rfqDisplayStatuses.filter((status) => status === "Closed").length,
      totalQuotes: quotes.length,
      pendingQuotes: quoteStatuses.filter((status) => status === "Pending").length,
      awardedQuotes: quoteStatuses.filter((status) => status === "Awarded").length,
      verifiedSuppliers: supplierStatuses.filter((status) => status === "Verified")
        .length,
      suppliersUnderReview: profiles.filter((profile) =>
        isSupplierUnderReview(profile.verification_status)
      ).length,
      rfqsByProvince: countBy(
        rfqs.map((rfq) => normalizeDimension(rfq.province ?? rfq.region))
      ),
      rfqsByCategory: countBy(
        rfqs.map((rfq) => normalizeDimension(rfq.category))
      ),
      quotesByStatus: countBy(quoteStatuses),
      suppliersByVerificationStatus: countBy(supplierStatuses),
    }
  }, [profiles, quotes, rfqs])

  const hasNoData =
    rfqs.length === 0 && quotes.length === 0 && profiles.length === 0

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Procurement Intelligence
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Procurement Analytics Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Monitor RFQ velocity, quote pipeline health, and supplier verification
          readiness through a compact enterprise reporting workspace.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Analytics failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && <AnalyticsSkeleton />}

      {!loading && !errorMessage && hasNoData && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No procurement analytics available yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            RFQs, quote submissions, and supplier profiles will populate this
            dashboard once platform activity begins.
          </p>
        </div>
      )}

      {!loading && !errorMessage && !hasNoData && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryPanel label="Total RFQs" value={analytics.totalRFQs} />
            <SummaryPanel label="Open RFQs" value={analytics.openRFQs} tone="blue" />
            <SummaryPanel
              label="Closing Soon"
              value={analytics.closingSoonRFQs}
              tone="amber"
            />
            <SummaryPanel
              label="Closed RFQs"
              value={analytics.closedRFQs}
              tone="red"
            />
            <SummaryPanel
              label="Total Quotes"
              value={analytics.totalQuotes}
            />
            <SummaryPanel
              label="Pending Quotes"
              value={analytics.pendingQuotes}
              tone="amber"
            />
            <SummaryPanel
              label="Awarded Quotes"
              value={analytics.awardedQuotes}
              tone="green"
            />
            <SummaryPanel
              label="Verified Suppliers"
              value={analytics.verifiedSuppliers}
              tone="green"
            />
            <SummaryPanel
              label="Suppliers Under Review"
              value={analytics.suppliersUnderReview}
              tone="amber"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <BreakdownTable
              title="RFQs by province"
              subtitle="Geographic demand"
              rows={analytics.rfqsByProvince}
            />
            <BreakdownTable
              title="RFQs by category"
              subtitle="Procurement categories"
              rows={analytics.rfqsByCategory}
            />
            <BreakdownTable
              title="Quotes by status"
              subtitle="Quote pipeline"
              rows={analytics.quotesByStatus}
            />
            <BreakdownTable
              title="Suppliers by verification status"
              subtitle="Supplier readiness"
              rows={analytics.suppliersByVerificationStatus}
            />
          </section>
        </div>
      )}
    </div>
  )
}

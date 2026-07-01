"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import { getCurrentProfile } from "@/lib/auth"
import {
  getSupplierScores,
  type SupplierIntelligenceRecord,
} from "@/lib/intelligence"

const riskStyles: Record<SupplierIntelligenceRecord["riskRating"], string> = {
  Low: "border-success/35 bg-success-soft text-success",
  Medium: "border-warning/35 bg-warning-soft text-warning",
  High: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Critical: "border-rose-700/35 bg-rose-700/10 text-rose-800",
}

function RateCell({ value }: { value: number }) {
  const tone =
    value >= 75
      ? "bg-success"
      : value >= 50
        ? "bg-sky-500"
        : value >= 30
          ? "bg-warning"
          : "bg-rose-500"

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tabular-nums text-heading">
          {value}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-md border border-panel bg-card shadow-panel"
        />
      ))}
    </div>
  )
}

export default function SupplierPerformancePage() {
  const router = useRouter()
  const [records, setRecords] = useState<SupplierIntelligenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<"All" | SupplierIntelligenceRecord["riskRating"]>("All")

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()

      if (profile?.role?.trim().toLowerCase() !== "admin") {
        router.replace("/dashboard")
        return
      }

      try {
        const data = await getSupplierScores()
        setRecords(data)
      } catch (error) {
        console.error("Supplier performance load failed:", error)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Supplier performance data failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch =
        !needle ||
        record.supplierName.toLowerCase().includes(needle) ||
        (record.province?.toLowerCase().includes(needle) ?? false) ||
        (record.industry?.toLowerCase().includes(needle) ?? false)
      const matchesRisk = riskFilter === "All" || record.riskRating === riskFilter

      return matchesSearch && matchesRisk
    })
  }, [records, riskFilter, search])

  const summary = useMemo(
    () => ({
      suppliers: records.length,
      elite: records.filter((record) => record.smartScore.score >= 85).length,
      trusted: records.filter(
        (record) => record.smartScore.score >= 75 && record.smartScore.score < 85
      ).length,
      highRisk: records.filter(
        (record) => record.riskRating === "High" || record.riskRating === "Critical"
      ).length,
    }),
    [records]
  )

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Supplier Intelligence</p>
        <h1 className="enterprise-page-title">Supplier Performance Engine</h1>
        <p className="enterprise-page-description">
          SmartScore v1 converts supplier verification, quote behaviour, awards,
          contracts, invoices, and payment reliability into a procurement trust
          and risk view.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Supplier performance failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && <SkeletonRows />}

      {!loading && !errorMessage && (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Suppliers", summary.suppliers, "text-heading"],
              ["Elite Suppliers", summary.elite, "text-amber-700"],
              ["Trusted Suppliers", summary.trusted, "text-success"],
              ["High Risk", summary.highRisk, "text-rose-700"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">
                  {label}
                </p>
                <p className={`mt-3 text-3xl font-semibold tabular-nums ${tone}`}>
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search supplier, province, or industry"
                  className="enterprise-input"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["All", "Low", "Medium", "High", "Critical"] as const).map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => setRiskFilter(risk)}
                    className={[
                      "rounded-md border px-3.5 py-2 text-xs font-semibold transition",
                      riskFilter === risk
                        ? "border-accent bg-accent text-button"
                        : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
                    ].join(" ")}
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {records.length === 0 && (
            <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
              <p className="text-sm font-semibold text-heading">
                No supplier performance data available.
              </p>
              <p className="mt-2 text-xs text-muted">
                Supplier performance will appear once profiles and procurement
                activity exist.
              </p>
            </div>
          )}

          {records.length > 0 && filtered.length === 0 && (
            <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
              <p className="text-sm font-semibold text-heading">
                No suppliers match these filters.
              </p>
              <p className="mt-2 text-xs text-muted">
                Adjust the search or risk filter to broaden the list.
              </p>
            </div>
          )}

          {filtered.length > 0 && (
            <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1320px] text-sm">
                  <thead>
                    <tr className="border-b border-panel bg-panel">
                      {[
                        "Supplier",
                        "SmartScore",
                        "Level",
                        "Risk Rating",
                        "Response Rate",
                        "Award Rate",
                        "Contract Completion",
                        "Invoice Compliance",
                        "Payment Reliability",
                        "Improvement Tips",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-panel">
                    {filtered.map((record) => (
                      <tr key={record.supplierId} className="align-top transition-colors hover:bg-surface">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-heading">{record.supplierName}</p>
                          <p className="mt-1 text-xs text-muted">
                            {[record.province, record.industry].filter(Boolean).join(" | ") || "No location/industry"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Awards: {record.awards} | Contracts: {record.contracts}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <SmartScoreCircle
                            score={record.smartScore}
                            size="sm"
                            compact
                            className="max-w-[180px] bg-panel p-4"
                          />
                        </td>
                        <td className="px-4 py-4 text-secondary">{record.level}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${riskStyles[record.riskRating]}`}>
                            {record.riskRating}
                          </span>
                        </td>
                        <td className="px-4 py-4"><RateCell value={record.responseRate} /></td>
                        <td className="px-4 py-4"><RateCell value={record.awardRate} /></td>
                        <td className="px-4 py-4"><RateCell value={record.completionRate} /></td>
                        <td className="px-4 py-4"><RateCell value={record.invoiceCompliance} /></td>
                        <td className="px-4 py-4"><RateCell value={record.paymentReliabilityRate} /></td>
                        <td className="max-w-[300px] px-4 py-4">
                          {record.improvementTips.length > 0 ? (
                            <ul className="space-y-2">
                              {record.improvementTips.map((tip) => (
                                <li key={tip} className="rounded border border-panel bg-panel px-3 py-2 text-xs leading-5 text-secondary">
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-muted">No immediate tips.</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-panel px-5 py-3">
                <p className="text-xs text-muted">
                  Showing {filtered.length} of {records.length} supplier performance record
                  {records.length !== 1 ? "s" : ""}.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

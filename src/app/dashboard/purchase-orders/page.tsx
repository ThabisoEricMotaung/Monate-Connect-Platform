"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  getEstimatedDeliveryDate,
  getPurchaseOrders,
  normalizePurchaseOrderStatus,
  type PurchaseOrder,
} from "@/lib/purchaseOrders"

const statusStyles: Record<string, string> = {
  Issued: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Accepted: "border-accent-soft bg-accent-soft text-accent-strong",
  "In Progress": "border-warning bg-warning-soft text-warning",
  "Ready for Delivery": "border-warning bg-warning-soft text-warning",
  Delivered: "border-success/60 bg-success-soft text-success",
  Completed: "border-success bg-success-soft text-success",
  Cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

function formatAmount(amount: string | null): string {
  if (!amount) return "-"
  const numericAmount = Number(amount.replace(/[^\d]/g, ""))
  return Number.isNaN(numericAmount)
    ? amount
    : `R${numericAmount.toLocaleString("en-ZA")}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-heading">{value}</p>
    </div>
  )
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"newest" | "value">("newest")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadPurchaseOrders() {
      try {
        setPurchaseOrders(await getPurchaseOrders())
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Purchase orders failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadPurchaseOrders()
  }, [])

  const metrics = useMemo(() => {
    const statuses = purchaseOrders.map((purchaseOrder) =>
      normalizePurchaseOrderStatus(purchaseOrder.status)
    )

    return {
      active: statuses.filter((status) =>
        ["Issued", "Accepted", "In Progress", "Ready for Delivery"].includes(status)
      ).length,
      delivered: statuses.filter((status) => status === "Delivered").length,
      outstanding: statuses.filter((status) =>
        ["Issued", "Accepted", "In Progress", "Ready for Delivery"].includes(status)
      ).length,
      completed: statuses.filter((status) => status === "Completed").length,
    }
  }, [purchaseOrders])

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders
      .filter((purchaseOrder) => {
        const status = normalizePurchaseOrderStatus(purchaseOrder.status).toLowerCase()
        const statusMatch = statusFilter === "all" || status === statusFilter
        const issuedAt = purchaseOrder.generated_at
          ? new Date(purchaseOrder.generated_at).getTime()
          : 0
        const fromMatch = !dateFrom || issuedAt >= new Date(`${dateFrom}T00:00:00`).getTime()
        const toMatch = !dateTo || issuedAt <= new Date(`${dateTo}T23:59:59`).getTime()

        return statusMatch && fromMatch && toMatch
      })
      .sort((a, b) => {
        if (sortBy === "value") {
          const aAmount = Number((a.amount ?? "").replace(/[^\d.]/g, ""))
          const bAmount = Number((b.amount ?? "").replace(/[^\d.]/g, ""))

          return (Number.isFinite(bAmount) ? bAmount : 0) - (Number.isFinite(aAmount) ? aAmount : 0)
        }

        return new Date(b.generated_at ?? 0).getTime() - new Date(a.generated_at ?? 0).getTime()
      })
  }, [dateFrom, dateTo, purchaseOrders, sortBy, statusFilter])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement / Fulfilment
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Purchase Orders
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Track awarded RFQs from purchase-order issue through supplier acceptance,
          delivery, and completion.
        </p>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active POs" value={metrics.active} />
        <MetricCard label="Delivered POs" value={metrics.delivered} />
        <MetricCard label="Outstanding POs" value={metrics.outstanding} />
        <MetricCard label="Completed POs" value={metrics.completed} />
      </section>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Purchase orders failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3 rounded-md border border-panel bg-card p-6 shadow-panel">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-panel" />
          ))}
        </div>
      )}

      {!loading && !errorMessage && purchaseOrders.length > 0 && (
        <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
          <div className="grid gap-4 md:grid-cols-4">
            <label>
              <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                Status
              </span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent">
                <option value="all">All statuses</option>
                <option value="issued">Issued</option>
                <option value="accepted">Confirmed</option>
                <option value="cancelled">Rejected</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                From
              </span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent" />
            </label>
            <label>
              <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                To
              </span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent" />
            </label>
            <label>
              <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                Sort
              </span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "newest" | "value")} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent">
                <option value="newest">Issue date newest</option>
                <option value="value">Value high to low</option>
              </select>
            </label>
          </div>
        </section>
      )}

      {!loading && !errorMessage && purchaseOrders.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No purchase orders available yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Purchase orders appear here after an awarded quote is converted into a
            fulfilment record.
          </p>
        </div>
      )}

      {!loading && !errorMessage && purchaseOrders.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "PO Number",
                    "RFQ",
                    "Supplier",
                    "Amount",
                    "Issue Date",
                    "Delivery Date",
                    "Status",
                    "Action",
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
                {filteredPurchaseOrders.map((purchaseOrder) => {
                  const status = normalizePurchaseOrderStatus(purchaseOrder.status)

                  return (
                    <tr key={purchaseOrder.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-accent">
                        {purchaseOrder.po_number || `PO-${purchaseOrder.id}`}
                      </td>
                      <td className="max-w-[260px] px-4 py-4 text-secondary">
                        <p className="line-clamp-2">
                          {purchaseOrder.rfq_id ? `RFQ-${purchaseOrder.rfq_id}` : "-"}
                          {purchaseOrder.title ? ` / ${purchaseOrder.title}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {purchaseOrder.supplier_name || "-"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {formatAmount(purchaseOrder.amount)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(purchaseOrder.generated_at)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(
                          getEstimatedDeliveryDate(
                            purchaseOrder.generated_at,
                            purchaseOrder.timeline
                          )
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusStyles[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/awards/${purchaseOrder.id}`}
                          className="inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

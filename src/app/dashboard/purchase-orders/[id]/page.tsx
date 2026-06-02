"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import {
  getEstimatedDeliveryDate,
  getPurchaseOrderById,
  getPurchaseOrderTimeline,
  normalizePurchaseOrderStatus,
  PURCHASE_ORDER_STATUSES,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type PurchaseOrderTimelineEvent,
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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-heading">{value}</p>
    </div>
  )
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const purchaseOrderId = Number(params.id)
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [history, setHistory] = useState<PurchaseOrderTimelineEvent[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadPurchaseOrder() {
      if (!Number.isFinite(purchaseOrderId)) {
        setErrorMessage("Invalid purchase order reference.")
        setLoading(false)
        return
      }

      try {
        const [profile, loadedPurchaseOrder, loadedHistory] = await Promise.all([
          getCurrentProfile(),
          getPurchaseOrderById(purchaseOrderId),
          getPurchaseOrderTimeline(purchaseOrderId),
        ])

        setCanManage(profile?.role === "admin" || profile?.role === "buyer")
        setPurchaseOrder(loadedPurchaseOrder)
        setHistory(loadedHistory)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Purchase order failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadPurchaseOrder()
  }, [purchaseOrderId])

  const currentStatus = normalizePurchaseOrderStatus(purchaseOrder?.status ?? null)
  const timeline = useMemo(() => {
    const currentIndex = PURCHASE_ORDER_STATUSES.indexOf(currentStatus)

    return PURCHASE_ORDER_STATUSES.filter((status) => status !== "Cancelled").map(
      (status, index) => ({
        status,
        completed: currentStatus !== "Cancelled" && index <= currentIndex,
        current: status === currentStatus,
      })
    )
  }, [currentStatus])

  async function updateStatus(status: PurchaseOrderStatus) {
    if (!purchaseOrder) return

    setUpdating(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const updatedPurchaseOrder = await updatePurchaseOrderStatus(
        purchaseOrder.id,
        status
      )
      setPurchaseOrder(updatedPurchaseOrder)
      setHistory(await getPurchaseOrderTimeline(purchaseOrder.id))
      setSuccessMessage(`${updatedPurchaseOrder.po_number || "Purchase order"} updated to ${status}.`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Purchase order update failed."
      )
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  if (errorMessage && !purchaseOrder) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">Purchase order failed to load</p>
        <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">Purchase order not found.</p>
      </div>
    )
  }

  const notes = purchaseOrder.notes || "No notes captured."

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Procurement / Purchase Order
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {purchaseOrder.po_number || `PO-${purchaseOrder.id}`}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Track supplier acceptance and fulfilment progress for this awarded RFQ.
          </p>
        </div>
        <Link
          href="/dashboard/purchase-orders"
          className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
        >
          Back to Purchase Orders
        </Link>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="flex flex-col gap-4 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
              Purchase Order Summary
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              {purchaseOrder.title || "Awarded RFQ"}
            </h2>
          </div>
          <span className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusStyles[currentStatus]}`}>
            {currentStatus}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <DetailField label="PO Number" value={purchaseOrder.po_number || `PO-${purchaseOrder.id}`} />
          <DetailField label="RFQ" value={purchaseOrder.rfq_id ? `RFQ-${purchaseOrder.rfq_id}` : "-"} />
          <DetailField label="Supplier" value={purchaseOrder.supplier_name || "-"} />
          <DetailField label="Amount" value={formatAmount(purchaseOrder.amount)} />
          <DetailField label="Issue Date" value={formatDate(purchaseOrder.generated_at)} />
          <DetailField label="Delivery Date" value={formatDate(getEstimatedDeliveryDate(purchaseOrder.generated_at, purchaseOrder.timeline))} />
          <DetailField label="Status" value={currentStatus} />
          <DetailField label="Delivery Timeline" value={purchaseOrder.timeline || "-"} />
          <DetailField label="Notes" value={notes} />
        </div>
      </section>

      <section className="mt-6 rounded-md border border-panel bg-card p-6 shadow-panel">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
          Timeline History
        </p>
        <h2 className="mt-2 text-xl font-semibold text-heading">
          Purchase order lifecycle
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {timeline.map((item) => (
            <div key={item.status} className={`rounded-md border p-4 ${item.completed ? "border-accent bg-accent-soft" : "border-panel bg-panel"}`}>
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-secondary">
                {item.current ? "Current status" : item.completed ? "Completed" : "Pending"}
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">{item.status}</p>
            </div>
          ))}
        </div>
        {currentStatus === "Cancelled" && (
          <p className="mt-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
            This purchase order has been cancelled.
          </p>
        )}
        <div className="mt-6 border-t border-panel pt-5">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
            Recorded activity
          </p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-muted">
              No visible lifecycle log entries are available yet.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {history.map((event) => (
                <div key={event.id} className="rounded-md border border-panel bg-panel px-4 py-3">
                  <p className="text-sm font-semibold text-heading">
                    {typeof event.metadata?.new_status === "string"
                      ? `Status updated to ${event.metadata.new_status}`
                      : event.action === "purchase_order.created"
                        ? "Purchase order issued"
                        : event.action}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(event.created_at)}
                    {event.actor_email ? ` / ${event.actor_email}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-panel bg-card p-6 shadow-panel">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
          Lifecycle Actions
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {!canManage && currentStatus === "Issued" && (
            <button type="button" disabled={updating} onClick={() => updateStatus("Accepted")} className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50">
              {updating ? "Accepting..." : "Accept Purchase Order"}
            </button>
          )}
          {canManage &&
            PURCHASE_ORDER_STATUSES.map((status) => (
              <button key={status} type="button" disabled={updating || status === currentStatus} onClick={() => updateStatus(status)} className="rounded-md border border-panel bg-panel px-4 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:bg-surface disabled:opacity-50">
                Mark {status}
              </button>
            ))}
        </div>
      </section>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type PurchaseOrder = {
  id: number
  po_number: string | null
  supplier_name: string | null
  title: string | null
  amount: string | null
  status: string | null
  generated_at: string | null
}

const statusStyles: Record<string, string> = {
  Generated: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Issued: "border-accent-soft bg-accent-soft text-accent-strong",
  Approved: "border-success bg-success-soft text-success",
  Cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

function statusBadgeClass(status: string | null): string {
  return statusStyles[status || ""] ?? "border-panel bg-panel text-secondary"
}

function formatAmount(amount: string | null): string {
  if (!amount) return "-"

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  })}`
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function PurchaseOrdersSkeleton() {
  return (
    <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <div className="h-4 w-64 animate-pulse rounded bg-panel" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-md bg-panel" />
        ))}
      </div>
    </div>
  )
}

export default function AdminPurchaseOrdersPage() {
  const router = useRouter()
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadPurchaseOrders() {
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

      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, supplier_name, title, amount, status, generated_at")
        .order("generated_at", { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setPurchaseOrders((data ?? []) as PurchaseOrder[])
      setLoading(false)
    }

    loadPurchaseOrders()
  }, [router])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Procurement Control
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Purchase Orders
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review generated purchase orders after RFQs are awarded and open
          printable procurement records for supplier fulfilment.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Purchase orders failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && <PurchaseOrdersSkeleton />}

      {!loading && !errorMessage && purchaseOrders.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No purchase orders have been generated yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Award an RFQ quote, then generate a purchase order from the quote
            comparison page.
          </p>
        </div>
      )}

      {!loading && !errorMessage && purchaseOrders.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "PO Number",
                    "Supplier",
                    "RFQ Title",
                    "Amount",
                    "Status",
                    "Generated",
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
                {purchaseOrders.map((purchaseOrder) => (
                  <tr
                    key={purchaseOrder.id}
                    className="align-top transition-colors hover:bg-surface"
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm font-semibold text-accent">
                        {purchaseOrder.po_number || `PO-${purchaseOrder.id}`}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-heading">
                      {purchaseOrder.supplier_name || "-"}
                    </td>
                    <td className="max-w-[300px] px-4 py-4 text-secondary">
                      <p className="line-clamp-2 leading-6">
                        {purchaseOrder.title || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-heading">
                      {formatAmount(purchaseOrder.amount)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusBadgeClass(purchaseOrder.status)}`}
                      >
                        {purchaseOrder.status || "Generated"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-secondary">
                      {formatDateTime(purchaseOrder.generated_at)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/purchase-orders/${purchaseOrder.id}`}
                        className="inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                      >
                        View PO
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-panel px-5 py-3">
            <p className="text-xs text-muted">
              Showing {purchaseOrders.length} purchase order
              {purchaseOrders.length !== 1 ? "s" : ""}.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

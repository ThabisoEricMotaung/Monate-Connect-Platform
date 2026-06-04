"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  formatPaymentAmount,
  getPayments,
  normalizePaymentStatus,
  type Payment,
} from "@/lib/payments"

const statusStyles: Record<string, string> = {
  Pending: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Processing: "border-warning bg-warning-soft text-warning",
  Paid: "border-success bg-success-soft text-success",
  Failed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Cancelled: "border-panel bg-panel text-secondary",
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadPayments() {
      try {
        setPayments(await getPayments())
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Payments failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadPayments()
  }, [])

  const metrics = useMemo(() => {
    const statuses = payments.map((payment) =>
      normalizePaymentStatus(payment.status)
    )

    return {
      pending: statuses.filter((status) => status === "Pending").length,
      processing: statuses.filter((status) => status === "Processing").length,
      paid: statuses.filter((status) => status === "Paid").length,
      failed: statuses.filter((status) => status === "Failed").length,
    }
  }, [payments])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement / Payments
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Payments</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Track approved invoice payments from pending release through processing,
          settlement, and payment confirmation.
        </p>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={metrics.pending} />
        <MetricCard label="Processing" value={metrics.processing} />
        <MetricCard label="Paid" value={metrics.paid} />
        <MetricCard label="Failed" value={metrics.failed} />
      </section>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Payments failed to load
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

      {!loading && !errorMessage && payments.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No payments available yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Payments appear here after an approved invoice is converted into a
            payment record.
          </p>
        </div>
      )}

      {!loading && !errorMessage && payments.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "Payment Number",
                    "Invoice Number",
                    "Supplier",
                    "Amount",
                    "Payment Method",
                    "Payment Date",
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
                {payments.map((payment) => {
                  const status = normalizePaymentStatus(payment.status)

                  return (
                    <tr key={payment.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-accent">
                        {payment.payment_number || `PAY-${payment.id}`}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {payment.invoice?.invoice_number ||
                          (payment.invoice_id ? `INV-${payment.invoice_id}` : "-")}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {payment.supplier_name || "-"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {formatPaymentAmount(payment.amount)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {payment.payment_method || "-"}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(payment.payment_date)}
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
                          href={`/dashboard/payments/${payment.id}`}
                          className="inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                        >
                          View Payment
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

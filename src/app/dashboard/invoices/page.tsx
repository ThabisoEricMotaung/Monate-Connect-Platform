"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getInvoices, type Invoice } from "@/lib/invoices"

const statusStyles: Record<string, string> = {
  Draft: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Submitted: "border-accent-soft bg-accent-soft text-accent-strong",
  "Under Review": "border-warning bg-warning-soft text-warning",
  Approved: "border-success/60 bg-success-soft text-success",
  Rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Paid: "border-success bg-success-soft text-success",
}

function normalizeInvoiceStatus(status: string | null): string {
  return status && statusStyles[status] ? status : "Draft"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function displayValue(value: string | number | null): string {
  return value == null ? "-" : String(value)
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadInvoices() {
      try {
        setInvoices(await getInvoices())
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Invoices failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [])

  const metrics = useMemo(() => {
    const statuses = invoices.map((invoice) =>
      normalizeInvoiceStatus(invoice.status)
    )

    return {
      submitted: statuses.filter((status) => status === "Submitted").length,
      review: statuses.filter((status) => status === "Under Review").length,
      approved: statuses.filter((status) => status === "Approved").length,
      paid: statuses.filter((status) => status === "Paid").length,
    }
  }, [invoices])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement / Finance
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Invoices</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Generate, review, and track supplier invoices connected to contracts
          and awarded purchase orders.
        </p>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Submitted" value={metrics.submitted} />
        <MetricCard label="Under Review" value={metrics.review} />
        <MetricCard label="Approved" value={metrics.approved} />
        <MetricCard label="Paid" value={metrics.paid} />
      </section>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Invoices failed to load
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

      {!loading && !errorMessage && invoices.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No invoices available yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Invoices appear here after a contract is converted into a billing
            record.
          </p>
        </div>
      )}

      {!loading && !errorMessage && invoices.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "Invoice Number",
                    "Supplier",
                    "Contract",
                    "Amount",
                    "Due Date",
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
                {invoices.map((invoice) => {
                  const status = normalizeInvoiceStatus(invoice.status)

                  return (
                    <tr key={invoice.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-accent">
                        {invoice.invoice_number || `INV-${invoice.id}`}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {invoice.supplier_name || "-"}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {invoice.contract_id ? `CNT-${invoice.contract_id}` : "-"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {displayValue(invoice.amount)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(invoice.due_date)}
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
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                        >
                          View Invoice
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

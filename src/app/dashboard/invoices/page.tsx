"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getInvoices, type Invoice } from "@/lib/invoices"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"

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

function dueUrgency(invoice: Invoice): number {
  if (!invoice.due_date) return 3

  const due = new Date(invoice.due_date)
  if (Number.isNaN(due.getTime())) return 3

  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
  if (days < 0) return 0
  if (days <= 7) return 1

  return 2
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
  const [canManage, setCanManage] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadInvoices() {
      try {
        const [profile, loadedInvoices] = await Promise.all([
          getCurrentProfile(),
          getInvoices(),
        ])

        setCanManage(hasAdminOrBuyerAccess(profile))
        setInvoices(loadedInvoices)
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

  const supplierOptions = useMemo(
    () => Array.from(new Set(invoices.map((invoice) => invoice.supplier_name).filter(Boolean))).sort(),
    [invoices]
  )

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((invoice) => {
        const status = normalizeInvoiceStatus(invoice.status).toLowerCase().replace(/\s+/g, "-")
        const statusMatch = statusFilter === "all" || status === statusFilter
        const supplierMatch = supplierFilter === "all" || invoice.supplier_name === supplierFilter
        const submittedAt = invoice.created_at ? new Date(invoice.created_at).getTime() : 0
        const fromMatch = !dateFrom || submittedAt >= new Date(`${dateFrom}T00:00:00`).getTime()
        const toMatch = !dateTo || submittedAt <= new Date(`${dateTo}T23:59:59`).getTime()

        return statusMatch && supplierMatch && fromMatch && toMatch
      })
      .sort((a, b) => {
        if (canManage) {
          const urgency = dueUrgency(a) - dueUrgency(b)
          if (urgency !== 0) return urgency
        }

        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
  }, [canManage, dateFrom, dateTo, invoices, statusFilter, supplierFilter])

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

      {!loading && !errorMessage && invoices.length > 0 && (
        <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
          <div className="grid gap-4 md:grid-cols-5">
            <label>
              <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                Status
              </span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent">
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under-review">Under review</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            {canManage && (
              <label>
                <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                  Supplier
                </span>
                <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent">
                  <option value="all">All suppliers</option>
                  {supplierOptions.map((supplierName) => (
                    <option key={supplierName} value={supplierName ?? ""}>{supplierName}</option>
                  ))}
                </select>
              </label>
            )}
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
            <div className="rounded-md border border-panel bg-panel px-4 py-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                Sort
              </p>
              <p className="mt-2 text-sm font-semibold text-heading">
                {canManage ? "Urgent first" : "Submitted newest"}
              </p>
            </div>
          </div>
        </section>
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
                {filteredInvoices.map((invoice) => {
                  const status = normalizeInvoiceStatus(invoice.status)
                  const urgent = canManage && dueUrgency(invoice) <= 1

                  return (
                    <tr key={invoice.id} className={`transition-colors hover:bg-surface ${urgent ? "bg-warning-soft/60" : ""}`}>
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
                          href={invoice.purchase_order_id ? `/dashboard/awards/${invoice.purchase_order_id}` : `/dashboard/invoices/${invoice.id}`}
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

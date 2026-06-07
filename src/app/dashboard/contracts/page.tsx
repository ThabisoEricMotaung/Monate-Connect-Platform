"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  getContractRenewalStatus,
  getContracts,
  normalizeContractStatus,
  type ContractRenewalStatus,
  type Contract,
} from "@/lib/contracts"

const statusStyles: Record<string, string> = {
  Draft: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Active: "border-success bg-success-soft text-success",
  "Expiring Soon": "border-warning bg-warning-soft text-warning",
  Renewed: "border-accent-soft bg-accent-soft text-accent-strong",
  Completed: "border-success/60 bg-success-soft text-success",
  Terminated: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

const renewalStatusStyles: Record<ContractRenewalStatus, string> = {
  Expired: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  "Expiring Soon": "border-warning bg-warning-soft text-warning",
  "Renewal Due": "border-accent bg-accent-soft text-accent-strong",
  Active: "border-success bg-success-soft text-success",
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

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"newest" | "endDate">("newest")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadContracts() {
      try {
        setContracts(await getContracts())
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Contracts failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadContracts()
  }, [])

  const metrics = useMemo(() => {
    const statuses = contracts.map((contract) => normalizeContractStatus(contract.status))
    const renewalStatuses = contracts.map((contract) =>
      getContractRenewalStatus(contract.end_date, contract.renewal_date)
    )

    return {
      active: statuses.filter((status) => status === "Active").length,
      expiring: renewalStatuses.filter((status) => status === "Expiring Soon").length,
      renewed: statuses.filter((status) => status === "Renewed").length,
      completed: statuses.filter((status) => status === "Completed").length,
    }
  }, [contracts])

  const filteredContracts = useMemo(() => {
    return contracts
      .filter((contract) => {
        const status = normalizeContractStatus(contract.status, contract.end_date)
        const normalizedStatus =
          status === "Draft" ? "pending" :
          status === "Expiring Soon" ? "expired" :
          status.toLowerCase()
        const statusMatch = statusFilter === "all" || normalizedStatus === statusFilter
        const issuedAt = contract.created_at
          ? new Date(contract.created_at).getTime()
          : 0
        const fromMatch = !dateFrom || issuedAt >= new Date(`${dateFrom}T00:00:00`).getTime()
        const toMatch = !dateTo || issuedAt <= new Date(`${dateTo}T23:59:59`).getTime()

        return statusMatch && fromMatch && toMatch
      })
      .sort((a, b) => {
        if (sortBy === "endDate") {
          return new Date(a.end_date ?? 0).getTime() - new Date(b.end_date ?? 0).getTime()
        }

        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
  }, [contracts, dateFrom, dateTo, sortBy, statusFilter])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement / Contracting
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Contracts
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Manage supplier contracts created from accepted and fulfilled purchase
          orders, with renewal tracking and expiry visibility.
        </p>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Contracts" value={metrics.active} />
        <MetricCard label="Expiring Soon" value={metrics.expiring} />
        <MetricCard label="Renewed" value={metrics.renewed} />
        <MetricCard label="Completed" value={metrics.completed} />
      </section>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Contracts failed to load
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

      {!loading && !errorMessage && contracts.length > 0 && (
        <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
          <div className="grid gap-4 md:grid-cols-4">
            <label>
              <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                Status
              </span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Signed</option>
                <option value="expired">Expired</option>
                <option value="terminated">Expired / terminated</option>
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
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "newest" | "endDate")} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none focus:border-accent">
                <option value="newest">Issue date newest</option>
                <option value="endDate">End date soonest</option>
              </select>
            </label>
          </div>
        </section>
      )}

      {!loading && !errorMessage && contracts.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No contracts available yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Contracts appear here after a purchase order is converted into a
            managed agreement.
          </p>
        </div>
      )}

      {!loading && !errorMessage && contracts.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "Contract Number",
                    "Supplier",
                    "Contract Value",
                    "Start Date",
                    "End Date",
                    "Renewal Date",
                    "Renewal Status",
                    "Contract Status",
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
                {filteredContracts.map((contract) => {
                  const status = normalizeContractStatus(contract.status)
                  const renewalStatus = getContractRenewalStatus(
                    contract.end_date,
                    contract.renewal_date
                  )

                  return (
                    <tr key={contract.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-accent">
                        {contract.contract_number || `CNT-${contract.id}`}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {contract.supplier_name || "-"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {formatAmount(contract.contract_value)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(contract.start_date)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(contract.end_date)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(contract.renewal_date)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${renewalStatusStyles[renewalStatus]}`}
                        >
                          {renewalStatus}
                        </span>
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
                          href={contract.purchase_order_id ? `/dashboard/awards/${contract.purchase_order_id}` : `/dashboard/contracts/${contract.id}`}
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

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { notifyContractExpiring } from "@/lib/automationRules"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  getContractRenewalStatus,
  normalizeContractStatus,
  type Contract,
  type ContractRenewalStatus,
} from "@/lib/contracts"
import { supabase } from "@/lib/supabase"

type RenewalRow = Contract & {
  supplier_province: string | null
  supplier_industry: string | null
}

type Filters = {
  supplier: string
  province: string
  status: string
  renewalStatus: string
}

const EMPTY_FILTERS: Filters = {
  supplier: "",
  province: "",
  status: "",
  renewalStatus: "",
}

const statusStyles: Record<string, string> = {
  Draft: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Active: "border-success bg-success-soft text-success",
  "Expiring Soon": "border-warning bg-warning-soft text-warning",
  Renewed: "border-accent bg-accent-soft text-accent-strong",
  Completed: "border-success/60 bg-success-soft text-success",
  Terminated: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

const renewalStatusStyles: Record<ContractRenewalStatus, string> = {
  Expired: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  "Expiring Soon": "border-warning bg-warning-soft text-warning",
  "Renewal Due": "border-accent bg-accent-soft text-accent-strong",
  Active: "border-success bg-success-soft text-success",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("does not exist") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
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
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function uniqueOptions(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort()
}

function MetricCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-heading">{value}</p>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  )
}

export default function AdminContractRenewalsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<RenewalRow[]>([])
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadRenewals() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("contracts")
        .select("id, contract_number, supplier_id, supplier_name, rfq_id, purchase_order_id, contract_value, start_date, end_date, renewal_date, status, notes, document_url, created_at")
        .order("end_date", { ascending: true, nullsFirst: false })

      if (error) {
        setErrorMessage(
          isMissingTableError(error)
            ? "Contracts table is not available yet. Renewal management will load once contracts exist."
            : error.message
        )
        setLoading(false)
        return
      }

      const contractRows = (data ?? []) as Contract[]
      const supplierIds = Array.from(
        new Set(contractRows.map((contract) => contract.supplier_id).filter((id): id is string => Boolean(id)))
      )
      const supplierMap = new Map<string, { province: string | null; industry: string | null }>()

      if (supplierIds.length > 0) {
        const { data: supplierData, error: supplierError } = await supabase
          .from("profiles")
          .select("id, province, industry")
          .in("id", supplierIds)

        if (supplierError && !isMissingTableError(supplierError)) {
          setErrorMessage(supplierError.message)
        }

        ;(supplierData ?? []).forEach((supplier) => {
          supplierMap.set(String(supplier.id), {
            province: (supplier.province as string | null) ?? null,
            industry: (supplier.industry as string | null) ?? null,
          })
        })
      }

      const rows = contractRows.map((contract) => {
        const supplier = contract.supplier_id ? supplierMap.get(contract.supplier_id) : null
        return {
          ...contract,
          supplier_province: supplier?.province ?? null,
          supplier_industry: supplier?.industry ?? null,
        }
      })

      setContracts(rows)
      setLoading(false)

      try {
        await Promise.all(
          rows
            .filter((contract) => getContractRenewalStatus(contract.end_date, contract.renewal_date) === "Expiring Soon")
            .map((contract) => notifyContractExpiring(contract))
        )
      } catch (notificationError) {
        console.warn("Contract expiry renewal notifications failed:", notificationError)
      }
    }

    loadRenewals()
  }, [router])

  const options = useMemo(
    () => ({
      suppliers: uniqueOptions(contracts.map((contract) => contract.supplier_name)),
      provinces: uniqueOptions(contracts.map((contract) => contract.supplier_province)),
      statuses: uniqueOptions(contracts.map((contract) => normalizeContractStatus(contract.status))),
      renewalStatuses: uniqueOptions(
        contracts.map((contract) =>
          getContractRenewalStatus(contract.end_date, contract.renewal_date)
        )
      ),
    }),
    [contracts]
  )

  const filteredContracts = useMemo(
    () =>
      contracts.filter((contract) => {
        const contractStatus = normalizeContractStatus(contract.status)
        const renewalStatus = getContractRenewalStatus(
          contract.end_date,
          contract.renewal_date
        )

        return (
          (!filters.supplier || contract.supplier_name === filters.supplier) &&
          (!filters.province || contract.supplier_province === filters.province) &&
          (!filters.status || contractStatus === filters.status) &&
          (!filters.renewalStatus || renewalStatus === filters.renewalStatus)
        )
      }),
    [contracts, filters]
  )

  const metrics = useMemo(() => {
    const renewalStatuses = contracts.map((contract) =>
      getContractRenewalStatus(contract.end_date, contract.renewal_date)
    )
    const contractStatuses = contracts.map((contract) =>
      normalizeContractStatus(contract.status)
    )

    return {
      expiringSoon: renewalStatuses.filter((status) => status === "Expiring Soon").length,
      renewalDue: renewalStatuses.filter((status) => status === "Renewal Due").length,
      expired: renewalStatuses.filter((status) => status === "Expired").length,
      active: renewalStatuses.filter((status) => status === "Active").length,
      completed: contractStatuses.filter((status) => status === "Completed").length,
    }
  }, [contracts])

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
    setSuccessMessage("")
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Contract Governance
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Contract Renewals
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Track contract end dates, renewal windows, expiry risk, and supplier
          continuity exposure across the procurement portfolio.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Renewals alert</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Expiring Soon" value={metrics.expiringSoon} hint="End date within 30 days" />
        <MetricCard label="Renewal Due" value={metrics.renewalDue} hint="Renewal date within 30 days" />
        <MetricCard label="Expired" value={metrics.expired} hint="End date is in the past" />
        <MetricCard label="Active" value={metrics.active} hint="No immediate date risk" />
        <MetricCard label="Completed" value={metrics.completed} hint="Lifecycle status completed" />
      </section>

      <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label htmlFor="renewal-supplier" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Supplier
            </label>
            <select
              id="renewal-supplier"
              value={filters.supplier}
              onChange={(event) => updateFilter("supplier", event.target.value)}
              className={filterClass}
            >
              <option value="">All suppliers</option>
              {options.suppliers.map((supplier) => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="renewal-province" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Province
            </label>
            <select
              id="renewal-province"
              value={filters.province}
              onChange={(event) => updateFilter("province", event.target.value)}
              className={filterClass}
            >
              <option value="">All provinces</option>
              {options.provinces.map((province) => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="renewal-status" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Contract Status
            </label>
            <select
              id="renewal-status"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              className={filterClass}
            >
              <option value="">All statuses</option>
              {options.statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="renewal-intelligence" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Renewal Status
            </label>
            <select
              id="renewal-intelligence"
              value={filters.renewalStatus}
              onChange={(event) => updateFilter("renewalStatus", event.target.value)}
              className={filterClass}
            >
              <option value="">All renewal statuses</option>
              {options.renewalStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFilters(EMPTY_FILTERS)
                setSuccessMessage("Filters cleared.")
              }}
              className="w-full rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <div className="mt-6 space-y-3 rounded-md border border-panel bg-card p-6 shadow-panel">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-md bg-panel" />
          ))}
        </div>
      )}

      {!loading && contracts.length === 0 && !errorMessage && (
        <div className="mt-6 rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No contracts available.</p>
          <p className="mt-2 text-xs text-muted">
            Renewal tracking will populate once contract records exist.
          </p>
        </div>
      )}

      {!loading && contracts.length > 0 && filteredContracts.length === 0 && (
        <div className="mt-6 rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No contracts match these filters.</p>
          <p className="mt-2 text-xs text-muted">Clear or adjust filters to broaden the renewal queue.</p>
        </div>
      )}

      {!loading && filteredContracts.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "Contract",
                    "Supplier",
                    "Province",
                    "Value",
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
                  const renewalStatus = getContractRenewalStatus(
                    contract.end_date,
                    contract.renewal_date
                  )
                  const contractStatus = normalizeContractStatus(contract.status)

                  return (
                    <tr key={contract.id} className="transition-colors hover:bg-surface">
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-accent">
                        {contract.contract_number || `CNT-${contract.id}`}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {contract.supplier_name || "-"}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {contract.supplier_province || "-"}
                      </td>
                      <td className="px-4 py-4 font-semibold text-heading">
                        {formatAmount(contract.contract_value)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(contract.end_date)}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {formatDate(contract.renewal_date)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${renewalStatusStyles[renewalStatus]}`}>
                          {renewalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusStyles[contractStatus] ?? "border-panel bg-panel text-secondary"}`}>
                          {contractStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/contracts/${contract.id}`}
                          className="inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                        >
                          Manage Renewal
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

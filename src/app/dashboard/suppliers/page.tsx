"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  email: string | null
  verification_status: string | null
  created_at: string | null
}

const statusStyles: Record<string, string> = {
  Verified: "border-success bg-success-soft text-success",
  "Under Review": "border-warning bg-warning-soft text-warning",
  "Pending Review": "border-warning bg-warning-soft text-warning",
  Pending: "border-warning bg-warning-soft text-warning",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-700",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function statusBadgeClass(status: string | null): string {
  return statusStyles[status || ""] ?? "border-panel bg-panel text-secondary"
}

function normalize(value: string | null): string {
  return (value ?? "").toLowerCase().trim()
}

export default function SuppliersDirectoryPage() {
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([])
  const [search, setSearch] = useState("")
  const [provinceFilter, setProvinceFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadSuppliers() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, business_name, province, industry, phone, email, verification_status, created_at")
        .order("business_name", { ascending: true })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setSuppliers((data ?? []) as SupplierProfile[])
      setLoading(false)
    }

    loadSuppliers()
  }, [])

  const provinceOptions = useMemo(
    () =>
      Array.from(
        new Set(suppliers.map((supplier) => supplier.province).filter(Boolean))
      ).sort() as string[],
    [suppliers]
  )

  const industryOptions = useMemo(
    () =>
      Array.from(
        new Set(suppliers.map((supplier) => supplier.industry).filter(Boolean))
      ).sort() as string[],
    [suppliers]
  )

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          suppliers
            .map((supplier) => supplier.verification_status)
            .filter(Boolean)
        )
      ).sort() as string[],
    [suppliers]
  )

  const filteredSuppliers = useMemo(() => {
    const searchNeedle = normalize(search)

    return suppliers.filter((supplier) => {
      const searchMatches =
        !searchNeedle ||
        normalize(supplier.business_name).includes(searchNeedle)
      const provinceMatches =
        !provinceFilter || supplier.province === provinceFilter
      const industryMatches =
        !industryFilter || supplier.industry === industryFilter
      const statusMatches =
        !statusFilter || supplier.verification_status === statusFilter

      return searchMatches && provinceMatches && industryMatches && statusMatches
    })
  }, [industryFilter, provinceFilter, search, statusFilter, suppliers])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement / Supplier Network
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier Directory
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Search and review registered suppliers by region, industry, and
          verification readiness for procurement engagement.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Supplier directory failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label
              htmlFor="supplier-search"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Business Name
            </label>
            <input
              id="supplier-search"
              type="search"
              placeholder="Search supplier"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={filterClass}
            />
          </div>

          <div>
            <label
              htmlFor="province-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Province
            </label>
            <select
              id="province-filter"
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All provinces</option>
              {provinceOptions.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="industry-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Industry
            </label>
            <select
              id="industry-filter"
              value={industryFilter}
              onChange={(event) => setIndustryFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All industries</option>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Verification
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading && (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-md border border-panel bg-card p-6 shadow-panel"
            >
              <div className="h-4 w-56 animate-pulse rounded bg-panel" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((__, fieldIndex) => (
                  <div
                    key={fieldIndex}
                    className="h-14 animate-pulse rounded-md bg-panel"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && suppliers.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No suppliers found.
          </p>
          <p className="mt-2 text-xs text-muted">
            Registered suppliers will appear here after profile creation.
          </p>
        </div>
      )}

      {!loading && suppliers.length > 0 && filteredSuppliers.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No suppliers match these filters.
          </p>
          <p className="mt-2 text-xs text-muted">
            Adjust the business name, province, industry, or verification status.
          </p>
        </div>
      )}

      {!loading && filteredSuppliers.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredSuppliers.map((supplier) => (
            <article
              key={supplier.id}
              className="rounded-md border border-panel bg-card p-6 shadow-panel"
            >
              <div className="flex flex-col gap-4 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                    Supplier
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-heading">
                    {supplier.business_name || "Supplier Profile"}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Registered {formatDate(supplier.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(supplier.verification_status)}`}
                >
                  {supplier.verification_status || "Pending Review"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Province
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {supplier.province || "-"}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Industry
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {supplier.industry || "-"}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Phone
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {supplier.phone || "-"}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Email
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-heading">
                    {supplier.email || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-panel pt-5">
                <Link
                  href={`/dashboard/suppliers/${supplier.id}`}
                  className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
                >
                  View Profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

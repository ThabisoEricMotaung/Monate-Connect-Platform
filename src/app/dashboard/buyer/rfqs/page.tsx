"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { formatRand } from "@/lib/format"
import { supabase } from "@/lib/supabase"

type BuyerRFQ = {
  id: number
  title: string | null
  category: string | null
  province: string | null
  region: string | null
  budget: string | number | null
  deadline: string | null
  status: string | null
  created_at: string | null
  is_external_opportunity: boolean | null
  source_name: string | null
}

type SupplierMatchProfile = {
  industry: string | null
  province: string | null
  provinces: string[] | null
}

type ListFilter = "all" | "etenders-pending"
type SortKey = "newest" | "matches"

const UI_PAGE_SIZE = 50
const FETCH_PAGE_SIZE = 1000

// --- Supplier matching (mirrors the scoring used on the public
// /opportunities page and the admin RFQ queue, so "strong match" means the
// same thing everywhere someone is prioritizing review) ----------------------

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function normalizeArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizedProvinceSet(
  province: string | null | undefined,
  provinces: string[] | null | undefined,
): Set<string> {
  const values = normalizeArray(provinces)
  if (province) values.push(province)

  return new Set(
    values.map(normalize).map((value) =>
      value === "south africa" || value === "all provinces" ? "national" : value,
    ),
  )
}

function countMatchingSuppliers(rfq: BuyerRFQ, suppliers: SupplierMatchProfile[]): number {
  const rfqIndustry = normalize(rfq.category)
  const rfqProvinces = normalizedProvinceSet(rfq.province ?? rfq.region, null)

  if (!rfqIndustry) return 0

  return suppliers.filter((supplier) => {
    const industryMatches = normalize(supplier.industry) === rfqIndustry
    if (!industryMatches) return false

    if (rfqProvinces.size === 0) return true

    const supplierProvinces = normalizedProvinceSet(supplier.province, supplier.provinces)
    return Array.from(supplierProvinces).some((province) => rfqProvinces.has(province))
  }).length
}

function statusBadgeClass(status: string | null): string {
  const value = String(status ?? "").toLowerCase()
  if (["open", "published", "active"].includes(value)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
  }
  if (["evaluation", "under review", "review"].includes(value)) {
    return "border-sky-500/25 bg-sky-500/10 text-sky-700"
  }
  if (["awarded", "po issued"].includes(value)) {
    return "border-accent/25 bg-accent/10 text-accent"
  }
  if (["closed", "completed", "cancelled", "canceled"].includes(value)) {
    return "border-panel bg-surface text-secondary"
  }
  return "border-panel bg-surface text-secondary"
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"

  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function BuyerRfqsPage() {
  const [rfqs, setRfqs] = useState<BuyerRFQ[]>([])
  const [suppliers, setSuppliers] = useState<SupplierMatchProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<ListFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [provinceFilter, setProvinceFilter] = useState("all")
  const [sortBy, setSortBy] = useState<SortKey>("newest")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  async function loadRFQs() {
    if (!supabase) return

    setLoading(true)
    setErrorMessage(null)

    const allRows: BuyerRFQ[] = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from("rfqs")
        .select(
          "id, title, category, province, region, budget, deadline, status, created_at, is_external_opportunity, source_name",
        )
        .order("created_at", { ascending: false })
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as BuyerRFQ[]
      allRows.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }

    setRfqs(allRows)
    setLoading(false)
  }

  async function loadSuppliers() {
    if (!supabase) return

    const allRows: SupplierMatchProfile[] = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from("profiles")
        .select("industry, province, provinces")
        .eq("role", "supplier")
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        console.warn("Supplier match fetch failed:", error.message)
        break
      }

      const rows = (data ?? []) as SupplierMatchProfile[]
      allRows.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }

    setSuppliers(allRows)
  }

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Supabase is not configured.")
      setLoading(false)
      return
    }

    loadRFQs()
    loadSuppliers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const matchCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const rfq of rfqs) {
      counts.set(rfq.id, countMatchingSuppliers(rfq, suppliers))
    }
    return counts
  }, [rfqs, suppliers])

  const activeCount = useMemo(
    () =>
      rfqs.filter((rfq) =>
        ["open", "evaluation"].includes(String(rfq.status ?? "").toLowerCase()),
      ).length,
    [rfqs],
  )

  const etendersPending = useMemo(
    () =>
      rfqs.filter(
        (rfq) => rfq.is_external_opportunity && String(rfq.status ?? "").toLowerCase() === "draft",
      ),
    [rfqs],
  )

  const baseList = filter === "etenders-pending" ? etendersPending : rfqs

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(baseList.map((rfq) => rfq.category?.trim()).filter(Boolean) as string[])).sort(),
    [baseList],
  )

  const provinceOptions = useMemo(
    () =>
      Array.from(
        new Set(baseList.map((rfq) => (rfq.province ?? rfq.region)?.trim()).filter(Boolean) as string[]),
      ).sort(),
    [baseList],
  )

  const filteredRfqs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    const matched = baseList.filter((rfq) => {
      if (categoryFilter !== "all" && rfq.category?.trim() !== categoryFilter) return false
      if (provinceFilter !== "all" && (rfq.province ?? rfq.region)?.trim() !== provinceFilter) return false
      if (term && !(rfq.title ?? "").toLowerCase().includes(term)) return false
      return true
    })

    if (sortBy === "matches") {
      return [...matched].sort((a, b) => (matchCounts.get(b.id) ?? 0) - (matchCounts.get(a.id) ?? 0))
    }

    return matched
  }, [baseList, categoryFilter, provinceFilter, searchTerm, sortBy, matchCounts])

  const totalPages = Math.max(1, Math.ceil(filteredRfqs.length / UI_PAGE_SIZE))
  const pagedRfqs = filteredRfqs.slice((page - 1) * UI_PAGE_SIZE, page * UI_PAGE_SIZE)

  // Reset to page 1 and clear selection whenever the visible set changes shape,
  // so bulk actions never silently apply to a stale selection.
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [filter, searchTerm, categoryFilter, provinceFilter])

  const pageAllSelected = pagedRfqs.length > 0 && pagedRfqs.every((rfq) => selectedIds.has(rfq.id))

  function toggleRow(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePage() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (pageAllSelected) {
        for (const rfq of pagedRfqs) next.delete(rfq.id)
      } else {
        for (const rfq of pagedRfqs) next.add(rfq.id)
      }
      return next
    })
  }

  function selectAllMatching() {
    setSelectedIds(new Set(filteredRfqs.map((rfq) => rfq.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function publishSelected() {
    if (!supabase || selectedIds.size === 0) return
    setBulkBusy(true)
    setBulkMessage(null)

    const ids = Array.from(selectedIds)
    const { error } = await supabase.from("rfqs").update({ status: "open" }).in("id", ids)

    setBulkBusy(false)
    if (error) {
      setBulkMessage(`Publish failed: ${error.message}`)
      return
    }

    setBulkMessage(`Published ${ids.length} RFQ${ids.length === 1 ? "" : "s"}.`)
    clearSelection()
    await loadRFQs()
  }

  async function discardSelected() {
    if (!supabase || selectedIds.size === 0) return
    if (!window.confirm(`Discard ${selectedIds.size} draft${selectedIds.size === 1 ? "" : "s"}? This can't be undone.`)) {
      return
    }

    setBulkBusy(true)
    setBulkMessage(null)

    const ids = Array.from(selectedIds)
    const { error } = await supabase.from("rfqs").delete().in("id", ids)

    setBulkBusy(false)
    if (error) {
      setBulkMessage(`Discard failed: ${error.message}`)
      return
    }

    setBulkMessage(`Discarded ${ids.length} draft${ids.length === 1 ? "" : "s"}.`)
    clearSelection()
    await loadRFQs()
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-heading">RFQs</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
              Manage active and draft requests for quotation across the platform.
            </p>
          </div>
          <Link
            href="/dashboard/buyer/rfqs/new"
            className="inline-flex w-fit rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
          >
            Create new RFQ &rarr;
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Total RFQs</p>
          <p className="mt-2 text-3xl font-bold text-heading">{loading ? "-" : rfqs.length}</p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Active</p>
          <p className="mt-2 text-3xl font-bold text-heading">{loading ? "-" : activeCount}</p>
        </div>
        <button
          type="button"
          onClick={() => setFilter(filter === "etenders-pending" ? "all" : "etenders-pending")}
          className={`rounded-md border p-5 text-left shadow-panel transition ${
            filter === "etenders-pending"
              ? "border-accent bg-accent/10"
              : "border-panel bg-card hover:border-accent/40"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
            eTenders pending review
          </p>
          <p className="mt-2 text-3xl font-bold text-heading">{loading ? "-" : etendersPending.length}</p>
          <p className="mt-1 text-xs font-semibold text-accent">
            {filter === "etenders-pending" ? "Showing pending only ✕" : "Click to filter"}
          </p>
        </button>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Latest</p>
          <p className="mt-2 break-words text-sm font-semibold text-heading">
            {loading ? "-" : rfqs[0]?.title ?? "No RFQs"}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">RFQs failed to load</p>
          <p className="mt-1 text-sm text-rose-700">{errorMessage}</p>
        </div>
      )}

      {!loading && baseList.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-md border border-panel bg-card p-4 shadow-panel sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title..."
            className="w-full rounded-md border border-panel bg-page px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none sm:max-w-xs"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-md border border-panel bg-page px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none sm:w-auto"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={provinceFilter}
            onChange={(event) => setProvinceFilter(event.target.value)}
            className="w-full rounded-md border border-panel bg-page px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none sm:w-auto"
          >
            <option value="all">All provinces</option>
            {provinceOptions.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
            className="w-full rounded-md border border-panel bg-page px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none sm:w-auto"
          >
            <option value="newest">Newest first</option>
            <option value="matches">Most matching suppliers</option>
          </select>
          {(searchTerm || categoryFilter !== "all" || provinceFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("")
                setCategoryFilter("all")
                setProvinceFilter("all")
              }}
              className="text-xs font-semibold text-accent transition hover:text-accent-strong"
            >
              Clear filters
            </button>
          )}
          <p className="text-xs text-muted sm:ml-auto">
            {filteredRfqs.length} matching
          </p>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-10 mb-4 flex flex-col gap-3 rounded-md border border-accent/40 bg-accent/10 p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-heading">
            {selectedIds.size} selected
            {selectedIds.size < filteredRfqs.length && (
              <button
                type="button"
                onClick={selectAllMatching}
                className="ml-2 text-xs font-semibold text-accent underline transition hover:text-accent-strong"
              >
                Select all {filteredRfqs.length} matching
              </button>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={publishSelected}
              className="rounded-md border border-accent bg-accent px-4 py-2 text-xs font-bold text-button shadow-sm transition hover:bg-accent-strong disabled:opacity-60"
            >
              Publish selected
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={discardSelected}
              className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-60"
            >
              Discard selected
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-semibold text-secondary transition hover:text-heading"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {bulkMessage && (
        <div className="mb-4 rounded-md border border-panel bg-card px-4 py-3 text-xs font-semibold text-secondary shadow-panel">
          {bulkMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-md border border-panel bg-card p-8 text-center text-sm text-secondary shadow-panel">
          Loading&hellip;
        </div>
      ) : filteredRfqs.length === 0 ? (
        <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            {filter === "etenders-pending"
              ? "No eTenders drafts match right now."
              : "No RFQs yet. Create the first RFQ to start receiving quotes from verified suppliers."}
          </p>
          {filter === "etenders-pending" ? (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-5 inline-flex rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
            >
              Show all RFQs
            </button>
          ) : (
            <Link
              href="/dashboard/buyer/rfqs/new"
              className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
            >
              Create new RFQ &rarr;
            </Link>
          )}
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-panel shadow-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel bg-card text-left text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  <th className="w-10 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={togglePage}
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="px-5 py-3">Title</th>
                  <th className="hidden px-5 py-3 md:table-cell">Category</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Budget</th>
                  <th className="hidden px-5 py-3 lg:table-cell" title="Suppliers on the platform whose industry and province match this RFQ">
                    Matches
                  </th>
                  <th className="px-5 py-3">Status</th>
                  <th className="hidden px-5 py-3 sm:table-cell">Deadline</th>
                  <th className="hidden px-5 py-3 xl:table-cell">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-panel bg-card">
                {pagedRfqs.map((rfq) => (
                  <tr
                    key={rfq.id}
                    className={`transition hover:bg-surface ${selectedIds.has(rfq.id) ? "bg-accent/5" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rfq.id)}
                        onChange={() => toggleRow(rfq.id)}
                        aria-label={`Select ${rfq.title ?? `RFQ-${rfq.id}`}`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-2 break-words font-semibold text-primary">
                          {rfq.title ?? `RFQ-${rfq.id}`}
                        </p>
                        {rfq.is_external_opportunity && (
                          <span
                            className="inline-flex shrink-0 items-center rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-sky-700"
                            title={rfq.source_name ? `Sourced from ${rfq.source_name}` : "Externally sourced"}
                          >
                            {rfq.source_name ?? "External"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-words text-xs text-secondary md:hidden">
                        {rfq.category ?? "No category"} / {rfq.province ?? rfq.region ?? "No province"}
                      </p>
                    </td>
                    <td className="hidden px-5 py-4 text-secondary md:table-cell">
                      <span className="line-clamp-2 break-words">
                        {rfq.category ?? "No category"} / {rfq.province ?? rfq.region ?? "No province"}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 font-semibold text-heading lg:table-cell">
                      {formatRand(rfq.budget)}
                    </td>
                    <td className="hidden px-5 py-4 lg:table-cell">
                      {(() => {
                        const count = matchCounts.get(rfq.id) ?? 0
                        if (count === 0) {
                          return <span className="text-xs text-muted">No matches</span>
                        }
                        return (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold ${
                              count >= 5
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                                : "border-sky-500/25 bg-sky-500/10 text-sky-700"
                            }`}
                          >
                            {count} supplier{count === 1 ? "" : "s"}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold capitalize ${statusBadgeClass(
                          rfq.status,
                        )}`}
                      >
                        {rfq.status ?? "Draft"}
                      </span>
                    </td>
                    <td className="hidden px-5 py-4 text-secondary sm:table-cell">
                      {formatDate(rfq.deadline)}
                    </td>
                    <td className="hidden px-5 py-4 text-secondary xl:table-cell">
                      {formatDate(rfq.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/buyer/rfqs/${rfq.id}`}
                        className="text-xs font-semibold text-accent transition hover:text-accent-strong"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border border-panel bg-card px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent disabled:opacity-40"
              >
                &larr; Previous
              </button>
              <p className="text-xs font-semibold text-secondary">
                Page {page} of {totalPages}
              </p>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-md border border-panel bg-card px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent disabled:opacity-40"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

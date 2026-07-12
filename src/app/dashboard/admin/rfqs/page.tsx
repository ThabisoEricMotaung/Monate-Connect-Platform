"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { formatRand } from "@/lib/format"
import { supabase } from "@/lib/supabase"

type AdminRFQ = {
  id: number
  title: string | null
  category: string | null
  province: string | null
  region: string | null
  budget: string | number | null
  deadline: string | null
  status: string | null
  created_at: string | null
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

export default function AdminRfqsPage() {
  const [rfqs, setRfqs] = useState<AdminRFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Supabase is not configured.")
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadRFQs() {
      if (!supabase) return

      setLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from("rfqs")
        .select("id, title, category, province, region, budget, deadline, status, created_at")
        .order("created_at", { ascending: false })

      if (cancelled) return

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setRfqs((data ?? []) as AdminRFQ[])
      setLoading(false)
    }

    loadRFQs()

    return () => {
      cancelled = true
    }
  }, [])

  const activeCount = useMemo(
    () =>
      rfqs.filter((rfq) =>
        ["open", "evaluation"].includes(String(rfq.status ?? "").toLowerCase()),
      ).length,
    [rfqs],
  )

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
            href="/dashboard/admin/rfqs/new"
            className="inline-flex w-fit rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
          >
            Create new RFQ &rarr;
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Total RFQs</p>
          <p className="mt-2 text-3xl font-bold text-heading">{loading ? "-" : rfqs.length}</p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Active</p>
          <p className="mt-2 text-3xl font-bold text-heading">{loading ? "-" : activeCount}</p>
        </div>
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

      {loading ? (
        <div className="rounded-md border border-panel bg-card p-8 text-center text-sm text-secondary shadow-panel">
          Loading&hellip;
        </div>
      ) : rfqs.length === 0 ? (
        <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No RFQs yet. Create the first RFQ to start receiving quotes from verified suppliers.
          </p>
          <Link
            href="/dashboard/admin/rfqs/new"
            className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
          >
            Create new RFQ &rarr;
          </Link>
        </section>
      ) : (
        <div className="overflow-hidden rounded-md border border-panel shadow-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel bg-card text-left text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                <th className="px-5 py-3">Title</th>
                <th className="hidden px-5 py-3 md:table-cell">Category</th>
                <th className="hidden px-5 py-3 lg:table-cell">Budget</th>
                <th className="px-5 py-3">Status</th>
                <th className="hidden px-5 py-3 sm:table-cell">Deadline</th>
                <th className="hidden px-5 py-3 xl:table-cell">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-panel bg-card">
              {rfqs.map((rfq) => (
                <tr key={rfq.id} className="transition hover:bg-surface">
                  <td className="px-5 py-4">
                    <p className="line-clamp-2 break-words font-semibold text-primary">
                      {rfq.title ?? `RFQ-${rfq.id}`}
                    </p>
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
                      href={`/dashboard/admin/rfqs/${rfq.id}`}
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
      )}
    </div>
  )
}

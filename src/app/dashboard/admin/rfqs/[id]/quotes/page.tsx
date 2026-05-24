"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type QuoteStatus = "Pending" | "Under Review" | "Shortlisted" | "Awarded" | "Rejected"

type SortMode = "newest" | "amount"

type RFQ = {
  id: number
  title: string | null
  province: string | null
  category: string | null
  budget: string | null
  deadline: string | null
  status: string | null
}

type Quote = {
  id: number
  supplier_name: string | null
  amount: string | null
  timeline: string | null
  status: string | null
  scope: string | null
  supporting_notes: string | null
  created_at: string | null
}

const REVIEW_STATUSES: QuoteStatus[] = [
  "Under Review",
  "Shortlisted",
  "Awarded",
  "Rejected",
]

const statusStyles: Record<string, string> = {
  Pending: "border-warning bg-warning-soft text-warning",
  "Under Review": "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Shortlisted: "border-accent-soft bg-accent-soft text-accent-strong",
  Awarded: "border-success bg-success-soft text-success",
  Rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Open: "border-success bg-success-soft text-success",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  Closed: "border-panel bg-panel text-secondary",
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"

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

function amountValue(amount: string | null): number {
  if (!amount) return Number.POSITIVE_INFINITY

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  return !cleanAmount || Number.isNaN(numericAmount)
    ? Number.POSITIVE_INFINITY
    : numericAmount
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function AdminRFQQuotesPage() {
  const params = useParams<{ id: string }>()
  const rfqId = Number(params.id)
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadComparisonData() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      if (!Number.isFinite(rfqId)) {
        setErrorMessage("Invalid RFQ reference.")
        setLoading(false)
        return
      }

      const { data: rfqData, error: rfqError } = await supabase
        .from("rfqs")
        .select("id, title, province, category, budget, deadline, status")
        .eq("id", rfqId)
        .single()

      if (rfqError) {
        setErrorMessage(rfqError.message)
        setLoading(false)
        return
      }

      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select("id, supplier_name, amount, timeline, status, scope, supporting_notes, created_at")
        .eq("rfq_id", rfqId)
        .order("created_at", { ascending: false })

      if (quoteError) {
        setErrorMessage(quoteError.message)
        setLoading(false)
        return
      }

      setRfq(rfqData as RFQ)
      setQuotes((quoteData ?? []) as Quote[])
      setLoading(false)
    }

    loadComparisonData()
  }, [rfqId])

  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((a, b) => {
      if (sortMode === "amount") {
        return amountValue(a.amount) - amountValue(b.amount)
      }

      return (
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
      )
    })
  }, [quotes, sortMode])

  async function updateQuoteStatus(quoteId: number, status: QuoteStatus) {
    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    setUpdatingId(quoteId)
    setErrorMessage("")
    setSuccessMessage("")

    const { error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", quoteId)

    setUpdatingId(null)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setQuotes((currentQuotes) =>
      currentQuotes.map((quote) =>
        quote.id === quoteId ? { ...quote, status } : quote
      )
    )
    setSuccessMessage(`Quote ${quoteId} marked as ${status}.`)
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / RFQ Quote Comparison
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          RFQ Quote Comparison
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Compare supplier responses for a single RFQ and progress quote
          decisions through the procurement review workflow.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Quote comparison failed
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-5">
          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="h-5 w-72 animate-pulse rounded bg-panel" />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-md bg-panel"
                />
              ))}
            </div>
          </div>
          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="h-64 animate-pulse rounded-md bg-panel" />
          </div>
        </div>
      )}

      {!loading && rfq && (
        <>
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="flex flex-col gap-4 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                  RFQ Summary
                </p>
                <h2 className="mt-2 text-xl font-semibold text-heading">
                  {rfq.title || `RFQ-${rfq.id}`}
                </h2>
              </div>
              <span
                className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(rfq.status)}`}
              >
                {rfq.status || "Open"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Province
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {rfq.province || "-"}
                </p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Category
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {rfq.category || "-"}
                </p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Budget
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {formatAmount(rfq.budget)}
                </p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Deadline
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {formatDate(rfq.deadline)}
                </p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4 md:col-span-2">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  RFQ ID
                </p>
                <p className="mt-2 font-mono text-sm font-semibold text-accent">
                  RFQ-{rfq.id}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="grid gap-4 md:grid-cols-[1fr_260px] md:items-end">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  Quote Controls
                </p>
                <h2 className="mt-2 text-lg font-semibold text-heading">
                  Supplier comparison queue
                </h2>
              </div>
              <div>
                <label
                  htmlFor="quote-sort"
                  className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
                >
                  Sort
                </label>
                <select
                  id="quote-sort"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className={filterClass}
                >
                  <option value="newest">Newest first</option>
                  <option value="amount">Amount low to high</option>
                </select>
              </div>
            </div>
          </section>

          {quotes.length === 0 ? (
            <div className="mt-6 rounded-md border border-panel bg-card p-16 text-center shadow-panel">
              <p className="text-sm font-semibold text-heading">
                No quotes submitted for this RFQ yet.
              </p>
              <p className="mt-2 text-xs text-muted">
                Supplier submissions will appear here as soon as they are received.
              </p>
            </div>
          ) : (
            <section className="mt-6 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead>
                    <tr className="border-b border-panel bg-panel">
                      {[
                        "Supplier",
                        "Amount",
                        "Timeline",
                        "Status",
                        "Scope",
                        "Supporting Notes",
                        "Created",
                        "Actions",
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
                    {sortedQuotes.map((quote) => (
                      <tr
                        key={quote.id}
                        className="align-top transition-colors hover:bg-surface"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-heading">
                            {quote.supplier_name || "-"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-muted">
                            Q-{quote.id}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-heading">
                            {formatAmount(quote.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-secondary">
                          {quote.timeline || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusBadgeClass(quote.status)}`}
                          >
                            {quote.status || "Pending"}
                          </span>
                        </td>
                        <td className="max-w-[280px] px-4 py-4 text-secondary">
                          <p className="line-clamp-4 leading-6">
                            {quote.scope || "-"}
                          </p>
                        </td>
                        <td className="max-w-[280px] px-4 py-4 text-secondary">
                          <p className="line-clamp-4 leading-6">
                            {quote.supporting_notes || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-secondary">
                          {formatDate(quote.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-[260px] flex-wrap gap-2">
                            {REVIEW_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                disabled={
                                  updatingId === quote.id ||
                                  quote.status === status
                                }
                                onClick={() => updateQuoteStatus(quote.id, status)}
                                className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent-soft hover:bg-surface hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {status === "Under Review"
                                  ? "Mark Under Review"
                                  : status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-panel px-5 py-3">
                <p className="text-xs text-muted">
                  Showing {sortedQuotes.length} quote
                  {sortedQuotes.length !== 1 ? "s" : ""} for RFQ-{rfq.id}.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Quote = {
  id: number
  rfq_id: number | null
  supplier_name: string | null
  amount: string | null
  status: string | null
  created_at: string | null
  submitted_at: string | null
  supplier_id: string | null
}

type RFQSummary = {
  id: number
  title: string | null
  created_by?: string | null
}

type BuyerProfile = {
  id: string
  business_name: string | null
}

type QuoteView = Quote & {
  rfq_title: string
  buyer_name: string
}

const statusOptions = ["All", "Submitted", "Under review", "Shortlisted", "Awarded", "Unsuccessful"]

const statusStyles: Record<string, string> = {
  Submitted: "border-panel bg-panel text-secondary",
  "Under review": "border-sky-500/25 bg-sky-500/10 text-sky-200",
  Shortlisted: "border-success bg-success-soft text-success",
  Awarded: "border-accent bg-accent/15 text-accent",
  Unsuccessful: "border-rose-500/25 bg-rose-500/10 text-rose-200",
}

function normalizeStatus(status: string | null): string {
  const value = (status ?? "").trim().toLowerCase()

  if (["approved", "shortlisted"].includes(value)) return "Shortlisted"
  if (["awarded", "won"].includes(value)) return "Awarded"
  if (["rejected", "declined", "unsuccessful", "not awarded"].includes(value)) return "Unsuccessful"
  if (["under review", "reviewing", "in review"].includes(value)) return "Under review"

  return "Submitted"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not submitted"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatCurrency(amount: string | null): string {
  const numericAmount = Number(String(amount ?? "").replace(/[^\d.-]/g, ""))

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "R 0"

  return `R ${numericAmount.toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  })}`
}

function dateValue(quote: Quote): number {
  const rawDate = quote.submitted_at ?? quote.created_at
  return rawDate ? new Date(rawDate).getTime() : 0
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteView[]>([])
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadQuotes() {
      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        if (mounted) {
          setError(userError.message)
          setLoading(false)
        }
        return
      }

      if (!user) {
        if (mounted) {
          setQuotes([])
          setLoading(false)
        }
        return
      }

      const { data: quoteRows, error: quotesError } = await supabase
        .from("quotes")
        .select("id, rfq_id, supplier_name, amount, status, created_at, submitted_at, supplier_id")
        .eq("supplier_id", user.id)
        .order("created_at", { ascending: false })

      if (quotesError) {
        if (mounted) {
          setError(quotesError.message)
          setLoading(false)
        }
        return
      }

      const safeQuotes = (quoteRows ?? []) as Quote[]
      const rfqIds = Array.from(
        new Set(safeQuotes.map((quote) => quote.rfq_id).filter((id): id is number => id != null)),
      )

      let rfqMap = new Map<number, RFQSummary>()
      if (rfqIds.length > 0) {
        const { data: rfqRows } = await supabase
          .from("rfqs")
          .select("id, title, created_by")
          .in("id", rfqIds)

        rfqMap = new Map(((rfqRows ?? []) as RFQSummary[]).map((rfq) => [rfq.id, rfq]))
      }

      const buyerIds = Array.from(
        new Set(
          Array.from(rfqMap.values())
            .map((rfq) => rfq.created_by)
            .filter((id): id is string => Boolean(id)),
        ),
      )

      let buyerMap = new Map<string, string>()
      if (buyerIds.length > 0) {
        const { data: buyerRows } = await supabase
          .from("profiles")
          .select("id, business_name")
          .in("id", buyerIds)

        buyerMap = new Map(
          ((buyerRows ?? []) as BuyerProfile[]).map((buyer) => [
            buyer.id,
            buyer.business_name ?? "Buyer profile pending",
          ]),
        )
      }

      const hydratedQuotes = safeQuotes.map((quote) => {
        const rfq = quote.rfq_id != null ? rfqMap.get(quote.rfq_id) : undefined
        const buyerName = rfq?.created_by ? buyerMap.get(rfq.created_by) : undefined

        return {
          ...quote,
          rfq_title: rfq?.title ?? (quote.rfq_id != null ? `RFQ-${quote.rfq_id}` : "RFQ unavailable"),
          buyer_name: buyerName ?? "Buyer details pending",
        }
      })

      if (mounted) {
        setQuotes(hydratedQuotes)
        setLoading(false)
      }
    }

    loadQuotes()

    return () => {
      mounted = false
    }
  }, [])

  const visibleQuotes = useMemo(() => {
    return quotes
      .filter((quote) => statusFilter === "All" || normalizeStatus(quote.status) === statusFilter)
      .sort((a, b) => {
        const first = dateValue(a)
        const second = dateValue(b)

        return sortOrder === "newest" ? second - first : first - second
      })
  }, [quotes, sortOrder, statusFilter])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Submitted quotes</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Quote tracking</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Track submitted RFQ responses, buyer context, quote value, and review status in one
          structured supplier list.
        </p>
      </div>

      <div className="mb-5 grid gap-3 rounded-md border border-panel bg-card p-4 shadow-panel md:grid-cols-[1fr_auto_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-heading">Supplier quote list</p>
          <p className="mt-1 text-xs text-muted">
            {visibleQuotes.length} of {quotes.length} quote{quotes.length !== 1 ? "s" : ""} shown
          </p>
        </div>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-44 rounded-md border border-panel bg-panel px-3 py-2 text-sm font-medium normal-case tracking-normal text-heading outline-none transition focus:border-accent"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
          Sort
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}
            className="min-w-40 rounded-md border border-panel bg-panel px-3 py-2 text-sm font-medium normal-case tracking-normal text-heading outline-none transition focus:border-accent"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-md border border-panel bg-card p-5 shadow-panel"
            >
              <div className="h-4 w-2/5 animate-pulse rounded bg-panel" />
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((__, itemIndex) => (
                  <div key={itemIndex} className="h-3 animate-pulse rounded bg-panel" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-6">
          <p className="text-sm font-semibold text-rose-200">Failed to load quotes</p>
          <p className="mt-2 text-xs leading-6 text-rose-200/75">{error}</p>
        </div>
      ) : visibleQuotes.length === 0 ? (
        <div className="rounded-md border border-panel bg-card p-12 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No matching quotes</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">
            Submitted supplier quotes will appear here with their RFQ, buyer, value, date, and
            status.
          </p>
          <Link
            href="/dashboard/rfqs"
            className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Browse RFQs
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleQuotes.map((quote) => {
            const displayStatus = normalizeStatus(quote.status)

            return (
              <article
                key={quote.id}
                className="rounded-md border border-panel bg-card p-5 shadow-panel transition hover:border-accent/40"
              >
                <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr_0.7fr_0.8fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-accent">
                      RFQ-{quote.rfq_id ?? "pending"}
                    </p>
                    <h2 className="mt-2 text-base font-semibold text-heading">{quote.rfq_title}</h2>
                    <p className="mt-1 text-sm text-secondary">{quote.buyer_name}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Total quote value</p>
                    <p className="mt-2 text-lg font-semibold text-heading">
                      {formatCurrency(quote.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Submitted</p>
                    <p className="mt-2 text-sm font-medium text-heading">
                      {formatDate(quote.submitted_at ?? quote.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Status</p>
                    <span
                      className={`mt-2 inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
                        statusStyles[displayStatus] ?? "border-panel bg-panel text-secondary"
                      }`}
                    >
                      {displayStatus}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/messages?receiver_role=buyer-admin&rfq_id=${quote.rfq_id ?? ""}&quote_id=${quote.id}&subject=${encodeURIComponent(`Quote Q-${quote.id} question`)}`}
                    className="inline-flex justify-center rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-heading transition hover:border-accent hover:text-accent"
                  >
                    Message buyer
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

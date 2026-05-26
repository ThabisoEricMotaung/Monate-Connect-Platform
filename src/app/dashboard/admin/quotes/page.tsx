"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { logActivity } from "@/lib/activity"
import { requireAdminOrBuyer } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"

type QuoteStatus = "Pending" | "Under Review" | "Shortlisted" | "Awarded" | "Rejected"

type Quote = {
  id: number
  rfq_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  supplier_phone: string | null
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
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function formatAmount(amount: string | null): string {
  if (!amount) return "-"

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  })}`
}

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

function normalizeSearch(value: string | null): string {
  return (value ?? "").toLowerCase().trim()
}

function formatWhatsAppPhone(phone: string | null): string | null {
  const cleanedPhone = (phone ?? "")
    .replace(/\s/g, "")
    .replace(/\+/g, "")
    .replace(/[^\d]/g, "")

  if (!cleanedPhone) return null

  return cleanedPhone.startsWith("0")
    ? `27${cleanedPhone.slice(1)}`
    : cleanedPhone
}

function createWhatsAppLink(phone: string | null, message: string): string | null {
  const formattedPhone = formatWhatsAppPhone(phone)

  if (!formattedPhone) return null

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
}

export default function AdminQuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const [rfqFilter, setRfqFilter] = useState("")
  const [supplierSearch, setSupplierSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadQuotes() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("quotes")
        .select("id, rfq_id, supplier_id, supplier_name, amount, timeline, status, scope, supporting_notes, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      const quoteRows = (data ?? []) as Omit<Quote, "supplier_phone">[]
      const supplierIds = Array.from(
        new Set(
          quoteRows
            .map((quote) => quote.supplier_id)
            .filter((supplierId): supplierId is string => Boolean(supplierId))
        )
      )
      let phoneBySupplierId = new Map<string, string | null>()

      if (supplierIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, phone")
          .in("id", supplierIds)

        if (profileError) {
          setErrorMessage(profileError.message)
          setLoading(false)
          return
        }

        phoneBySupplierId = new Map(
          (profileData ?? []).map((profile) => [
            profile.id as string,
            profile.phone as string | null,
          ])
        )
      }

      setQuotes(
        quoteRows.map((quote) => ({
          ...quote,
          supplier_phone: quote.supplier_id
            ? phoneBySupplierId.get(quote.supplier_id) ?? null
            : null,
        }))
      )
      setLoading(false)
    }

    loadQuotes()
  }, [router])

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(quotes.map((quote) => quote.status).filter(Boolean))
      ).sort() as string[],
    [quotes]
  )

  const rfqOptions = useMemo(
    () =>
      Array.from(
        new Set(
          quotes
            .map((quote) => quote.rfq_id)
            .filter((rfqId): rfqId is number => rfqId !== null)
        )
      ).sort((a, b) => a - b),
    [quotes]
  )

  const filteredQuotes = useMemo(() => {
    const supplierNeedle = normalizeSearch(supplierSearch)

    return quotes.filter((quote) => {
      const statusMatches = !statusFilter || quote.status === statusFilter
      const rfqMatches = !rfqFilter || String(quote.rfq_id ?? "") === rfqFilter
      const supplierMatches =
        !supplierNeedle ||
        normalizeSearch(quote.supplier_name).includes(supplierNeedle)

      return statusMatches && rfqMatches && supplierMatches
    })
  }, [quotes, rfqFilter, statusFilter, supplierSearch])

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

    const updatedQuote = quotes.find((quote) => quote.id === quoteId)

    try {
      await logActivity({
        action: "quote.status_updated",
        entity_type: "quote",
        entity_id: quoteId,
        metadata: {
          previous_status: updatedQuote?.status ?? null,
          new_status: status,
          rfq_id: updatedQuote?.rfq_id ?? null,
          supplier_name: updatedQuote?.supplier_name ?? null,
        },
      })
    } catch (activityError) {
      console.error(activityError)
    }

    if (status === "Awarded" && updatedQuote?.supplier_id) {
      await createNotification({
        recipientId: updatedQuote.supplier_id,
        type: "Quote Awarded",
        title: "Your quote was awarded",
        message: `Your quote ${quoteId} has been marked as awarded.`,
        link: updatedQuote.rfq_id
          ? `/dashboard/rfqs/${updatedQuote.rfq_id}`
          : "/dashboard/quotes",
        metadata: {
          quote_id: quoteId,
          rfq_id: updatedQuote.rfq_id,
        },
      })
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
          Admin / Procurement Review
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Quote Review Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review submitted supplier quotations, filter procurement responses,
          and update quote decisions through a controlled enterprise workflow.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Quote review failed</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="quote-status-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Status
            </label>
            <select
              id="quote-status-filter"
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

          <div>
            <label
              htmlFor="quote-rfq-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              RFQ ID
            </label>
            <select
              id="quote-rfq-filter"
              value={rfqFilter}
              onChange={(event) => setRfqFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All RFQs</option>
              {rfqOptions.map((rfqId) => (
                <option key={rfqId} value={rfqId}>
                  RFQ-{rfqId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="quote-supplier-search"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Supplier Search
            </label>
            <input
              id="quote-supplier-search"
              type="search"
              placeholder="Search supplier name"
              value={supplierSearch}
              onChange={(event) => setSupplierSearch(event.target.value)}
              className={filterClass}
            />
          </div>
        </div>
      </section>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-md border border-panel bg-card p-6 shadow-panel"
            >
              <div className="h-4 w-64 animate-pulse rounded bg-panel" />
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((__, fieldIndex) => (
                  <div
                    key={fieldIndex}
                    className="h-16 animate-pulse rounded-md bg-panel"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && quotes.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No quotes found.</p>
          <p className="mt-2 text-xs text-muted">
            Supplier quotes will appear here once RFQ responses are submitted.
          </p>
        </div>
      )}

      {!loading && quotes.length > 0 && filteredQuotes.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No quotes match these filters.
          </p>
          <p className="mt-2 text-xs text-muted">
            Adjust status, RFQ ID, or supplier search to broaden the review queue.
          </p>
        </div>
      )}

      {!loading && filteredQuotes.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "Quote ID",
                    "RFQ ID",
                    "Supplier",
                    "WhatsApp",
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
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="align-top transition-colors hover:bg-surface">
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-accent">
                        Q-{quote.id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-secondary">
                        {quote.rfq_id != null ? `RFQ-${quote.rfq_id}` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-heading">
                        {quote.supplier_name || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const supplierName = quote.supplier_name || "Supplier"
                        const rfqReference =
                          quote.rfq_id != null ? quote.rfq_id : "unknown"
                        const whatsappLink = createWhatsAppLink(
                          quote.supplier_phone,
                          `Hi ${supplierName}, we reviewed your quote for RFQ #${rfqReference}. Please confirm availability for next steps.`
                        )

                        return whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex whitespace-nowrap rounded-md border border-success bg-success-soft px-3 py-2 text-xs font-semibold text-success transition hover:bg-success/10"
                          >
                            Contact on WhatsApp
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex cursor-not-allowed whitespace-nowrap rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-muted opacity-70"
                          >
                            No WhatsApp number
                          </button>
                        )
                      })()}
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
                      <p className="line-clamp-4 leading-6">{quote.scope || "-"}</p>
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
                        {quote.supplier_id ? (
                          <Link
                            href={`/dashboard/messages?receiver_id=${quote.supplier_id}&rfq_id=${quote.rfq_id ?? ""}&quote_id=${quote.id}&subject=${encodeURIComponent(`Quote Q-${quote.id} review`)}`}
                            className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                          >
                            Message Supplier
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-muted opacity-70"
                          >
                            No Supplier ID
                          </button>
                        )}
                        {REVIEW_STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={updatingId === quote.id || quote.status === status}
                            onClick={() => updateQuoteStatus(quote.id, status)}
                            className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent-soft hover:bg-surface hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {status === "Under Review" ? "Mark Under Review" : status}
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
              Showing {filteredQuotes.length} of {quotes.length} quote
              {quotes.length !== 1 ? "s" : ""}.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

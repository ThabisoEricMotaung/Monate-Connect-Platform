"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { logActivity } from "@/lib/activity"
import { requireAdminOrBuyer } from "@/lib/auth"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"

type QuoteStatus =
  | "Pending"
  | "Under Review"
  | "Shortlisted"
  | "Awarded"
  | "Not Awarded"
  | "Rejected"

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

type PurchaseOrder = {
  id: number
  po_number: string | null
  quote_id: number | null
}

const REVIEW_STATUSES: QuoteStatus[] = [
  "Under Review",
  "Shortlisted",
  "Rejected",
]

const statusStyles: Record<string, string> = {
  Pending: "border-warning bg-warning-soft text-warning",
  "Under Review": "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Shortlisted: "border-accent-soft bg-accent-soft text-accent-strong",
  Awarded: "border-success bg-success-soft text-success",
  "Not Awarded": "border-panel bg-panel text-secondary",
  Rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Open: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  Closed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
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

export default function AdminRFQQuotesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rfqId = Number(params.id)
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [awardingId, setAwardingId] = useState<number | null>(null)
  const [generatingPOId, setGeneratingPOId] = useState<number | null>(null)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadComparisonData() {
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
        .select("id, supplier_id, supplier_name, amount, timeline, status, scope, supporting_notes, created_at")
        .eq("rfq_id", rfqId)
        .order("created_at", { ascending: false })

      if (quoteError) {
        setErrorMessage(quoteError.message)
        setLoading(false)
        return
      }

      const quoteRows = (quoteData ?? []) as Omit<Quote, "supplier_phone">[]
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

      const { data: purchaseOrderData, error: purchaseOrderError } = await supabase
        .from("purchase_orders")
        .select("id, po_number, quote_id")
        .eq("rfq_id", rfqId)

      if (purchaseOrderError) {
        setErrorMessage(purchaseOrderError.message)
        setLoading(false)
        return
      }

      setRfq(rfqData as RFQ)
      setQuotes(
        quoteRows.map((quote) => ({
          ...quote,
          supplier_phone: quote.supplier_id
            ? phoneBySupplierId.get(quote.supplier_id) ?? null
            : null,
          }))
      )
      setPurchaseOrders((purchaseOrderData ?? []) as PurchaseOrder[])
      setLoading(false)
    }

    loadComparisonData()
  }, [rfqId, router])

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
  const rfqDisplayStatus = rfq
    ? getRFQDisplayStatus(rfq.status, rfq.deadline)
    : null
  const rfqIsAwarded = rfqDisplayStatus === "Awarded"
  const purchaseOrderByQuoteId = useMemo(
    () =>
      new Map(
        purchaseOrders
          .filter((purchaseOrder) => purchaseOrder.quote_id != null)
          .map((purchaseOrder) => [
            purchaseOrder.quote_id as number,
            purchaseOrder,
          ])
      ),
    [purchaseOrders]
  )

  async function getNextPONumber(): Promise<string> {
    if (!supabase) {
      throw new Error("Supabase environment variables are not configured.")
    }

    const year = new Date().getFullYear()
    const prefix = `PO-${year}-`
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("po_number")
      .like("po_number", `${prefix}%`)
      .order("po_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    const lastNumber = data?.po_number
      ? Number(String(data.po_number).replace(prefix, ""))
      : 0
    const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

    return `${prefix}${String(nextNumber).padStart(4, "0")}`
  }

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
          rfq_id: rfqId,
          supplier_name: updatedQuote?.supplier_name ?? null,
        },
      })
    } catch (activityError) {
      console.error(activityError)
    }

    setQuotes((currentQuotes) =>
      currentQuotes.map((quote) =>
        quote.id === quoteId ? { ...quote, status } : quote
      )
    )
    setSuccessMessage(`Quote ${quoteId} marked as ${status}.`)
  }

  async function awardQuote(selectedQuoteId: number) {
    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    if (!rfq) {
      setErrorMessage("RFQ details are not available.")
      return
    }

    const confirmed = window.confirm(
      "Are you sure you want to award this RFQ to this supplier?"
    )

    if (!confirmed) return

    setAwardingId(selectedQuoteId)
    setErrorMessage("")
    setSuccessMessage("")

    const { error: selectedQuoteError } = await supabase
      .from("quotes")
      .update({ status: "Awarded" })
      .eq("id", selectedQuoteId)
      .eq("rfq_id", rfqId)

    if (selectedQuoteError) {
      setAwardingId(null)
      setErrorMessage(selectedQuoteError.message)
      return
    }

    const { error: otherQuotesError } = await supabase
      .from("quotes")
      .update({ status: "Not Awarded" })
      .eq("rfq_id", rfqId)
      .neq("id", selectedQuoteId)

    if (otherQuotesError) {
      setAwardingId(null)
      setErrorMessage(otherQuotesError.message)
      return
    }

    const { error: rfqError } = await supabase
      .from("rfqs")
      .update({ status: "Awarded" })
      .eq("id", rfqId)

    setAwardingId(null)

    if (rfqError) {
      setErrorMessage(rfqError.message)
      return
    }

    try {
      await logActivity({
        action: "RFQ awarded",
        entity_type: "rfq",
        entity_id: params.id,
        metadata: { quote_id: selectedQuoteId },
      })
    } catch (activityError) {
      console.error(activityError)
    }

    setRfq((currentRfq) =>
      currentRfq ? { ...currentRfq, status: "Awarded" } : currentRfq
    )
    setQuotes((currentQuotes) =>
      currentQuotes.map((quote) => ({
        ...quote,
        status: quote.id === selectedQuoteId ? "Awarded" : "Not Awarded",
      }))
    )
    setSuccessMessage(`RFQ-${rfq.id} has been awarded to quote ${selectedQuoteId}.`)
  }

  async function generatePurchaseOrder(selectedQuoteId: number) {
    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    if (!rfq) {
      setErrorMessage("RFQ details are not available.")
      return
    }

    const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId)

    if (!selectedQuote) {
      setErrorMessage("The awarded quote could not be found.")
      return
    }

    const existingPurchaseOrder = purchaseOrderByQuoteId.get(selectedQuoteId)

    if (existingPurchaseOrder) {
      setSuccessMessage(
        `${existingPurchaseOrder.po_number || "Purchase order"} has already been generated for this quote.`
      )
      return
    }

    setGeneratingPOId(selectedQuoteId)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const poNumber = await getNextPONumber()
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert([
          {
            po_number: poNumber,
            rfq_id: rfq.id,
            quote_id: selectedQuote.id,
            supplier_id: selectedQuote.supplier_id,
            supplier_name: selectedQuote.supplier_name,
            amount: selectedQuote.amount,
            timeline: selectedQuote.timeline,
            title: rfq.title || `RFQ-${rfq.id}`,
            status: "Generated",
            generated_at: new Date().toISOString(),
          },
        ])
        .select("id, po_number, quote_id")
        .single()

      if (error) {
        throw error
      }

      try {
        await logActivity({
          action: "Purchase order generated",
          entity_type: "purchase_order",
          entity_id: data.id,
          metadata: {
            po_number: data.po_number,
            rfq_id: rfq.id,
            quote_id: selectedQuote.id,
            supplier_name: selectedQuote.supplier_name,
          },
        })
      } catch (activityError) {
        console.error(activityError)
      }

      setPurchaseOrders((currentPurchaseOrders) => [
        data as PurchaseOrder,
        ...currentPurchaseOrders,
      ])
      setSuccessMessage(`${data.po_number} has been generated.`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Purchase order generation failed."
      )
    } finally {
      setGeneratingPOId(null)
    }
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

      {!loading && rfq && rfqDisplayStatus && (
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
                className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(rfqDisplayStatus)}`}
              >
                {rfqDisplayStatus}
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
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Deadline Status
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {rfqDisplayStatus}
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

          {rfqIsAwarded && (
            <div className="mt-6 rounded-md border border-success bg-success-soft px-5 py-4">
              <p className="text-sm font-semibold text-success">
                This RFQ has been awarded.
              </p>
            </div>
          )}

          <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_260px] md:items-end">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  Quote Controls
                </p>
                <h2 className="mt-2 text-lg font-semibold text-heading">
                  Supplier comparison queue
                </h2>
              </div>
              <Link
                href={`/dashboard/admin/rfqs/${rfq.id}/questions`}
                className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
              >
                Manage Questions
              </Link>
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
                <table className="w-full min-w-[1240px] text-sm">
                  <thead>
                    <tr className="border-b border-panel bg-panel">
                      {[
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
                          {(() => {
                            const supplierName = quote.supplier_name || "Supplier"
                            const whatsappLink = createWhatsAppLink(
                              quote.supplier_phone,
                              `Hi ${supplierName}, we reviewed your quote for RFQ #${rfq.id}. Please confirm availability for next steps.`
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
                          <div className="flex min-w-[320px] flex-wrap gap-2">
                            {quote.status === "Awarded" &&
                              (() => {
                                const purchaseOrder =
                                  purchaseOrderByQuoteId.get(quote.id)

                                return purchaseOrder ? (
                                  <Link
                                    href={`/dashboard/admin/purchase-orders/${purchaseOrder.id}`}
                                    className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                                  >
                                    View PO
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={generatingPOId === quote.id}
                                    onClick={() => generatePurchaseOrder(quote.id)}
                                    className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {generatingPOId === quote.id
                                      ? "Generating..."
                                      : "Generate Purchase Order"}
                                  </button>
                                )
                              })()}
                            <button
                              type="button"
                              disabled={
                                rfqIsAwarded ||
                                awardingId === quote.id ||
                                updatingId === quote.id
                              }
                              onClick={() => awardQuote(quote.id)}
                              className="rounded-md border border-success bg-success px-3 py-2 text-xs font-semibold text-button transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {awardingId === quote.id
                                ? "Awarding..."
                                : "Award Quote"}
                            </button>
                            {REVIEW_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                disabled={
                                  rfqIsAwarded ||
                                  updatingId === quote.id ||
                                  awardingId === quote.id ||
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

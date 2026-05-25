"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { logActivity } from "@/lib/activity"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type SupplierProfile = {
  id: string
  business_name: string | null
}

type RFQ = {
  id: number
  title: string | null
}

type Quote = {
  id: number
  rfq_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | null
  status: string | null
}

type ReviewForm = {
  supplier_id: string
  rfq_id: string
  quote_id: string
  rating: string
  delivery_score: string
  price_score: string
  compliance_score: string
  communication_score: string
  quality_score: string
  review_notes: string
}

const scoreOptions = ["1", "2", "3", "4", "5"]
const fieldClass =
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

function initialForm(): ReviewForm {
  return {
    supplier_id: "",
    rfq_id: "",
    quote_id: "",
    rating: "5",
    delivery_score: "5",
    price_score: "5",
    compliance_score: "5",
    communication_score: "5",
    quality_score: "5",
    review_notes: "",
  }
}

export default function NewSupplierReviewPage() {
  const router = useRouter()
  const [form, setForm] = useState<ReviewForm>(() => initialForm())
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([])
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadFormOptions() {
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

      const [suppliersResult, rfqsResult, quotesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, business_name")
          .order("business_name", { ascending: true }),
        supabase
          .from("rfqs")
          .select("id, title")
          .order("created_at", { ascending: false }),
        supabase
          .from("quotes")
          .select("id, rfq_id, supplier_id, supplier_name, amount, status")
          .eq("status", "Awarded")
          .order("created_at", { ascending: false }),
      ])

      if (suppliersResult.error) {
        setErrorMessage(suppliersResult.error.message)
        setLoading(false)
        return
      }

      if (rfqsResult.error) {
        setErrorMessage(rfqsResult.error.message)
        setLoading(false)
        return
      }

      if (quotesResult.error) {
        setErrorMessage(quotesResult.error.message)
        setLoading(false)
        return
      }

      setSuppliers((suppliersResult.data ?? []) as SupplierProfile[])
      setRfqs((rfqsResult.data ?? []) as RFQ[])
      setQuotes((quotesResult.data ?? []) as Quote[])
      setLoading(false)
    }

    loadFormOptions()
  }, [router])

  const filteredQuotes = useMemo(
    () =>
      quotes.filter((quote) => {
        const supplierMatches =
          !form.supplier_id || quote.supplier_id === form.supplier_id
        const rfqMatches = !form.rfq_id || String(quote.rfq_id) === form.rfq_id

        return supplierMatches && rfqMatches
      }),
    [form.rfq_id, form.supplier_id, quotes]
  )

  function updateField(field: keyof ReviewForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function selectQuote(quoteId: string) {
    const selectedQuote = quotes.find((quote) => String(quote.id) === quoteId)

    setForm((currentForm) => ({
      ...currentForm,
      quote_id: quoteId,
      supplier_id: selectedQuote?.supplier_id || currentForm.supplier_id,
      rfq_id: selectedQuote?.rfq_id
        ? String(selectedQuote.rfq_id)
        : currentForm.rfq_id,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    if (!form.supplier_id || !form.rfq_id || !form.quote_id) {
      setErrorMessage("Select a supplier, RFQ, and awarded quote before saving.")
      return
    }

    setSaving(true)
    setErrorMessage("")
    setSuccessMessage("")

    const payload = {
      supplier_id: form.supplier_id,
      rfq_id: Number(form.rfq_id),
      quote_id: Number(form.quote_id),
      rating: Number(form.rating),
      delivery_score: Number(form.delivery_score),
      price_score: Number(form.price_score),
      compliance_score: Number(form.compliance_score),
      communication_score: Number(form.communication_score),
      quality_score: Number(form.quality_score),
      review_notes: form.review_notes.trim() || null,
    }

    const { data, error } = await supabase
      .from("supplier_reviews")
      .insert([payload])
      .select("id")
      .single()

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    try {
      await logActivity({
        action: "supplier.review_created",
        entity_type: "supplier_review",
        entity_id: data.id,
        metadata: {
          supplier_id: payload.supplier_id,
          rfq_id: payload.rfq_id,
          quote_id: payload.quote_id,
          rating: payload.rating,
        },
      })
    } catch (activityError) {
      console.error(activityError)
    }

    setForm(initialForm())
    setSuccessMessage("Supplier performance review saved.")
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Admin / Supplier Performance
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            New Supplier Review
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Capture structured performance feedback after an awarded RFQ has
            moved through delivery and procurement review.
          </p>
        </div>
        <Link
          href="/dashboard/admin/supplier-reviews"
          className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface hover:text-heading"
        >
          View Reviews
        </Link>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Supplier review failed
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="h-5 w-72 animate-pulse rounded bg-panel" />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-panel" />
            ))}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-panel bg-card p-6 shadow-panel"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="supplier-id"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                Supplier
              </label>
              <select
                id="supplier-id"
                value={form.supplier_id}
                onChange={(event) => updateField("supplier_id", event.target.value)}
                className={fieldClass}
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.business_name || supplier.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="rfq-id"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                RFQ
              </label>
              <select
                id="rfq-id"
                value={form.rfq_id}
                onChange={(event) => updateField("rfq_id", event.target.value)}
                className={fieldClass}
              >
                <option value="">Select RFQ</option>
                {rfqs.map((rfq) => (
                  <option key={rfq.id} value={rfq.id}>
                    RFQ-{rfq.id} {rfq.title ? `- ${rfq.title}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="quote-id"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                Awarded Quote
              </label>
              <select
                id="quote-id"
                value={form.quote_id}
                onChange={(event) => selectQuote(event.target.value)}
                className={fieldClass}
              >
                <option value="">Select awarded quote</option>
                {filteredQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    Q-{quote.id} {quote.supplier_name ? `- ${quote.supplier_name}` : ""} ({formatAmount(quote.amount)})
                  </option>
                ))}
              </select>
            </div>

            {[
              ["rating", "Overall Rating"],
              ["delivery_score", "Delivery Score"],
              ["price_score", "Price Score"],
              ["compliance_score", "Compliance Score"],
              ["communication_score", "Communication Score"],
              ["quality_score", "Quality Score"],
            ].map(([field, label]) => (
              <div key={field}>
                <label
                  htmlFor={field}
                  className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
                >
                  {label}
                </label>
                <select
                  id={field}
                  value={form[field as keyof ReviewForm]}
                  onChange={(event) =>
                    updateField(field as keyof ReviewForm, event.target.value)
                  }
                  className={fieldClass}
                >
                  {scoreOptions.map((score) => (
                    <option key={score} value={score}>
                      {score} / 5
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="md:col-span-3">
              <label
                htmlFor="review-notes"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                Review Notes
              </label>
              <textarea
                id="review-notes"
                rows={6}
                value={form.review_notes}
                onChange={(event) => updateField("review_notes", event.target.value)}
                placeholder="Capture delivery observations, risks, and future procurement considerations."
                className={fieldClass}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-panel pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving Review..." : "Save Supplier Review"}
            </button>
            <Link
              href="/dashboard/admin/supplier-reviews"
              className="rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface hover:text-heading"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

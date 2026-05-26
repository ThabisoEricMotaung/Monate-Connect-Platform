"use client"

import { logActivity } from "@/lib/activity"
import { useI18n } from "@/lib/i18n"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

type RFQSubmissionState = {
  id: number
  title: string | null
  deadline: string | null
  status: string | null
}

function cleanAmountInput(value: string): string {
  return value.replace(/[^\d]/g, "")
}

function cleanNumberInput(value: string): string {
  return value.replace(/[^\d]/g, "")
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function SubmitQuotePage() {
  const { t } = useI18n()
  const params = useParams<{ id: string }>()
  const [rfq, setRfq] = useState<RFQSubmissionState | null>(null)
  const [loadingRfq, setLoadingRfq] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [quotedAmount, setQuotedAmount] = useState("")
  const [deliveryTimeline, setDeliveryTimeline] = useState("")
  const [scope, setScope] = useState("")
  const [supportingNotes, setSupportingNotes] = useState("")
  const displayStatus = rfq
    ? getRFQDisplayStatus(rfq.status, rfq.deadline)
    : "Open"
  const isClosed = displayStatus === "Closed"

  useEffect(() => {
    async function loadRfq() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoadingRfq(false)
        return
      }

      const { data, error } = await supabase
        .from("rfqs")
        .select("id, title, deadline, status")
        .eq("id", Number(params.id))
        .single()

      if (error) {
        setErrorMessage(error.message)
        setLoadingRfq(false)
        return
      }

      setRfq(data as RFQSubmissionState)
      setLoadingRfq(false)
    }

    loadRfq()
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(false)
    setErrorMessage("")

    if (loadingRfq) {
      setErrorMessage("RFQ details are still loading. Please try again.")
      return
    }

    if (isClosed) {
      setErrorMessage("This RFQ has closed and no longer accepts submissions.")
      return
    }

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    const { data: quoteData, error } = await supabase
      .from("quotes")
      .insert([
        {
          rfq_id: Number(params.id),
          supplier_name: "Monate Electrical Services",
          amount: cleanAmountInput(quotedAmount),
          timeline: `${cleanNumberInput(deliveryTimeline)} working days`,
          scope,
          supporting_notes: supportingNotes,
          status: "Pending",
        },
      ])
      .select("id")
      .single()

    if (error) {
      console.error(error)
      setErrorMessage(error.message)
      return
    }

    try {
      await logActivity({
        action: "quote.submitted",
        entity_type: "quote",
        entity_id: quoteData?.id ?? null,
        metadata: {
          rfq_id: Number(params.id),
          amount: cleanAmountInput(quotedAmount),
          timeline: `${cleanNumberInput(deliveryTimeline)} working days`,
        },
      })
    } catch (activityError) {
      console.error(activityError)
    }

    setSubmitted(true)
  }

  return (
    <section className="enterprise-main-panel">
      <div className="enterprise-breadcrumbs">
        {t("home")} / {t("dashboard")} / {t("rfqs")} / {t("submitQuote")}
      </div>

      <div className="enterprise-section-heading">
        <p className="enterprise-section-label">
          Procurement Submission
        </p>

        <h1 className="enterprise-page-title">
          Submit Supplier Quote
        </h1>

        <p className="enterprise-page-description">
          Submit pricing, delivery timelines, and
          supporting procurement documentation for
          enterprise review.
        </p>
      </div>

      <div className="enterprise-card">
        {rfq && (
          <div className="mb-6 rounded-md border border-panel bg-panel p-4">
            <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
              RFQ
            </p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-heading">
                  {rfq.title || `RFQ-${rfq.id}`}
                </p>
                <p className="mt-1 text-xs font-medium text-secondary">
                  {t("deadline")}: {formatDeadline(rfq.deadline)}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <span
                  className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
                    displayStatus === "Open"
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
                      : displayStatus === "Closing Soon"
                        ? "border-warning bg-warning-soft text-warning"
                        : displayStatus === "Awarded"
                          ? "border-success bg-success-soft text-success"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-700"
                  }`}
                >
                  {displayStatus}
                </span>
                <span className="text-xs text-muted">
                  {t("deadline")} {t("status").toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {isClosed && (
          <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-rose-700">
              This RFQ has closed and no longer accepts submissions.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="enterprise-grid enterprise-grid-2">
            <div className="enterprise-field">
              <label>
                {t("amount")} (ZAR)
              </label>

              <div className="flex overflow-hidden rounded-[14px] border border-panel bg-surface transition focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.14)]">
                <span className="flex items-center border-r border-panel bg-muted px-4 text-base font-bold text-secondary">
                  R
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="450000"
                  className="w-full bg-transparent px-4 py-4 text-heading outline-none"
                  value={quotedAmount}
                  onChange={(e) => setQuotedAmount(cleanAmountInput(e.target.value))}
                  disabled={isClosed}
                />
              </div>
              <p className="text-xs text-muted">
                Enter numbers only. Currency is applied automatically.
              </p>
            </div>

            <div className="enterprise-field">
              <label>
                Estimated Delivery Timeline
              </label>

              <div className="flex overflow-hidden rounded-[14px] border border-panel bg-surface transition focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.14)]">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="14"
                  className="w-full bg-transparent px-4 py-4 text-heading outline-none"
                  value={deliveryTimeline}
                  onChange={(e) => setDeliveryTimeline(cleanNumberInput(e.target.value))}
                  disabled={isClosed}
                />
                <span className="flex items-center border-l border-panel bg-muted px-4 text-sm font-bold text-secondary">
                  {t("workingDays").toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-muted">
                Enter number of working days only. The system applies the label automatically.
              </p>
            </div>
          </div>

          <div className="enterprise-field">
            <label>Services / Scope</label>

            <textarea
              rows={6}
              placeholder="Describe supplied services, compliance readiness, certifications, labour capacity, and procurement deliverables..."
              className="enterprise-textarea"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={isClosed}
            />
          </div>

          <div className="enterprise-field">
            <label>Supporting Notes</label>

            <textarea
              rows={4}
              placeholder="Optional procurement notes..."
              className="enterprise-textarea"
              value={supportingNotes}
              onChange={(e) => setSupportingNotes(e.target.value)}
              disabled={isClosed}
            />
          </div>

          <button
            type="submit"
            disabled={loadingRfq || isClosed}
            className="enterprise-primary-button disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClosed ? "Submissions Closed" : t("submitQuote")}
          </button>
        </form>

        {submitted && (
          <div className="enterprise-success-banner">
            Quote submitted successfully for
            procurement review.
          </div>
        )}

        {errorMessage && (
          <div className="enterprise-success-banner">
            {errorMessage}
          </div>
        )}
      </div>
    </section>
  )
}

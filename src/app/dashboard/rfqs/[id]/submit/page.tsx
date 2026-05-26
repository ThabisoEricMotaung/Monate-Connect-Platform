"use client"

import { useAutosave } from "@/hooks/useAutosave"
import { logActivity } from "@/lib/activity"
import { useI18n } from "@/lib/i18n"
import { createNotificationsForRoles } from "@/lib/notifications"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

type RFQSubmissionState = {
  id: number
  title: string | null
  deadline: string | null
  status: string | null
  attachment_url: string | null
}

type QuoteDraft = {
  deliveryTimeline: string
  quotedAmount: string
  scope: string
  supportingNotes: string
}

type QuoteAssistantResult = {
  status: "ready" | "needs-work"
  suggestions: string[]
}

const SUPPORTING_NOTE_TERMS = [
  "vat",
  "delivery",
  "warranty",
  "compliance",
  "documents",
  "availability",
]


const SUBMISSION_CHECKLIST = [
  "My pricing is complete and clearly itemised",
  "My estimated delivery timeline is clearly stated",
  "My scope directly responds to the RFQ requirements",
  "All required compliance documents are ready for submission",
]

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

function reviewQuoteDraft(draft: QuoteDraft): QuoteAssistantResult {
  const suggestions: string[] = []
  const hasAmount = cleanAmountInput(draft.quotedAmount).length > 0
  const hasTimeline = cleanNumberInput(draft.deliveryTimeline).length > 0
  const scopeText = draft.scope.trim()
  const notesText = draft.supportingNotes.toLowerCase()
  const hasProcurementNote = SUPPORTING_NOTE_TERMS.some((term) =>
    notesText.includes(term)
  )

  if (!hasAmount) {
    suggestions.push("Add a quoted amount so buyers can evaluate pricing.")
  }

  if (!hasTimeline) {
    suggestions.push("Add an estimated delivery timeline in working days.")
  }

  if (scopeText.length < 30) {
    suggestions.push(
      "Expand the scope to at least 30 characters and describe the deliverables clearly."
    )
  }

  if (!hasProcurementNote) {
    suggestions.push(
      "Add supporting notes that mention VAT, delivery, warranty, compliance, documents, or availability."
    )
  }

  if (suggestions.length === 0) {
    return {
      status: "ready",
      suggestions: [
        "Your quote includes the core procurement details buyers usually need for first review.",
        "Before submitting, confirm the amount, working days, and supporting notes match your attached documents.",
      ],
    }
  }

  return {
    status: "needs-work",
    suggestions,
  }
}

function improveScopeText(scope: string): string {
  const cleanScope = scope.trim().replace(/\s+/g, " ")

  if (!cleanScope) {
    return "Our organisation will deliver the required goods or services in line with the RFQ specification, agreed delivery timelines, applicable compliance requirements, and documented quality standards. The quote includes the necessary labour, materials, coordination, and supplier support required for successful completion."
  }

  const normalizedScope =
    cleanScope.endsWith(".") || cleanScope.endsWith("!")
      ? cleanScope.slice(0, -1)
      : cleanScope

  return `Our organisation will provide ${normalizedScope}. This includes the required planning, supply, delivery coordination, quality control, and procurement documentation needed to meet the RFQ requirements. Work will be completed in line with the agreed timeline, applicable compliance obligations, and buyer review expectations.`
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
  const [assistantResult, setAssistantResult] =
    useState<QuoteAssistantResult | null>(null)
  const [improvedScope, setImprovedScope] = useState("")
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

  const checklistItems = rfq?.attachment_url
    ? [...SUBMISSION_CHECKLIST, "I have reviewed the RFQ attachment before submitting"]
    : SUBMISSION_CHECKLIST

  function toggleCheckItem(index: number) {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const quoteDraft = useMemo<QuoteDraft>(
    () => ({
      deliveryTimeline,
      quotedAmount,
      scope,
      supportingNotes,
    }),
    [deliveryTimeline, quotedAmount, scope, supportingNotes]
  )
  const autosave = useAutosave<QuoteDraft>({
    key: `monate-draft-quote-submit-${params.id}`,
    value: quoteDraft,
    enabled: !submitted,
    onRestore: (draft) => {
      setQuotedAmount(draft.quotedAmount)
      setDeliveryTimeline(draft.deliveryTimeline)
      setScope(draft.scope)
      setSupportingNotes(draft.supportingNotes)
    },
  })
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
        .select("id, title, deadline, status, attachment_url")
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

  function handleCheckQuote() {
    setAssistantResult(reviewQuoteDraft(quoteDraft))
  }

  function handleImproveScope() {
    setImprovedScope(improveScopeText(scope))
  }

  function handleUseImprovedScope() {
    const updatedDraft = {
      ...quoteDraft,
      scope: improvedScope,
    }

    setScope(improvedScope)
    setAssistantResult(reviewQuoteDraft(updatedDraft))
    setImprovedScope("")
  }

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: quoteData, error } = await supabase
      .from("quotes")
      .insert([
        {
          rfq_id: Number(params.id),
          supplier_id: user?.id ?? null,
          supplier_name: user?.email ?? "Supplier",
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

    await createNotificationsForRoles(["admin", "buyer"], {
      type: "Quote Submitted",
      title: "New quote submitted",
      message: `A supplier submitted a quote for ${rfq?.title || `RFQ-${params.id}`}.`,
      link: `/dashboard/admin/rfqs/${params.id}/quotes`,
      metadata: {
        quote_id: quoteData?.id ?? null,
        rfq_id: Number(params.id),
      },
    })

    setSubmitted(true)
    autosave.clearDraft()
    setQuotedAmount("")
    setDeliveryTimeline("")
    setScope("")
    setSupportingNotes("")
    setAssistantResult(null)
    setImprovedScope("")
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

        <div className="mb-6 rounded-md border border-panel bg-panel p-5">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Pre-Submission Review
          </p>
          <h3 className="mt-1 text-base font-semibold text-heading">
            Before submitting, confirm:
          </h3>
          <ul className="mt-4 space-y-3">
            {checklistItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleCheckItem(i)}
                  className={[
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[0.6rem] font-bold transition-colors",
                    checkedItems[i]
                      ? "border-success bg-success-soft text-success"
                      : "border-panel bg-card text-transparent",
                  ].join(" ")}
                  aria-label={`Toggle: ${item}`}
                >
                  &#10003;
                </button>
                <span
                  className={[
                    "text-sm leading-5 transition-colors",
                    checkedItems[i] ? "text-secondary line-through" : "text-heading",
                  ].join(" ")}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          {autosave.showRecoveryDialog && (
            <div className="mb-6 rounded-md border border-accent bg-surface p-5 shadow-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-heading">
                    Restore previous draft?
                  </p>
                  <p className="mt-1 text-xs leading-5 text-secondary">
                    We found saved quote progress for this RFQ.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={autosave.restoreDraft}
                    className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
                  >
                    Restore Draft
                  </button>
                  <button
                    type="button"
                    onClick={autosave.discardDraft}
                    className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
                  >
                    Discard Draft
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-panel bg-surface px-5 py-3">
            <p className="text-xs font-semibold text-success">
              {autosave.status === "saved" ? "\u2713 Draft saved" : "Draft autosaves every 5 seconds"}
            </p>
            <button
              type="button"
              onClick={autosave.discardDraft}
              className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface"
            >
              Discard Draft
            </button>
          </div>

          <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.67rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  AI Quote Assistant
                </p>
                <h2 className="mt-2 text-lg font-bold text-heading">
                  Procurement readiness review
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                  Run a local quote quality check before submission. No external
                  AI service is used, and your draft remains in this browser.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCheckQuote}
                  disabled={isClosed}
                  className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Check My Quote
                </button>
                <button
                  type="button"
                  onClick={handleImproveScope}
                  disabled={isClosed}
                  className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-heading transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Improve Scope Wording
                </button>
              </div>
            </div>

            {assistantResult && (
              <div
                className={`mt-5 rounded-md border p-4 ${
                  assistantResult.status === "ready"
                    ? "border-success bg-success-soft"
                    : "border-warning bg-warning-soft"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    className={`text-sm font-bold ${
                      assistantResult.status === "ready"
                        ? "text-success"
                        : "text-warning"
                    }`}
                  >
                    {assistantResult.status === "ready"
                      ? "Quote looks ready for procurement review"
                      : "Quote needs a few improvements"}
                  </p>
                  <span className="w-fit rounded-md border border-panel bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Local rules check
                  </span>
                </div>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-heading">
                  {assistantResult.suggestions.map((suggestion) => (
                    <li key={suggestion} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent">
                        -
                      </span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {improvedScope && (
              <div className="mt-5 rounded-md border border-accent bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-heading">
                      Improved scope wording
                    </p>
                    <p className="mt-2 text-sm leading-6 text-secondary">
                      {improvedScope}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseImprovedScope}
                    className="w-fit rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
                  >
                    Use This Version
                  </button>
                </div>
              </div>
            )}
          </section>

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

"use client"

import { useAutosave } from "@/hooks/useAutosave"
import { logActivity } from "@/lib/activity"
import { logAuditAction } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"
import { createNotificationsForRoles } from "@/lib/notifications"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ComplianceChecklist from "@/components/compliance/ComplianceChecklist"

// ─── Types ────────────────────────────────────────────────────────────────────

type RFQSubmissionState = {
  id: number
  title: string | null
  deadline: string | null
  status: string | null
  attachment_url: string | null
  category: string | null
  province: string | null
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

type BuiltResponse = {
  understandingOfScope: string
  proposedDeliveryApproach: string
  complianceReadiness: string
  pricingAndAssumptions: string
  availabilityAndNextSteps: string
}

type TenderResponseOutput = {
  response: BuiltResponse
  warnings: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── AI Quote Assistant logic (existing) ──────────────────────────────────────

function reviewQuoteDraft(draft: QuoteDraft): QuoteAssistantResult {
  const suggestions: string[] = []
  const hasAmount = cleanAmountInput(draft.quotedAmount).length > 0
  const hasTimeline = cleanNumberInput(draft.deliveryTimeline).length > 0
  const scopeText = draft.scope.trim()
  const notesText = draft.supportingNotes.toLowerCase()
  const hasProcurementNote = SUPPORTING_NOTE_TERMS.some((term) =>
    notesText.includes(term)
  )

  if (!hasAmount) suggestions.push("Add a quoted amount so buyers can evaluate pricing.")
  if (!hasTimeline) suggestions.push("Add an estimated delivery timeline in working days.")
  if (scopeText.length < 30) {
    suggestions.push("Expand the scope to at least 30 characters and describe the deliverables clearly.")
  }
  if (!hasProcurementNote) {
    suggestions.push("Add supporting notes that mention VAT, delivery, warranty, compliance, documents, or availability.")
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

  return { status: "needs-work", suggestions }
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

// ─── Tender Response Builder logic ────────────────────────────────────────────

function buildTenderResponse(
  roughNotes: string,
  rfqTitle: string | null
): TenderResponseOutput {
  const warnings: string[] = []
  const notes = roughNotes.trim()
  const lower = notes.toLowerCase()

  // Warnings
  if (notes.length < 50) {
    warnings.push(
      `Your notes are very brief (${notes.length} characters). Add more detail — pricing, services, timeline, and compliance — for a more personalised response.`
    )
  }
  if (!/r\s?[\d,]+|\d{4,}|rand|price|cost|budget|amount|quote/.test(lower)) {
    warnings.push("No pricing detected — include your quoted amount and state whether it excludes or includes VAT.")
  }
  if (!/(day|week|month|deliver|timeline|schedule|deadline|period)/.test(lower)) {
    warnings.push("No delivery timeline detected — specify working days, weeks, or months.")
  }
  if (!/(cidb|bbbee|b-bbee|csd|tax|compli|certif|registr|vat|sars)/.test(lower)) {
    warnings.push("No compliance terms detected — mention VAT, B-BBEE level, CIDB grading, CSD registration, or tax clearance.")
  }
  if (!/(avail|start|commenc|ready|mobili|when|immediate)/.test(lower)) {
    warnings.push("No availability information detected — add when you can start or mobilise.")
  }
  if (!/(warrant|guarant|mainten|after|service level|sla|support)/.test(lower)) {
    warnings.push("No warranty or after-delivery terms detected — consider specifying warranty period, guarantee, or SLA.")
  }

  const rfqRef = rfqTitle ? `"${rfqTitle}"` : "the referenced Request for Quotation"

  // Extract timeline
  const timelineMatch = lower.match(/(\d+)\s*(working\s+)?(day|week|month)/i)
  const timelineHint = timelineMatch
    ? `${timelineMatch[1]} ${timelineMatch[2] ? "working " : ""}${timelineMatch[3]}${Number(timelineMatch[1]) > 1 ? "s" : ""}`
    : "the agreed delivery period"

  // Extract price
  const priceMatch = notes.match(
    /R?\s?[\d\s,]+(?:\.\d{2})?\s*(?:ex|excl|incl|including|excluding|vat)?/i
  )
  const priceHint = priceMatch ? priceMatch[0].replace(/\s+/g, " ").trim() : null

  // Extract service verbs / keywords
  const serviceKeywords = [
    "supply", "provide", "deliver", "install", "maintain", "service",
    "construct", "repair", "design", "develop", "manufacture", "support",
    "manage", "commission", "fabricate", "source",
  ]
  const detected = serviceKeywords.filter((kw) => lower.includes(kw))
  const servicePhrase =
    detected.length > 0
      ? detected.slice(0, 2).join(" and ") + " the required goods and services"
      : "supply and deliver the required goods and services"

  // Detect compliance items
  const complianceMentions: string[] = []
  if (/(bbbee|b-bbee)/.test(lower)) complianceMentions.push("B-BBEE compliance certificate")
  if (/cidb/.test(lower)) complianceMentions.push("CIDB registration and grading")
  if (/csd/.test(lower)) complianceMentions.push("CSD registration")
  if (/(tax|sars)/.test(lower)) complianceMentions.push("valid tax clearance")
  if (complianceMentions.length === 0) {
    complianceMentions.push("CSD registration", "B-BBEE compliance certificate", "valid tax clearance")
  }
  const complianceList = complianceMentions.join(", ")

  // Detect availability
  const availMatch = lower.match(/(immediate|within\s+\d+|ready|(\d+)\s*day)/)
  const availHint = availMatch ? availMatch[0] : "within the required timeframe"

  // Detect warranty
  const warrantyMatch = lower.match(/(\d+)\s*(year|month|day)/)
  const warrantyHint =
    warrantyMatch && /(warrant|guarant|mainten)/.test(lower)
      ? `${warrantyMatch[1]}-${warrantyMatch[2]} warranty period`
      : "standard warranty terms as outlined in our documentation"

  // Incorporate raw notes excerpt in delivery section if detailed enough
  const notesExcerpt =
    notes.length > 80
      ? ` Our approach is informed by the following from our internal brief: "${notes.slice(0, 150).trim()}${notes.length > 150 ? "…" : ""}"`
      : ""

  // Build the five sections
  const understandingOfScope =
    `We have carefully reviewed ${rfqRef} and confirm our full understanding of the scope, requirements, and evaluation criteria set out therein. Our organisation is positioned to ${servicePhrase} as specified, in complete alignment with the buyer's technical, commercial, and compliance expectations. We acknowledge the performance milestones, documentation obligations, and quality standards that govern this procurement engagement and commit to meeting them in full.`

  const proposedDeliveryApproach =
    `We propose a structured, phased delivery methodology encompassing procurement planning, material sourcing, scheduling, execution, quality assurance, and formal handover. All deliverables will be completed within ${timelineHint}, subject to the issuance of a purchase order, confirmation of site access, and finalisation of any buyer approvals. Our team will provide regular progress updates at intervals agreed with the buyer and will escalate schedule risks proactively and transparently.${notesExcerpt}`

  const complianceReadiness =
    `Our organisation maintains current and valid compliance documentation in accordance with South African public and private procurement requirements. This includes our ${complianceList}. All compliance certificates are available for immediate submission upon request and will be included in our formal tender pack at award stage. We remain committed to full regulatory compliance throughout the life of the contract and will notify the buyer promptly of any changes to our compliance status.`

  const pricingAndAssumptions = [
    priceHint
      ? `Our total quoted price is ${priceHint}.`
      : "Our pricing is detailed in the accompanying schedule of rates and is available upon request.",
    "The quoted amount is exclusive of VAT unless expressly stated otherwise.",
    "Pricing is based on current material, labour, and logistics costs and is valid for 30 days from the date of submission.",
    "Key pricing assumptions include: the scope is as described in the RFQ; site or delivery access is available on the agreed commencement date; and any variations to scope will be subject to a written change order at agreed rates.",
    "Payment terms of 30 days from date of invoice are assumed unless otherwise agreed in writing.",
  ].join(" ")

  const availabilityAndNextSteps =
    `We confirm our availability to commence delivery ${availHint} upon receipt of a formal purchase order or letter of award. Our team is prepared to attend a kick-off meeting, finalise mobilisation logistics, and submit all pre-commencement compliance documentation within the required notice period. Our offering includes ${warrantyHint} and ongoing support as agreed. We welcome the opportunity to clarify any aspect of this submission and are available at short notice for further discussion, site inspection, or presentation before the evaluation committee.`

  return {
    response: {
      understandingOfScope,
      proposedDeliveryApproach,
      complianceReadiness,
      pricingAndAssumptions,
      availabilityAndNextSteps,
    },
    warnings,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubmitQuotePage() {
  const { t } = useI18n()
  const params = useParams<{ id: string }>()

  // Core form state
  const [rfq, setRfq] = useState<RFQSubmissionState | null>(null)
  const [loadingRfq, setLoadingRfq] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [quotedAmount, setQuotedAmount] = useState("")
  const [deliveryTimeline, setDeliveryTimeline] = useState("")
  const [scope, setScope] = useState("")
  const [supportingNotes, setSupportingNotes] = useState("")
  const [assistantResult, setAssistantResult] = useState<QuoteAssistantResult | null>(null)
  const [improvedScope, setImprovedScope] = useState("")
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

  // Tender Response Builder state
  const [roughNotes, setRoughNotes] = useState("")
  const [builtResponse, setBuiltResponse] = useState<BuiltResponse | null>(null)
  const [responseWarnings, setResponseWarnings] = useState<string[]>([])
  const [responseBuilt, setResponseBuilt] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  const checklistItems = rfq?.attachment_url
    ? [...SUBMISSION_CHECKLIST, "I have reviewed the RFQ attachment before submitting"]
    : SUBMISSION_CHECKLIST

  function toggleCheckItem(index: number) {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const quoteDraft = useMemo<QuoteDraft>(
    () => ({ deliveryTimeline, quotedAmount, scope, supportingNotes }),
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

  const displayStatus = rfq ? getRFQDisplayStatus(rfq.status, rfq.deadline) : "Open"
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
        .select("id, title, deadline, status, attachment_url, category, province")
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

  // ─── Handlers: AI Quote Assistant ──────────────────────────────────────────

  function handleCheckQuote() {
    setAssistantResult(reviewQuoteDraft(quoteDraft))
  }

  function handleImproveScope() {
    setImprovedScope(improveScopeText(scope))
  }

  function handleUseImprovedScope() {
    const updatedDraft = { ...quoteDraft, scope: improvedScope }
    setScope(improvedScope)
    setAssistantResult(reviewQuoteDraft(updatedDraft))
    setImprovedScope("")
  }

  // ─── Handlers: Tender Response Builder ─────────────────────────────────────

  function handleBuildResponse() {
    const { response, warnings } = buildTenderResponse(roughNotes, rfq?.title ?? null)
    setBuiltResponse(response)
    setResponseWarnings(warnings)
    setResponseBuilt(true)
    setExpandedSection("understandingOfScope")
    // Scroll to the generated response
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  function handleUseBuiltResponse() {
    if (!builtResponse) return

    const newScope = [
      "UNDERSTANDING OF SCOPE",
      builtResponse.understandingOfScope,
      "",
      "PROPOSED DELIVERY APPROACH",
      builtResponse.proposedDeliveryApproach,
    ].join("\n")

    const newNotes = [
      "COMPLIANCE READINESS",
      builtResponse.complianceReadiness,
      "",
      "PRICING AND ASSUMPTIONS",
      builtResponse.pricingAndAssumptions,
      "",
      "AVAILABILITY AND NEXT STEPS",
      builtResponse.availabilityAndNextSteps,
    ].join("\n")

    setScope(newScope)
    setSupportingNotes(newNotes)
    setAssistantResult(
      reviewQuoteDraft({ ...quoteDraft, scope: newScope, supportingNotes: newNotes })
    )
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

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

    const user = await getCurrentUser()
    if (!user) {
      setErrorMessage("You must be signed in as a supplier before submitting a quote.")
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, business_name, email")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      setErrorMessage(profileError.message)
      return
    }

    const supplierName =
      (profileData?.business_name as string | null) ||
      user.user_metadata?.business_name ||
      (profileData?.email as string | null) ||
      user.email ||
      "Supplier"

    const { data: quoteData, error } = await supabase
      .from("quotes")
      .insert([
        {
          rfq_id: Number(params.id),
          supplier_id: user.id,
          supplier_name: supplierName,
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
      await logAuditAction({
        action: "quote.submitted",
        entity_type: "quote",
        entity_id: quoteData?.id ?? null,
        old_values: null,
        new_values: {
          rfq_id: Number(params.id),
          supplier_id: user.id,
          supplier_name: supplierName,
          amount: cleanAmountInput(quotedAmount),
          timeline: `${cleanNumberInput(deliveryTimeline)} working days`,
          scope,
          supporting_notes: supportingNotes,
          status: "Pending",
        },
        metadata: {
          rfq_id: Number(params.id),
          supplier_id: user.id,
        },
      })
      await logActivity({
        action: "quote.submitted",
        entity_type: "quote",
        entity_id: quoteData?.id ?? null,
        metadata: {
          rfq_id: Number(params.id),
          supplier_id: user.id,
          supplier_name: supplierName,
          amount: cleanAmountInput(quotedAmount),
          timeline: `${cleanNumberInput(deliveryTimeline)} working days`,
        },
      })
    } catch (activityError) {
      console.warn("Quote submission audit/activity logging failed:", activityError)
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
    setRoughNotes("")
    setBuiltResponse(null)
    setResponseWarnings([])
    setResponseBuilt(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const RESPONSE_SECTIONS: Array<{
    key: keyof BuiltResponse
    title: string
    destination: string
  }> = [
    { key: "understandingOfScope", title: "Understanding of Scope", destination: "Scope field" },
    { key: "proposedDeliveryApproach", title: "Proposed Delivery Approach", destination: "Scope field" },
    { key: "complianceReadiness", title: "Compliance Readiness", destination: "Supporting Notes" },
    { key: "pricingAndAssumptions", title: "Pricing and Assumptions", destination: "Supporting Notes" },
    { key: "availabilityAndNextSteps", title: "Availability and Next Steps", destination: "Supporting Notes" },
  ]

  return (
    <section className="enterprise-main-panel">
      <div className="enterprise-breadcrumbs">
        {t("home")} / {t("dashboard")} / {t("rfqs")} / {t("submitQuote")}
      </div>

      <div className="enterprise-section-heading">
        <p className="enterprise-section-label">Procurement Submission</p>
        <h1 className="enterprise-page-title">Submit Supplier Quote</h1>
        <p className="enterprise-page-description">
          Submit pricing, delivery timelines, and supporting procurement
          documentation for enterprise review.
        </p>
      </div>

      <div className="enterprise-card">
        {/* RFQ info */}
        {rfq && (
          <div className="mb-6 rounded-md border border-panel bg-panel p-4">
            <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">RFQ</p>
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

        {/* Closed warning */}
        {isClosed && (
          <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-rose-700">
              This RFQ has closed and no longer accepts submissions.
            </p>
          </div>
        )}

        {/* Compliance checklist */}
        {rfq && (
          <div className="mb-6">
            <ComplianceChecklist
              category={rfq.category}
              province={rfq.province}
              title="Documents Required for This RFQ"
              description="Have these ready before submitting. Requirements are tailored to this RFQ's category and province."
              collapsible
            />
          </div>
        )}

        {/* Pre-submission checklist */}
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
          {/* Draft recovery */}
          {autosave.showRecoveryDialog && (
            <div className="mb-6 rounded-md border border-accent bg-surface p-5 shadow-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-heading">Restore previous draft?</p>
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

          {/* Autosave indicator */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-panel bg-surface px-5 py-3">
            <p className="text-xs font-semibold text-success">
              {autosave.status === "saved"
                ? "✓ Draft saved"
                : "Draft autosaves every 5 seconds"}
            </p>
            <button
              type="button"
              onClick={autosave.discardDraft}
              className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface"
            >
              Discard Draft
            </button>
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              TENDER RESPONSE BUILDER
          ─────────────────────────────────────────────────────────────────── */}
          <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.67rem] font-semibold uppercase tracking-[0.24em] text-accent">
                  Tender Response Builder
                </p>
                <h2 className="mt-2 text-lg font-bold text-heading">
                  Build My Professional Response
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                  Enter your rough notes and we will structure them into five
                  professional RFQ response sections. No external AI service is
                  used — everything runs locally in this browser.
                </p>
              </div>
              <span className="hidden w-fit self-start rounded-md border border-panel bg-panel px-3 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-muted lg:inline-flex">
                Local engine
              </span>
            </div>

            {/* Rough notes textarea */}
            <div className="mt-5">
              <label
                htmlFor="rough-notes"
                className="mb-2 block text-[0.67rem] font-bold uppercase tracking-[0.24em] text-secondary"
              >
                Rough Supplier Notes
              </label>
              <textarea
                id="rough-notes"
                rows={5}
                placeholder={
                  "Write freely, e.g.\n" +
                  "We supply and install electrical distribution boards. R380 000 excl VAT. " +
                  "3-week delivery. CIDB Grade 3. CSD registered. Tax clearance valid. " +
                  "B-BBEE Level 2. 1-year warranty on all installed equipment. " +
                  "Available to start within 5 days of purchase order."
                }
                className="enterprise-textarea"
                value={roughNotes}
                onChange={(e) => setRoughNotes(e.target.value)}
                disabled={isClosed}
                aria-describedby="rough-notes-hint"
              />
              <p
                id="rough-notes-hint"
                className="mt-1.5 text-xs text-muted"
              >
                Include pricing, delivery timeline, services, compliance certificates, and availability.
                The more detail you add, the more personalised your response will be.
              </p>
            </div>

            {/* Character count + warnings preview */}
            <div className="mt-2 flex items-center justify-between gap-3">
              <p
                className={`text-xs font-semibold ${
                  roughNotes.length < 50 && roughNotes.length > 0
                    ? "text-warning"
                    : roughNotes.length >= 50
                      ? "text-success"
                      : "text-muted"
                }`}
              >
                {roughNotes.length > 0 && (
                  <>
                    {roughNotes.length} character{roughNotes.length !== 1 ? "s" : ""}
                    {roughNotes.length < 50 ? " — add more detail for best results" : " — good"}
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={handleBuildResponse}
                disabled={isClosed || roughNotes.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Build My Response
              </button>
            </div>

            {/* Generated output */}
            {responseBuilt && builtResponse && (
              <div ref={responseRef} className="mt-6 space-y-4">

                {/* Warnings */}
                {responseWarnings.length > 0 && (
                  <div className="rounded-md border border-warning bg-warning-soft p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <div>
                        <p className="text-sm font-bold text-warning">
                          {responseWarnings.length} reminder{responseWarnings.length > 1 ? "s" : ""} — review before finalising
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {responseWarnings.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-warning">
                              <span aria-hidden="true" className="mt-0.5 shrink-0">–</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success header */}
                <div className="flex flex-col gap-2 rounded-md border border-success bg-success-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-success">
                    ✓ Response generated — 5 sections ready for review
                  </p>
                  <span className="w-fit rounded-md border border-panel bg-surface px-3 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Local template engine · No API call
                  </span>
                </div>

                {/* 5 sections — accordion */}
                <div className="space-y-2">
                  {RESPONSE_SECTIONS.map((section) => {
                    const isOpen = expandedSection === section.key
                    const text = builtResponse[section.key]
                    return (
                      <div
                        key={section.key}
                        className="overflow-hidden rounded-md border border-panel bg-surface"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSection(isOpen ? null : section.key)
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-panel"
                          aria-expanded={isOpen}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[0.55rem] font-extrabold text-button">
                              {RESPONSE_SECTIONS.indexOf(section) + 1}
                            </span>
                            <span className="text-sm font-bold text-heading">
                              {section.title}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden text-[0.63rem] text-muted sm:inline">
                              → {section.destination}
                            </span>
                            <svg
                              className={`h-4 w-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-panel px-4 pb-4 pt-3">
                            <p className="text-sm leading-7 text-secondary">{text}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Mapping note */}
                <div className="rounded-md border border-panel bg-panel px-4 py-3">
                  <p className="text-[0.67rem] font-bold uppercase tracking-[0.2em] text-secondary">
                    How sections map to your quote
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      Sections 1–2 → Services / Scope field
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                      Sections 3–5 → Supporting Notes field
                    </div>
                  </div>
                </div>

                {/* Use This Response CTA */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-accent bg-surface px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-heading">
                      Ready to use this response?
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Populates the Scope and Supporting Notes fields below. You can edit them freely afterwards.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseBuiltResponse}
                    className="inline-flex shrink-0 items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Use This Response
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ──────────────────────────────────────────────────────────────────
              AI QUOTE ASSISTANT (existing)
          ─────────────────────────────────────────────────────────────────── */}
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
                      assistantResult.status === "ready" ? "text-success" : "text-warning"
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
                      <span aria-hidden="true" className="text-accent">-</span>
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
                    <p className="text-sm font-bold text-heading">Improved scope wording</p>
                    <p className="mt-2 text-sm leading-6 text-secondary">{improvedScope}</p>
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

          {/* ──────────────────────────────────────────────────────────────────
              FORM FIELDS (existing)
          ─────────────────────────────────────────────────────────────────── */}
          <div className="enterprise-grid enterprise-grid-2">
            <div className="enterprise-field">
              <label>{t("amount")} (ZAR)</label>
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
              <label>Estimated Delivery Timeline</label>
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
            Quote submitted successfully for procurement review.
          </div>
        )}

        {errorMessage && (
          <div className="enterprise-success-banner">{errorMessage}</div>
        )}
      </div>
    </section>
  )
}

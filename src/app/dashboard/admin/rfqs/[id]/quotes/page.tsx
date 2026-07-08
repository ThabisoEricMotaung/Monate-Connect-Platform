"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProfileImage, initialsFromName } from "@/components/ProfileImage"
import { logActivity } from "@/lib/activity"
import { logAuditAction } from "@/lib/audit"
import { notifyQuoteAwarded } from "@/lib/automationRules"
import { requireAdminOrBuyer } from "@/lib/auth"
import { createContract } from "@/lib/contracts"
import { createPurchaseOrder } from "@/lib/purchaseOrders"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"
import { evaluateWorkflowRules } from "@/lib/workflowRules"
import { checkRFQCompliance } from "@/lib/policyCompliance"
import ComplianceBanner from "@/components/compliance/ComplianceBanner"
import { checkApprovedOverride } from "@/lib/procurementOverrides"
import { checkAndLogApprovalRequirement } from "@/lib/approvalMatrix"

// --- Types --------------------------------------------------------------------

type QuoteStatus =
  | "Pending"
  | "Under Review"
  | "Shortlisted"
  | "Awarded"
  | "Not Awarded"
  | "Rejected"

type SortMode = "newest" | "amount" | "score"

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
  company_logo_url: string | null
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

type EvaluationDraft = {
  price_score: number       // 0–20
  compliance_score: number  // 0–20
  delivery_score: number    // 0–20
  experience_score: number  // 0–20
  locality_score: number    // 0–20
  evaluation_notes: string
  db_id?: number
}

// --- Evaluation criteria config -----------------------------------------------

type CriterionField = keyof Omit<EvaluationDraft, "evaluation_notes" | "db_id">

const CRITERIA: Array<{
  field: CriterionField
  label: string
  hint: string
}> = [
  {
    field: "price_score",
    label: "Price Competitiveness",
    hint: "Value for money, transparent and fully-itemised pricing",
  },
  {
    field: "compliance_score",
    label: "Compliance & Documentation",
    hint: "CSD registration, B-BBEE, tax clearance, CIPC — complete and valid",
  },
  {
    field: "delivery_score",
    label: "Delivery Approach & Timeline",
    hint: "Realistic delivery schedule, clear methodology, mobilisation plan",
  },
  {
    field: "experience_score",
    label: "Relevant Experience",
    hint: "Proven track record, reference projects, technical capacity",
  },
  {
    field: "locality_score",
    label: "Locality / Province Alignment",
    hint: "Local supplier presence, proximity to site, regional B-BBEE contribution",
  },
]

// --- Constants ----------------------------------------------------------------

const REVIEW_STATUSES: QuoteStatus[] = ["Under Review", "Shortlisted", "Rejected"]

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

// --- Helpers ------------------------------------------------------------------

function statusBadgeClass(status: string | null): string {
  return statusStyles[status || ""] ?? "border-panel bg-panel text-secondary"
}

function formatAmount(amount: string | null): string {
  if (!amount) return "-"
  const clean = amount.replace(/[^\d]/g, "")
  const n = Number(clean)
  if (!clean || Number.isNaN(n)) return amount
  return `R${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function amountValue(amount: string | null): number {
  if (!amount) return Number.POSITIVE_INFINITY
  const clean = amount.replace(/[^\d]/g, "")
  const n = Number(clean)
  return !clean || Number.isNaN(n) ? Number.POSITIVE_INFINITY : n
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
  })
}

function formatWhatsAppPhone(phone: string | null): string | null {
  const clean = (phone ?? "").replace(/\s/g, "").replace(/\+/g, "").replace(/[^\d]/g, "")
  if (!clean) return null
  return clean.startsWith("0") ? `27${clean.slice(1)}` : clean
}

function createWhatsAppLink(phone: string | null, message: string): string | null {
  const formatted = formatWhatsAppPhone(phone)
  if (!formatted) return null
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`
}

function computeTotal(draft: EvaluationDraft): number {
  return (
    draft.price_score +
    draft.compliance_score +
    draft.delivery_score +
    draft.experience_score +
    draft.locality_score
  )
}

function evalRingColor(score: number): string {
  if (score >= 80) return "var(--success)"
  if (score >= 60) return "var(--accent)"
  if (score >= 40) return "var(--warning)"
  return "#ef4444"
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "border-warning/50 bg-warning/15 text-warning"
  if (rank === 2) return "border-accent/40 bg-accent/10 text-accent-strong"
  if (rank === 3) return "border-success/40 bg-success/10 text-success"
  return "border-panel bg-surface text-muted"
}

// --- Sub-components -----------------------------------------------------------

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = evalRingColor(score)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Score ${score}/100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={size * 0.1} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.1}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold tabular-nums leading-none text-heading">{score}</span>
        <span className="text-[0.5rem] font-bold uppercase tracking-wider text-muted">/ 100</span>
      </div>
    </div>
  )
}

function CriterionSlider({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string
  hint: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const pct = (value / 20) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-heading">{label}</span>
          <span className="ml-1.5 text-[0.62rem] text-muted">{hint}</span>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-heading">
          {value} <span className="text-[0.65rem] font-normal text-muted">/ 20</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-panel">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: evalRingColor(value * 5) }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label={`${label}: ${value} out of 20`}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled || value <= 0}
            onClick={() => onChange(Math.max(0, value - 1))}
            className="flex h-6 w-6 items-center justify-center rounded border border-panel bg-surface text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Decrease ${label}`}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            disabled={disabled || value >= 20}
            onClick={() => onChange(Math.min(20, value + 1))}
            className="flex h-6 w-6 items-center justify-center rounded border border-panel bg-surface text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Increase ${label}`}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

export default function AdminRFQQuotesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rfqId = Number(params.id)

  // Existing state
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

  // Evaluation state
  const [evaluations, setEvaluations] = useState<Record<number, EvaluationDraft>>({})
  const [savingEvals, setSavingEvals] = useState<Set<number>>(new Set())
  const [evaluatorId, setEvaluatorId] = useState<string>("")
  const [evalError, setEvalError] = useState("")
  const [evalSuccess, setEvalSuccess] = useState("")
  const [showEvalMatrix, setShowEvalMatrix] = useState(false)
  const [recommendedId, setRecommendedId] = useState<number | null>(null)

  // --- Load ------------------------------------------------------------------

  useEffect(() => {
    async function loadComparisonData() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      setEvaluatorId(authorizedProfile.id)

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
        .maybeSingle()

      if (rfqError) {
        setErrorMessage(rfqError.message)
        setLoading(false)
        return
      }

      if (!rfqData) {
        setErrorMessage("RFQ not found or access denied.")
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

      const quoteRows = (quoteData ?? []) as Omit<Quote, "supplier_phone" | "company_logo_url">[]
      const supplierIds = Array.from(
        new Set(quoteRows.map((q) => q.supplier_id).filter((id): id is string => Boolean(id)))
      )
      const supplierEmails = Array.from(
        new Set(quoteRows.filter((q) => !q.supplier_id && q.supplier_name?.includes("@")).map((q) => q.supplier_name as string))
      )
      let phoneBySupplierId = new Map<string, string | null>()
      let logoBySupplierId = new Map<string, string | null>()
      let profileByEmail = new Map<string, { id: string; business_name: string | null; phone: string | null; company_logo_url: string | null }>()

      if (supplierIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles").select("id, phone, company_logo_url").in("id", supplierIds)
        if (profileError) { setErrorMessage(profileError.message); setLoading(false); return }
        phoneBySupplierId = new Map((profileData ?? []).map((p) => [p.id as string, p.phone as string | null]))
        logoBySupplierId = new Map((profileData ?? []).map((p) => [p.id as string, p.company_logo_url as string | null]))
      }

      if (supplierEmails.length > 0) {
        const { data: emailProfileData, error: emailProfileError } = await supabase
          .from("profiles").select("id, business_name, email, phone, company_logo_url").in("email", supplierEmails)
        if (emailProfileError) { setErrorMessage(emailProfileError.message); setLoading(false); return }
        profileByEmail = new Map(
          (emailProfileData ?? []).map((p) => [
            p.email as string,
            { id: p.id as string, business_name: p.business_name as string | null, phone: p.phone as string | null, company_logo_url: p.company_logo_url as string | null },
          ])
        )
      }

      const { data: purchaseOrderData, error: purchaseOrderError } = await supabase
        .from("purchase_orders").select("id, po_number, quote_id").eq("rfq_id", rfqId)
      if (purchaseOrderError) { setErrorMessage(purchaseOrderError.message); setLoading(false); return }

      setRfq(rfqData as RFQ)
      setQuotes(
        quoteRows.map((quote) => {
          const emailProfile = quote.supplier_name ? profileByEmail.get(quote.supplier_name) : undefined
          const supplierId = quote.supplier_id || emailProfile?.id || null
          return {
            ...quote,
            supplier_id: supplierId,
            supplier_name:
              quote.supplier_name?.includes("@") && emailProfile?.business_name
                ? emailProfile.business_name
                : quote.supplier_name,
            supplier_phone: supplierId
              ? phoneBySupplierId.get(supplierId) ?? emailProfile?.phone ?? null
              : null,
            company_logo_url: supplierId
              ? logoBySupplierId.get(supplierId) ?? emailProfile?.company_logo_url ?? null
              : emailProfile?.company_logo_url ?? null,
          }
        })
      )
      setPurchaseOrders((purchaseOrderData ?? []) as PurchaseOrder[])

      // Load existing evaluations (graceful failure if table doesn't exist)
      const { data: evalData } = await supabase
        .from("quote_evaluations")
        .select("id, quote_id, price_score, compliance_score, delivery_score, experience_score, locality_score, evaluation_notes")
        .eq("rfq_id", rfqId)

      if (evalData && evalData.length > 0) {
        const evalMap: Record<number, EvaluationDraft> = {}
        for (const e of evalData) {
          const qid = e.quote_id as number
          evalMap[qid] = {
            price_score: Number(e.price_score ?? 0),
            compliance_score: Number(e.compliance_score ?? 0),
            delivery_score: Number(e.delivery_score ?? 0),
            experience_score: Number(e.experience_score ?? 0),
            locality_score: Number(e.locality_score ?? 0),
            evaluation_notes: String(e.evaluation_notes ?? ""),
            db_id: e.id as number,
          }
        }
        setEvaluations(evalMap)
      }

      setLoading(false)
    }

    loadComparisonData()
  }, [rfqId, router])

  // --- Derived ---------------------------------------------------------------

  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((a, b) => {
      if (sortMode === "amount") {
        return amountValue(a.amount) - amountValue(b.amount)
      }
      if (sortMode === "score") {
        const sA = evaluations[a.id] ? computeTotal(evaluations[a.id]) : -1
        const sB = evaluations[b.id] ? computeTotal(evaluations[b.id]) : -1
        return sB - sA
      }
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    })
  }, [quotes, sortMode, evaluations])

  const rfqDisplayStatus = rfq ? getRFQDisplayStatus(rfq.status, rfq.deadline) : null
  const rfqIsAwarded = rfqDisplayStatus === "Awarded"

  const purchaseOrderByQuoteId = useMemo(
    () => new Map(
      purchaseOrders
        .filter((po) => po.quote_id != null)
        .map((po) => [po.quote_id as number, po])
    ),
    [purchaseOrders]
  )

  // Compute rankings from evaluations
  const rankedQuotes = useMemo(() => {
    const withScores = quotes.map((q) => ({
      quote: q,
      total: evaluations[q.id] ? computeTotal(evaluations[q.id]) : -1,
    }))
    const sorted = [...withScores].sort((a, b) => b.total - a.total)
    return sorted.map((item, idx) => ({
      ...item,
      rank: item.total >= 0 ? idx + 1 : null,
    }))
  }, [quotes, evaluations])

  const topScoringQuoteId = useMemo(() => {
    let topId: number | null = null
    let topScore = 0
    for (const q of quotes) {
      if (!evaluations[q.id]) continue
      const s = computeTotal(evaluations[q.id])
      if (s > topScore) { topScore = s; topId = q.id }
    }
    return topScore > 0 ? topId : null
  }, [quotes, evaluations])

  const rankByQuoteId = useMemo(() => {
    const map = new Map<number, number>()
    rankedQuotes.forEach((item) => {
      if (item.rank !== null) map.set(item.quote.id, item.rank)
    })
    return map
  }, [rankedQuotes])

  // Compliance result for this RFQ
  const rfqCompliance = useMemo(() => {
    if (!rfq) return null
    return checkRFQCompliance(rfq)
  }, [rfq])

  // --- Handlers: existing quote workflow -------------------------------------

  async function updateQuoteStatus(quoteId: number, status: QuoteStatus) {
    if (!supabase) { setErrorMessage("Supabase environment variables are not configured."); return }
    setUpdatingId(quoteId)
    setErrorMessage("")
    setSuccessMessage("")
    const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId)
    setUpdatingId(null)
    if (error) { setErrorMessage(error.message); return }
    const updated = quotes.find((q) => q.id === quoteId)
    try {
      await logAuditAction({
        action: status === "Awarded" ? "quote.awarded" : "quote.evaluated",
        entity_type: "quote",
        entity_id: quoteId,
        old_values: { status: updated?.status ?? null },
        new_values: { status },
        metadata: { rfq_id: rfqId, supplier_id: updated?.supplier_id ?? null, supplier_name: updated?.supplier_name ?? null },
      })
      await logActivity({
        action: "quote.status_updated",
        entity_type: "quote",
        entity_id: quoteId,
        metadata: { previous_status: updated?.status ?? null, new_status: status, rfq_id: rfqId, supplier_name: updated?.supplier_name ?? null },
      })
    } catch (err) { console.warn("Quote status audit/activity logging failed:", err) }
    if (status === "Awarded" && updated) {
      await notifyQuoteAwarded({
        ...updated,
        id: quoteId,
        status,
        rfq_title: rfq?.title ?? null,
      })
    }
    setQuotes((cur) => cur.map((q) => q.id === quoteId ? { ...q, status } : q))
    setSuccessMessage(`Quote ${quoteId} marked as ${status}.`)
  }

  async function awardQuote(selectedQuoteId: number) {
    if (!supabase) { setErrorMessage("Supabase environment variables are not configured."); return }
    if (!rfq) { setErrorMessage("RFQ details are not available."); return }
    // -- Workflow rule evaluation before award -------------------------------
    const quoteToAward = quotes.find((q) => q.id === selectedQuoteId)
    if (quoteToAward) {
      const ruleResult = await evaluateWorkflowRules("quote", {
        amount: quoteToAward.amount ? Number(quoteToAward.amount.replace(/[^\d.]/g, "")) : 0,
        supplier_id: quoteToAward.supplier_id,
        supplier_name: quoteToAward.supplier_name,
      })
      if (ruleResult.blocked && ruleResult.blockMessage) {
        // Check for approved override for this specific quote
        const override = await checkApprovedOverride("quote", String(selectedQuoteId))
        if (!override) {
          setErrorMessage(ruleResult.blockMessage)
          return
        }
        setSuccessMessage(`Note: Proceeding under approved override (${override.id}). Reason: ${override.override_reason ?? "see overrides record"}.`)
      } else if (ruleResult.requiresApproval && ruleResult.approvalMessage) {
        setSuccessMessage(`Note: ${ruleResult.approvalMessage}`)
      }
    }

    // Approval matrix check for the award (fire-and-forget)
    if (quoteToAward) {
      checkAndLogApprovalRequirement(
        "award_recommendation",
        String(selectedQuoteId),
        rfq.title ?? `RFQ-${rfqId}`,
        quoteToAward.amount ? Number(quoteToAward.amount.replace(/[^\d.]/g, "")) : null,
        null,
        null
      )
    }

    if (!window.confirm("Are you sure you want to award this RFQ to this supplier?")) return

    setAwardingId(selectedQuoteId)
    setErrorMessage("")
    setSuccessMessage("")

    const { error: e1 } = await supabase.from("quotes").update({ status: "Awarded" }).eq("id", selectedQuoteId).eq("rfq_id", rfqId)
    if (e1) { setAwardingId(null); setErrorMessage(e1.message); return }

    const { error: e2 } = await supabase.from("quotes").update({ status: "Not Awarded" }).eq("rfq_id", rfqId).neq("id", selectedQuoteId)
    if (e2) { setAwardingId(null); setErrorMessage(e2.message); return }

    const { error: e3 } = await supabase.from("rfqs").update({ status: "awarded" }).eq("id", rfqId)
    setAwardingId(null)
    if (e3) { setErrorMessage(e3.message); return }

    try {
      const selected = quotes.find((q) => q.id === selectedQuoteId)
      await logAuditAction({
        action: "quote.awarded",
        entity_type: "quote",
        entity_id: selectedQuoteId,
        old_values: { status: selected?.status ?? null, rfq_status: rfq.status },
        new_values: { status: "Awarded", rfq_status: "awarded" },
        metadata: { rfq_id: rfq.id, supplier_id: selected?.supplier_id ?? null, supplier_name: selected?.supplier_name ?? null },
      })
      await logActivity({ action: "RFQ awarded", entity_type: "rfq", entity_id: params.id, metadata: { quote_id: selectedQuoteId } })
    } catch (err) { console.warn("RFQ award audit/activity logging failed:", err) }

    const selected = quotes.find((q) => q.id === selectedQuoteId)
    if (selected) {
      await notifyQuoteAwarded({
        ...selected,
        id: selectedQuoteId,
        status: "Awarded",
        rfq_title: rfq.title,
      })
    }

    setRfq((cur) => cur ? { ...cur, status: "awarded" } : cur)
    setQuotes((cur) => cur.map((q) => ({ ...q, status: q.id === selectedQuoteId ? "Awarded" : "Not Awarded" })))
    setSuccessMessage(`RFQ-${rfq.id} has been awarded to quote ${selectedQuoteId}.`)
  }

  async function generatePurchaseOrder(selectedQuoteId: number) {
    if (!supabase) { setErrorMessage("Supabase environment variables are not configured."); return }
    if (!rfq) { setErrorMessage("RFQ details are not available."); return }
    const selectedQuote = quotes.find((q) => q.id === selectedQuoteId)
    if (!selectedQuote) { setErrorMessage("The awarded quote could not be found."); return }

    const existingPO = purchaseOrderByQuoteId.get(selectedQuoteId)
    if (existingPO) {
      try {
        const contract = await createContract({ purchaseOrderId: existingPO.id })
        setSuccessMessage(`${existingPO.po_number || "Purchase order"} already exists. ${contract.contract_number || "Contract"} is linked.`)
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Purchase order exists, but contract generation failed.")
      }
      return
    }

    setGeneratingPOId(selectedQuoteId)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const data = await createPurchaseOrder({
        rfqId: rfq.id,
        quoteId: selectedQuote.id,
        supplierId: selectedQuote.supplier_id,
        supplierName: selectedQuote.supplier_name,
        amount: selectedQuote.amount,
        timeline: selectedQuote.timeline,
        title: rfq.title || `RFQ-${rfq.id}`,
      })
      setPurchaseOrders((cur) => [data, ...cur])
      const contract = await createContract({ purchaseOrderId: data.id })
      setSuccessMessage(`${data.po_number} has been generated with ${contract.contract_number || "a contract"}.`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Purchase order generation failed.")
    } finally {
      setGeneratingPOId(null)
    }
  }

  // --- Handlers: evaluation --------------------------------------------------

  function handleEvalChange(quoteId: number, field: CriterionField | "evaluation_notes", value: number | string) {
    setEvaluations((prev) => {
      const existing = prev[quoteId] ?? {
        price_score: 0, compliance_score: 0, delivery_score: 0,
        experience_score: 0, locality_score: 0, evaluation_notes: "",
      }
      return { ...prev, [quoteId]: { ...existing, [field]: value } }
    })
    setEvalError("")
    setEvalSuccess("")
  }

  async function handleSaveEvaluation(quoteId: number) {
    if (!supabase) { setEvalError("Supabase is not configured."); return }
    const draft = evaluations[quoteId]
    if (!draft) return

    setSavingEvals((prev) => new Set(prev).add(quoteId))
    setEvalError("")
    setEvalSuccess("")

    const total = computeTotal(draft)
    const payload = {
      quote_id: quoteId,
      rfq_id: rfqId,
      evaluator_id: evaluatorId || null,
      price_score: draft.price_score,
      compliance_score: draft.compliance_score,
      delivery_score: draft.delivery_score,
      experience_score: draft.experience_score,
      locality_score: draft.locality_score,
      total_score: total,
      evaluation_notes: draft.evaluation_notes.trim() || null,
    }

    let newDbId: number | undefined

    if (draft.db_id) {
      const { error: updateErr } = await supabase
        .from("quote_evaluations")
        .update(payload)
        .eq("id", draft.db_id)
      if (updateErr) {
        setSavingEvals((prev) => { const n = new Set(prev); n.delete(quoteId); return n })
        if (updateErr.message.includes("does not exist") || updateErr.message.includes("relation")) {
          setEvalError("quote_evaluations table not found. Run the SQL migration provided.")
        } else {
          setEvalError(updateErr.message)
        }
        return
      }
      newDbId = draft.db_id
    } else {
      const { data, error: insertErr } = await supabase
        .from("quote_evaluations")
        .insert([payload])
        .select("id")
        .single()
      if (insertErr) {
        setSavingEvals((prev) => { const n = new Set(prev); n.delete(quoteId); return n })
        if (insertErr.message.includes("does not exist") || insertErr.message.includes("relation")) {
          setEvalError("quote_evaluations table not found. Run the SQL migration provided.")
        } else {
          setEvalError(insertErr.message)
        }
        return
      }
      newDbId = (data as { id: number } | null)?.id
    }

    setEvaluations((prev) => ({
      ...prev,
      [quoteId]: { ...draft, db_id: newDbId ?? draft.db_id },
    }))

    setSavingEvals((prev) => { const n = new Set(prev); n.delete(quoteId); return n })

    const supplier = quotes.find((q) => q.id === quoteId)?.supplier_name
    setEvalSuccess(`Evaluation saved for ${supplier ?? `Q-${quoteId}`}. Total: ${total}/100.`)

    try {
      await logAuditAction({
        action: "quote.evaluated",
        entity_type: "quote_evaluation",
        entity_id: newDbId ?? quoteId,
        old_values: draft.db_id ? { id: draft.db_id } : null,
        new_values: payload,
        metadata: { rfq_id: rfqId, total_score: total, quote_id: quoteId },
      })
      await logActivity({
        action: "quote_evaluation.saved",
        entity_type: "quote_evaluation",
        entity_id: quoteId,
        metadata: { rfq_id: rfqId, total_score: total, quote_id: quoteId },
      })
    } catch (auditError) {
      console.warn("Quote evaluation audit/activity logging failed:", auditError)
    }
  }

  function handleRecommendAward(quoteId: number) {
    setRecommendedId(quoteId)
    const supplier = quotes.find((q) => q.id === quoteId)?.supplier_name
    const score = evaluations[quoteId] ? computeTotal(evaluations[quoteId]) : 0
    setEvalSuccess(
      `${supplier ?? `Q-${quoteId}`} is now highlighted as the recommended supplier (score: ${score}/100). Use "Award Quote" in the table above to formally award.`
    )
    // Scroll to the quotes table
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // --- Render ----------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / RFQ Quote Comparison
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          RFQ Quote Comparison
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Compare supplier responses, score quotes using the structured evaluation
          matrix, and progress decisions through the procurement review workflow.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Quote comparison failed</p>
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
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-panel" />
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
          {/* -- RFQ Summary -- */}
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="flex flex-col gap-4 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">RFQ Summary</p>
                <h2 className="mt-2 text-xl font-semibold text-heading">
                  {rfq.title || `RFQ-${rfq.id}`}
                </h2>
              </div>
              <span className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(rfqDisplayStatus)}`}>
                {rfqDisplayStatus}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { label: "Province", value: rfq.province || "-" },
                { label: "Category", value: rfq.category || "-" },
                { label: "Budget", value: formatAmount(rfq.budget) },
                { label: "Deadline", value: formatDate(rfq.deadline) },
                { label: "Deadline Status", value: rfqDisplayStatus },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-heading">{item.value}</p>
                </div>
              ))}
              <div className="rounded-md border border-panel bg-panel p-4 md:col-span-1">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">RFQ ID</p>
                <p className="mt-2 font-mono text-sm font-semibold text-accent">RFQ-{rfq.id}</p>
              </div>
            </div>
          </section>

          {rfqIsAwarded && (
            <div className="mt-6 rounded-md border border-success bg-success-soft px-5 py-4">
              <p className="text-sm font-semibold text-success">This RFQ has been awarded.</p>
            </div>
          )}

          {/* -- Policy Compliance Panel -- */}
          {rfqCompliance && (
            <ComplianceBanner
              result={rfqCompliance}
              title="Pre-Award Compliance Check"
              collapsible
              hideWhenCompliant
              className="mt-6"
            />
          )}

          {/* -- Quote Controls -- */}
          <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto_auto_260px] md:items-end">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Quote Controls</p>
                <h2 className="mt-2 text-lg font-semibold text-heading">Supplier comparison queue</h2>
              </div>
              <Link
                href={`/dashboard/admin/rfqs/${rfq.id}/award-report`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
                Award Report
              </Link>
              <Link
                href={`/dashboard/admin/rfqs/${rfq.id}/matching`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-success bg-success-soft px-5 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                </svg>
                Recommended Suppliers
              </Link>
              <Link
                href={`/dashboard/admin/rfqs/${rfq.id}/questions`}
                className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
              >
                Manage Questions
              </Link>
              <Link
                href={`/dashboard/admin/whatsapp?rfq_id=${rfq.id}`}
                className="inline-flex items-center justify-center rounded-md border border-success bg-success-soft px-5 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10"
              >
                Send RFQ WhatsApp Alert
              </Link>
              <Link
                href={`/dashboard/admin/rfqs/${rfq.id}/document-pack`}
                className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
              >
                Tender Pack
              </Link>
              <div>
                <label htmlFor="quote-sort" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  Sort
                </label>
                <select
                  id="quote-sort"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className={filterClass}
                >
                  <option value="newest">Newest first</option>
                  <option value="amount">Amount low to high</option>
                  <option value="score">Evaluation score (high to low)</option>
                </select>
              </div>
            </div>
          </section>

          {/* -- Quote Table -- */}
          {quotes.length === 0 ? (
            <div className="mt-6 rounded-md border border-panel bg-card p-16 text-center shadow-panel">
              <p className="text-sm font-semibold text-heading">No quotes submitted for this RFQ yet.</p>
              <p className="mt-2 text-xs text-muted">Supplier submissions will appear here as soon as they are received.</p>
            </div>
          ) : (
            <section className="mt-6 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1300px] text-sm">
                  <thead>
                    <tr className="border-b border-panel bg-panel">
                      {[
                        "Rank", "Supplier", "WhatsApp", "Amount",
                        "Timeline", "Status", "Scope", "Supporting Notes",
                        "Created", "Actions",
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
                    {sortedQuotes.map((quote) => {
                      const rank = rankByQuoteId.get(quote.id)
                      const isRecommended = quote.id === recommendedId || quote.id === topScoringQuoteId
                      const evalScore = evaluations[quote.id] ? computeTotal(evaluations[quote.id]) : null

                      return (
                        <tr
                          key={quote.id}
                          className={`align-top transition-colors ${
                            isRecommended
                              ? "bg-success/5 hover:bg-success/10"
                              : "hover:bg-surface"
                          }`}
                        >
                          {/* Rank */}
                          <td className="px-4 py-4">
                            {rank !== undefined ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${rankBadgeClass(rank)}`}>
                                  {rank}
                                </span>
                                {evalScore !== null && (
                                  <span className="text-[0.6rem] font-bold tabular-nums text-heading">{evalScore}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>

                          {/* Supplier */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <ProfileImage
                                src={quote.company_logo_url}
                                alt={`${quote.supplier_name || "Supplier"} logo`}
                                className="h-9 w-9 rounded-xl border border-panel bg-white object-contain p-1"
                                fallbackClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-panel bg-panel text-xs font-bold text-heading"
                                fallbackText={initialsFromName(quote.supplier_name, "S")}
                                seedName={quote.supplier_name}
                              />
                              <div>
                                <p className="font-semibold text-heading">
                                  {quote.supplier_name || "-"}
                                  {isRecommended && (
                                    <span className="ml-2 inline-flex rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-success">
                                      ★ Recommended
                                    </span>
                                  )}
                                </p>
                                <p className="mt-1 font-mono text-xs text-muted">Q-{quote.id}</p>
                              </div>
                            </div>
                          </td>

                          {/* WhatsApp */}
                          <td className="px-4 py-4">
                            {(() => {
                              const link = createWhatsAppLink(
                                quote.supplier_phone,
                                `Hi ${quote.supplier_name || "Supplier"}, we reviewed your quote for RFQ #${rfq.id}. Please confirm availability for next steps.`
                              )
                              return link ? (
                                <a href={link} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex whitespace-nowrap rounded-md border border-success bg-success-soft px-3 py-2 text-xs font-semibold text-success transition hover:bg-success/10">
                                  Contact on WhatsApp
                                </a>
                              ) : (
                                <button type="button" disabled
                                  className="inline-flex cursor-not-allowed whitespace-nowrap rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-muted opacity-70">
                                  No WhatsApp number
                                </button>
                              )
                            })()}
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-semibold text-heading">{formatAmount(quote.amount)}</span>
                          </td>
                          <td className="px-4 py-4 text-secondary">{quote.timeline || "-"}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusBadgeClass(quote.status)}`}>
                              {quote.status || "Pending"}
                            </span>
                          </td>
                          <td className="max-w-[240px] px-4 py-4 text-secondary">
                            <p className="line-clamp-4 leading-6">{quote.scope || "-"}</p>
                          </td>
                          <td className="max-w-[240px] px-4 py-4 text-secondary">
                            <p className="line-clamp-4 leading-6">{quote.supporting_notes || "-"}</p>
                          </td>
                          <td className="px-4 py-4 text-secondary">{formatDate(quote.created_at)}</td>

                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex min-w-[320px] flex-wrap gap-2">
                              {quote.supplier_id ? (
                                <Link
                                  href={`/dashboard/messages?receiver_id=${quote.supplier_id}&rfq_id=${rfq.id}&quote_id=${quote.id}&subject=${encodeURIComponent(`RFQ-${rfq.id} quote discussion`)}`}
                                  className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                                >
                                  Message Supplier
                                </Link>
                              ) : (
                                <button type="button" disabled
                                  className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-muted opacity-70">
                                  No Supplier ID
                                </button>
                              )}
                              {quote.status === "Awarded" && (() => {
                                const po = purchaseOrderByQuoteId.get(quote.id)
                                return po ? (
                                  <Link href={`/dashboard/purchase-orders/${po.id}`}
                                    className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong">
                                    View PO
                                  </Link>
                                ) : (
                                  <button type="button" disabled={generatingPOId === quote.id}
                                    onClick={() => generatePurchaseOrder(quote.id)}
                                    className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
                                    {generatingPOId === quote.id ? "Generating..." : "Generate Purchase Order"}
                                  </button>
                                )
                              })()}
                              <button type="button"
                                disabled={rfqIsAwarded || awardingId === quote.id || updatingId === quote.id}
                                onClick={() => awardQuote(quote.id)}
                                className="rounded-md border border-success bg-success px-3 py-2 text-xs font-semibold text-button transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50">
                                {awardingId === quote.id ? "Awarding..." : "Award Quote"}
                              </button>
                              {REVIEW_STATUSES.map((status) => (
                                <button key={status} type="button"
                                  disabled={rfqIsAwarded || updatingId === quote.id || awardingId === quote.id || quote.status === status}
                                  onClick={() => updateQuoteStatus(quote.id, status)}
                                  className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-secondary transition hover:border-accent-soft hover:bg-surface hover:text-heading disabled:cursor-not-allowed disabled:opacity-50">
                                  {status === "Under Review" ? "Mark Under Review" : status}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-panel px-5 py-3">
                <p className="text-xs text-muted">
                  Showing {sortedQuotes.length} quote{sortedQuotes.length !== 1 ? "s" : ""} for RFQ-{rfq.id}.
                </p>
              </div>
            </section>
          )}

          {/* -- Evaluation Matrix -- */}
          {quotes.length > 0 && (
            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                    Evaluation Matrix
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-heading">
                    Quote Scoring Matrix
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEvalMatrix((v) => !v)}
                  className={[
                    "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition",
                    showEvalMatrix
                      ? "border-panel bg-panel text-secondary hover:bg-surface"
                      : "border-accent bg-accent text-button hover:bg-accent-strong",
                  ].join(" ")}
                >
                  {showEvalMatrix ? (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      Hide Evaluation Matrix
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      Open Evaluation Matrix
                    </>
                  )}
                </button>
              </div>

              {showEvalMatrix && (
                <div className="space-y-5">
                  {/* SQL migration notice */}
                  <div className="rounded-md border border-accent/20 bg-accent/5 px-5 py-3">
                    <p className="text-xs text-secondary">
                      <span className="font-semibold text-accent">Database required:</span>{" "}
                      Make sure the <code className="rounded bg-accent/10 px-1 font-mono text-[0.7rem] text-accent">quote_evaluations</code> table exists. Run the SQL provided in the requirements if it does not.
                    </p>
                  </div>

                  {/* Advisory warning */}
                  <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/8 px-5 py-4">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-sm text-warning">
                      <span className="font-bold">Advisory only.</span>{" "}
                      Evaluation scores are a decision-support tool. Final award remains a procurement decision made by an authorised person in accordance with applicable regulations and procurement policy.
                    </p>
                  </div>

                  {/* Evaluation feedback */}
                  {evalError && (
                    <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-3">
                      <p className="text-sm font-semibold text-rose-700">{evalError}</p>
                    </div>
                  )}
                  {evalSuccess && (
                    <div className="rounded-md border border-success bg-success-soft px-5 py-3">
                      <p className="text-sm font-semibold text-success">{evalSuccess}</p>
                    </div>
                  )}

                  {/* Criteria legend */}
                  <div className="rounded-md border border-panel bg-panel px-5 py-3">
                    <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-secondary">
                      Scoring Guide — each criterion scored 0–20, total 100 points
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-5">
                      {CRITERIA.map((c) => (
                        <div key={c.field} className="text-xs">
                          <span className="font-semibold text-heading">{c.label}</span>
                          <span className="block text-muted leading-relaxed">{c.hint}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quote evaluation cards */}
                  <div className="grid gap-5 lg:grid-cols-2">
                    {rankedQuotes.map(({ quote, rank }) => {
                      const draft = evaluations[quote.id] ?? {
                        price_score: 0, compliance_score: 0, delivery_score: 0,
                        experience_score: 0, locality_score: 0, evaluation_notes: "",
                      }
                      const currentTotal = computeTotal(draft)
                      const isSaving = savingEvals.has(quote.id)
                      const isTop = quote.id === topScoringQuoteId
                      const isRecommended = quote.id === recommendedId || isTop

                      return (
                        <div
                          key={quote.id}
                          className={[
                            "enterprise-card",
                            isRecommended ? "!border-success/35" : "",
                          ].join(" ")}
                        >
                          {/* Card header */}
                          <div className="flex items-start gap-4">
                            <ScoreRing score={currentTotal} />
                            <ProfileImage
                              src={quote.company_logo_url}
                              alt={`${quote.supplier_name || "Supplier"} logo`}
                              className="h-12 w-12 rounded-xl border border-panel bg-white object-contain p-1"
                              fallbackClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-panel bg-panel text-sm font-bold text-heading"
                              fallbackText={initialsFromName(quote.supplier_name, "S")}
                              seedName={quote.supplier_name}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {rank !== null && (
                                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${rankBadgeClass(rank)}`}>
                                    {rank}
                                  </span>
                                )}
                                <p className="text-sm font-bold text-heading">
                                  {quote.supplier_name || `Q-${quote.id}`}
                                </p>
                                {isTop && evaluations[quote.id] && (
                                  <span className="inline-flex rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-success">
                                    ★ Highest Score
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted">
                                Q-{quote.id} ·{" "}
                                {formatAmount(quote.amount)}{" "}
                                {quote.timeline ? `· ${quote.timeline}` : ""}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-heading">
                                {currentTotal}/100{" "}
                                <span className={`font-normal ${
                                  currentTotal >= 80 ? "text-success"
                                    : currentTotal >= 60 ? "text-accent"
                                      : currentTotal >= 40 ? "text-warning"
                                        : "text-muted"
                                }`}>
                                  {currentTotal >= 80 ? "— Excellent"
                                    : currentTotal >= 60 ? "— Good"
                                      : currentTotal >= 40 ? "— Acceptable"
                                        : currentTotal > 0 ? "— Needs evaluation"
                                          : "— Not yet scored"}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Score sliders */}
                          <div className="mt-4 space-y-3.5">
                            {CRITERIA.map((criterion) => (
                              <CriterionSlider
                                key={criterion.field}
                                label={criterion.label}
                                hint={criterion.hint}
                                value={draft[criterion.field]}
                                onChange={(v) => handleEvalChange(quote.id, criterion.field, v)}
                                disabled={isSaving}
                              />
                            ))}
                          </div>

                          {/* Score breakdown mini-row */}
                          <div className="mt-3 flex flex-wrap gap-2 rounded-md border border-panel bg-surface px-4 py-2.5">
                            {CRITERIA.map((c) => (
                              <div key={c.field} className="flex flex-col items-center">
                                <span className="text-xs font-bold tabular-nums text-heading">{draft[c.field]}</span>
                                <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted">{c.label.split(" ")[0]}</span>
                              </div>
                            ))}
                            <div className="ml-auto flex flex-col items-end justify-center">
                              <span className="text-base font-bold tabular-nums text-heading">{currentTotal}</span>
                              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted">Total</span>
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="mt-3">
                            <label
                              htmlFor={`notes-${quote.id}`}
                              className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.2em] text-secondary"
                            >
                              Evaluation Notes
                            </label>
                            <textarea
                              id={`notes-${quote.id}`}
                              rows={2}
                              value={draft.evaluation_notes}
                              onChange={(e) => handleEvalChange(quote.id, "evaluation_notes", e.target.value)}
                              disabled={isSaving}
                              placeholder="Add evaluation notes, observations, or justification…"
                              className="w-full resize-none rounded-md border border-panel bg-panel px-3 py-2 text-xs text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEvaluation(quote.id)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-4 py-2 text-xs font-bold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving ? (
                                <>
                                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                  Saving…
                                </>
                              ) : (
                                <>
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" />
                                  </svg>
                                  Save Evaluation
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRecommendAward(quote.id)}
                              disabled={rfqIsAwarded}
                              className={[
                                "inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                                isRecommended
                                  ? "border-success bg-success text-button hover:bg-success/90"
                                  : "border-success/40 bg-success/10 text-success hover:bg-success/20",
                              ].join(" ")}
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={isRecommended ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                              {isRecommended ? "Recommended" : "Recommend Award"}
                            </button>

                            {draft.db_id && (
                              <span className="ml-1 text-[0.63rem] text-success">
                                ✓ Evaluation saved
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Rankings summary */}
                  {rankedQuotes.some((r) => r.total >= 0) && (
                    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
                      <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                        Rankings
                      </p>
                      <h3 className="mb-4 text-sm font-bold text-heading">
                        Current Evaluation Rankings
                      </h3>
                      <div className="divide-y divide-panel">
                        {rankedQuotes
                          .filter((r) => r.total >= 0)
                          .map(({ quote, total, rank }) => {
                            const isTop = quote.id === topScoringQuoteId
                            return (
                              <div key={quote.id} className="flex items-center gap-4 py-3">
                                {rank !== null && (
                                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${rankBadgeClass(rank)}`}>
                                    {rank}
                                  </span>
                                )}
                                <ProfileImage
                                  src={quote.company_logo_url}
                                  alt={`${quote.supplier_name || "Supplier"} logo`}
                                  className="h-9 w-9 rounded-xl border border-panel bg-white object-contain p-1"
                                  fallbackClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-panel bg-panel text-xs font-bold text-heading"
                                  fallbackText={initialsFromName(quote.supplier_name, "S")}
                                  seedName={quote.supplier_name}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-heading">
                                    {quote.supplier_name || `Q-${quote.id}`}
                                    {isTop && (
                                      <span className="ml-2 text-[0.6rem] font-bold text-success">★ Recommended</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted">{formatAmount(quote.amount)}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-base font-bold tabular-nums text-heading">{total}/100</p>
                                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-panel">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${total}%`, background: evalRingColor(total) }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                      <p className="mt-3 text-xs text-muted">
                        Advisory only — evaluation scores inform but do not determine the final award decision.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

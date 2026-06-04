"use client"

/*
 * ─── award_recommendations SQL migration ──────────────────────────────────────
 *
 * create table if not exists award_recommendations (
 *   id bigint generated always as identity primary key,
 *   rfq_id bigint,
 *   recommended_quote_id bigint,
 *   recommended_supplier_id uuid,
 *   evaluator_id uuid,
 *   recommendation_summary text,
 *   decision_reason text,
 *   risks text,
 *   mitigation_notes text,
 *   status text default 'Draft',
 *   created_at timestamptz default timezone('utc', now())
 * );
 * alter table award_recommendations enable row level security;
 * create policy "Read award recommendations" on award_recommendations for select using (true);
 * create policy "Insert award recommendations" on award_recommendations for insert with check (true);
 * create policy "Update award recommendations" on award_recommendations for update using (true);
 */

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { createDecisionItem } from "@/lib/decisionBoard"
import { checkAndLogApprovalRequirement } from "@/lib/approvalMatrix"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

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
  amount: string | null
  timeline: string | null
  status: string | null
  scope: string | null
  created_at: string | null
}

type Evaluation = {
  id: number
  quote_id: number
  price_score: number
  compliance_score: number
  delivery_score: number
  experience_score: number
  locality_score: number
  total_score: number
  evaluation_notes: string | null
}

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  bbbee_level: string | null
  csd_number: string | null
}

type AwardRec = {
  id: number
  rfq_id: number | null
  recommended_quote_id: number | null
  recommended_supplier_id: string | null
  evaluator_id: string | null
  recommendation_summary: string | null
  decision_reason: string | null
  risks: string | null
  mitigation_notes: string | null
  status: string | null
  created_at: string | null
}

type ReportForm = {
  recommendation_summary: string
  decision_reason: string
  risks: string
  mitigation_notes: string
  selected_quote_id: number | null
}

// ─── SQL migration string ─────────────────────────────────────────────────────

const MIGRATION_SQL = `create table if not exists award_recommendations (
  id bigint generated always as identity primary key,
  rfq_id bigint,
  recommended_quote_id bigint,
  recommended_supplier_id uuid,
  evaluator_id uuid,
  recommendation_summary text,
  decision_reason text,
  risks text,
  mitigation_notes text,
  status text default 'Draft',
  created_at timestamptz default timezone('utc', now())
);

alter table award_recommendations enable row level security;

create policy "Read award recommendations"
  on award_recommendations for select using (true);
create policy "Insert award recommendations"
  on award_recommendations for insert with check (true);
create policy "Update award recommendations"
  on award_recommendations for update using (true);`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmount(amount: string | null): string {
  if (!amount) return "—"
  const n = Number(amount.replace(/[^\d]/g, ""))
  return Number.isNaN(n) || n === 0 ? amount : `R${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function fmtDate(d: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", opts ?? { year: "numeric", month: "short", day: "numeric" })
}

function rankBg(rank: number): string {
  if (rank === 1) return "border-warning/50 bg-warning/15 text-warning"
  if (rank === 2) return "border-accent/40 bg-accent/10 text-accent-strong"
  if (rank === 3) return "border-success/40 bg-success/10 text-success"
  return "border-panel bg-surface text-muted"
}

function scoreColor(s: number): string {
  if (s >= 80) return "text-success"
  if (s >= 60) return "text-accent"
  if (s >= 40) return "text-warning"
  return "text-rose-600"
}

function statusBadge(status: string | null): string {
  if (status === "Approved") return "border-success/30 bg-success/10 text-success"
  if (status === "Draft") return "border-warning/30 bg-warning/10 text-warning"
  if (status === "Rejected") return "border-rose-500/30 bg-rose-500/10 text-rose-700"
  return "border-panel bg-surface text-secondary"
}

const inputCls =
  "w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 print:border-gray-300 print:bg-white"

const labelCls =
  "mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary print:text-gray-600"

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ n, title, eyebrow }: { n: number; title: string; eyebrow: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-panel pb-3 print:border-gray-200">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-button text-xs font-bold print:bg-gray-700">
        {n}
      </span>
      <div>
        <p className="text-[0.63rem] font-bold uppercase tracking-[0.22em] text-accent print:text-gray-500">{eyebrow}</p>
        <h2 className="text-base font-bold text-heading print:text-gray-900">{title}</h2>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="w-40 shrink-0 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted print:text-gray-500">
        {label}
      </span>
      <span className="text-sm font-semibold text-heading print:text-gray-900">{value}</span>
    </div>
  )
}

function SQLBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(sql).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div className="mb-6 rounded-md border border-accent/25 bg-accent/5 print:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left" aria-expanded={open}>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p className="text-sm font-semibold text-accent">Database migration required</p>
          <span className="hidden text-xs text-secondary sm:inline">— award_recommendations table</span>
        </div>
        <svg className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-accent/20">
          <div className="flex items-center justify-between px-5 py-2">
            <p className="text-xs text-secondary">Run in Supabase → SQL Editor, then refresh.</p>
            <button type="button" onClick={copy}
              className="inline-flex items-center gap-1.5 rounded border border-panel bg-surface px-3 py-1 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
              {copied ? "Copied ✓" : "Copy SQL"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-b-md bg-heading/5 px-5 py-4 font-mono text-[0.68rem] leading-relaxed text-secondary">{sql}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwardReportPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rfqId = Number(params.id)
  const printRef = useRef<HTMLDivElement>(null)

  // Data state
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [suppliers, setSuppliers] = useState<Map<string, SupplierProfile>>(new Map())
  const [existingRec, setExistingRec] = useState<AwardRec | null>(null)
  const [evaluatorId, setEvaluatorId] = useState("")

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [tableError, setTableError] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)

  const [form, setForm] = useState<ReportForm>({
    recommendation_summary: "",
    decision_reason: "",
    risks: "",
    mitigation_notes: "",
    selected_quote_id: null,
  })

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      setEvaluatorId(profile.id)

      if (!supabase) { setError("Supabase is not configured."); setLoading(false); return }
      if (!Number.isFinite(rfqId)) { setError("Invalid RFQ reference."); setLoading(false); return }

      const [rfqRes, quoteRes, evalRes, recRes] = await Promise.all([
        supabase.from("rfqs").select("id, title, province, category, budget, deadline, status").eq("id", rfqId).single(),
        supabase.from("quotes").select("id, supplier_id, supplier_name, amount, timeline, status, scope, created_at").eq("rfq_id", rfqId).order("created_at", { ascending: false }),
        supabase.from("quote_evaluations").select("id, quote_id, price_score, compliance_score, delivery_score, experience_score, locality_score, total_score, evaluation_notes").eq("rfq_id", rfqId),
        supabase.from("award_recommendations").select("*").eq("rfq_id", rfqId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ])

      if (rfqRes.error) { setError(rfqRes.error.message); setLoading(false); return }

      const loadedQuotes = (quoteRes.data ?? []) as Quote[]
      const loadedEvals = (evalRes.data ?? []) as Evaluation[]

      setRfq(rfqRes.data as RFQ)
      setQuotes(loadedQuotes)
      setEvaluations(loadedEvals)

      // Load supplier profiles
      const supplierIds = [...new Set(loadedQuotes.map(q => q.supplier_id).filter(Boolean) as string[])]
      if (supplierIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, business_name, province, industry, verification_status, bbbee_level, csd_number")
          .in("id", supplierIds)
        if (profileData) {
          setSuppliers(new Map((profileData as SupplierProfile[]).map(p => [p.id, p])))
        }
      }

      // Handle existing recommendation
      if (recRes.error) {
        if (recRes.error.message.includes("does not exist") || recRes.error.message.includes("relation")) {
          setTableError(true)
        }
      } else if (recRes.data) {
        const rec = recRes.data as AwardRec
        setExistingRec(rec)
        setForm({
          recommendation_summary: rec.recommendation_summary ?? "",
          decision_reason: rec.decision_reason ?? "",
          risks: rec.risks ?? "",
          mitigation_notes: rec.mitigation_notes ?? "",
          selected_quote_id: rec.recommended_quote_id ?? null,
        })
      }

      setLoading(false)
    }
    load()
  }, [rfqId, router])

  // ─── Derived ───────────────────────────────────────────────────────────────

  const evalByQuoteId = new Map(evaluations.map(e => [e.quote_id, e]))

  const rankedQuotes = [...quotes]
    .map(q => ({ quote: q, eval: evalByQuoteId.get(q.id) ?? null }))
    .sort((a, b) => (b.eval?.total_score ?? -1) - (a.eval?.total_score ?? -1))
    .map((item, idx) => ({ ...item, rank: item.eval ? idx + 1 : null }))

  const autoRecommendedId = rankedQuotes.find(r => r.eval)?.quote.id ?? null
  const selectedQuoteId = form.selected_quote_id ?? autoRecommendedId

  const selectedQuote = quotes.find(q => q.id === selectedQuoteId) ?? null
  const selectedEval = selectedQuote ? evalByQuoteId.get(selectedQuote.id) ?? null : null
  const selectedSupplier = selectedQuote?.supplier_id ? suppliers.get(selectedQuote.supplier_id) ?? null : null
  const selectedRank = rankedQuotes.find(r => r.quote.id === selectedQuoteId)?.rank ?? null

  const rfqDisplayStatus = rfq ? getRFQDisplayStatus(rfq.status, rfq.deadline) : null
  const isApproved = existingRec?.status === "Approved"
  const reportDate = existingRec?.created_at ? fmtDate(existingRec.created_at) : fmtDate(new Date().toISOString())

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!supabase) { setError("Supabase is not configured."); return }
    setSaving(true)
    setError("")
    setSuccess("")

    const payload = {
      rfq_id: rfqId,
      recommended_quote_id: selectedQuoteId,
      recommended_supplier_id: selectedQuote?.supplier_id ?? null,
      evaluator_id: evaluatorId || null,
      recommendation_summary: form.recommendation_summary.trim() || null,
      decision_reason: form.decision_reason.trim() || null,
      risks: form.risks.trim() || null,
      mitigation_notes: form.mitigation_notes.trim() || null,
      status: existingRec?.status ?? "Draft",
    }

    if (existingRec?.id) {
      const { error: updateErr } = await supabase
        .from("award_recommendations").update(payload).eq("id", existingRec.id)
      if (updateErr) {
        setSaving(false)
        setTableError(updateErr.message.includes("does not exist") || updateErr.message.includes("relation"))
        setError(updateErr.message)
        return
      }
      setExistingRec(prev => prev ? { ...prev, ...payload } : prev)
    } else {
      const { data, error: insertErr } = await supabase
        .from("award_recommendations").insert([payload]).select("*").single()
      if (insertErr) {
        setSaving(false)
        setTableError(insertErr.message.includes("does not exist") || insertErr.message.includes("relation"))
        setError(insertErr.message)
        return
      }
      setExistingRec(data as AwardRec)
    }

    setSaving(false)
    setSuccess("Recommendation saved as Draft.")
    try {
      await logActivity({ action: "award_recommendation.saved", entity_type: "rfq", entity_id: rfqId, metadata: { recommended_quote_id: selectedQuoteId } })
    } catch { /* swallow */ }
  }

  async function handleApprove(alsoAwardInSystem: boolean) {
    if (!supabase) { setError("Supabase is not configured."); return }
    setApproving(true)
    setShowApproveConfirm(false)
    setError("")
    setSuccess("")

    // Save + approve the recommendation
    const payload = {
      rfq_id: rfqId,
      recommended_quote_id: selectedQuoteId,
      recommended_supplier_id: selectedQuote?.supplier_id ?? null,
      evaluator_id: evaluatorId || null,
      recommendation_summary: form.recommendation_summary.trim() || null,
      decision_reason: form.decision_reason.trim() || null,
      risks: form.risks.trim() || null,
      mitigation_notes: form.mitigation_notes.trim() || null,
      status: "Approved",
    }

    if (existingRec?.id) {
      const { error: updateErr } = await supabase.from("award_recommendations").update(payload).eq("id", existingRec.id)
      if (updateErr) { setApproving(false); setError(updateErr.message); return }
      setExistingRec(prev => prev ? { ...prev, ...payload } : prev)
    } else {
      const { data, error: insertErr } = await supabase.from("award_recommendations").insert([payload]).select("*").single()
      if (insertErr) { setApproving(false); setError(insertErr.message); return }
      setExistingRec(data as AwardRec)
    }

    // Optionally trigger formal award in the system
    if (alsoAwardInSystem && selectedQuoteId) {
      await Promise.all([
        supabase.from("quotes").update({ status: "Awarded" }).eq("id", selectedQuoteId).eq("rfq_id", rfqId),
        supabase.from("quotes").update({ status: "Not Awarded" }).eq("rfq_id", rfqId).neq("id", selectedQuoteId),
        supabase.from("rfqs").update({ status: "Awarded" }).eq("id", rfqId),
      ])
      setRfq(prev => prev ? { ...prev, status: "Awarded" } : prev)
      setQuotes(prev => prev.map(q => ({ ...q, status: q.id === selectedQuoteId ? "Awarded" : "Not Awarded" })))
    }

    setApproving(false)
    setSuccess(alsoAwardInSystem
      ? "Recommendation approved and RFQ formally awarded in the system."
      : "Recommendation approved. Return to the quotes page to complete the formal award.")

    try {
      await logActivity({ action: "award_recommendation.approved", entity_type: "rfq", entity_id: rfqId, metadata: { recommended_quote_id: selectedQuoteId, also_awarded: alsoAwardInSystem } })
    } catch { /* swallow */ }

    // Log to decision board (never blocks)
    createDecisionItem({
      item_type: "award_recommendation",
      entity_id: String(rfqId),
      title: `Award Approved: RFQ-${rfqId} — ${selectedQuote?.supplier_name ?? "Unknown Supplier"}`,
      description: `Evaluation score: ${selectedEval?.total_score ?? "N/A"}/100. ${alsoAwardInSystem ? "RFQ awarded in system." : "Report only — formal award pending."}`,
      requested_by: evaluatorId || undefined,
      priority: "High",
    }).catch(() => { /* never block */ })

    // Approval matrix check — fire-and-forget
    checkAndLogApprovalRequirement(
      "award_recommendation",
      String(rfqId),
      rfq?.title ?? `RFQ-${rfqId}`,
      rfq?.budget,
      null,
      evaluatorId || undefined
    )
  }

  function handlePrint() {
    window.print()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 h-8 w-72 animate-pulse rounded bg-panel" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-5 h-32 animate-pulse rounded-md bg-panel" />
        ))}
      </div>
    )
  }

  if (!rfq) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">{error || "RFQ not found."}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl print:max-w-none" ref={printRef}>

      {/* ── Screen header ── */}
      <div className="mb-6 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href={`/dashboard/admin/rfqs/${rfqId}/quotes`}
              className="text-xs font-semibold text-accent transition hover:text-accent-strong">
              ← Back to Quote Comparison
            </Link>
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Procurement</p>
          <h1 className="mt-2 text-2xl font-semibold text-heading">Award Recommendation Report</h1>
          <p className="mt-1 text-sm text-secondary">
            Formal procurement decision record for {rfq.title ?? `RFQ-${rfqId}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-panel bg-surface px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Print masthead ── */}
      <div className="hidden print:block print:mb-8 print:border-b print:border-gray-300 print:pb-5">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gray-500">
          MonateConnect · Procurement Services · Confidential
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Award Recommendation Report</h1>
        <p className="mt-1 text-sm text-gray-600">
          RFQ-{rfqId} · Generated {fmtDate(new Date().toISOString(), { year: "numeric", month: "long", day: "numeric" })}
        </p>
        {existingRec?.status === "Approved" && (
          <p className="mt-1 text-sm font-bold text-green-700">STATUS: APPROVED</p>
        )}
      </div>

      {/* SQL migration */}
      {tableError && <SQLBlock sql={MIGRATION_SQL} />}
      {tableError && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-rose-700">award_recommendations table not found.</p>
          <p className="mt-1 text-xs text-rose-700">Run the SQL migration above, then refresh.</p>
        </div>
      )}

      {/* Error / Success */}
      {error && !tableError && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-md border border-success/30 bg-success-soft px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-success">{success}</p>
        </div>
      )}

      {/* Status banner */}
      {isApproved && (
        <div className="mb-5 flex items-center gap-3 rounded-md border border-success/30 bg-success-soft px-5 py-4 print:hidden">
          <svg className="h-5 w-5 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>
            <p className="text-sm font-bold text-success">This recommendation has been approved.</p>
            <p className="text-xs text-success/80">Return to the quote comparison page to verify the formal award status.</p>
          </div>
        </div>
      )}

      <div className="space-y-5">

        {/* ── Section 1: Procurement Reference ── */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-gray-200 print:shadow-none">
          <SectionHeader n={1} title="Procurement Reference" eyebrow="RFQ Details" />
          <div className="space-y-2.5">
            <MetaRow label="RFQ Number" value={`RFQ-${rfq.id}`} />
            <MetaRow label="Title" value={rfq.title ?? "—"} />
            <MetaRow label="Category" value={rfq.category ?? "—"} />
            <MetaRow label="Target Province" value={rfq.province ?? "—"} />
            <MetaRow label="Approved Budget" value={fmtAmount(rfq.budget)} />
            <MetaRow label="Submission Deadline" value={fmtDate(rfq.deadline)} />
            <MetaRow label="Procurement Status" value={rfqDisplayStatus ?? rfq.status ?? "—"} />
            <MetaRow label="Total Submissions" value={`${quotes.length} quote${quotes.length !== 1 ? "s" : ""} received`} />
            <MetaRow label="Evaluations Completed" value={`${evaluations.length} of ${quotes.length}`} />
            <MetaRow label="Report Date" value={reportDate} />
          </div>
        </section>

        {/* ── Section 2: Submission Overview ── */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-gray-200 print:shadow-none">
          <SectionHeader n={2} title="Submission Overview" eyebrow="All Quotes Received" />
          {quotes.length === 0 ? (
            <p className="text-sm text-muted">No quotes submitted for this RFQ.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-panel print:border-gray-200">
                    {["Supplier", "Amount", "Timeline", "Quote Status", "Submission Date"].map(h => (
                      <th key={h} className="pb-2.5 pr-4 text-left text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary last:pr-0 print:text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel print:divide-gray-100">
                  {quotes.map(q => (
                    <tr key={q.id} className={q.id === selectedQuoteId ? "bg-success/5" : ""}>
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold text-heading print:text-gray-900">
                          {q.supplier_name ?? "—"}
                          {q.id === selectedQuoteId && (
                            <span className="ml-2 text-[0.58rem] font-bold text-success">★ Recommended</span>
                          )}
                        </p>
                        <p className="font-mono text-[0.65rem] text-muted">Q-{q.id}</p>
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-heading print:text-gray-900">{fmtAmount(q.amount)}</td>
                      <td className="py-2.5 pr-4 text-secondary print:text-gray-700">{q.timeline ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span className="rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider border-panel bg-surface text-muted print:border-gray-300 print:text-gray-700">
                          {q.status ?? "Pending"}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted print:text-gray-600">{fmtDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Section 3: Evaluation & Scoring Matrix ── */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-gray-200 print:shadow-none">
          <SectionHeader n={3} title="Evaluation & Scoring Matrix" eyebrow="Structured Assessment" />
          {evaluations.length === 0 ? (
            <div className="rounded-md border border-warning/25 bg-warning/8 px-5 py-4">
              <p className="text-sm text-warning">
                No evaluation scores have been recorded. Complete the Evaluation Matrix on the Quote Comparison page before generating a formal report.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-panel print:border-gray-200">
                    {["Rank", "Supplier", "Price", "Compliance", "Delivery", "Experience", "Locality", "Total /100", "Notes"].map(h => (
                      <th key={h} className="pb-2.5 pr-3 text-left text-[0.6rem] font-bold uppercase tracking-[0.16em] text-secondary last:pr-0 print:text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel print:divide-gray-100">
                  {rankedQuotes.filter(r => r.eval).map(({ quote, eval: ev, rank }) => (
                    <tr key={quote.id} className={quote.id === selectedQuoteId ? "bg-success/5" : ""}>
                      <td className="py-2.5 pr-3">
                        {rank !== null ? (
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${rankBg(rank)}`}>
                            {rank}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-heading print:text-gray-900">
                        {quote.supplier_name ?? "—"}
                        {quote.id === selectedQuoteId && (
                          <span className="ml-1.5 text-[0.55rem] font-bold text-success">★</span>
                        )}
                      </td>
                      {[ev!.price_score, ev!.compliance_score, ev!.delivery_score, ev!.experience_score, ev!.locality_score].map((s, i) => (
                        <td key={i} className="py-2.5 pr-3 tabular-nums text-secondary print:text-gray-700">{s}</td>
                      ))}
                      <td className={`py-2.5 pr-3 text-base font-bold tabular-nums ${scoreColor(ev!.total_score)}`}>
                        {ev!.total_score}
                      </td>
                      <td className="max-w-[160px] py-2.5 text-xs text-muted print:text-gray-600">
                        <p className="line-clamp-2">{ev!.evaluation_notes ?? "—"}</p>
                      </td>
                    </tr>
                  ))}
                  {rankedQuotes.filter(r => !r.eval).map(({ quote }) => (
                    <tr key={quote.id} className="opacity-60">
                      <td className="py-2.5 pr-3 text-muted">—</td>
                      <td className="py-2.5 pr-3 text-secondary">{quote.supplier_name ?? "—"}</td>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <td key={i} className="py-2.5 pr-3 text-muted">—</td>
                      ))}
                      <td className="py-2.5 text-xs italic text-muted">Not evaluated</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 rounded-md border border-panel bg-panel px-4 py-2.5 print:border-gray-200">
            <p className="text-[0.63rem] text-muted print:text-gray-500">
              Each criterion scored 0–20 · Total maximum: 100 · Price Competitiveness · Compliance & Documentation · Delivery Approach & Timeline · Relevant Experience · Locality / Province Alignment
            </p>
          </div>
        </section>

        {/* ── Section 4: Recommended Supplier ── */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-gray-200 print:shadow-none">
          <SectionHeader n={4} title="Recommended Supplier" eyebrow="Procurement Recommendation" />

          {/* Override selector */}
          <div className="mb-5 print:hidden">
            <label htmlFor="rec-quote" className={labelCls}>Override Recommended Quote</label>
            <select
              id="rec-quote"
              value={form.selected_quote_id ?? "auto"}
              onChange={(e) => setForm(prev => ({ ...prev, selected_quote_id: e.target.value === "auto" ? null : Number(e.target.value) }))}
              className={inputCls}
              disabled={isApproved}
            >
              <option value="auto">Auto-detect (highest evaluation score)</option>
              {quotes.map(q => {
                const ev = evalByQuoteId.get(q.id)
                return (
                  <option key={q.id} value={q.id}>
                    Q-{q.id} — {q.supplier_name ?? "Unknown"} {ev ? `(Score: ${ev.total_score}/100)` : "(No evaluation)"}
                  </option>
                )
              })}
            </select>
          </div>

          {selectedQuote ? (
            <div className={`rounded-md border p-5 ${selectedEval ? "border-success/25 bg-success/5" : "border-panel bg-surface"}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {/* Score ring */}
                {selectedEval && (
                  <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
                      <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" strokeWidth="8" />
                      <circle cx="40" cy="40" r="30" fill="none"
                        stroke={selectedEval.total_score >= 80 ? "var(--success)" : selectedEval.total_score >= 60 ? "var(--accent)" : "var(--warning)"}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 * (1 - selectedEval.total_score / 100)}
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold tabular-nums text-heading">{selectedEval.total_score}</span>
                      <span className="text-[0.5rem] font-bold uppercase text-muted">/ 100</span>
                    </div>
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRank !== null && (
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${rankBg(selectedRank)}`}>
                        {selectedRank}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-heading print:text-gray-900">
                      {selectedQuote.supplier_name ?? "Unknown Supplier"}
                    </h3>
                    {selectedSupplier?.verification_status === "Verified" && (
                      <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.6rem] font-bold text-success">Verified</span>
                    )}
                  </div>

                  <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    <MetaRow label="Quote Ref" value={`Q-${selectedQuote.id}`} />
                    <MetaRow label="Quoted Amount" value={fmtAmount(selectedQuote.amount)} />
                    <MetaRow label="Delivery Timeline" value={selectedQuote.timeline ?? "—"} />
                    <MetaRow label="Quote Status" value={selectedQuote.status ?? "Pending"} />
                    {selectedSupplier && (
                      <>
                        <MetaRow label="Province" value={selectedSupplier.province ?? "—"} />
                        <MetaRow label="Industry" value={selectedSupplier.industry ?? "—"} />
                        <MetaRow label="B-BBEE Level" value={selectedSupplier.bbbee_level ?? "—"} />
                        <MetaRow label="CSD Number" value={selectedSupplier.csd_number ?? "—"} />
                      </>
                    )}
                    {selectedEval && (
                      <>
                        <MetaRow label="Evaluation Score" value={`${selectedEval.total_score}/100`} />
                        <MetaRow label="Evaluation Rank" value={selectedRank ? `#${selectedRank} of ${rankedQuotes.filter(r => r.eval).length} evaluated` : "—"} />
                      </>
                    )}
                  </div>

                  {selectedQuote.scope && (
                    <div className="mt-3">
                      <p className={labelCls}>Scope Summary</p>
                      <p className="text-xs leading-relaxed text-secondary print:text-gray-700">
                        {selectedQuote.scope.slice(0, 400)}{selectedQuote.scope.length > 400 ? "…" : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-warning/25 bg-warning/8 px-5 py-4">
              <p className="text-sm text-warning">
                No recommended supplier could be determined. Ensure at least one quote has been evaluated and scored.
              </p>
            </div>
          )}
        </section>

        {/* ── Section 5: Formal Recommendation ── */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-gray-200 print:shadow-none">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-panel pb-4 print:border-gray-200">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-button text-xs font-bold print:bg-gray-700">
                5
              </span>
              <div>
                <p className="text-[0.63rem] font-bold uppercase tracking-[0.22em] text-accent print:text-gray-500">
                  Recommendation Record
                </p>
                <h2 className="text-base font-bold text-heading print:text-gray-900">Formal Procurement Recommendation</h2>
              </div>
            </div>
            {existingRec?.status && (
              <span className={`inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${statusBadge(existingRec.status)}`}>
                {existingRec.status}
              </span>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="recommendation_summary" className={labelCls}>
                Recommendation Summary
              </label>
              {isApproved ? (
                <div className="rounded-md border border-panel bg-surface px-4 py-3 print:border-gray-200 print:bg-white">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary print:text-gray-700">
                    {form.recommendation_summary || "Not provided."}
                  </p>
                </div>
              ) : (
                <textarea
                  id="recommendation_summary"
                  rows={4}
                  value={form.recommendation_summary}
                  onChange={(e) => setForm(p => ({ ...p, recommendation_summary: e.target.value }))}
                  placeholder="Summarise how the recommendation was arrived at — evaluation process, methodology, and committee composition..."
                  className={`${inputCls} resize-y`}
                />
              )}
            </div>

            <div>
              <label htmlFor="decision_reason" className={labelCls}>
                Decision Reason / Procurement Justification
              </label>
              {isApproved ? (
                <div className="rounded-md border border-panel bg-surface px-4 py-3 print:border-gray-200 print:bg-white">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary print:text-gray-700">
                    {form.decision_reason || "Not provided."}
                  </p>
                </div>
              ) : (
                <textarea
                  id="decision_reason"
                  rows={4}
                  value={form.decision_reason}
                  onChange={(e) => setForm(p => ({ ...p, decision_reason: e.target.value }))}
                  placeholder="State the formal procurement justification for this award — regulatory basis, value for money, technical superiority, or PPPFA compliance..."
                  className={`${inputCls} resize-y`}
                />
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label htmlFor="risks" className={labelCls}>Identified Risks</label>
                {isApproved ? (
                  <div className="rounded-md border border-panel bg-surface px-4 py-3 print:border-gray-200 print:bg-white">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary print:text-gray-700">
                      {form.risks || "No risks identified."}
                    </p>
                  </div>
                ) : (
                  <textarea
                    id="risks"
                    rows={4}
                    value={form.risks}
                    onChange={(e) => setForm(p => ({ ...p, risks: e.target.value }))}
                    placeholder="List any procurement, delivery, compliance, or supplier risks identified during evaluation..."
                    className={`${inputCls} resize-y`}
                  />
                )}
              </div>

              <div>
                <label htmlFor="mitigation_notes" className={labelCls}>Risk Mitigation Notes</label>
                {isApproved ? (
                  <div className="rounded-md border border-panel bg-surface px-4 py-3 print:border-gray-200 print:bg-white">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary print:text-gray-700">
                      {form.mitigation_notes || "Not provided."}
                    </p>
                  </div>
                ) : (
                  <textarea
                    id="mitigation_notes"
                    rows={4}
                    value={form.mitigation_notes}
                    onChange={(e) => setForm(p => ({ ...p, mitigation_notes: e.target.value }))}
                    placeholder="Describe controls, conditions, or contract clauses to mitigate identified risks..."
                    className={`${inputCls} resize-y`}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 6: Declaration ── */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-gray-200 print:shadow-none">
          <SectionHeader n={6} title="Advisory Declaration" eyebrow="Compliance Notice" />
          <div className="space-y-3 text-sm leading-7 text-secondary print:text-gray-700">
            <p>
              This award recommendation report has been generated from structured evaluation data recorded on the MonateConnect Procurement Platform. Evaluation scores are an advisory decision-support tool only. The final award decision remains the responsibility of an authorised procurement official in accordance with applicable procurement legislation, regulations, and organisational delegations of authority.
            </p>
            <p>
              This report does not constitute a contract, letter of award, or binding commitment to any supplier. Formal contract award must be communicated through an official purchase order or letter of award issued by an authorised signatory.
            </p>
          </div>
          <div className="mt-5 grid gap-3 rounded-md border border-panel bg-panel p-4 sm:grid-cols-3 print:border-gray-200 print:bg-gray-50">
            <div>
              <p className={labelCls}>Prepared by (Evaluator ID)</p>
              <p className="font-mono text-xs text-heading print:text-gray-900">
                {evaluatorId ? evaluatorId.slice(0, 8) + "…" : "—"}
              </p>
            </div>
            <div>
              <p className={labelCls}>Report Status</p>
              <p className="text-sm font-bold text-heading print:text-gray-900">
                {existingRec?.status ?? "Unsaved"}
              </p>
            </div>
            <div>
              <p className={labelCls}>Date Generated</p>
              <p className="text-sm text-heading print:text-gray-900">{reportDate}</p>
            </div>
          </div>
          {/* Signature lines for print */}
          <div className="mt-8 hidden print:grid print:grid-cols-2 print:gap-12">
            {["Evaluator Signature", "Authorising Officer Signature"].map(sig => (
              <div key={sig}>
                <div className="border-b border-gray-400 pb-1" style={{ minHeight: 48 }} />
                <p className="mt-2 text-xs text-gray-600">{sig}</p>
                <p className="mt-1 text-xs text-gray-500">Name: _____________________ Date: ___________</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Action bar ── */}
        {!isApproved && (
          <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel print:hidden">
            <div>
              <p className="text-xs font-semibold text-secondary">
                {existingRec ? "Draft saved" : "Not saved yet"}
              </p>
              {tableError && (
                <p className="text-xs text-rose-600">Database table required — see migration above.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSave} disabled={saving || tableError}
                className="inline-flex items-center gap-2 rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" />
                    </svg>
                    Save Recommendation
                  </>
                )}
              </button>

              <button type="button"
                onClick={() => setShowApproveConfirm(true)}
                disabled={approving || tableError || !selectedQuoteId}
                className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
                {approving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Approving…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Approve Recommendation
                  </>
                )}
              </button>

              <button type="button" onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
                Print / Save PDF
              </button>
            </div>
          </div>
        )}

        {/* ── Approve confirmation modal ── */}
        {showApproveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="approve-dialog-title">
            <div className="w-full max-w-md rounded-xl border border-panel bg-card p-6 shadow-panel">
              <h3 id="approve-dialog-title" className="text-base font-bold text-heading">
                Approve Recommendation
              </h3>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Approving this recommendation records it as the formal procurement decision. Would you also like to award the quote in the system?
              </p>
              <div className="mt-4 rounded-md border border-warning/25 bg-warning/8 px-4 py-3">
                <p className="text-xs text-warning">
                  Advisory only — this approval is a decision-support record. Ensure it complies with applicable procurement regulations before proceeding.
                </p>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button type="button" onClick={() => handleApprove(true)}
                  className="w-full rounded-md border border-accent bg-accent py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong">
                  Approve & Award in System
                </button>
                <button type="button" onClick={() => handleApprove(false)}
                  className="w-full rounded-md border border-panel bg-surface py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel">
                  Approve Report Only
                </button>
                <button type="button" onClick={() => setShowApproveConfirm(false)}
                  className="w-full rounded-md border border-panel py-2 text-xs font-semibold text-muted transition hover:text-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approved action bar */}
        {isApproved && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-success/30 bg-success-soft px-5 py-4 print:hidden">
            <p className="text-sm font-semibold text-success">Recommendation approved.</p>
            <div className="flex gap-3">
              <Link href={`/dashboard/admin/rfqs/${rfqId}/quotes`}
                className="rounded-md border border-success bg-success px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-success/90">
                Return to Quote Comparison
              </Link>
              <button type="button" onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Award Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

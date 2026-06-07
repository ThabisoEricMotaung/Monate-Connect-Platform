"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplianceStatus = "Compliant" | "Exceptions Noted" | "Non-Compliant"

type RFQ = { id: number; title: string | null; category: string | null; province: string | null; budget: string | null; deadline: string | null; status: string | null; description: string | null; attachment_url: string | null; created_at: string | null }
type Quote = { id: number; supplier_id: string | null; supplier_name: string | null; amount: string | null; timeline: string | null; status: string | null; scope: string | null; created_at: string | null }
type Evaluation = { id: number; quote_id: number; price_score: number; compliance_score: number; delivery_score: number; experience_score: number; locality_score: number; total_score: number; evaluation_notes: string | null }
type AwardRec = { id: number; rfq_id: number | null; recommended_quote_id: number | null; recommended_supplier_id: string | null; evaluator_id: string | null; recommendation_summary: string | null; decision_reason: string | null; risks: string | null; mitigation_notes: string | null; status: string | null; created_at: string | null }
type PO = { id: number; po_number: string | null; rfq_id: number | null; quote_id: number | null; supplier_name: string | null; amount: string | null; status: string | null; generated_at: string | null }
type Contract = { id: number; contract_number: string | null; rfq_id: number | null; purchase_order_id: number | null; supplier_name: string | null; contract_value: string | null; status: string | null; start_date: string | null; end_date: string | null; created_at: string | null }
type Invoice = { id: number; invoice_number: string | null; rfq_id: number | null; contract_id: number | null; purchase_order_id: number | null; supplier_name: string | null; amount: string | null; total_amount: string | null; status: string | null; created_at: string | null }
type Payment = { id: number; payment_number: string | null; invoice_id: number | null; supplier_name: string | null; amount: string | null; status: string | null; payment_date: string | null; created_at: string | null }
type AuditLog = { id: number; user_email: string | null; action: string | null; entity_type: string | null; entity_id: string | null; metadata: Record<string, unknown> | null; created_at: string | null }
type BoardItem = { id: number; item_type: string | null; entity_id: string | null; title: string | null; decision_status: string | null; requested_by_email: string | null; approved_by_email: string | null; priority: string | null; created_at: string | null; decided_at: string | null }
type Override = { id: number; entity_type: string | null; entity_id: string | null; blocked_reason: string | null; override_reason: string | null; requested_by_email: string | null; approved_by_email: string | null; status: string | null; created_at: string | null }
type SupplierProfile = { id: string; business_name: string | null; verification_status: string | null; bbbee_level: string | null; csd_number: string | null }
type BankDetails = { supplier_id: string | null; verification_status: string | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null, long = false): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", long
    ? { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" }
  )
}

function fmtAmt(v: string | number | null): string {
  if (!v) return "—"
  const n = Number(String(v).replace(/[^\d.]/g, ""))
  return Number.isNaN(n) ? String(v) : `R${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function safeResult<T>(r: PromiseSettledResult<{ data: T | null; error: unknown }>): T | null {
  return r.status === "fulfilled" ? (r.value.data ?? null) : null
}

function certRef(rfqId: number): string {
  const d = new Date()
  return `COMP-${rfqId}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, size = "md" }: { status: string | null; size?: "sm" | "md" }) {
  const cls: Record<string, string> = {
    "Compliant":         "border-success/40 bg-success/10 text-success",
    "Exceptions Noted":  "border-warning/40 bg-warning/10 text-warning",
    "Non-Compliant":     "border-rose-500/35 bg-rose-500/10 text-rose-700",
    "Approved":          "border-success/40 bg-success/10 text-success",
    "Pending":           "border-warning/35 bg-warning/10 text-warning",
    "Rejected":          "border-rose-500/30 bg-rose-500/10 text-rose-700",
    "Verified":          "border-success/35 bg-success/10 text-success",
    "Paid":              "border-success/35 bg-success/10 text-success",
    "Awarded":           "border-success/35 bg-success/10 text-success",
  }
  const base = cls[status ?? ""] ?? "border-panel bg-surface text-secondary"
  const sz = size === "sm" ? "text-[0.58rem] px-2 py-0.5" : "text-[0.65rem] px-2.5 py-0.5"
  return (
    <span className={`inline-flex rounded-full border font-bold uppercase tracking-wider ${sz} ${base}`}>
      {status ?? "—"}
    </span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function AuditSection({ n, title, eyebrow, children, compliance }: {
  n: number; title: string; eyebrow: string; children: React.ReactNode; compliance?: "pass" | "warn" | "fail" | "na"
}) {
  const dot = compliance === "pass" ? "bg-success" : compliance === "warn" ? "bg-warning" : compliance === "fail" ? "bg-rose-500" : "bg-muted"
  return (
    <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-gray-200 print:bg-white print:shadow-none">
      <div className="mb-4 flex items-start gap-3 border-b border-panel pb-3 print:border-gray-200">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-button text-[0.62rem] font-bold print:bg-gray-700">
          {n}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.63rem] font-bold uppercase tracking-[0.22em] text-accent print:text-gray-500">{eyebrow}</p>
          <h2 className="text-base font-bold text-heading print:text-gray-900">{title}</h2>
        </div>
        {compliance && <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />}
      </div>
      {children}
    </section>
  )
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4 print:flex-row print:items-baseline print:gap-4">
      <span className="w-44 shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted print:text-gray-500">{label}</span>
      <span className={`text-sm font-semibold text-heading print:text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPackPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rfqId = Number(params.id)
  const packRef = certRef(rfqId)
  const printRef = useRef<HTMLDivElement>(null)

  // Data
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [awardRec, setAwardRec] = useState<AwardRec | null>(null)
  const [pos, setPos] = useState<PO[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [boardItems, setBoardItems] = useState<BoardItem[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [suppliers, setSuppliers] = useState<Map<string, SupplierProfile>>(new Map())
  const [banking, setBanking] = useState<Map<string, BankDetails>>(new Map())

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [auditorNotes, setAuditorNotes] = useState("")
  const [showCertificate, setShowCertificate] = useState(false)
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>("Compliant")
  const [complianceFindings, setComplianceFindings] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      if (!supabase || !Number.isFinite(rfqId)) { setError("Invalid RFQ reference or Supabase not configured."); setLoading(false); return }

      const [rfqRes, quotesRes, evalRes, awardRes, posRes, contractsRes, invoicesRes, logsRes, boardRes, overridesRes] =
        await Promise.allSettled([
          supabase.from("rfqs").select("id, title, category, province, budget, deadline, status, description, attachment_url, created_at").eq("id", rfqId).single(),
          supabase.from("quotes").select("id, supplier_id, supplier_name, amount, timeline, status, scope, created_at").eq("rfq_id", rfqId).order("created_at"),
          supabase.from("quote_evaluations").select("id, quote_id, price_score, compliance_score, delivery_score, experience_score, locality_score, total_score, evaluation_notes").eq("rfq_id", rfqId),
          supabase.from("award_recommendations").select("id, rfq_id, recommended_quote_id, recommended_supplier_id, evaluator_id, recommendation_summary, decision_reason, risks, mitigation_notes, status, created_at").eq("rfq_id", rfqId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("purchase_orders").select("id, po_number, rfq_id, quote_id, supplier_name, amount, status, generated_at").eq("rfq_id", rfqId),
          supabase.from("contracts").select("id, contract_number, rfq_id, purchase_order_id, supplier_name, contract_value, status, start_date, end_date, created_at").eq("rfq_id", rfqId),
          supabase.from("invoices").select("id, invoice_number, rfq_id, contract_id, purchase_order_id, supplier_name, amount, total_amount, status, created_at").eq("rfq_id", rfqId),
          supabase.from("audit_logs").select("id, user_email, action, entity_type, entity_id, metadata, created_at").eq("entity_type", "rfq").eq("entity_id", String(rfqId)).order("created_at", { ascending: false }).limit(100),
          supabase.from("decision_board_items").select("id, item_type, entity_id, title, decision_status, requested_by_email, approved_by_email, priority, created_at, decided_at").eq("entity_id", String(rfqId)).order("created_at", { ascending: false }),
          supabase.from("procurement_overrides").select("id, entity_type, entity_id, blocked_reason, override_reason, requested_by_email, approved_by_email, status, created_at").eq("entity_id", String(rfqId)).order("created_at", { ascending: false }),
        ])

      const loadedRfq = rfqRes.status === "fulfilled" ? rfqRes.value.data as RFQ | null : null
      const loadedQuotes = (safeResult(quotesRes) ?? []) as Quote[]
      const loadedEvals = (safeResult(evalRes) ?? []) as Evaluation[]
      const loadedAward = awardRes.status === "fulfilled" ? awardRes.value.data as AwardRec | null : null
      const loadedPos = (safeResult(posRes) ?? []) as PO[]
      const loadedContracts = (safeResult(contractsRes) ?? []) as Contract[]
      const loadedInvoices = (safeResult(invoicesRes) ?? []) as Invoice[]
      const loadedLogs = (safeResult(logsRes) ?? []) as AuditLog[]
      const loadedBoard = (safeResult(boardRes) ?? []) as BoardItem[]
      const loadedOverrides = (safeResult(overridesRes) ?? []) as Override[]

      if (!loadedRfq) { setError("RFQ not found."); setLoading(false); return }

      setRfq(loadedRfq)
      setQuotes(loadedQuotes)
      setEvaluations(loadedEvals)
      setAwardRec(loadedAward)
      setPos(loadedPos)
      setContracts(loadedContracts)
      setInvoices(loadedInvoices)
      setAuditLogs(loadedLogs)
      setBoardItems(loadedBoard)
      setOverrides(loadedOverrides)

      // Load invoices' payments
      if (loadedInvoices.length > 0) {
        const invoiceIds = loadedInvoices.map((i) => i.id)
        const { data: paymentsData } = await supabase.from("payments").select("id, payment_number, invoice_id, supplier_name, amount, status, payment_date, created_at").in("invoice_id", invoiceIds)
        setPayments((paymentsData ?? []) as Payment[])
      }

      // Load supplier profiles for awarded/quoted suppliers
      const supplierIds = [...new Set(loadedQuotes.map((q) => q.supplier_id).filter(Boolean) as string[])]
      if (supplierIds.length > 0) {
        const { data: profileData } = await supabase.from("profiles").select("id, business_name, verification_status, bbbee_level, csd_number").in("id", supplierIds)
        const map = new Map<string, SupplierProfile>()
        for (const p of (profileData ?? []) as SupplierProfile[]) map.set(p.id, p)
        setSuppliers(map)

        const { data: bankData } = await supabase.from("supplier_bank_details").select("supplier_id, verification_status").in("supplier_id", supplierIds)
        const bmap = new Map<string, BankDetails>()
        for (const b of (bankData ?? []) as BankDetails[]) {
          if (b.supplier_id) bmap.set(b.supplier_id, b)
        }
        setBanking(bmap)
      }

      // ── Compute compliance status ─────────────────────────────────────────
      const findings: string[] = []
      let status: ComplianceStatus = "Compliant"

      const awardedQuote = loadedQuotes.find((q) => q.status === "Awarded")
      if (awardedQuote?.supplier_id) {
        const supplierId = awardedQuote.supplier_id
        // Will resolve on next render; set placeholder
        findings.push(`Awarded supplier: ${awardedQuote.supplier_name ?? supplierId}`)
      }

      if (loadedQuotes.filter((q) => q.status === "Awarded").length === 0 && loadedRfq.status === "Awarded") {
        findings.push("RFQ is marked Awarded but no quote has Awarded status — verify award records.")
        status = "Exceptions Noted"
      }

      if (!loadedAward) {
        findings.push("No award recommendation record found.")
        status = status === "Compliant" ? "Exceptions Noted" : status
      } else if (loadedAward.status !== "Approved") {
        findings.push(`Award recommendation status: ${loadedAward.status ?? "Draft"} — not yet approved.`)
        if (status === "Compliant") status = "Exceptions Noted"
      } else {
        findings.push("Award recommendation approved.")
      }

      if (loadedContracts.length === 0 && loadedPos.length > 0) {
        findings.push("Purchase order issued but no contract created.")
        if (status === "Compliant") status = "Exceptions Noted"
      }

      const hasApprovedOverride = loadedOverrides.some((o) => o.status === "Approved")
      if (hasApprovedOverride) {
        findings.push(`${loadedOverrides.filter((o) => o.status === "Approved").length} compliance override(s) approved for this procurement.`)
        if (status === "Compliant") status = "Exceptions Noted"
      }

      if (loadedInvoices.length > 0) {
        const hasUnapprovedPayments = loadedInvoices.some(
          (inv) => inv.status !== "Approved" && inv.status !== "Paid"
        )
        if (hasUnapprovedPayments) {
          findings.push("Some invoices are not yet in Approved or Paid status.")
          if (status === "Compliant") status = "Exceptions Noted"
        }
      }

      if (loadedEvals.length > 0 && loadedEvals.length < loadedQuotes.filter((q) => q.status !== "Rejected").length) {
        findings.push("Not all submitted quotes have evaluation scores recorded.")
        if (status === "Compliant") status = "Exceptions Noted"
      }

      if (findings.length === 0) {
        findings.push("All procurement records are present and complete.")
        findings.push("Award recommendation is approved.")
        findings.push("No compliance overrides were required.")
      }

      setComplianceStatus(status)
      setComplianceFindings(findings)
      setLoading(false)
    }

    load()
  }, [rfqId, router])

  // Re-check supplier compliance after suppliers/banking loaded
  useEffect(() => {
    if (!rfq || loading) return
    const awardedQuote = quotes.find((q) => q.status === "Awarded")
    if (!awardedQuote?.supplier_id) return

    const sup = suppliers.get(awardedQuote.supplier_id)
    const bank = banking.get(awardedQuote.supplier_id)
    const newFindings: string[] = []
    let newStatus: ComplianceStatus = "Compliant"

    if (sup?.verification_status !== "Verified") {
      newFindings.push(`Awarded supplier "${awardedQuote.supplier_name}" is not Verified — status: ${sup?.verification_status ?? "Unknown"}.`)
      newStatus = "Non-Compliant"
    } else {
      newFindings.push(`Awarded supplier "${awardedQuote.supplier_name}" is Verified.`)
    }

    if (!bank || bank.verification_status !== "Verified") {
      newFindings.push(`Banking details for "${awardedQuote.supplier_name}" are not verified — payment risk exists.`)
      if (newStatus === "Compliant") newStatus = "Non-Compliant"
    } else {
      newFindings.push(`Banking details for "${awardedQuote.supplier_name}" are verified.`)
    }

    if (!awardRec) {
      newFindings.push("No award recommendation record found.")
      if (newStatus === "Compliant") newStatus = "Exceptions Noted"
    } else if (awardRec.status === "Approved") {
      newFindings.push("Award recommendation formally approved.")
    } else {
      newFindings.push(`Award recommendation status: ${awardRec.status ?? "Draft"}.`)
      if (newStatus === "Compliant") newStatus = "Exceptions Noted"
    }

    if (overrides.some((o) => o.status === "Approved")) {
      newFindings.push(`${overrides.filter((o) => o.status === "Approved").length} approved override(s) applied.`)
      if (newStatus === "Compliant") newStatus = "Exceptions Noted"
    }

    if (contracts.length === 0 && pos.length > 0) {
      newFindings.push("Purchase order exists but no contract was generated.")
      if (newStatus === "Compliant") newStatus = "Exceptions Noted"
    } else if (contracts.length > 0) {
      newFindings.push(`${contracts.length} contract(s) created.`)
    }

    if (invoices.length > 0) {
      const paid = invoices.filter((i) => i.status === "Paid" || i.status === "Approved").length
      newFindings.push(`${paid} of ${invoices.length} invoice(s) approved/paid.`)
    }

    setComplianceStatus(newStatus)
    setComplianceFindings(newFindings)
  }, [suppliers, banking, awardRec, contracts, invoices, overrides, pos, quotes, rfq, loading])

  const displayStatus = rfq ? getRFQDisplayStatus(rfq.status, rfq.deadline) : null

  // Ranked evaluations
  const rankedEvals = [...quotes]
    .map((q) => ({ quote: q, eval: evaluations.find((e) => e.quote_id === q.id) ?? null }))
    .filter((x) => x.eval)
    .sort((a, b) => (b.eval?.total_score ?? 0) - (a.eval?.total_score ?? 0))

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 h-8 w-72 animate-pulse rounded bg-panel" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-4 h-32 animate-pulse rounded-md bg-panel" />)}
      </div>
    )
  }

  if (error || !rfq) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">{error || "RFQ not found."}</p>
      </div>
    )
  }

  const statusColor = complianceStatus === "Compliant"
    ? "border-success/40 bg-success/8 text-success"
    : complianceStatus === "Exceptions Noted"
      ? "border-warning/40 bg-warning/8 text-warning"
      : "border-rose-500/35 bg-rose-500/8 text-rose-700"

  return (
    <div ref={printRef} className="mx-auto max-w-5xl print:max-w-none">

      {/* ── Screen header ── */}
      <div className="mb-6 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href={`/dashboard/admin/rfqs/${rfqId}/quotes`}
              className="text-xs font-semibold text-accent transition hover:text-accent-strong">
              ← Back to Quote Comparison
            </Link>
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Procurement Audit</p>
          <h1 className="mt-2 text-2xl font-semibold text-heading">Compliance Audit Pack</h1>
          <p className="mt-1 text-sm text-secondary">
            RFQ-{rfqId} · {rfq.title ?? "Untitled"} · Pack Ref: {packRef}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => setShowCertificate((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition ${showCertificate ? "border-panel bg-panel text-secondary hover:bg-surface" : "border-accent bg-accent text-button hover:bg-accent-strong"}`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            {showCertificate ? "Hide Certificate" : "Generate Compliance Certificate"}
          </button>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-panel bg-surface px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Audit Pack
          </button>
        </div>
      </div>

      {/* ── Print masthead ── */}
      <div className="hidden print:block print:mb-8 print:border-b print:border-gray-300 print:pb-5">
        <div className="print:flex print:items-start print:justify-between">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gray-500">
              MonateConnect Procurement Services — CONFIDENTIAL
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Procurement Compliance Audit Pack</h1>
            <p className="mt-1 text-sm text-gray-600">
              RFQ-{rfqId}: {rfq.title ?? "Untitled"} · Pack Reference: {packRef} · Generated: {fmtDate(new Date().toISOString())}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusColor} print:border print:px-3`}>
              {complianceStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ── Compliance certificate (toggleable) ── */}
      {showCertificate && (
        <div className="mb-6 rounded-md border border-accent bg-accent/5 p-6 shadow-panel print:border-gray-300 print:bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent print:text-gray-500">
                MonateConnect · Procurement Compliance Certificate
              </p>
              <h2 className="mt-1 text-xl font-bold text-heading print:text-gray-900">
                Certificate Reference: {packRef}
              </h2>
            </div>
            <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-bold uppercase tracking-wider ${statusColor}`}>
              {complianceStatus}
            </span>
          </div>

          <div className="mt-4 divide-y divide-panel print:divide-gray-100">
            <MetaRow label="RFQ Reference" value={`RFQ-${rfqId}`} mono />
            <MetaRow label="RFQ Title" value={rfq.title ?? "—"} />
            <MetaRow label="Category" value={rfq.category ?? "—"} />
            <MetaRow label="Province" value={rfq.province ?? "—"} />
            <MetaRow label="Budget" value={fmtAmt(rfq.budget)} />
            <MetaRow label="Procurement Status" value={displayStatus ?? rfq.status ?? "—"} />
            <MetaRow label="Certificate Date" value={fmtDate(new Date().toISOString())} />
            <MetaRow label="Compliance Status" value={complianceStatus} />
            <MetaRow label="Total Submissions" value={`${quotes.length} quote${quotes.length !== 1 ? "s" : ""}`} />
            <MetaRow label="Evaluations Completed" value={`${evaluations.length}`} />
            <MetaRow label="Overrides Applied" value={`${overrides.filter((o) => o.status === "Approved").length}`} />
          </div>

          <div className="mt-4 space-y-1.5">
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary print:text-gray-500">Key Findings</p>
            {complianceFindings.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-secondary print:text-gray-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent print:bg-gray-400" aria-hidden="true" />
                {f}
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-10 print:mt-8">
            {["Compiled by (Procurement Officer)", "Reviewed by (Authorised Signatory)"].map((sig) => (
              <div key={sig}>
                <div className="border-b border-panel print:border-gray-400" style={{ minHeight: 44 }} />
                <p className="mt-2 text-xs font-semibold text-secondary print:text-gray-700">{sig}</p>
                <p className="mt-1 text-xs text-muted print:text-gray-500">Name: __________________________ Date: ___________</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted print:text-gray-500">
            This compliance certificate is generated from the MonateConnect procurement platform and is based on the records available at the time of generation. It does not constitute legal advice and must be reviewed by an authorised procurement official before reliance.
          </p>
        </div>
      )}

      <div className="space-y-5">

        {/* ── S1: Procurement Reference ── */}
        <AuditSection n={1} title="Procurement Reference" eyebrow="RFQ Details" compliance="na">
          <div className="divide-y divide-panel print:divide-gray-100">
            <MetaRow label="RFQ Number" value={`RFQ-${rfqId}`} mono />
            <MetaRow label="Title" value={rfq.title ?? "—"} />
            <MetaRow label="Category" value={rfq.category ?? "—"} />
            <MetaRow label="Province" value={rfq.province ?? "—"} />
            <MetaRow label="Budget" value={fmtAmt(rfq.budget)} />
            <MetaRow label="Submission Deadline" value={fmtDate(rfq.deadline)} />
            <MetaRow label="Current Status" value={displayStatus ?? rfq.status ?? "—"} />
            <MetaRow label="Created" value={fmtDate(rfq.created_at)} />
            <MetaRow label="Attachment" value={rfq.attachment_url ? "Document attached" : "No attachment"} />
          </div>
        </AuditSection>

        {/* ── S2: Supplier Participation ── */}
        <AuditSection n={2} title="Supplier Participation" eyebrow="Quote Submissions"
          compliance={quotes.length > 0 ? "pass" : "warn"}>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted italic">No quotes submitted for this RFQ.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-panel print:border-gray-200">
                    {["Quote #", "Supplier", "Amount", "Timeline", "Status", "Submitted"].map((h) => (
                      <th key={h} className="pb-2.5 pr-4 text-left text-[0.62rem] font-bold uppercase tracking-[0.16em] text-secondary print:text-gray-500 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel print:divide-gray-100">
                  {quotes.map((q) => (
                    <tr key={q.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted">Q-{q.id}</td>
                      <td className="py-2.5 pr-4 text-sm font-semibold text-heading print:text-gray-900">{q.supplier_name ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-sm font-semibold text-heading print:text-gray-900">{fmtAmt(q.amount)}</td>
                      <td className="py-2.5 pr-4 text-xs text-secondary print:text-gray-700">{q.timeline ?? "—"}</td>
                      <td className="py-2.5 pr-4"><StatusBadge status={q.status} size="sm" /></td>
                      <td className="py-2.5 text-xs text-muted print:text-gray-600">{fmtDate(q.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted print:text-gray-500">
            {quotes.length} submission{quotes.length !== 1 ? "s" : ""} received ·
            {quotes.filter((q) => q.status === "Awarded").length} awarded ·
            {quotes.filter((q) => q.status === "Rejected").length} rejected
          </p>
        </AuditSection>

        {/* ── S3: Quote Evaluation Matrix ── */}
        <AuditSection n={3} title="Evaluation & Scoring Matrix" eyebrow="Structured Assessment"
          compliance={evaluations.length > 0 ? "pass" : quotes.length > 0 ? "warn" : "na"}>
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted italic">No evaluation scores recorded for this RFQ.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-panel print:border-gray-200">
                    {["Rank", "Supplier", "Price", "Compliance", "Delivery", "Experience", "Locality", "Total"].map((h) => (
                      <th key={h} className="pb-2.5 pr-3 text-left text-[0.6rem] font-bold uppercase tracking-[0.16em] text-secondary print:text-gray-500 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel print:divide-gray-100">
                  {rankedEvals.map(({ quote: q, eval: ev }, idx) => (
                    <tr key={q.id} className={q.status === "Awarded" ? "bg-success/5" : ""}>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-panel bg-surface text-xs font-bold text-heading print:border-gray-300">{idx + 1}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-sm font-semibold text-heading print:text-gray-900">
                        {q.supplier_name ?? "—"}
                        {q.status === "Awarded" && <span className="ml-1.5 text-[0.6rem] font-bold text-success">★</span>}
                      </td>
                      {[ev!.price_score, ev!.compliance_score, ev!.delivery_score, ev!.experience_score, ev!.locality_score].map((s, i) => (
                        <td key={i} className="py-2.5 pr-3 tabular-nums text-secondary print:text-gray-700">{s}</td>
                      ))}
                      <td className="py-2.5 text-base font-bold tabular-nums text-heading print:text-gray-900">{ev!.total_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted print:text-gray-500">Each criterion: 0–20 · Total maximum: 100</p>
        </AuditSection>

        {/* ── S4: Award Recommendation ── */}
        <AuditSection n={4} title="Award Recommendation" eyebrow="Procurement Decision"
          compliance={awardRec?.status === "Approved" ? "pass" : awardRec ? "warn" : "fail"}>
          {!awardRec ? (
            <p className="text-sm text-muted italic">No award recommendation recorded.</p>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-panel print:divide-gray-100">
                <MetaRow label="Status" value={awardRec.status ?? "Draft"} />
                <MetaRow label="Recommended Quote ID" value={awardRec.recommended_quote_id ? `Q-${awardRec.recommended_quote_id}` : "—"} mono />
                <MetaRow label="Created" value={fmtDate(awardRec.created_at)} />
              </div>
              {awardRec.recommendation_summary && (
                <div><p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Summary</p>
                  <p className="text-xs leading-relaxed text-secondary print:text-gray-700">{awardRec.recommendation_summary}</p></div>
              )}
              {awardRec.decision_reason && (
                <div><p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Decision Reason</p>
                  <p className="text-xs leading-relaxed text-secondary print:text-gray-700">{awardRec.decision_reason}</p></div>
              )}
              {awardRec.risks && (
                <div><p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Identified Risks</p>
                  <p className="text-xs leading-relaxed text-secondary print:text-gray-700">{awardRec.risks}</p></div>
              )}
            </div>
          )}
        </AuditSection>

        {/* ── S5: Approval History ── */}
        <AuditSection n={5} title="Approval History" eyebrow="Decision Board Items"
          compliance={boardItems.length > 0 ? "pass" : "na"}>
          {boardItems.length === 0 ? (
            <p className="text-sm text-muted italic">No decision board items found for this RFQ.</p>
          ) : (
            <div className="divide-y divide-panel print:divide-gray-100">
              {boardItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3">
                  <StatusBadge status={item.decision_status} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-heading print:text-gray-900">{item.title ?? "—"}</p>
                    <p className="text-[0.62rem] text-muted print:text-gray-500">
                      {item.item_type} · Requested by {item.requested_by_email ?? "unknown"} · {fmtDate(item.created_at)}
                      {item.decided_at ? ` · Decided ${fmtDate(item.decided_at)}` : ""}
                      {item.approved_by_email ? ` by ${item.approved_by_email}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AuditSection>

        {/* ── S6: Override History ── */}
        <AuditSection n={6} title="Override History" eyebrow="Compliance Exceptions"
          compliance={overrides.length === 0 ? "pass" : overrides.some((o) => o.status === "Approved") ? "warn" : "na"}>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted italic">No compliance overrides recorded for this RFQ.</p>
          ) : (
            <div className="space-y-3">
              {overrides.map((o) => (
                <div key={o.id} className="rounded-md border border-panel bg-surface p-3.5 print:border-gray-200">
                  <div className="flex items-start gap-2">
                    <StatusBadge status={o.status} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-heading print:text-gray-900">
                        {o.entity_type}/{o.entity_id}
                      </p>
                      <p className="text-[0.62rem] text-muted print:text-gray-500">
                        Requested by {o.requested_by_email ?? "unknown"} · {fmtDate(o.created_at)}
                        {o.approved_by_email ? ` · Reviewed by ${o.approved_by_email}` : ""}
                      </p>
                    </div>
                  </div>
                  {o.blocked_reason && <p className="mt-2 text-xs text-rose-700 print:text-red-700"><span className="font-semibold">Blocked:</span> {o.blocked_reason}</p>}
                  {o.override_reason && <p className="mt-1 text-xs text-secondary print:text-gray-700"><span className="font-semibold">Justification:</span> {o.override_reason}</p>}
                </div>
              ))}
            </div>
          )}
        </AuditSection>

        {/* ── S7: Delegation Authority ── */}
        <AuditSection n={7} title="Delegation Authority Check" eyebrow="Approver Authority"
          compliance={quotes.some((q) => q.status === "Awarded") ? "pass" : "na"}>
          {(() => {
            const awardedQuote = quotes.find((q) => q.status === "Awarded")
            const awardedSup = awardedQuote?.supplier_id ? suppliers.get(awardedQuote.supplier_id) : null
            const bankRec = awardedQuote?.supplier_id ? banking.get(awardedQuote.supplier_id) : null
            return (
              <div className="space-y-3">
                <div className="divide-y divide-panel print:divide-gray-100">
                  <MetaRow label="Awarded Supplier" value={awardedQuote?.supplier_name ?? "Not yet awarded"} />
                  {awardedSup && <>
                    <MetaRow label="Verification Status" value={awardedSup.verification_status ?? "Unknown"} />
                    <MetaRow label="B-BBEE Level" value={awardedSup.bbbee_level ?? "Not captured"} />
                    <MetaRow label="CSD Number" value={awardedSup.csd_number ?? "Not captured"} mono />
                  </>}
                  {bankRec && <MetaRow label="Banking Verification" value={bankRec.verification_status ?? "Unknown"} />}
                </div>
                <p className="text-xs text-muted print:text-gray-500">
                  Delegation authority enforcement is configured in Admin → Delegation Authority. Refer to the delegation register for the specific approver authority applicable to this procurement value.
                </p>
              </div>
            )
          })()}
        </AuditSection>

        {/* ── S8: PO / Contract / Invoice / Payment Trail ── */}
        <AuditSection n={8} title="Procurement Lifecycle Trail" eyebrow="PO / Contract / Invoice / Payment"
          compliance={pos.length > 0 ? contracts.length > 0 ? "pass" : "warn" : "na"}>
          <div className="space-y-4">
            {/* POs */}
            <div>
              <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Purchase Orders ({pos.length})</p>
              {pos.length === 0 ? <p className="text-xs text-muted italic">No purchase orders generated.</p> : (
                <div className="divide-y divide-panel print:divide-gray-100">
                  {pos.map((po) => (
                    <div key={po.id} className="flex items-center justify-between gap-4 py-2.5">
                      <p className="font-mono text-xs text-accent print:text-gray-900">{po.po_number ?? `PO-${po.id}`}</p>
                      <p className="text-xs text-secondary print:text-gray-700">{po.supplier_name ?? "—"}</p>
                      <p className="text-xs font-semibold text-heading print:text-gray-900">{fmtAmt(po.amount)}</p>
                      <StatusBadge status={po.status} size="sm" />
                      <p className="text-xs text-muted print:text-gray-500">{fmtDate(po.generated_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contracts */}
            <div>
              <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Contracts ({contracts.length})</p>
              {contracts.length === 0 ? <p className="text-xs text-muted italic">No contracts created.</p> : (
                <div className="divide-y divide-panel print:divide-gray-100">
                  {contracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-4 py-2.5">
                      <p className="font-mono text-xs text-accent print:text-gray-900">{c.contract_number ?? `CNT-${c.id}`}</p>
                      <p className="text-xs text-secondary print:text-gray-700">{c.supplier_name ?? "—"}</p>
                      <p className="text-xs font-semibold text-heading print:text-gray-900">{fmtAmt(c.contract_value)}</p>
                      <StatusBadge status={c.status} size="sm" />
                      <p className="text-xs text-muted print:text-gray-500">{fmtDate(c.start_date)} – {fmtDate(c.end_date)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div>
              <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Invoices ({invoices.length})</p>
              {invoices.length === 0 ? <p className="text-xs text-muted italic">No invoices raised.</p> : (
                <div className="divide-y divide-panel print:divide-gray-100">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-4 py-2.5">
                      <p className="font-mono text-xs text-accent print:text-gray-900">{inv.invoice_number ?? `INV-${inv.id}`}</p>
                      <p className="text-xs text-secondary print:text-gray-700">{inv.supplier_name ?? "—"}</p>
                      <p className="text-xs font-semibold text-heading print:text-gray-900">{fmtAmt(inv.total_amount ?? inv.amount)}</p>
                      <StatusBadge status={inv.status} size="sm" />
                      <p className="text-xs text-muted print:text-gray-500">{fmtDate(inv.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments */}
            <div>
              <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Payments ({payments.length})</p>
              {payments.length === 0 ? <p className="text-xs text-muted italic">No payments generated.</p> : (
                <div className="divide-y divide-panel print:divide-gray-100">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                      <p className="font-mono text-xs text-accent print:text-gray-900">{p.payment_number ?? `PAY-${p.id}`}</p>
                      <p className="text-xs text-secondary print:text-gray-700">{p.supplier_name ?? "—"}</p>
                      <p className="text-xs font-semibold text-heading print:text-gray-900">{fmtAmt(p.amount)}</p>
                      <StatusBadge status={p.status} size="sm" />
                      <p className="text-xs text-muted print:text-gray-500">{fmtDate(p.payment_date ?? p.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AuditSection>

        {/* ── S9: Audit Log Timeline ── */}
        <AuditSection n={9} title="Audit Log Timeline" eyebrow="System Activity" compliance="na">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted italic">No audit log entries found for this RFQ.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto print:max-h-none">
              <div className="space-y-2">
                {auditLogs.slice(0, 50).map((log, i) => (
                  <div key={log.id ?? i} className="flex items-start gap-3 rounded-md border border-panel bg-surface px-3.5 py-2.5 print:border-gray-200 print:bg-white">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent print:bg-gray-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[0.65rem] font-bold text-heading print:text-gray-900">{log.action ?? "—"}</span>
                        {log.entity_type && <span className="text-[0.6rem] text-muted">{log.entity_type}/{log.entity_id}</span>}
                      </div>
                      <p className="text-[0.62rem] text-muted print:text-gray-500">
                        {log.user_email ?? "system"} · {fmtDate(log.created_at, true)}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length > 50 && (
                  <p className="text-center text-xs text-muted">Showing 50 of {auditLogs.length} log entries.</p>
                )}
              </div>
            </div>
          )}
        </AuditSection>

        {/* ── S10: Compliance Conclusion ── */}
        <AuditSection n={10} title="Compliance Conclusion" eyebrow="Audit Summary"
          compliance={complianceStatus === "Compliant" ? "pass" : complianceStatus === "Exceptions Noted" ? "warn" : "fail"}>
          <div className="space-y-5">
            {/* Status */}
            <div className={`flex items-center gap-4 rounded-md border p-5 ${statusColor}`}>
              <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {complianceStatus === "Compliant" ? (
                  <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
                ) : complianceStatus === "Exceptions Noted" ? (
                  <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>
                ) : (
                  <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>
                )}
              </svg>
              <div>
                <p className="text-xl font-bold">{complianceStatus}</p>
                <p className="text-sm opacity-80">
                  {complianceStatus === "Compliant"
                    ? "All procurement records are in order. This process is compliant with applicable governance requirements."
                    : complianceStatus === "Exceptions Noted"
                      ? "Procurement records are largely in order with some items that require attention or documentation."
                      : "Critical compliance issues found. This procurement record requires urgent review before payment release."}
                </p>
              </div>
            </div>

            {/* Findings */}
            <div>
              <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Compliance Findings</p>
              <ul className="space-y-1.5">
                {complianceFindings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-secondary print:text-gray-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent print:bg-gray-400" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Auditor notes */}
            <div>
              <label htmlFor="auditor-notes" className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary print:text-gray-500">
                Auditor Notes
              </label>
              <textarea
                id="auditor-notes"
                rows={4}
                value={auditorNotes}
                onChange={(e) => setAuditorNotes(e.target.value)}
                placeholder="Add auditor observations, exceptions, or notes for the file..."
                className="w-full resize-y rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 print:border-gray-300 print:bg-white"
              />
              {auditorNotes && (
                <div className="mt-2 hidden print:block print:rounded print:border print:border-gray-200 print:bg-gray-50 print:p-3">
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{auditorNotes}</p>
                </div>
              )}
            </div>

            {/* Declaration */}
            <div className="rounded-md border border-panel bg-panel p-4 text-xs leading-6 text-secondary print:border-gray-200 print:text-gray-700">
              This audit pack has been compiled from procurement records stored on the MonateConnect platform. All findings are based on data available at the time of generation. This document must be reviewed by an authorised procurement official and does not constitute a legal compliance opinion.
            </div>
          </div>
        </AuditSection>

      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-3 shadow-panel print:hidden">
        <p className="text-xs text-muted">Pack Reference: {packRef} · Generated {fmtDate(new Date().toISOString())}</p>
        <div className="flex gap-3">
          <Link href={`/dashboard/admin/rfqs/${rfqId}/quotes`}
            className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-panel">
            ← Quote Comparison
          </Link>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong">
            Print Audit Pack
          </button>
        </div>
      </div>
    </div>
  )
}

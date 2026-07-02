"use client"

/*
 * --- invoice_approvals SQL migration ------------------------------------------
 *
 * create table if not exists invoice_approvals (
 *   id bigint generated always as identity primary key,
 *   invoice_id bigint,
 *   approver_id uuid,
 *   approval_status text default 'Pending',
 *   approval_notes text,
 *   approved_at timestamptz,
 *   created_at timestamptz default timezone('utc', now())
 * );
 * alter table invoice_approvals enable row level security;
 * create policy "Read invoice approvals" on invoice_approvals for select using (true);
 * create policy "Insert invoice approvals" on invoice_approvals for insert with check (true);
 * create policy "Update invoice approvals" on invoice_approvals for update using (true);
 */

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import {
  INVOICE_STATUSES,
  getInvoiceById,
  updateInvoiceStatus,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/invoices"
import { logActivity } from "@/lib/activity"
import { createDecisionItem } from "@/lib/decisionBoard"
import { createPayment } from "@/lib/payments"
import { evaluateWorkflowRules } from "@/lib/workflowRules"
import { checkInvoiceCompliance } from "@/lib/policyCompliance"
import ComplianceBanner from "@/components/compliance/ComplianceBanner"
import { checkApprovedOverride, type ProcurementOverride } from "@/lib/procurementOverrides"
import { supabase } from "@/lib/supabase"
import { canUserApprove } from "@/lib/delegationAuthority"

// --- Types --------------------------------------------------------------------

type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "Correction Required"

type InvoiceApproval = {
  id: number
  invoice_id: number | null
  approver_id: string | null
  approval_status: string | null
  approval_notes: string | null
  approved_at: string | null
  created_at: string | null
}

// --- Constants ----------------------------------------------------------------

const statusStyles: Record<string, string> = {
  Draft: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Submitted: "border-accent-soft bg-accent-soft text-accent-strong",
  "Under Review": "border-warning bg-warning-soft text-warning",
  Approved: "border-success/60 bg-success-soft text-success",
  Rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Paid: "border-success bg-success-soft text-success",
}

const approvalStyles: Record<string, string> = {
  "Pending": "border-warning/40 bg-warning/10 text-warning",
  "Approved": "border-success/40 bg-success/10 text-success",
  "Rejected": "border-rose-500/35 bg-rose-500/10 text-rose-700",
  "Correction Required": "border-sky-500/35 bg-sky-500/10 text-sky-700",
}

const MIGRATION_SQL = `create table if not exists invoice_approvals (
  id bigint generated always as identity primary key,
  invoice_id bigint,
  approver_id uuid,
  approval_status text default 'Pending',
  approval_notes text,
  approved_at timestamptz,
  created_at timestamptz default timezone('utc', now())
);
alter table invoice_approvals enable row level security;
create policy "Read invoice approvals" on invoice_approvals for select using (true);
create policy "Insert invoice approvals" on invoice_approvals for insert with check (true);
create policy "Update invoice approvals" on invoice_approvals for update using (true);`

// --- Helpers ------------------------------------------------------------------

function normalizeInvoiceStatus(status: string | null): InvoiceStatus {
  return INVOICE_STATUSES.includes(status as InvoiceStatus)
    ? (status as InvoiceStatus)
    : "Draft"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
  })
}

function formatDateLong(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric", month: "long", day: "numeric",
  })
}

function displayValue(value: string | number | null): string | null {
  return value == null ? null : String(value)
}

// --- Sub-components -----------------------------------------------------------

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-heading">{value || "-"}</p>
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
    <div className="mb-5 rounded-md border border-accent/25 bg-accent/5 print:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left" aria-expanded={open}>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p className="text-sm font-semibold text-accent">Database migration required</p>
          <span className="hidden text-xs text-secondary sm:inline">— invoice_approvals table</span>
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

// --- Page ---------------------------------------------------------------------

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const invoiceId = Number(params.id)

  // Core state
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [approverId, setApproverId] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [generatingPayment, setGeneratingPayment] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Approval state
  const [approvals, setApprovals] = useState<InvoiceApproval[]>([])
  const [approverNotes, setApproverNotes] = useState("")
  const [savingApproval, setSavingApproval] = useState(false)
  const [approvalTableError, setApprovalTableError] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [approvedOverride, setApprovedOverride] = useState<ProcurementOverride | null>(null)

  const latestApproval = approvals[0] ?? null

  const invoiceCompliance = useMemo(() => {
    if (!invoice) return null
    return checkInvoiceCompliance(
      {
        amount: invoice.amount,
        total: invoice.total,
        status: invoice.status,
        contract_id: invoice.contract_id,
        purchase_order_id: invoice.purchase_order_id,
        supplier_id: invoice.supplier_id,
        due_date: invoice.due_date,
        created_at: invoice.created_at,
      },
      invoice.purchaseOrder
        ? { amount: invoice.purchaseOrder.amount, status: invoice.purchaseOrder.status }
        : null,
      invoice.contract
        ? {
            contract_value: invoice.contract.contract_value,
            status: invoice.contract.status,
            end_date: invoice.contract.end_date,
          }
        : null
    )
  }, [invoice])

  // --- Load ------------------------------------------------------------------

  useEffect(() => {
    async function loadInvoice() {
      if (!Number.isFinite(invoiceId)) {
        setErrorMessage("Invalid invoice reference.")
        setLoading(false)
        return
      }

      try {
        const [profile, loadedInvoice] = await Promise.all([
          getCurrentProfile(),
          getInvoiceById(invoiceId),
        ])

        const manage = hasAdminOrBuyerAccess(profile)
        setCanManage(manage)
        setApproverId(profile?.id ?? "")
        setInvoice(loadedInvoice)

        // Load approval records — graceful failure if table missing
        if (supabase) {
          const { data: approvalData, error: approvalErr } = await supabase
            .from("invoice_approvals")
            .select("id, invoice_id, approver_id, approval_status, approval_notes, approved_at, created_at")
            .eq("invoice_id", invoiceId)
            .order("created_at", { ascending: false })

          if (approvalErr) {
            if (approvalErr.message.includes("does not exist") || approvalErr.message.includes("relation")) {
              setApprovalTableError(true)
            }
          } else {
            setApprovals((approvalData ?? []) as InvoiceApproval[])
          }

          // Check for approved override
          const override = await checkApprovedOverride("invoice", String(invoiceId))
          if (override) setApprovedOverride(override)
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Invoice failed to load.")
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [invoiceId])

  const currentStatus = normalizeInvoiceStatus(invoice?.status ?? null)

  const timeline = useMemo(() => {
    const currentIndex = INVOICE_STATUSES.indexOf(currentStatus)
    return INVOICE_STATUSES.map((status, index) => ({
      status,
      completed: index <= currentIndex,
      current: status === currentStatus,
    }))
  }, [currentStatus])

  // --- Existing handlers -----------------------------------------------------

  async function updateStatus(status: InvoiceStatus) {
    if (!invoice) return
    setUpdating(true)
    setErrorMessage("")
    setSuccessMessage("")
    try {
      const updatedInvoice = await updateInvoiceStatus(invoice.id, status)
      setInvoice((await getInvoiceById(invoice.id)) ?? updatedInvoice)
      setSuccessMessage(`${updatedInvoice.invoice_number || "Invoice"} updated to ${status}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invoice update failed.")
    } finally {
      setUpdating(false)
    }
  }

  async function generatePaymentFromInvoice() {
    if (!invoice) return

    // Block payment if supplier banking is not verified
    if (supabase && invoice.supplier_id) {
      const { data: bankData } = await supabase
        .from("supplier_bank_details")
        .select("verification_status")
        .eq("supplier_id", invoice.supplier_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!bankData || bankData.verification_status !== "Verified") {
        setErrorMessage(
          "Supplier banking details must be verified before payment can be processed. " +
          "Ask the supplier to submit their banking details, then verify them in Banking Review."
        )
        return
      }
    }

    setGeneratingPayment(true)
    setErrorMessage("")
    setSuccessMessage("")
    try {
      const payment = await createPayment({ invoiceId: invoice.id })
      router.push(`/dashboard/payments/${payment.id}`)
    } catch (error) {
      console.error("Payment generation failed:", error)
      setErrorMessage(error instanceof Error ? error.message : "Payment generation failed.")
    } finally {
      setGeneratingPayment(false)
    }
  }

  // --- Approval handlers -----------------------------------------------------

  async function submitApproval(approvalStatus: ApprovalStatus, targetInvoiceStatus: InvoiceStatus) {
    if (!invoice || !supabase) {
      setErrorMessage("Cannot save approval — Supabase not configured.")
      return
    }

    // -- Delegation Authority Check ------------------------------------------
    const invoiceAmount = invoice.total ? Number(String(invoice.total).replace(/[^\d.]/g, "")) : (invoice.amount ? Number(String(invoice.amount).replace(/[^\d.]/g, "")) : 0)
    const hasDelegationAuthority = await canUserApprove(approverId, "invoices", invoiceAmount)

    if (!hasDelegationAuthority) {
      setErrorMessage("You do not have delegation authority for this action.")
      setSavingApproval(false)
      return
    }


    // -- Workflow rule check for approvals -----------------------------------
    if (approvalStatus === "Approved") {
      const ruleResult = await evaluateWorkflowRules("invoice", {
        amount: invoice.amount ? Number(String(invoice.amount).replace(/[^\d.]/g, "")) : 0,
        total_amount: invoice.total ? Number(String(invoice.total).replace(/[^\d.]/g, "")) : 0,
        status: invoice.status,
        supplier_id: invoice.supplier_id,
      }, approverId)
      if (ruleResult.blocked && ruleResult.blockMessage) {
        // Allow if there's an approved override for this invoice
        const override = await checkApprovedOverride("invoice", String(invoice.id))
        if (!override) {
          setErrorMessage(ruleResult.blockMessage)
          return
        }
        // Override found — update local state and proceed
        setApprovedOverride(override)
      }
    }

    setSavingApproval(true)
    setErrorMessage("")
    setSuccessMessage("")

    // 1. Insert approval record
    const { data: approvalData, error: approvalErr } = await supabase
      .from("invoice_approvals")
      .insert([{
        invoice_id: invoice.id,
        approver_id: approverId || null,
        approval_status: approvalStatus,
        approval_notes: approverNotes.trim() || null,
        approved_at: approvalStatus === "Approved" ? new Date().toISOString() : null,
      }])
      .select("*")
      .single()

    if (approvalErr) {
      setSavingApproval(false)
      if (approvalErr.message.includes("does not exist") || approvalErr.message.includes("relation")) {
        setApprovalTableError(true)
        setErrorMessage("invoice_approvals table not found. Run the SQL migration above first.")
      } else {
        setErrorMessage(approvalErr.message)
      }
      return
    }

    // 2. Update invoice status
    try {
      const updatedInvoice = await updateInvoiceStatus(invoice.id, targetInvoiceStatus)
      setInvoice((await getInvoiceById(invoice.id)) ?? updatedInvoice)
    } catch (err) {
      setSavingApproval(false)
      setErrorMessage(err instanceof Error ? err.message : "Failed to update invoice status.")
      return
    }

    setApprovals((prev) => [approvalData as InvoiceApproval, ...prev])
    setApproverNotes("")
    setSavingApproval(false)

    const label =
      approvalStatus === "Approved" ? "approved"
        : approvalStatus === "Rejected" ? "rejected"
          : "returned for correction"
    setSuccessMessage(`Invoice ${label}. Status updated to ${targetInvoiceStatus}.`)

    try {
      await logActivity({
        action: `invoice.${approvalStatus.toLowerCase().replace(/ /g, "_")}`,
        entity_type: "invoice",
        entity_id: invoice.id,
        metadata: { approval_status: approvalStatus, invoice_status: targetInvoiceStatus },
      })
    } catch { /* swallow */ }

    // Log approved invoices to decision board (never blocks)
    if (approvalStatus === "Approved") {
      createDecisionItem({
        item_type: "invoice_approval",
        entity_id: String(invoice.id),
        title: `Invoice Approved: ${invoice.invoice_number ?? `INV-${invoice.id}`} — ${invoice.supplier_name ?? "Unknown Supplier"}`,
        description: `Invoice approved. Amount: ${invoice.total ?? invoice.amount ?? "N/A"}. Contract: ${invoice.contract_id ? `CNT-${invoice.contract_id}` : "N/A"}.`,
        requested_by: approverId || undefined,
        priority: "Normal",
      }).catch(() => { /* never block */ })
    }
  }

  // --- Guards ----------------------------------------------------------------

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  if (errorMessage && !invoice) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">Invoice failed to load</p>
        <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">Invoice not found.</p>
      </div>
    )
  }

  const canApprove =
    canManage &&
    (currentStatus === "Submitted" || currentStatus === "Under Review") &&
    latestApproval?.approval_status !== "Approved"

  const isAlreadyApproved =
    currentStatus === "Approved" || latestApproval?.approval_status === "Approved"

  // --- Render ----------------------------------------------------------------

  return (
    <div>
      {/* -- Header -- */}
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Procurement / Invoice</p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {invoice.invoice_number || `INV-${invoice.id}`}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
            Review billing details, manage approval workflow, and generate the payment request pack.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Back to Invoices
          </Link>
          <Link
            href={`/dashboard/invoices/${invoiceId}/payment-request`}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Payment Request Pack
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
          >
            Print Invoice
          </button>
          {canManage && currentStatus === "Approved" && (
            <button
              type="button"
              disabled={generatingPayment}
              onClick={generatePaymentFromInvoice}
              className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface disabled:opacity-50"
            >
              {generatingPayment ? "Generating..." : "Generate Payment"}
            </button>
          )}
        </div>
      </div>

      {approvalTableError && <SQLBlock sql={MIGRATION_SQL} />}

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <div className="print-document space-y-6">

        {/* -- Invoice Summary -- */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="flex flex-col gap-4 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">Invoice Summary</p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {invoice.invoice_number || `INV-${invoice.id}`}
              </h2>
            </div>
            <span className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusStyles[currentStatus] ?? "border-panel bg-panel text-secondary"}`}>
              {currentStatus}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DetailField label="Invoice Number" value={invoice.invoice_number || `INV-${invoice.id}`} />
            <DetailField label="Supplier" value={invoice.supplier_name || "-"} />
            <DetailField label="Contract" value={invoice.contract?.contract_number || (invoice.contract_id ? `CNT-${invoice.contract_id}` : null)} />
            <DetailField label="Purchase Order" value={invoice.purchaseOrder?.po_number || (invoice.purchase_order_id ? `PO-${invoice.purchase_order_id}` : null)} />
            <DetailField label="Amount" value={displayValue(invoice.amount)} />
            <DetailField label="VAT" value={invoice.vat} />
            <DetailField label="Total" value={invoice.total} />
            <DetailField label="Created Date" value={formatDate(invoice.created_at)} />
            <DetailField label="Due Date" value={formatDate(invoice.due_date)} />
            <DetailField label="Status" value={currentStatus} />
            <DetailField label="Notes" value={invoice.notes || "No notes captured."} />
          </div>
        </section>

        {/* -- Supplier / Contract / PO -- */}
        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">Supplier</p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {invoice.supplier?.business_name || invoice.supplier_name || "Supplier"}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="Supplier ID" value={invoice.supplier_id} />
              <DetailField label="Industry" value={invoice.supplier?.industry ?? null} />
              <DetailField label="Province" value={invoice.supplier?.province ?? null} />
              <DetailField label="Phone" value={invoice.supplier?.phone ?? null} />
              <DetailField label="Email" value={invoice.supplier?.email ?? null} />
            </div>
          </div>

          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">Contract</p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {invoice.contract?.contract_number || (invoice.contract_id ? `CNT-${invoice.contract_id}` : "Contract")}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="Contract ID" value={invoice.contract_id ? `CNT-${invoice.contract_id}` : null} />
              <DetailField label="Contract Value" value={displayValue(invoice.contract?.contract_value ?? invoice.amount)} />
              <DetailField label="Start Date" value={formatDate(invoice.contract?.start_date ?? null)} />
              <DetailField label="End Date" value={formatDate(invoice.contract?.end_date ?? null)} />
              {invoice.contract_id && (
                <Link
                  href={`/dashboard/contracts/${invoice.contract_id}`}
                  className="inline-flex w-fit rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong print:hidden"
                >
                  View Contract
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">PO</p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {invoice.purchaseOrder?.po_number || (invoice.purchase_order_id ? `PO-${invoice.purchase_order_id}` : "Purchase Order")}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="PO ID" value={invoice.purchase_order_id ? `PO-${invoice.purchase_order_id}` : null} />
              <DetailField label="RFQ ID" value={invoice.rfq_id ? `RFQ-${invoice.rfq_id}` : null} />
              <DetailField label="PO Amount" value={displayValue(invoice.purchaseOrder?.amount ?? invoice.amount)} />
              <DetailField label="PO Status" value={invoice.purchaseOrder?.status ?? null} />
              {invoice.purchase_order_id && (
                <Link
                  href={`/dashboard/purchase-orders/${invoice.purchase_order_id}`}
                  className="inline-flex w-fit rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong print:hidden"
                >
                  View Purchase Order
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* -- Lifecycle -- */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">Invoice Lifecycle</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {timeline.map((item) => (
              <div
                key={item.status}
                className={`rounded-md border p-4 ${item.completed ? "border-accent bg-accent-soft" : "border-panel bg-panel"}`}
              >
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-secondary">
                  {item.current ? "Current status" : item.completed ? "Completed" : "Pending"}
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">{item.status}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -- Invoice Policy Compliance -- */}
        {invoiceCompliance && (
          <ComplianceBanner
            result={invoiceCompliance}
            title="Invoice Compliance Check"
            collapsible
            hideWhenCompliant={false}
            className="print:hidden"
            entityType="invoice"
            entityId={String(invoiceId)}
            approvedOverride={approvedOverride}
          />
        )}

        {/* -- Approval Workflow Panel -- */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:hidden">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-panel pb-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Approval Workflow</p>
              <h2 className="mt-1 text-lg font-bold text-heading">Invoice Approval</h2>
            </div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${approvalStyles[latestApproval?.approval_status ?? "Pending"] ?? approvalStyles.Pending}`}>
              {latestApproval?.approval_status ?? "Pending Approval"}
            </span>
          </div>

          {/* Approved banner */}
          {isAlreadyApproved && (
            <div className="mb-5 flex items-start gap-3 rounded-md border border-success/30 bg-success-soft px-5 py-4">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <p className="text-sm font-bold text-success">Invoice approved.</p>
                <p className="text-xs text-success/80">
                  {latestApproval?.approved_at ? `Approved on ${formatDateLong(latestApproval.approved_at)}.` : "This invoice has been approved."}
                  {" "}
                  <Link href={`/dashboard/invoices/${invoiceId}/payment-request`}
                    className="font-semibold underline underline-offset-2 hover:text-success">
                    View Payment Request Pack →
                  </Link>
                </p>
                {latestApproval?.approval_notes && (
                  <p className="mt-1.5 text-xs text-secondary">
                    <span className="font-semibold">Notes:</span> {latestApproval.approval_notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Latest rejection/correction banner */}
          {latestApproval && !isAlreadyApproved && latestApproval.approval_notes && (
            <div className={`mb-5 rounded-md border px-5 py-4 ${latestApproval.approval_status === "Rejected" ? "border-rose-500/25 bg-rose-500/10" : "border-sky-500/25 bg-sky-500/10"}`}>
              <p className={`text-sm font-semibold ${latestApproval.approval_status === "Rejected" ? "text-rose-700" : "text-sky-700"}`}>
                {latestApproval.approval_status === "Rejected" ? "Invoice rejected" : "Correction requested"}
              </p>
              <p className={`mt-1 text-xs ${latestApproval.approval_status === "Rejected" ? "text-rose-700" : "text-sky-700"}`}>
                {latestApproval.approval_notes}
              </p>
              <p className="mt-1 text-[0.63rem] text-muted">{formatDateLong(latestApproval.created_at)}</p>
            </div>
          )}

          {/* Approver notes textarea */}
          {canManage && !isAlreadyApproved && (
            <div className="mb-5">
              <label htmlFor="approver-notes" className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary">
                Approver Notes
              </label>
              <textarea
                id="approver-notes"
                rows={3}
                value={approverNotes}
                onChange={(e) => setApproverNotes(e.target.value)}
                placeholder="Add approval notes, rejection reason, or specific corrections required..."
                disabled={savingApproval}
                className="w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-muted">
                Notes are required for Rejection and Correction requests. Optional for Approval.
              </p>
            </div>
          )}

          {/* Status gate hint */}
          {canManage && !canApprove && !isAlreadyApproved && (
            <div className="mb-5 rounded-md border border-warning/25 bg-warning/8 px-4 py-3">
              <p className="text-sm text-warning">
                Approval actions require invoice status <strong>Submitted</strong> or <strong>Under Review</strong>. Current: <strong>{currentStatus}</strong>.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {canManage && !isAlreadyApproved && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={savingApproval || !canApprove}
                onClick={() => submitApproval("Approved", "Approved")}
                className="inline-flex items-center gap-2 rounded-md border border-success bg-success px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingApproval ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                Approve Invoice
              </button>

              <button
                type="button"
                disabled={savingApproval || !canApprove || !approverNotes.trim()}
                onClick={() => submitApproval("Rejected", "Rejected")}
                className="inline-flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Reject Invoice
              </button>

              <button
                type="button"
                disabled={savingApproval || !canApprove || !approverNotes.trim()}
                onClick={() => submitApproval("Correction Required", "Draft")}
                className="inline-flex items-center gap-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-5 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Request Correction
              </button>

              {!approverNotes.trim() && canApprove && (
                <p className="text-xs text-muted">Notes required for Reject &amp; Correction.</p>
              )}
            </div>
          )}

          {/* Advisory */}
          <div className="mt-5 flex items-start gap-2.5 rounded-md border border-panel bg-panel px-4 py-3">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-muted">
              Invoice approval is a finance control gate. Approved invoices can proceed to payment generation. All approval actions are logged in the audit record.
            </p>
          </div>

          {/* Approval history */}
          {approvals.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-accent transition hover:text-accent-strong"
                aria-expanded={showHistory}
              >
                <svg className={`h-3.5 w-3.5 transition-transform ${showHistory ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {showHistory ? "Hide" : "View"} approval history ({approvals.length})
              </button>

              {showHistory && (
                <div className="mt-3 divide-y divide-panel overflow-hidden rounded-md border border-panel">
                  {approvals.map((ap) => (
                    <div key={ap.id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`mt-0.5 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${approvalStyles[ap.approval_status ?? "Pending"] ?? approvalStyles.Pending}`}>
                        {ap.approval_status ?? "Pending"}
                      </span>
                      <div className="min-w-0 flex-1">
                        {ap.approval_notes && (
                          <p className="text-xs leading-relaxed text-secondary">{ap.approval_notes}</p>
                        )}
                        <p className="mt-0.5 text-[0.62rem] text-muted">
                          {formatDateLong(ap.created_at)}
                          {ap.approved_at && ap.approval_status === "Approved" && (
                            <> · Approved {formatDateLong(ap.approved_at)}</>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* -- Status Actions -- */}
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:hidden">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">Status Actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!canManage && currentStatus === "Draft" && (
              <button
                type="button"
                disabled={updating}
                onClick={() => updateStatus("Submitted")}
                className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50"
              >
                {updating ? "Submitting..." : "Submit Invoice"}
              </button>
            )}
            {canManage && INVOICE_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updating || status === currentStatus}
                onClick={() => updateStatus(status)}
                className="rounded-md border border-panel bg-panel px-4 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:bg-surface disabled:opacity-50"
              >
                Mark {status}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

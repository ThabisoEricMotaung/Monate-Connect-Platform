"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import { getInvoiceById, type Invoice } from "@/lib/invoices"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceApproval = {
  id: number
  approver_id: string | null
  approval_status: string | null
  approval_notes: string | null
  approved_at: string | null
  created_at: string | null
}

type BankDetails = {
  bank_name: string | null
  account_holder: string | null
  account_number: string | null
  branch_code: string | null
  account_type: string | null
  verification_status: string | null
  verification_notes: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", opts ?? { year: "numeric", month: "long", day: "numeric" })
}

function displayVal(v: string | number | null): string {
  return v == null ? "—" : String(v)
}

function refNum(invoiceId: number): string {
  const now = new Date()
  return `PR-${invoiceId}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PackRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4 print:flex-row print:items-baseline print:gap-4">
      <span className="w-52 shrink-0 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted print:text-gray-500">
        {label}
      </span>
      <span className={`text-sm font-semibold text-heading print:text-gray-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  )
}

function PackSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel print:border-gray-200 print:bg-white print:shadow-none">
      <div className="mb-3 flex items-center gap-3 border-b border-panel pb-3 print:border-gray-200">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-button text-[0.62rem] font-bold print:bg-gray-700">
          {n}
        </span>
        <h3 className="text-sm font-bold text-heading print:text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-panel print:divide-gray-100">{children}</div>
    </div>
  )
}

function ApprovalStatusBadge({ status }: { status: string | null }) {
  const cls: Record<string, string> = {
    "Approved": "border-success/40 bg-success/10 text-success print:border-green-500 print:text-green-700",
    "Pending": "border-warning/40 bg-warning/10 text-warning print:border-yellow-500 print:text-yellow-700",
    "Rejected": "border-rose-500/35 bg-rose-500/10 text-rose-700 print:border-red-500 print:text-red-700",
    "Correction Required": "border-sky-500/35 bg-sky-500/10 text-sky-700 print:border-blue-500 print:text-blue-700",
  }
  const s = status ?? "Pending"
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${cls[s] ?? cls.Pending}`}>
      {s}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentRequestPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const invoiceId = Number(params.id)

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [approval, setApproval] = useState<InvoiceApproval | null>(null)
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      if (!Number.isFinite(invoiceId)) {
        setError("Invalid invoice reference.")
        setLoading(false)
        return
      }

      try {
        const [profile, loadedInvoice] = await Promise.all([
          getCurrentProfile(),
          getInvoiceById(invoiceId),
        ])

        if (!hasAdminOrBuyerAccess(profile)) {
          router.replace("/dashboard/invoices")
          return
        }

        setInvoice(loadedInvoice)

        if (supabase) {
          // Load most recent approval and banking details in parallel
          const [approvalRes, bankRes] = await Promise.all([
            supabase
              .from("invoice_approvals")
              .select("id, approver_id, approval_status, approval_notes, approved_at, created_at")
              .eq("invoice_id", invoiceId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            loadedInvoice?.supplier_id
              ? supabase
                  .from("supplier_bank_details")
                  .select("bank_name, account_holder, account_number, branch_code, account_type, verification_status, verification_notes")
                  .eq("supplier_id", loadedInvoice.supplier_id)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ])
          if (approvalRes.data) setApproval(approvalRes.data as InvoiceApproval)
          if (bankRes.data) setBankDetails(bankRes.data as BankDetails)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [invoiceId, router])

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  if (error || !invoice) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">{error || "Invoice not found."}</p>
        <Link href={`/dashboard/invoices/${invoiceId}`} className="mt-2 inline-block text-xs font-semibold text-accent">
          ← Back to Invoice
        </Link>
      </div>
    )
  }

  const isApproved = invoice.status === "Approved" || approval?.approval_status === "Approved"
  const packRef = refNum(invoiceId)
  const today = fmtDate(new Date().toISOString())

  return (
    <div className="mx-auto max-w-4xl print:max-w-none">

      {/* ── Screen header ── */}
      <div className="mb-6 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href={`/dashboard/invoices/${invoiceId}`}
              className="text-xs font-semibold text-accent transition hover:text-accent-strong">
              ← Back to Invoice
            </Link>
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Finance / Payment Request</p>
          <h1 className="mt-2 text-2xl font-semibold text-heading">
            Payment Request Pack
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {invoice.invoice_number || `INV-${invoiceId}`} · {packRef}
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Payment Request
          </button>
        </div>
      </div>

      {/* ── Print masthead ── */}
      <div className="hidden print:block print:mb-8 print:border-b print:border-gray-300 print:pb-6">
        <div className="print:flex print:items-start print:justify-between">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gray-500">
              MonateConnect Procurement Services
            </p>
            <h1 className="mt-1.5 text-2xl font-bold text-gray-900">Payment Request Pack</h1>
            <p className="mt-1 text-sm text-gray-600">
              Reference: {packRef} · Date: {today}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold text-gray-900">{invoice.invoice_number || `INV-${invoiceId}`}</p>
            <div className="mt-1">
              <ApprovalStatusBadge status={approval?.approval_status ?? (isApproved ? "Approved" : "Pending")} />
            </div>
          </div>
        </div>
      </div>

      {/* Approval gating warning */}
      {!isApproved && (
        <div className="mb-5 flex items-start gap-3 rounded-md border border-warning/30 bg-warning/8 px-5 py-4 print:hidden">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-warning">
              Invoice not yet approved — payment request is for reference only.
            </p>
            <p className="mt-0.5 text-xs text-warning/80">
              Payment should only be processed after the invoice has been formally approved.{" "}
              <Link href={`/dashboard/invoices/${invoiceId}`} className="font-semibold underline underline-offset-2">
                Go to invoice approval →
              </Link>
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="mb-5 flex items-center gap-3 rounded-md border border-success/30 bg-success-soft px-5 py-4 print:hidden">
          <svg className="h-4 w-4 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-sm font-semibold text-success">
            Invoice approved — payment request is ready for processing.
          </p>
        </div>
      )}

      <div className="space-y-4">

        {/* ── Section 1: Pack Reference ── */}
        <PackSection n="1" title="Payment Request Reference">
          <PackRow label="Pack Reference" value={packRef} mono />
          <PackRow label="Invoice Number" value={invoice.invoice_number || `INV-${invoiceId}`} mono />
          <PackRow label="Pack Generated" value={today} />
          <PackRow label="Approval Status" value="" />
          <div className="py-2.5">
            <ApprovalStatusBadge status={approval?.approval_status ?? (isApproved ? "Approved" : "Pending")} />
          </div>
          {approval?.approved_at && (
            <PackRow label="Approved Date" value={fmtDate(approval.approved_at)} />
          )}
        </PackSection>

        {/* ── Section 2: Invoice Details ── */}
        <PackSection n="2" title="Invoice Details">
          <PackRow label="Invoice Number" value={invoice.invoice_number || `INV-${invoiceId}`} mono />
          <PackRow label="Invoice Status" value={invoice.status ?? "—"} />
          <PackRow label="Invoice Date" value={fmtDate(invoice.created_at)} />
          <PackRow label="Due Date" value={fmtDate(invoice.due_date)} />
          {invoice.notes && (
            <PackRow label="Invoice Notes" value={invoice.notes} />
          )}
        </PackSection>

        {/* ── Section 3: Supplier Details ── */}
        <PackSection n="3" title="Supplier / Beneficiary Details">
          <PackRow label="Business Name" value={invoice.supplier?.business_name || invoice.supplier_name || "—"} />
          <PackRow label="Supplier ID" value={invoice.supplier_id || "—"} mono />
          {invoice.supplier?.industry && <PackRow label="Industry" value={invoice.supplier.industry} />}
          {invoice.supplier?.province && <PackRow label="Province" value={invoice.supplier.province} />}
          {invoice.supplier?.phone && <PackRow label="Phone" value={invoice.supplier.phone} />}
          {invoice.supplier?.email && <PackRow label="Email" value={invoice.supplier.email} />}
          <PackRow label="Verification Status" value={invoice.supplier?.verification_status || "—"} />
        </PackSection>

        {/* ── Section 4: Contract & PO Reference ── */}
        <PackSection n="4" title="Contract & Purchase Order Reference">
          <PackRow
            label="Contract Number"
            value={invoice.contract?.contract_number || (invoice.contract_id ? `CNT-${invoice.contract_id}` : "—")}
            mono
          />
          <PackRow
            label="Contract Value"
            value={displayVal(invoice.contract?.contract_value ?? invoice.amount)}
          />
          <PackRow label="Contract Start" value={fmtDate(invoice.contract?.start_date ?? null)} />
          <PackRow label="Contract End" value={fmtDate(invoice.contract?.end_date ?? null)} />
          <PackRow
            label="Purchase Order"
            value={invoice.purchaseOrder?.po_number || (invoice.purchase_order_id ? `PO-${invoice.purchase_order_id}` : "—")}
            mono
          />
          <PackRow label="PO Status" value={invoice.purchaseOrder?.status || "—"} />
          <PackRow
            label="RFQ Reference"
            value={invoice.rfq_id ? `RFQ-${invoice.rfq_id}` : "—"}
            mono
          />
        </PackSection>

        {/* ── Section 5: Financial Summary ── */}
        <PackSection n="5" title="Financial Summary">
          <PackRow label="Amount (excl. VAT)" value={displayVal(invoice.amount)} />
          <PackRow label="VAT Amount" value={invoice.vat ?? "—"} />
          <PackRow label="Total Payable" value={invoice.total ?? displayVal(invoice.amount)} />
          <PackRow label="Payment Due Date" value={fmtDate(invoice.due_date)} />
          <div className="mt-3 rounded-md border border-success/25 bg-success/5 px-4 py-3 print:border-green-200 print:bg-white">
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted print:text-gray-500">
              Total Amount for Payment
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-heading print:text-gray-900">
              {invoice.total ?? displayVal(invoice.amount)}
            </p>
          </div>
        </PackSection>

        {/* ── Section 6: Approval Record ── */}
        <PackSection n="6" title="Approval Record">
          <PackRow
            label="Approval Status"
            value={approval?.approval_status ?? (isApproved ? "Approved" : "Pending Approval")}
          />
          {approval?.approved_at && (
            <PackRow label="Approved On" value={fmtDate(approval.approved_at)} />
          )}
          {approval?.approver_id && (
            <PackRow label="Approver ID" value={approval.approver_id.slice(0, 8) + "…"} mono />
          )}
          {approval?.approval_notes && (
            <PackRow label="Approver Notes" value={approval.approval_notes} />
          )}
          {!approval && (
            <div className="py-2.5">
              <p className="text-sm italic text-muted print:text-gray-500">
                No approval record found. Approve the invoice before processing payment.
              </p>
            </div>
          )}
        </PackSection>

        {/* ── Section 7: Payment Instructions ── */}
        <PackSection n="7" title="Banking Details & Payment Instructions">
          {/* Banking verification status banner */}
          {bankDetails ? (
            <div className="py-2">
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-panel bg-panel px-4 py-3 print:border-gray-200 print:bg-gray-50">
                <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted print:text-gray-500">
                  Banking Verification Status
                </p>
                <span
                  className={[
                    "inline-flex rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider",
                    bankDetails.verification_status === "Verified"
                      ? "border-success/40 bg-success/10 text-success print:border-green-500 print:text-green-700"
                      : bankDetails.verification_status === "Under Review"
                        ? "border-sky-500/35 bg-sky-500/10 text-sky-700 print:border-blue-500 print:text-blue-700"
                        : bankDetails.verification_status === "Rejected"
                          ? "border-rose-500/35 bg-rose-500/10 text-rose-700 print:border-red-500 print:text-red-700"
                          : "border-warning/40 bg-warning/10 text-warning print:border-yellow-500 print:text-yellow-700",
                  ].join(" ")}
                >
                  {bankDetails.verification_status ?? "Unverified"}
                </span>
              </div>
              {bankDetails.verification_status !== "Verified" && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/25 bg-warning/8 px-3 py-2.5 print:hidden">
                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p className="text-xs text-warning">
                    Banking details are not yet verified. Payment must not be processed until status is <strong>Verified</strong>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2">
              <div className="rounded-md border border-rose-500/20 bg-rose-500/8 px-4 py-3 print:border-red-200 print:bg-white">
                <p className="text-sm font-semibold text-rose-700 print:text-red-700">
                  No banking details on record.
                </p>
                <p className="mt-0.5 text-xs text-rose-700/80 print:text-red-600">
                  The supplier has not submitted banking details. Payment cannot be processed.
                </p>
              </div>
            </div>
          )}

          {/* Verified details shown in full, unverified shown masked */}
          <PackRow
            label="Beneficiary Name"
            value={bankDetails?.account_holder || invoice.supplier?.business_name || invoice.supplier_name || "—"}
          />
          {bankDetails?.verification_status === "Verified" ? (
            <>
              <PackRow label="Bank Name" value={bankDetails.bank_name || "—"} />
              <PackRow label="Account Number" value={bankDetails.account_number || "—"} mono />
              <PackRow label="Branch Code" value={bankDetails.branch_code || "—"} mono />
              <PackRow label="Account Type" value={bankDetails.account_type || "—"} />
            </>
          ) : (
            <>
              <PackRow label="Bank Name" value={bankDetails?.bank_name || "[Pending verification]"} />
              <PackRow label="Account Number" value="[Pending verification — do not pay]" />
              <PackRow label="Branch Code" value="[Pending verification]" />
              <PackRow label="Account Type" value={bankDetails?.account_type || "[Pending verification]"} />
            </>
          )}
          <PackRow
            label="Payment Reference"
            value={invoice.invoice_number || `INV-${invoiceId}`}
            mono
          />
          <PackRow label="Amount" value={invoice.total ?? displayVal(invoice.amount)} />
          <PackRow label="Payment Date" value="[To be completed by finance team]" />

          {bankDetails?.verification_notes && bankDetails.verification_status === "Verified" && (
            <PackRow label="Verification Notes" value={bankDetails.verification_notes} />
          )}

          <div className="mt-3 rounded-md border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-secondary print:border-gray-200 print:bg-gray-50 print:text-gray-600">
            {bankDetails?.verification_status === "Verified"
              ? "Banking details have been verified by a finance administrator. Confirm the account number and holder name match the bank confirmation letter before processing."
              : "Bank details must be verified before payment processing. See the Banking Details Review page to verify this supplier."}
          </div>
        </PackSection>

        {/* ── Section 8: Declaration ── */}
        <PackSection n="8" title="Declaration & Authorisation">
          <div className="py-2 text-sm leading-7 text-secondary print:text-gray-700">
            <p>
              This payment request pack has been generated from the MonateConnect Procurement Platform and constitutes the formal documentation package supporting the payment instruction below. Payment must only be processed after all of the following conditions are met:
            </p>
            <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-secondary print:text-gray-700">
              <li>Invoice is in <strong>Approved</strong> status in the procurement system.</li>
              <li>Contract and Purchase Order references have been confirmed.</li>
              <li>Beneficiary banking details have been independently verified.</li>
              <li>An authorised financial officer has reviewed and signed this pack.</li>
              <li>Payment complies with applicable PFMA / MFMA or company policy obligations.</li>
            </ol>
          </div>

          {/* Signature lines */}
          <div className="mt-6 grid grid-cols-2 gap-10 print:mt-8">
            {[
              "Prepared by (Finance Officer)",
              "Authorised by (CFO / Approving Official)",
            ].map((sig) => (
              <div key={sig}>
                <div className="border-b border-panel pb-0.5 print:border-gray-400" style={{ minHeight: 44 }} />
                <p className="mt-2 text-xs font-semibold text-secondary print:text-gray-700">{sig}</p>
                <p className="mt-1 text-xs text-muted print:text-gray-500">
                  Name: __________________________ Date: ___________
                </p>
              </div>
            ))}
          </div>
        </PackSection>
      </div>

      {/* ── Footer actions ── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel print:hidden">
        <p className="text-xs text-muted">
          This pack is for internal finance use. Do not share with the supplier.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/invoices/${invoiceId}`}
            className="inline-flex items-center gap-2 rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
          >
            ← Invoice Detail
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Payment Request
          </button>
        </div>
      </div>
    </div>
  )
}

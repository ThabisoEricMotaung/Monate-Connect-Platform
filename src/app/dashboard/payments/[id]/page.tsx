"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import {
  PAYMENT_STATUSES,
  formatPaymentAmount,
  getPaymentById,
  normalizePaymentStatus,
  updatePaymentStatus,
  type Payment,
  type PaymentStatus,
} from "@/lib/payments"
import { supabase } from "@/lib/supabase"
import { checkPaymentCompliance } from "@/lib/policyCompliance"
import ComplianceBanner from "@/components/compliance/ComplianceBanner"
import { checkApprovedOverride, type ProcurementOverride } from "@/lib/procurementOverrides"
import { canUserApprove } from "@/lib/delegationAuthority"

const statusStyles: Record<string, string> = {
  Pending: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Processing: "border-warning bg-warning-soft text-warning",
  Paid: "border-success bg-success-soft text-success",
  Failed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Cancelled: "border-panel bg-panel text-secondary",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function parsePaymentAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (!value) return 0
  const numeric = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isFinite(numeric) ? numeric : 0
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-heading">
        {value || "-"}
      </p>
    </div>
  )
}

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>()
  const paymentId = Number(params.id)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [approverId, setApproverId] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [bankingStatus, setBankingStatus] = useState<string | null>(null)
  const [approvedOverride, setApprovedOverride] = useState<ProcurementOverride | null>(null)

  useEffect(() => {
    async function loadPayment() {
      if (!Number.isFinite(paymentId)) {
        setErrorMessage("Invalid payment reference.")
        setLoading(false)
        return
      }

      try {
        const [profile, loadedPayment] = await Promise.all([
          getCurrentProfile(),
          getPaymentById(paymentId),
        ])

        setCanManage(hasAdminOrBuyerAccess(profile))
        setApproverId(profile?.id ?? "")
        setPayment(loadedPayment)

        // Fetch supplier banking verification status
        if (supabase && loadedPayment?.supplier_id) {
          const { data: bankData } = await supabase
            .from("supplier_bank_details")
            .select("verification_status")
            .eq("supplier_id", loadedPayment.supplier_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          setBankingStatus((bankData as { verification_status: string | null } | null)?.verification_status ?? null)

          // Check for approved override for this payment
          const override = await checkApprovedOverride("payment", String(paymentId))
          if (override) setApprovedOverride(override)
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Payment failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadPayment()
  }, [paymentId])

  const paymentCompliance = useMemo(() => {
    if (!payment) return null
    return checkPaymentCompliance(
      { amount: payment.amount, status: payment.status },
      payment.invoice
        ? { status: payment.invoice.status, total: payment.invoice.total, amount: payment.invoice.amount }
        : null,
      { verification_status: bankingStatus }
    )
  }, [payment, bankingStatus])

  const currentStatus = normalizePaymentStatus(payment?.status ?? null)
  const timeline = useMemo(() => {
    const currentIndex = PAYMENT_STATUSES.indexOf(currentStatus)

    return PAYMENT_STATUSES.map((status, index) => ({
      status,
      completed: index <= currentIndex,
      current: status === currentStatus,
    }))
  }, [currentStatus])

  async function updateStatus(status: PaymentStatus) {
    if (!payment) return

    setUpdating(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      if (status === "Paid") {
        const hasAuthority = await canUserApprove(
          approverId,
          "payments",
          parsePaymentAmount(payment.amount)
        )

        if (!hasAuthority) {
          setErrorMessage("You do not have delegation authority for this action.")
          return
        }
      }

      const updatedPayment = await updatePaymentStatus(payment.id, status)
      setPayment((await getPaymentById(payment.id)) ?? updatedPayment)
      setSuccessMessage(
        `${updatedPayment.payment_number || "Payment"} updated to ${status}.`
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Payment update failed."
      )
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  if (errorMessage && !payment) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">Payment failed to load</p>
        <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">Payment not found.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Procurement / Payment
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {payment.payment_number || `PAY-${payment.id}`}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Review payment release details, invoice reference, supplier context,
            and settlement status.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/payments"
            className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Back to Payments
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Print Payment Record
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      {/* -- Payment Policy Compliance -- */}
      {paymentCompliance && (
        <ComplianceBanner
          result={paymentCompliance}
          title="Payment Release Compliance Check"
          collapsible={false}
          hideWhenCompliant={false}
          className="mb-6 print:hidden"
          entityType="payment"
          entityId={String(paymentId)}
          approvedOverride={approvedOverride}
        />
      )}

      <div className="print-document space-y-6">
        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="flex flex-col gap-4 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                Payment Summary
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {payment.payment_number || `PAY-${payment.id}`}
              </h2>
            </div>
            <span className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusStyles[currentStatus]}`}>
              {currentStatus}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DetailField label="Payment Number" value={payment.payment_number || `PAY-${payment.id}`} />
            <DetailField label="Invoice" value={payment.invoice?.invoice_number || (payment.invoice_id ? `INV-${payment.invoice_id}` : null)} />
            <DetailField label="Supplier" value={payment.supplier_name || "-"} />
            <DetailField label="Amount" value={formatPaymentAmount(payment.amount)} />
            <DetailField label="Payment Method" value={payment.payment_method} />
            <DetailField label="Reference Number" value={payment.reference_number} />
            <DetailField label="Payment Date" value={formatDate(payment.payment_date)} />
            <DetailField label="Status" value={currentStatus} />
            <DetailField label="Notes" value={payment.notes || "No notes captured."} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                Invoice Reference
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {payment.invoice?.invoice_number ||
                  (payment.invoice_id ? `INV-${payment.invoice_id}` : "Invoice")}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="Invoice ID" value={payment.invoice_id ? `INV-${payment.invoice_id}` : null} />
              <DetailField label="Invoice Status" value={payment.invoice?.status ?? null} />
              <DetailField label="Invoice Total" value={payment.invoice?.total ?? null} />
              <DetailField label="Due Date" value={formatDate(payment.invoice?.due_date ?? null)} />
              {payment.invoice_id ? (
                <Link
                  href={`/dashboard/invoices/${payment.invoice_id}`}
                  className="inline-flex w-fit rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong print:hidden"
                >
                  View Invoice
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                Supplier Details
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {payment.supplier?.business_name ||
                  payment.supplier_name ||
                  "Supplier"}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="Supplier ID" value={payment.supplier_id} />
              <DetailField label="Industry" value={payment.supplier?.industry ?? null} />
              <DetailField label="Province" value={payment.supplier?.province ?? null} />
              <DetailField label="Phone" value={payment.supplier?.phone ?? null} />
              <DetailField label="Email" value={payment.supplier?.email ?? null} />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
            Payment Workflow
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {timeline.map((item) => (
              <div
                key={item.status}
                className={`rounded-md border p-4 ${
                  item.completed
                    ? "border-accent bg-accent-soft"
                    : "border-panel bg-panel"
                }`}
              >
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-secondary">
                  {item.current ? "Current status" : item.completed ? "Completed" : "Pending"}
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {item.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {canManage && (
        <section className="mt-6 rounded-md border border-panel bg-card p-6 shadow-panel print:hidden">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
            Status Actions
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {PAYMENT_STATUSES.map((status) => (
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
      )}
    </div>
  )
}

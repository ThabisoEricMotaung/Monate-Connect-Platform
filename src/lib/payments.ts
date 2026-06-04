import { logActivity } from "./activity"
import { logAuditAction } from "./audit"
import { notifyPaymentPaid } from "./automationRules"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "./auth"
import { createDecisionItem, isHighValue } from "./decisionBoard"
import { evaluateWorkflowRules } from "./workflowRules"
import { checkAndLogApprovalRequirement } from "./approvalMatrix"
import {
  getInvoiceById,
  parseCurrencyToNumber,
  type Invoice,
} from "./invoices"
import { type PurchaseOrderSupplier } from "./purchaseOrders"
import { supabase } from "./supabase"

export const PAYMENT_STATUSES = [
  "Pending",
  "Processing",
  "Paid",
  "Failed",
  "Cancelled",
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export type Payment = {
  id: number
  payment_number: string | null
  invoice_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | number | null
  payment_method: string | null
  reference_number: string | null
  payment_date: string | null
  status: string | null
  notes: string | null
  created_at: string | null
  invoice?: Invoice | null
  supplier?: PurchaseOrderSupplier | null
}

export type CreatePaymentInput = {
  invoiceId: number
  paymentMethod?: string | null
  referenceNumber?: string | null
  notes?: string | null
}

const PAYMENT_SELECT = `
  id,
  payment_number,
  invoice_id,
  supplier_id,
  supplier_name,
  amount,
  payment_method,
  reference_number,
  payment_date,
  status,
  notes,
  created_at
`

function describeSupabaseError(error: {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}) {
  return [
    error.message,
    error.code ? `Code: ${error.code}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ]
    .filter(Boolean)
    .join(" | ")
}

export function normalizePaymentStatus(status: string | null): PaymentStatus {
  return PAYMENT_STATUSES.includes(status as PaymentStatus)
    ? (status as PaymentStatus)
    : "Pending"
}

export function formatPaymentAmount(amount: string | number | null): string {
  const amountValue = parseCurrencyToNumber(amount)

  if (!amountValue) return amount ? String(amount) : "-"

  return `R${amountValue.toLocaleString("en-ZA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`
}

function getInvoicePaymentAmount(invoice: Invoice): number {
  return (
    parseCurrencyToNumber(invoice.total_amount ?? invoice.total) ||
    parseCurrencyToNumber(invoice.amount)
  )
}

async function enrichPayment(payment: Payment): Promise<Payment> {
  const invoice = payment.invoice_id
    ? await getInvoiceById(payment.invoice_id)
    : null

  return {
    ...payment,
    invoice,
    supplier: invoice?.supplier ?? null,
  }
}

export async function generatePaymentNumber(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const year = new Date().getFullYear()
  const prefix = `PAY-${year}-`
  const { data, error } = await supabase
    .from("payments")
    .select("payment_number")
    .like("payment_number", `${prefix}%`)
    .order("payment_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(describeSupabaseError(error))

  const lastNumber = data?.payment_number
    ? Number(String(data.payment_number).replace(prefix, ""))
    : 0
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<Payment> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()

  if (!hasAdminOrBuyerAccess(profile)) {
    throw new Error("Only procurement team members can generate payments.")
  }

  const invoice = await getInvoiceById(input.invoiceId)

  if (!invoice) {
    throw new Error("Invoice not found or access denied.")
  }

  if (invoice.status !== "Approved") {
    throw new Error("Payments can only be generated from approved invoices.")
  }

  if (!invoice.supplier_id) {
    throw new Error("Payment generation requires a supplier UUID on the invoice.")
  }

  const { data: existingPayment, error: existingError } = await supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("invoice_id", input.invoiceId)
    .maybeSingle()

  if (existingError) {
    console.error("Payment lookup failed:", existingError)
    throw new Error(describeSupabaseError(existingError))
  }

  if (existingPayment) {
    return enrichPayment(existingPayment as Payment)
  }

  // ── Workflow rule evaluation ────────────────────────────────────────────────
  // Fetch banking verification status for this supplier
  let bankingStatus = "Unknown"
  if (supabase && invoice.supplier_id) {
    try {
      const { data: bankData } = await supabase
        .from("supplier_bank_details")
        .select("verification_status")
        .eq("supplier_id", invoice.supplier_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (bankData) bankingStatus = String((bankData as { verification_status: string | null }).verification_status ?? "Unverified")
    } catch { /* ignore */ }
  }
  const ruleResult = await evaluateWorkflowRules("payment", {
    amount: getInvoicePaymentAmount(invoice),
    supplier_id: invoice.supplier_id,
    banking_status: bankingStatus,
  }, profile?.id)
  if (ruleResult.blocked && ruleResult.blockMessage) {
    throw new Error(`Workflow rule blocked this action: ${ruleResult.blockMessage}`)
  }

  const paymentNumber = await generatePaymentNumber()
  const insertPayload = {
    payment_number: paymentNumber,
    invoice_id: invoice.id,
    supplier_id: invoice.supplier_id,
    supplier_name: invoice.supplier_name,
    amount: getInvoicePaymentAmount(invoice),
    payment_method: input.paymentMethod ?? "EFT",
    reference_number: input.referenceNumber ?? null,
    payment_date: null,
    status: "Pending",
    notes: input.notes ?? invoice.notes ?? null,
  }

  console.log("Payment insert payload:", {
    table: "payments",
    payload: insertPayload,
  })

  const { data, error } = await supabase
    .from("payments")
    .insert([insertPayload])
    .select(PAYMENT_SELECT)
    .single()

  if (error) {
    console.error("Payment insert error:", {
      table: "payments",
      payload: insertPayload,
      error,
    })
    throw new Error(describeSupabaseError(error))
  }

  try {
    await logAuditAction({
      action: "payment.generated",
      entity_type: "payment",
      entity_id: data.id,
      old_values: null,
      new_values: data as Record<string, unknown>,
      metadata: {
        payment_number: data.payment_number,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        supplier_id: invoice.supplier_id,
      },
    })
    await logActivity({
      action: "payment.created",
      entity_type: "payment",
      entity_id: data.id,
      metadata: {
        payment_number: data.payment_number,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        supplier_name: invoice.supplier_name,
        status: "Pending",
      },
    })
  } catch (activityError) {
    console.warn("Payment audit/activity logging failed:", activityError)
  }

  // Log to decision board for all payments (never blocks main action)
  createDecisionItem({
    item_type: "payment",
    entity_id: String(data.id),
    title: `Payment Raised: ${data.payment_number ?? `PAY-${data.id}`} — ${data.supplier_name ?? "Unknown Supplier"}`,
    description: `Payment amount: ${data.amount ?? "Not specified"}. Invoice: ${data.invoice_id ? `INV-${data.invoice_id}` : "N/A"}.`,
    requested_by: data.supplier_id ?? undefined,
    priority: isHighValue(data.amount) ? "High" : "Normal",
  }).catch(() => { /* never block */ })

  // Approval matrix check — fire-and-forget
  checkAndLogApprovalRequirement(
    "payment",
    String(data.id),
    data.payment_number ?? `PAY-${data.id}`,
    data.amount,
    null,
    data.supplier_id
  )

  return enrichPayment(data as Payment)
}

export async function getPayments(): Promise<Payment[]> {
  if (!supabase) return []

  const profile = await getCurrentProfile()
  let query = supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .order("created_at", { ascending: false })

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return []
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query

  if (error) throw new Error(describeSupabaseError(error))

  return Promise.all(((data ?? []) as Payment[]).map(enrichPayment))
}

export async function getPaymentById(paymentId: number): Promise<Payment | null> {
  if (!supabase) return null

  const profile = await getCurrentProfile()
  let query = supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("id", paymentId)

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return null
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw new Error(describeSupabaseError(error))
  if (!data) return null

  return enrichPayment(data as Payment)
}

export async function updatePaymentStatus(
  paymentId: number,
  status: PaymentStatus
): Promise<Payment> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()
  const currentPayment = await getPaymentById(paymentId)

  if (!hasAdminOrBuyerAccess(profile) || !currentPayment) {
    throw new Error("Payment not found or access denied.")
  }

  const currentStatus = normalizePaymentStatus(currentPayment.status)
  const updatePayload = {
    status,
    payment_date: status === "Paid" ? new Date().toISOString() : currentPayment.payment_date,
  }

  const { data, error } = await supabase
    .from("payments")
    .update(updatePayload)
    .eq("id", paymentId)
    .select(PAYMENT_SELECT)
    .single()

  if (error) throw new Error(describeSupabaseError(error))

  if (status === "Paid" && currentPayment.invoice_id) {
    const { error: invoiceError } = await supabase
      .from("invoices")
      .update({ status: "Paid" })
      .eq("id", currentPayment.invoice_id)

    if (invoiceError) {
      console.error("Invoice paid status update failed:", invoiceError)
      throw new Error(describeSupabaseError(invoiceError))
    }
  }

  try {
    await logAuditAction({
      action: "payment.status_updated",
      entity_type: "payment",
      entity_id: paymentId,
      old_values: {
        status: currentStatus,
        payment_date: currentPayment.payment_date,
      },
      new_values: updatePayload,
      metadata: {
        payment_number: currentPayment.payment_number,
        invoice_id: currentPayment.invoice_id,
        invoice_marked_paid: status === "Paid",
      },
    })
    await logActivity({
      action: "payment.status_updated",
      entity_type: "payment",
      entity_id: paymentId,
      metadata: {
        previous_status: currentStatus,
        new_status: status,
        payment_number: currentPayment.payment_number,
        invoice_id: currentPayment.invoice_id,
      },
    })
  } catch (activityError) {
    console.warn("Payment status audit/activity logging failed:", activityError)
  }

  const updatedPayment = await enrichPayment(data as Payment)

  if (status === "Paid") {
    await notifyPaymentPaid(updatedPayment)
  }

  return updatedPayment
}

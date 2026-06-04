import { logActivity } from "./activity"
import { logAuditAction } from "./audit"
import { notifyPOIssued } from "./automationRules"
import { createDecisionItem, isHighValue } from "./decisionBoard"
import { evaluateWorkflowRules } from "./workflowRules"
import { checkAndLogApprovalRequirement } from "./approvalMatrix"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "./auth"
import { supabase } from "./supabase"

export const PURCHASE_ORDER_STATUSES = [
  "Issued",
  "Accepted",
  "In Progress",
  "Ready for Delivery",
  "Delivered",
  "Completed",
  "Cancelled",
] as const

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number]

export type PurchaseOrder = {
  id: number
  po_number: string | null
  rfq_id: number | null
  quote_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | null
  timeline: string | null
  title: string | null
  status: string | null
  generated_at: string | null
  notes?: string | null
  supplier?: PurchaseOrderSupplier | null
  rfq?: PurchaseOrderRFQReference | null
  quote?: PurchaseOrderQuoteReference | null
}

export type CreatePurchaseOrderInput = {
  rfqId: number
  quoteId: number
  supplierId: string | null
  supplierName: string | null
  amount: string | null
  timeline: string | null
  title: string
}

export type PurchaseOrderTimelineEvent = {
  id: number
  action: string
  created_at: string | null
  actor_email: string | null
  metadata: Record<string, unknown> | null
}

export type PurchaseOrderSupplier = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  email: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
}

export type PurchaseOrderRFQReference = {
  id: number
  title: string | null
  category: string | null
  province: string | null
  budget: string | null
  deadline: string | null
  status: string | null
}

export type PurchaseOrderQuoteReference = {
  id: number
  supplier_name: string | null
  amount: string | null
  timeline: string | null
  status: string | null
  scope: string | null
  supporting_notes: string | null
  created_at: string | null
}

const PURCHASE_ORDER_SELECT = `
  id,
  po_number,
  rfq_id,
  quote_id,
  supplier_id,
  supplier_name,
  amount,
  timeline,
  title,
  status,
  generated_at
`

export function normalizePurchaseOrderStatus(status: string | null): PurchaseOrderStatus {
  if (status === "Generated") return "Issued"

  return PURCHASE_ORDER_STATUSES.includes(status as PurchaseOrderStatus)
    ? (status as PurchaseOrderStatus)
    : "Issued"
}

export function getEstimatedDeliveryDate(
  generatedAt: string | null,
  timeline: string | null
): string | null {
  if (!generatedAt || !timeline) return null

  const days = Number(timeline.match(/\d+/)?.[0])
  const issueDate = new Date(generatedAt)

  if (!Number.isFinite(days) || Number.isNaN(issueDate.getTime())) return null

  issueDate.setDate(issueDate.getDate() + days)

  return issueDate.toISOString()
}

export async function generatePONumber(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("po_number")
    .like("po_number", `${prefix}%`)
    .order("po_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const lastNumber = data?.po_number
    ? Number(String(data.po_number).replace(prefix, ""))
    : 0
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<PurchaseOrder> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const { data: existingPurchaseOrder, error: existingError } = await supabase
    .from("purchase_orders")
    .select(PURCHASE_ORDER_SELECT)
    .eq("quote_id", input.quoteId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existingPurchaseOrder) return existingPurchaseOrder as PurchaseOrder

  // ── Workflow rule evaluation (may block creation) ───────────────────────────
  const ruleResult = await evaluateWorkflowRules("purchase_order", {
    amount: parseCurrencyToNum(input.amount),
    supplier_id: input.supplierId,
    supplier_name: input.supplierName,
    title: input.title,
  }, input.supplierId)
  if (ruleResult.blocked && ruleResult.blockMessage) {
    throw new Error(`Workflow rule blocked this action: ${ruleResult.blockMessage}`)
  }

  const poNumber = await generatePONumber()
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert([
      {
        po_number: poNumber,
        rfq_id: input.rfqId,
        quote_id: input.quoteId,
        supplier_id: input.supplierId,
        supplier_name: input.supplierName,
        amount: input.amount,
        timeline: input.timeline,
        title: input.title,
        status: "Issued",
        generated_at: new Date().toISOString(),
      },
    ])
    .select(PURCHASE_ORDER_SELECT)
    .single()

  if (error) throw error

  try {
    await logAuditAction({
      action: "purchase_order.generated",
      entity_type: "purchase_order",
      entity_id: data.id,
      old_values: null,
      new_values: data as Record<string, unknown>,
      metadata: {
        rfq_id: input.rfqId,
        quote_id: input.quoteId,
        supplier_id: input.supplierId,
      },
    })
    await logActivity({
      action: "purchase_order.created",
      entity_type: "purchase_order",
      entity_id: data.id,
      metadata: {
        po_number: data.po_number,
        rfq_id: input.rfqId,
        quote_id: input.quoteId,
        supplier_name: input.supplierName,
        status: "Issued",
      },
    })
  } catch (activityError) {
    console.warn("Purchase order audit/activity logging failed:", activityError)
  }

  await notifyPOIssued(data as PurchaseOrder)

  // Log to decision board for high-value POs (never blocks main action)
  if (isHighValue(input.amount)) {
    createDecisionItem({
      item_type: "purchase_order",
      entity_id: String(data.id),
      title: `High-Value PO: ${data.po_number ?? `PO-${data.id}`} — ${input.supplierName ?? "Unknown Supplier"}`,
      description: `Purchase order issued for R${parseCurrencyToNum(input.amount).toLocaleString("en-ZA")}. RFQ ID: ${input.rfqId}. Supplier: ${input.supplierName}.`,
      requested_by: input.supplierId,
      priority: "High",
    }).catch(() => { /* never block */ })
  }

  // Approval matrix check — fire-and-forget, never blocks
  checkAndLogApprovalRequirement(
    "purchase_order",
    String(data.id),
    data.po_number ?? `PO-${data.id}`,
    parseCurrencyToNum(input.amount),
    null,
    input.supplierId
  )

  return data as PurchaseOrder
}

function parseCurrencyToNum(value: string | null): number {
  if (!value) return 0
  const n = Number(value.replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  if (!supabase) return []

  const profile = await getCurrentProfile()
  let query = supabase
    .from("purchase_orders")
    .select(PURCHASE_ORDER_SELECT)
    .order("generated_at", { ascending: false })

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return []
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []) as PurchaseOrder[]
}

export async function getPurchaseOrderById(
  purchaseOrderId: number
): Promise<PurchaseOrder | null> {
  if (!supabase) return null

  const profile = await getCurrentProfile()
  let query = supabase
    .from("purchase_orders")
    .select(PURCHASE_ORDER_SELECT)
    .eq("id", purchaseOrderId)

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return null
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  if (!data) return null

  const purchaseOrder = data as PurchaseOrder

  const [supplierResult, rfqResult, quoteResult] = await Promise.all([
    purchaseOrder.supplier_id
      ? supabase
          .from("profiles")
          .select("id, business_name, province, industry, phone, email, verification_status, csd_number, bbbee_level")
          .eq("id", purchaseOrder.supplier_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    purchaseOrder.rfq_id
      ? supabase
          .from("rfqs")
          .select("id, title, category, province, budget, deadline, status")
          .eq("id", purchaseOrder.rfq_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    purchaseOrder.quote_id
      ? supabase
          .from("quotes")
          .select("id, supplier_name, amount, timeline, status, scope, supporting_notes, created_at")
          .eq("id", purchaseOrder.quote_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (supplierResult.error) throw supplierResult.error
  if (rfqResult.error) throw rfqResult.error
  if (quoteResult.error) throw quoteResult.error

  const quote = quoteResult.data as PurchaseOrderQuoteReference | null

  return {
    ...purchaseOrder,
    notes: quote?.supporting_notes ?? null,
    supplier: supplierResult.data as PurchaseOrderSupplier | null,
    rfq: rfqResult.data as PurchaseOrderRFQReference | null,
    quote,
  }
}

export async function getPurchaseOrderTimeline(
  purchaseOrderId: number
): Promise<PurchaseOrderTimelineEvent[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, created_at, actor_email, metadata")
    .eq("entity_type", "purchase_order")
    .eq("entity_id", String(purchaseOrderId))
    .order("created_at", { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return (data ?? []) as PurchaseOrderTimelineEvent[]
}

export async function updatePurchaseOrderStatus(
  purchaseOrderId: number,
  status: PurchaseOrderStatus
): Promise<PurchaseOrder> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()
  const currentPurchaseOrder = await getPurchaseOrderById(purchaseOrderId)

  if (!profile || !currentPurchaseOrder) {
    throw new Error("Purchase order not found or access denied.")
  }

  const currentStatus = normalizePurchaseOrderStatus(currentPurchaseOrder.status)
  const canManageLifecycle = hasAdminOrBuyerAccess(profile)
  const canSupplierAccept = currentStatus === "Issued" && status === "Accepted"

  if (!canManageLifecycle && !canSupplierAccept) {
    throw new Error("Suppliers can only accept newly issued purchase orders.")
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("id", purchaseOrderId)
    .select(PURCHASE_ORDER_SELECT)
    .single()

  if (error) throw error

  try {
    await logAuditAction({
      action: "purchase_order.status_updated",
      entity_type: "purchase_order",
      entity_id: purchaseOrderId,
      old_values: {
        status: currentStatus,
      },
      new_values: {
        status,
      },
      metadata: {
        po_number: currentPurchaseOrder.po_number,
        rfq_id: currentPurchaseOrder.rfq_id,
      },
    })
    await logActivity({
      action: "purchase_order.status_updated",
      entity_type: "purchase_order",
      entity_id: purchaseOrderId,
      metadata: {
        previous_status: currentStatus,
        new_status: status,
        po_number: currentPurchaseOrder.po_number,
        rfq_id: currentPurchaseOrder.rfq_id,
      },
    })
  } catch (activityError) {
    console.warn("Purchase order status audit/activity logging failed:", activityError)
  }

  return data as PurchaseOrder
}

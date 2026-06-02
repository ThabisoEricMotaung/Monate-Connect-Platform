import { logActivity } from "./activity"
import { getCurrentProfile } from "./auth"
import { createNotification } from "./notifications"
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

async function getNextPONumber(): Promise<string> {
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

  const poNumber = await getNextPONumber()
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
    console.error(activityError)
  }

  if (input.supplierId) {
    await createNotification({
      recipientId: input.supplierId,
      type: "Purchase Order Issued",
      title: "Purchase order issued",
      message: `${data.po_number} has been issued for ${input.title}.`,
      link: `/dashboard/purchase-orders/${data.id}`,
      metadata: {
        purchase_order_id: data.id,
        po_number: data.po_number,
        quote_id: input.quoteId,
        rfq_id: input.rfqId,
      },
    })
  }

  return data as PurchaseOrder
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  if (!supabase) return []

  const profile = await getCurrentProfile()
  let query = supabase
    .from("purchase_orders")
    .select(PURCHASE_ORDER_SELECT)
    .order("generated_at", { ascending: false })

  if (profile?.role !== "admin" && profile?.role !== "buyer") {
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

  if (profile?.role !== "admin" && profile?.role !== "buyer") {
    if (!profile) return null
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  if (!data) return null

  let notes: string | null = null

  if (data.quote_id) {
    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .select("supporting_notes")
      .eq("id", data.quote_id)
      .maybeSingle()

    if (quoteError) throw quoteError

    notes = quoteData?.supporting_notes ?? null
  }

  return { ...(data as PurchaseOrder), notes }
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
  const canManageLifecycle = profile.role === "admin" || profile.role === "buyer"
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
    console.error(activityError)
  }

  return data as PurchaseOrder
}

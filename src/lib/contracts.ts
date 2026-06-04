import { logActivity } from "./activity"
import { logAuditAction } from "./audit"
import { notifyContractExpiring } from "./automationRules"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "./auth"
import { createDecisionItem, isHighValue } from "./decisionBoard"
import { evaluateWorkflowRules } from "./workflowRules"
import { checkAndLogApprovalRequirement } from "./approvalMatrix"
import { createNotification } from "./notifications"
import {
  getEstimatedDeliveryDate,
  getPurchaseOrderById,
  normalizePurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderRFQReference,
  type PurchaseOrderSupplier,
} from "./purchaseOrders"
import { supabase } from "./supabase"

export const CONTRACT_STATUSES = [
  "Draft",
  "Active",
  "Expiring Soon",
  "Renewed",
  "Completed",
  "Terminated",
] as const

export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const CONTRACT_RENEWAL_STATUSES = [
  "Expired",
  "Expiring Soon",
  "Renewal Due",
  "Active",
] as const

export type ContractRenewalStatus = (typeof CONTRACT_RENEWAL_STATUSES)[number]

export type Contract = {
  id: number
  contract_number: string | null
  supplier_id: string | null
  supplier_name: string | null
  rfq_id: number | null
  purchase_order_id: number | null
  contract_value: string | null
  start_date: string | null
  end_date: string | null
  renewal_date: string | null
  status: string | null
  notes: string | null
  document_url: string | null
  created_at: string | null
  supplier?: PurchaseOrderSupplier | null
  rfq?: PurchaseOrderRFQReference | null
  purchaseOrder?: PurchaseOrder | null
}

export type CreateContractInput = {
  purchaseOrderId: number
  notes?: string | null
  documentUrl?: string | null
}

export type RenewContractInput = {
  contractId: number
  endDate: string
  renewalDate: string
  notes?: string | null
}

export type TerminateContractInput = {
  contractId: number
  notes: string
}

const CONTRACT_SELECT = `
  id,
  contract_number,
  supplier_id,
  supplier_name,
  rfq_id,
  purchase_order_id,
  contract_value,
  start_date,
  end_date,
  renewal_date,
  status,
  notes,
  document_url,
  created_at
`

const CONTRACT_ELIGIBLE_PO_STATUSES = [
  "Issued",
  "Accepted",
  "In Progress",
  "Delivered",
  "Completed",
]

function addDays(dateStr: string | null, days: number): string | null {
  if (!dateStr) return null

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null

  date.setDate(date.getDate() + days)

  return date.toISOString()
}

export function normalizeContractStatus(
  status: string | null,
  endDate?: string | null
): ContractStatus {
  const storedStatus = CONTRACT_STATUSES.includes(status as ContractStatus)
    ? (status as ContractStatus)
    : "Draft"

  if (
    storedStatus === "Active" &&
    endDate &&
    isContractExpiringSoon(endDate)
  ) {
    return "Expiring Soon"
  }

  return storedStatus
}

export function isContractExpiringSoon(endDate: string | null): boolean {
  if (!endDate) return false

  const expiryDate = new Date(endDate)
  if (Number.isNaN(expiryDate.getTime())) return false

  const now = new Date()
  const daysRemaining =
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  return daysRemaining >= 0 && daysRemaining <= 30
}

function isDatePast(dateStr: string | null): boolean {
  if (!dateStr) return false

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return date < today
}

function isDateWithinDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false

  const diffDays = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)

  return diffDays >= 0 && diffDays <= days
}

export function getContractRenewalStatus(
  endDate: string | null,
  renewalDate: string | null
): ContractRenewalStatus {
  if (isDatePast(endDate)) return "Expired"
  if (isDateWithinDays(endDate, 30)) return "Expiring Soon"
  if (isDateWithinDays(renewalDate, 30)) return "Renewal Due"

  return "Active"
}

function appendContractNote(
  currentNotes: string | null,
  label: string,
  note: string | null
): string | null {
  const cleanNote = note?.trim()
  if (!cleanNote) return currentNotes

  const timestamp = new Date().toISOString()
  const entry = `[${timestamp}] ${label}: ${cleanNote}`

  return currentNotes ? `${currentNotes}\n\n${entry}` : entry
}

export async function generateContractNumber(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const year = new Date().getFullYear()
  const prefix = `CNT-${year}-`
  const { data, error } = await supabase
    .from("contracts")
    .select("contract_number")
    .like("contract_number", `${prefix}%`)
    .order("contract_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const lastNumber = data?.contract_number
    ? Number(String(data.contract_number).replace(prefix, ""))
    : 0
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}

export async function createContract(
  input: CreateContractInput
): Promise<Contract> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()

  if (!hasAdminOrBuyerAccess(profile)) {
    throw new Error("Only procurement team members can create contracts.")
  }

  const purchaseOrder = await getPurchaseOrderById(input.purchaseOrderId)

  if (!purchaseOrder) {
    throw new Error("Purchase order not found or access denied.")
  }

  const poStatus = normalizePurchaseOrderStatus(purchaseOrder.status)

  if (!CONTRACT_ELIGIBLE_PO_STATUSES.includes(poStatus)) {
    throw new Error("Contracts can only be created from issued, accepted, or fulfilled purchase orders.")
  }

  const { data: existingContract, error: existingError } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("purchase_order_id", input.purchaseOrderId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existingContract) return existingContract as Contract

  // ── Workflow rule evaluation ────────────────────────────────────────────────
  const contractValue = purchaseOrder.amount
  const daysToExpiry = (() => {
    const end = getEstimatedDeliveryDate(purchaseOrder.generated_at, purchaseOrder.timeline)
    if (!end) return 365
    return Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  })()
  const ruleResult = await evaluateWorkflowRules("contract", {
    contract_value: contractValue ? Number(contractValue.replace(/[^\d.]/g, "")) : 0,
    days_to_expiry: daysToExpiry,
    supplier_id: purchaseOrder.supplier_id,
    status: "Draft",
  }, profile?.id)
  if (ruleResult.blocked && ruleResult.blockMessage) {
    throw new Error(`Workflow rule blocked this action: ${ruleResult.blockMessage}`)
  }

  const contractNumber = await generateContractNumber()
  const startDate =
    purchaseOrder.generated_at ?? purchaseOrder.quote?.created_at ?? new Date().toISOString()
  const endDate =
    getEstimatedDeliveryDate(purchaseOrder.generated_at, purchaseOrder.timeline) ??
    addDays(startDate, 365)
  const renewalDate = addDays(endDate, -30)

  const { data, error } = await supabase
    .from("contracts")
    .insert([
      {
        contract_number: contractNumber,
        supplier_id: purchaseOrder.supplier_id,
        supplier_name: purchaseOrder.supplier_name,
        rfq_id: purchaseOrder.rfq_id,
        purchase_order_id: purchaseOrder.id,
        contract_value: purchaseOrder.amount,
        start_date: startDate,
        end_date: endDate,
        renewal_date: renewalDate,
        status: "Draft",
        notes: input.notes ?? purchaseOrder.notes ?? null,
        document_url: input.documentUrl ?? null,
      },
    ])
    .select(CONTRACT_SELECT)
    .single()

  if (error) throw error

  try {
    await logAuditAction({
      action: "contract.created",
      entity_type: "contract",
      entity_id: data.id,
      old_values: null,
      new_values: data as Record<string, unknown>,
      metadata: {
        purchase_order_id: purchaseOrder.id,
        rfq_id: purchaseOrder.rfq_id,
        supplier_id: purchaseOrder.supplier_id,
      },
    })
    await logActivity({
      action: "contract.created",
      entity_type: "contract",
      entity_id: data.id,
      metadata: {
        contract_number: data.contract_number,
        purchase_order_id: purchaseOrder.id,
        rfq_id: purchaseOrder.rfq_id,
        supplier_name: purchaseOrder.supplier_name,
        status: "Draft",
      },
    })
  } catch (activityError) {
    console.warn("Contract audit/activity logging failed:", activityError)
  }

  if (purchaseOrder.supplier_id) {
    await createNotification({
      recipientId: purchaseOrder.supplier_id,
      type: "Purchase Order Issued",
      title: "Contract created",
      message: `${data.contract_number} has been created for ${purchaseOrder.title || "your purchase order"}.`,
      link: `/dashboard/contracts/${data.id}`,
      metadata: {
        contract_id: data.id,
        contract_number: data.contract_number,
        purchase_order_id: purchaseOrder.id,
        rfq_id: purchaseOrder.rfq_id,
      },
    })
  }

  // Log to decision board for contract approval (never blocks main action)
  createDecisionItem({
    item_type: "contract",
    entity_id: String(data.id),
    title: `Contract Created: ${data.contract_number ?? `CNT-${data.id}`} — ${data.supplier_name ?? "Unknown Supplier"}`,
    description: `Contract value: ${data.contract_value ?? "Not specified"}. PO: ${data.purchase_order_id ? `PO-${data.purchase_order_id}` : "N/A"}.`,
    requested_by: data.supplier_id ?? undefined,
    priority: isHighValue(data.contract_value) ? "High" : "Normal",
  }).catch(() => { /* never block */ })

  // Approval matrix check — fire-and-forget
  checkAndLogApprovalRequirement(
    "contract",
    String(data.id),
    data.contract_number ?? `CNT-${data.id}`,
    data.contract_value,
    null,
    data.supplier_id
  )

  return data as Contract
}

export async function getContracts(): Promise<Contract[]> {
  if (!supabase) return []

  const profile = await getCurrentProfile()
  let query = supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .order("created_at", { ascending: false })

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return []
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []) as Contract[]
}

export async function getContractById(
  contractId: number
): Promise<Contract | null> {
  if (!supabase) return null

  const profile = await getCurrentProfile()
  let query = supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("id", contractId)

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return null
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error
  if (!data) return null

  const contract = data as Contract

  const [supplierResult, rfqResult, purchaseOrder] = await Promise.all([
    contract.supplier_id
      ? supabase
          .from("profiles")
          .select("id, business_name, province, industry, phone, email, verification_status, csd_number, bbbee_level")
          .eq("id", contract.supplier_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    contract.rfq_id
      ? supabase
          .from("rfqs")
          .select("id, title, category, province, budget, deadline, status")
          .eq("id", contract.rfq_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    contract.purchase_order_id
      ? getPurchaseOrderById(contract.purchase_order_id)
      : Promise.resolve(null),
  ])

  if (supplierResult.error) throw supplierResult.error
  if (rfqResult.error) throw rfqResult.error

  return {
    ...contract,
    supplier: supplierResult.data as PurchaseOrderSupplier | null,
    rfq: rfqResult.data as PurchaseOrderRFQReference | null,
    purchaseOrder,
  }
}

export async function updateContractStatus(
  contractId: number,
  status: ContractStatus
): Promise<Contract> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()
  const currentContract = await getContractById(contractId)

  if (!hasAdminOrBuyerAccess(profile) || !currentContract) {
    throw new Error("Contract not found or access denied.")
  }

  const currentStatus = normalizeContractStatus(
    currentContract.status,
    currentContract.end_date
  )

  const { data, error } = await supabase
    .from("contracts")
    .update({ status })
    .eq("id", contractId)
    .select(CONTRACT_SELECT)
    .single()

  if (error) throw error

  try {
    await logAuditAction({
      action: "contract.status_updated",
      entity_type: "contract",
      entity_id: contractId,
      old_values: {
        status: currentStatus,
      },
      new_values: {
        status,
      },
      metadata: {
        contract_number: currentContract.contract_number,
        purchase_order_id: currentContract.purchase_order_id,
      },
    })
    await logActivity({
      action: "contract.status_updated",
      entity_type: "contract",
      entity_id: contractId,
      metadata: {
        previous_status: currentStatus,
        new_status: status,
        contract_number: currentContract.contract_number,
        purchase_order_id: currentContract.purchase_order_id,
      },
    })
  } catch (activityError) {
    console.warn("Contract status audit/activity logging failed:", activityError)
  }

  if (status === "Expiring Soon" || normalizeContractStatus(status, data.end_date) === "Expiring Soon") {
    await notifyContractExpiring(data as Contract)
  }

  return data as Contract
}

export async function renewContract({
  contractId,
  endDate,
  renewalDate,
  notes = null,
}: RenewContractInput): Promise<Contract> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()
  const currentContract = await getContractById(contractId)

  if (!hasAdminOrBuyerAccess(profile) || !currentContract) {
    throw new Error("Contract not found or access denied.")
  }

  if (!endDate || !renewalDate) {
    throw new Error("New end date and renewal date are required.")
  }

  const updatePayload = {
    end_date: new Date(endDate).toISOString(),
    renewal_date: new Date(renewalDate).toISOString(),
    status: "Renewed" as ContractStatus,
    notes: appendContractNote(currentContract.notes, "Renewal notes", notes),
  }

  const { data, error } = await supabase
    .from("contracts")
    .update(updatePayload)
    .eq("id", contractId)
    .select(CONTRACT_SELECT)
    .single()

  if (error) throw error

  try {
    await logAuditAction({
      action: "contract.renewed",
      entity_type: "contract",
      entity_id: contractId,
      old_values: {
        status: currentContract.status,
        end_date: currentContract.end_date,
        renewal_date: currentContract.renewal_date,
      },
      new_values: updatePayload,
      metadata: {
        contract_number: currentContract.contract_number,
        purchase_order_id: currentContract.purchase_order_id,
      },
    })
    await logActivity({
      action: "contract.renewed",
      entity_type: "contract",
      entity_id: contractId,
      metadata: {
        contract_number: currentContract.contract_number,
        previous_end_date: currentContract.end_date,
        new_end_date: updatePayload.end_date,
        new_renewal_date: updatePayload.renewal_date,
      },
    })
  } catch (activityError) {
    console.warn("Contract renewal audit/activity logging failed:", activityError)
  }

  return data as Contract
}

export async function terminateContract({
  contractId,
  notes,
}: TerminateContractInput): Promise<Contract> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()
  const currentContract = await getContractById(contractId)

  if (!hasAdminOrBuyerAccess(profile) || !currentContract) {
    throw new Error("Contract not found or access denied.")
  }

  if (!notes.trim()) {
    throw new Error("Termination notes are required.")
  }

  const updatePayload = {
    status: "Terminated" as ContractStatus,
    notes: appendContractNote(currentContract.notes, "Termination notes", notes),
  }

  const { data, error } = await supabase
    .from("contracts")
    .update(updatePayload)
    .eq("id", contractId)
    .select(CONTRACT_SELECT)
    .single()

  if (error) throw error

  try {
    await logAuditAction({
      action: "contract.terminated",
      entity_type: "contract",
      entity_id: contractId,
      old_values: {
        status: currentContract.status,
      },
      new_values: updatePayload,
      metadata: {
        contract_number: currentContract.contract_number,
        purchase_order_id: currentContract.purchase_order_id,
      },
    })
    await logActivity({
      action: "contract.terminated",
      entity_type: "contract",
      entity_id: contractId,
      metadata: {
        contract_number: currentContract.contract_number,
        previous_status: currentContract.status,
      },
    })
  } catch (activityError) {
    console.warn("Contract termination audit/activity logging failed:", activityError)
  }

  return data as Contract
}

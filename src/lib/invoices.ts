import { logActivity } from "./activity"
import { logAuditAction } from "./audit"
import { notifyInvoiceApproved } from "./automationRules"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "./auth"
import { getContractById, type Contract } from "./contracts"
import { type PurchaseOrder, type PurchaseOrderSupplier } from "./purchaseOrders"
import { supabase } from "./supabase"

export const INVOICE_STATUSES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "Paid",
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type Invoice = {
  id: number
  invoice_number: string | null
  supplier_id: string | null
  supplier_name: string | null
  contract_id: number | null
  purchase_order_id: number | null
  rfq_id: number | null
  amount: string | number | null
  vat_amount?: string | number | null
  total_amount?: string | number | null
  vat: string | null
  total: string | null
  due_date: string | null
  status: string | null
  notes: string | null
  created_at: string | null
  contract?: Contract | null
  purchaseOrder?: PurchaseOrder | null
  supplier?: PurchaseOrderSupplier | null
}

export type CreateInvoiceInput = {
  contractId?: number | null
  purchaseOrderId?: number | null
  notes?: string | null
}

const INVOICE_SELECT = `
  id,
  invoice_number,
  supplier_id,
  supplier_name,
  contract_id,
  purchase_order_id,
  amount,
  vat_amount,
  total_amount,
  due_date,
  status,
  notes,
  created_at
`

function normalizeInvoiceStatus(status: string | null): InvoiceStatus {
  return INVOICE_STATUSES.includes(status as InvoiceStatus)
    ? (status as InvoiceStatus)
    : "Draft"
}

function addDays(dateStr: string | null, days: number): string | null {
  const date = dateStr ? new Date(dateStr) : new Date()
  if (Number.isNaN(date.getTime())) return null

  date.setDate(date.getDate() + days)

  return date.toISOString()
}

export function parseCurrencyToNumber(
  value: string | number | null | undefined
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (!value) return 0

  let normalizedValue = value
    .replace(/[Rr]/g, "")
    .replace(/\s/g, "")
    .trim()

  const hasComma = normalizedValue.includes(",")
  const hasDot = normalizedValue.includes(".")

  if (hasComma && hasDot) {
    normalizedValue = normalizedValue.replace(/,/g, "")
  } else if (hasComma) {
    const commaParts = normalizedValue.split(",")
    const lastPart = commaParts[commaParts.length - 1]
    const commaLooksDecimal =
      commaParts.length === 2 && lastPart.length > 0 && lastPart.length <= 2

    normalizedValue = commaLooksDecimal
      ? `${commaParts[0].replace(/,/g, "")}.${lastPart}`
      : normalizedValue.replace(/,/g, "")
  }

  normalizedValue = normalizedValue.replace(/[^\d.]/g, "")

  const numericValue = Number(normalizedValue)

  return Number.isFinite(numericValue) ? numericValue : 0
}

function formatCurrency(value: number): string {
  return `R${value.toLocaleString("en-ZA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`
}

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

function enrichInvoice(
  invoice: Invoice,
  contract: Contract | null = null
): Invoice {
  const amountValue = parseCurrencyToNumber(invoice.amount)
  const vatValue = parseCurrencyToNumber(invoice.vat_amount ?? invoice.vat)
  const totalValue = parseCurrencyToNumber(invoice.total_amount ?? invoice.total)
  const vat = formatCurrency(vatValue)
  const total = formatCurrency(totalValue || amountValue + vatValue)

  return {
    ...invoice,
    amount: formatCurrency(amountValue),
    rfq_id:
      invoice.rfq_id ??
      contract?.rfq_id ??
      contract?.purchaseOrder?.rfq_id ??
      null,
    vat,
    total,
    contract: contract ?? invoice.contract ?? null,
    purchaseOrder:
      invoice.purchaseOrder ?? contract?.purchaseOrder ?? null,
    supplier: invoice.supplier ?? contract?.supplier ?? null,
  }
}

async function getContractForInvoice(
  input: CreateInvoiceInput
): Promise<Contract> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  if (input.contractId) {
    const contract = await getContractById(input.contractId)

    if (!contract) {
      throw new Error("Contract not found or access denied.")
    }

    return contract
  }

  if (!input.purchaseOrderId) {
    throw new Error("A contract or purchase order reference is required.")
  }

  const { data, error } = await supabase
    .from("contracts")
    .select("id")
    .eq("purchase_order_id", input.purchaseOrderId)
    .maybeSingle()

  if (error) throw error

  if (!data?.id) {
    throw new Error("Create a contract for this purchase order before generating an invoice.")
  }

  const contract = await getContractById(data.id as number)

  if (!contract) {
    throw new Error("Contract not found or access denied.")
  }

  return contract
}

export async function generateInvoiceNumber(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const lastNumber = data?.invoice_number
    ? Number(String(data.invoice_number).replace(prefix, ""))
    : 0
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

  return `${prefix}${String(nextNumber).padStart(4, "0")}`
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<Invoice> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const contract = await getContractForInvoice(input)

  if (!contract.id) {
    throw new Error("A contract is required before generating an invoice.")
  }

  const profile = await getCurrentProfile()
  const supplierId =
    contract.supplier_id ?? contract.purchaseOrder?.supplier_id ?? null
  const supplierName =
    contract.supplier_name ?? contract.purchaseOrder?.supplier_name ?? null
  const canCreateForContract =
    hasAdminOrBuyerAccess(profile) ||
    Boolean(profile?.id && profile.id === supplierId)

  if (!canCreateForContract) {
    throw new Error("Invoice creation is restricted to the supplier or procurement team.")
  }

  if (!supplierId) {
    throw new Error(
      "Invoice generation requires a supplier UUID on the contract or linked purchase order."
    )
  }

  const { data: existingInvoice, error: existingError } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("contract_id", contract.id)
    .maybeSingle()

  if (existingError) {
    console.error("Invoice lookup failed:", existingError)
    throw new Error(describeSupabaseError(existingError))
  }

  if (existingInvoice) {
    return enrichInvoice(existingInvoice as Invoice, contract)
  }

  const invoiceNumber = await generateInvoiceNumber()
  const amountValue = parseCurrencyToNumber(contract.contract_value)
  const vatAmount = 0
  const totalAmount = amountValue + vatAmount
  const insertPayload = {
    invoice_number: invoiceNumber,
    supplier_id: supplierId,
    supplier_name: supplierName,
    contract_id: contract.id,
    purchase_order_id: contract.purchase_order_id,
    amount: amountValue,
    vat_amount: vatAmount,
    total_amount: totalAmount,
    due_date: addDays(new Date().toISOString(), 30),
    status: "Draft",
    notes: input.notes ?? contract.notes ?? null,
  }

  console.log("Invoice insert payload:", {
    table: "invoices",
    payload: insertPayload,
  })

  const { data, error } = await supabase
    .from("invoices")
    .insert([insertPayload])
    .select(INVOICE_SELECT)
    .single()

  if (error) {
    console.error("Invoice insert error:", {
      table: "invoices",
      payload: insertPayload,
      error,
    })
    throw new Error(describeSupabaseError(error))
  }

  const invoice = enrichInvoice(data as Invoice, contract)

  try {
    await logAuditAction({
      action: "invoice.generated",
      entity_type: "invoice",
      entity_id: invoice.id,
      old_values: null,
      new_values: data as Record<string, unknown>,
      metadata: {
        invoice_number: invoice.invoice_number,
        contract_id: contract.id,
        purchase_order_id: contract.purchase_order_id,
        supplier_id: supplierId,
      },
    })
    await logActivity({
      action: "invoice.created",
      entity_type: "invoice",
      entity_id: invoice.id,
      metadata: {
        invoice_number: invoice.invoice_number,
        contract_id: contract.id,
        purchase_order_id: contract.purchase_order_id,
        supplier_name: contract.supplier_name,
        status: "Draft",
      },
    })
  } catch (activityError) {
    console.warn("Invoice audit/activity logging failed:", activityError)
  }

  return invoice
}

export async function getInvoices(): Promise<Invoice[]> {
  if (!supabase) return []

  const profile = await getCurrentProfile()
  let query = supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .order("created_at", { ascending: false })

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return []
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query

  if (error) throw error

  return ((data ?? []) as Invoice[]).map((invoice) => enrichInvoice(invoice))
}

export async function getInvoiceById(invoiceId: number): Promise<Invoice | null> {
  if (!supabase) return null

  const profile = await getCurrentProfile()
  let query = supabase.from("invoices").select(INVOICE_SELECT).eq("id", invoiceId)

  if (!hasAdminOrBuyerAccess(profile)) {
    if (!profile) return null
    query = query.eq("supplier_id", profile.id)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error
  if (!data) return null

  const invoice = data as Invoice
  const contract = invoice.contract_id
    ? await getContractById(invoice.contract_id)
    : null

  return enrichInvoice(invoice, contract)
}

export async function updateInvoiceStatus(
  invoiceId: number,
  status: InvoiceStatus
): Promise<Invoice> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  const profile = await getCurrentProfile()
  const currentInvoice = await getInvoiceById(invoiceId)

  if (!currentInvoice) {
    throw new Error("Invoice not found or access denied.")
  }

  const currentStatus = normalizeInvoiceStatus(currentInvoice.status)
  const canProcurementUpdate = hasAdminOrBuyerAccess(profile)
  const canSupplierSubmit =
    profile?.id === currentInvoice.supplier_id &&
    currentStatus === "Draft" &&
    status === "Submitted"

  if (!canProcurementUpdate && !canSupplierSubmit) {
    throw new Error("Invoice status update is not permitted.")
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .select(INVOICE_SELECT)
    .single()

  if (error) throw error

  try {
    await logAuditAction({
      action:
        status === "Approved"
          ? "invoice.approved"
          : status === "Rejected"
            ? "invoice.rejected"
            : "invoice.status_updated",
      entity_type: "invoice",
      entity_id: invoiceId,
      old_values: {
        status: currentStatus,
      },
      new_values: {
        status,
      },
      metadata: {
        invoice_number: currentInvoice.invoice_number,
        contract_id: currentInvoice.contract_id,
        supplier_id: currentInvoice.supplier_id,
      },
    })
    await logActivity({
      action: "invoice.status_updated",
      entity_type: "invoice",
      entity_id: invoiceId,
      metadata: {
        previous_status: currentStatus,
        new_status: status,
        invoice_number: currentInvoice.invoice_number,
        contract_id: currentInvoice.contract_id,
      },
    })
  } catch (activityError) {
    console.warn("Invoice status audit/activity logging failed:", activityError)
  }

  const updatedInvoice = enrichInvoice(data as Invoice, currentInvoice.contract ?? null)

  if (status === "Approved") {
    await notifyInvoiceApproved(updatedInvoice)
  }

  return updatedInvoice
}

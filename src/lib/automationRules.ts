import { createNotification, createNotificationsForRoles } from "./notifications"
import { createRFQWhatsAppMessage, createWhatsAppLink, type WhatsAppAlertType } from "./whatsapp"
import { supabase } from "./supabase"

type RFQAutomation = {
  id?: number | string | null
  title?: string | null
  description?: string | null
  category?: string | null
  province?: string | null
  region?: string | null
  deadline?: string | null
  budget?: string | null
  status?: string | null
}

type SupplierAutomation = {
  id?: string | null
  business_name?: string | null
  email?: string | null
  phone?: string | null
  province?: string | null
  industry?: string | null
  verification_status?: string | null
  role?: string | null
  tax_expiry_date?: string | null
  bbbee_expiry_date?: string | null
  csd_expiry_date?: string | null
  cidb_expiry_date?: string | null
}

type QuoteAutomation = {
  id?: number | string | null
  rfq_id?: number | string | null
  supplier_id?: string | null
  supplier_name?: string | null
  amount?: string | number | null
  status?: string | null
  rfq_title?: string | null
}

type POAutomation = {
  id?: number | string | null
  po_number?: string | null
  rfq_id?: number | string | null
  quote_id?: number | string | null
  supplier_id?: string | null
  supplier_name?: string | null
  amount?: string | number | null
  title?: string | null
  status?: string | null
}

type ContractAutomation = {
  id?: number | string | null
  contract_number?: string | null
  supplier_id?: string | null
  supplier_name?: string | null
  rfq_id?: number | string | null
  purchase_order_id?: number | string | null
  contract_value?: string | number | null
  end_date?: string | null
  renewal_date?: string | null
  status?: string | null
}

type InvoiceAutomation = {
  id?: number | string | null
  invoice_number?: string | null
  supplier_id?: string | null
  supplier_name?: string | null
  contract_id?: number | string | null
  purchase_order_id?: number | string | null
  amount?: string | number | null
  total_amount?: string | number | null
  due_date?: string | null
  status?: string | null
}

type PaymentAutomation = {
  id?: number | string | null
  payment_number?: string | null
  invoice_id?: number | string | null
  supplier_id?: string | null
  supplier_name?: string | null
  amount?: string | number | null
  payment_date?: string | null
  status?: string | null
}

export type AutomationRunResult = {
  processed: number
  errors: string[]
}

const SUPPLIER_SELECT =
  "id, business_name, email, phone, province, industry, verification_status, role, tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date"

function warnAutomationFailure(action: string, error: unknown) {
  console.warn(`Automation rule failed: ${action}`, error)
}

function toNumberId(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "the published date"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function isWithinDays(dateStr: string | null | undefined, days: number): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false

  const diffDays = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= days
}

function getSupplierName(supplier: SupplierAutomation | null | undefined): string {
  return supplier?.business_name || supplier?.email || "Supplier"
}

function getRFQTitle(rfq: RFQAutomation | null | undefined): string {
  return rfq?.title || `RFQ-${rfq?.id ?? ""}`.trim() || "a procurement opportunity"
}

async function getSupplierById(supplierId: string | null | undefined): Promise<SupplierAutomation | null> {
  if (!supabase || !supplierId) return null

  const { data, error } = await supabase
    .from("profiles")
    .select(SUPPLIER_SELECT)
    .eq("id", supplierId)
    .maybeSingle()

  if (error) {
    warnAutomationFailure("supplier.lookup", error)
    return null
  }

  return (data ?? null) as SupplierAutomation | null
}

async function getMatchingSuppliers(rfq: RFQAutomation): Promise<SupplierAutomation[]> {
  if (!supabase) return []

  let query = supabase
    .from("profiles")
    .select(SUPPLIER_SELECT)
    .eq("role", "supplier")

  const province = rfq.province ?? rfq.region ?? null
  if (province) query = query.eq("province", province)
  if (rfq.category) query = query.ilike("industry", `%${rfq.category}%`)

  const { data, error } = await query.limit(100)

  if (error) {
    warnAutomationFailure("supplier.matching", error)
    return []
  }

  return (data ?? []) as SupplierAutomation[]
}

async function createWhatsAppDraft({
  supplier,
  alertType,
  message,
  rfqId = null,
  metadata = {},
}: {
  supplier: SupplierAutomation | null | undefined
  alertType: WhatsAppAlertType | string
  message: string
  rfqId?: number | string | null
  metadata?: Record<string, unknown>
}) {
  if (!supabase || !supplier?.id) return

  const waLink = createWhatsAppLink({ phone: supplier.phone, message })

  const { error } = await supabase.from("whatsapp_alerts").insert([
    {
      supplier_id: supplier.id,
      supplier_phone: supplier.phone ?? null,
      alert_type: alertType,
      message,
      rfq_id: toNumberId(rfqId),
      metadata: {
        ...metadata,
        wa_link: waLink,
        draft_status: "Draft",
        automation_generated: true,
        supplier_name: getSupplierName(supplier),
      },
    },
  ])

  if (error) throw error
}

async function createSupplierNotification({
  supplierId,
  type,
  title,
  message,
  link,
  metadata,
}: {
  supplierId: string | null | undefined
  type: Parameters<typeof createNotification>[0]["type"]
  title: string
  message: string
  link: string | null
  metadata: Record<string, unknown>
}) {
  if (!supplierId) return

  await createNotification({
    recipientId: supplierId,
    type,
    title,
    message,
    link,
    metadata: {
      ...metadata,
      automation_generated: true,
    },
  })
}

export async function notifyNewRFQ(rfq: RFQAutomation): Promise<void> {
  try {
    const suppliers = await getMatchingSuppliers(rfq)
    const title = getRFQTitle(rfq)

    await Promise.all(
      suppliers.map(async (supplier) => {
        const message = createRFQWhatsAppMessage(rfq, supplier, "New RFQ")
        await createSupplierNotification({
          supplierId: supplier.id,
          type: "RFQ Match",
          title: "New RFQ available",
          message: `${title} is available for review.`,
          link: rfq.id ? `/dashboard/rfqs/${rfq.id}` : "/dashboard/rfqs",
          metadata: { rfq_id: rfq.id ?? null, alert_type: "New RFQ" },
        })
        await createWhatsAppDraft({
          supplier,
          alertType: "New RFQ",
          message,
          rfqId: rfq.id ?? null,
          metadata: { rfq_title: title },
        })
      })
    )
  } catch (error) {
    warnAutomationFailure("notifyNewRFQ", error)
  }
}

export async function notifyRFQClosingSoon(rfq: RFQAutomation): Promise<void> {
  try {
    const suppliers = await getMatchingSuppliers(rfq)
    const title = getRFQTitle(rfq)

    await Promise.all(
      suppliers.map(async (supplier) => {
        const message = createRFQWhatsAppMessage(rfq, supplier, "Closing Soon")
        await createSupplierNotification({
          supplierId: supplier.id,
          type: "RFQ Deadline",
          title: "RFQ closing soon",
          message: `${title} closes on ${formatDate(rfq.deadline)}.`,
          link: rfq.id ? `/dashboard/rfqs/${rfq.id}` : "/dashboard/rfqs",
          metadata: { rfq_id: rfq.id ?? null, deadline: rfq.deadline ?? null },
        })
        await createWhatsAppDraft({
          supplier,
          alertType: "Closing Soon",
          message,
          rfqId: rfq.id ?? null,
          metadata: { rfq_title: title, deadline: rfq.deadline ?? null },
        })
      })
    )
  } catch (error) {
    warnAutomationFailure("notifyRFQClosingSoon", error)
  }
}

export async function notifyRecommendedSuppliers(rfq: RFQAutomation): Promise<void> {
  try {
    const suppliers = await getMatchingSuppliers(rfq)

    await createNotificationsForRoles(["admin", "buyer"], {
      type: "RFQ Match",
      title: "Recommended suppliers identified",
      message: `${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"} matched ${getRFQTitle(rfq)}.`,
      link: rfq.id ? `/dashboard/admin/rfqs/${rfq.id}/matching` : "/dashboard/admin/rfqs",
      metadata: {
        rfq_id: rfq.id ?? null,
        supplier_count: suppliers.length,
        automation_generated: true,
      },
    })
  } catch (error) {
    warnAutomationFailure("notifyRecommendedSuppliers", error)
  }
}

export async function notifyQuoteSubmitted(quote: QuoteAutomation): Promise<void> {
  try {
    await createNotificationsForRoles(["admin", "buyer"], {
      type: "Quote Submitted",
      title: "Quote submitted",
      message: `${quote.supplier_name || "A supplier"} submitted a quote${quote.rfq_id ? ` for RFQ-${quote.rfq_id}` : ""}.`,
      link: quote.rfq_id
        ? `/dashboard/admin/rfqs/${quote.rfq_id}/quotes`
        : "/dashboard/admin/quotes",
      metadata: {
        quote_id: quote.id ?? null,
        rfq_id: quote.rfq_id ?? null,
        supplier_id: quote.supplier_id ?? null,
        amount: quote.amount ?? null,
        automation_generated: true,
      },
    })
  } catch (error) {
    warnAutomationFailure("notifyQuoteSubmitted", error)
  }
}

export async function notifyQuoteAwarded(quote: QuoteAutomation): Promise<void> {
  try {
    const supplier = await getSupplierById(quote.supplier_id)
    const title = quote.rfq_title || `RFQ-${quote.rfq_id ?? ""}`.trim() || "your RFQ"
    const message = `Hi ${getSupplierName(supplier)}, AiForm Procure award notice: your quote for ${title} has been awarded. Please sign in to review next steps.`

    await createSupplierNotification({
      supplierId: quote.supplier_id,
      type: "Quote Awarded",
      title: "Your quote was awarded",
      message: `Your quote for ${title} has been awarded.`,
      link: quote.rfq_id ? `/dashboard/rfqs/${quote.rfq_id}` : "/dashboard/quotes",
      metadata: {
        quote_id: quote.id ?? null,
        rfq_id: quote.rfq_id ?? null,
      },
    })

    await createWhatsAppDraft({
      supplier,
      alertType: "Award Notice",
      message,
      rfqId: quote.rfq_id ?? null,
      metadata: { quote_id: quote.id ?? null, rfq_title: title },
    })
  } catch (error) {
    warnAutomationFailure("notifyQuoteAwarded", error)
  }
}

export async function notifyPOIssued(po: POAutomation): Promise<void> {
  try {
    const supplier = await getSupplierById(po.supplier_id)
    const poLabel = po.po_number || `PO-${po.id ?? ""}`.trim() || "a purchase order"
    const message = `Hi ${getSupplierName(supplier)}, ${poLabel} has been issued through AiForm Procure for ${po.title || "an awarded RFQ"}. Please sign in to review and accept the purchase order.`

    await createSupplierNotification({
      supplierId: po.supplier_id,
      type: "Purchase Order Issued",
      title: "Purchase order issued",
      message: `${poLabel} has been issued${po.title ? ` for ${po.title}` : ""}.`,
      link: po.id ? `/dashboard/purchase-orders/${po.id}` : "/dashboard/purchase-orders",
      metadata: {
        purchase_order_id: po.id ?? null,
        po_number: po.po_number ?? null,
        quote_id: po.quote_id ?? null,
        rfq_id: po.rfq_id ?? null,
      },
    })

    await createWhatsAppDraft({
      supplier,
      alertType: "PO Issued",
      message,
      rfqId: po.rfq_id ?? null,
      metadata: { purchase_order_id: po.id ?? null, po_number: po.po_number ?? null },
    })
  } catch (error) {
    warnAutomationFailure("notifyPOIssued", error)
  }
}

export async function notifyContractExpiring(contract: ContractAutomation): Promise<void> {
  try {
    const supplier = await getSupplierById(contract.supplier_id)
    const contractLabel = contract.contract_number || `Contract-${contract.id ?? ""}`.trim() || "A contract"
    const message = `${contractLabel} expires on ${formatDate(contract.end_date)}. Review renewal, close-out, or extension actions.`

    await createNotificationsForRoles(["admin", "buyer"], {
      type: "Contract Expiring",
      title: "Contract expiring soon",
      message,
      link: contract.id ? `/dashboard/contracts/${contract.id}` : "/dashboard/contracts",
      metadata: {
        contract_id: contract.id ?? null,
        contract_number: contract.contract_number ?? null,
        supplier_id: contract.supplier_id ?? null,
        end_date: contract.end_date ?? null,
        automation_generated: true,
      },
    })

    await createSupplierNotification({
      supplierId: contract.supplier_id,
      type: "Contract Expiring",
      title: "Contract expiring soon",
      message,
      link: contract.id ? `/dashboard/contracts/${contract.id}` : "/dashboard/contracts",
      metadata: {
        contract_id: contract.id ?? null,
        contract_number: contract.contract_number ?? null,
      },
    })

    await createWhatsAppDraft({
      supplier,
      alertType: "Compliance Reminder",
      message: `Hi ${getSupplierName(supplier)}, AiForm Procure reminder: ${contractLabel} is nearing expiry on ${formatDate(contract.end_date)}. Please review the contract in your dashboard.`,
      rfqId: contract.rfq_id ?? null,
      metadata: {
        contract_id: contract.id ?? null,
        contract_number: contract.contract_number ?? null,
        end_date: contract.end_date ?? null,
      },
    })
  } catch (error) {
    warnAutomationFailure("notifyContractExpiring", error)
  }
}

export async function notifyInvoiceApproved(invoice: InvoiceAutomation): Promise<void> {
  try {
    const supplier = await getSupplierById(invoice.supplier_id)
    const invoiceLabel = invoice.invoice_number || `Invoice-${invoice.id ?? ""}`.trim() || "Your invoice"
    const message = `Hi ${getSupplierName(supplier)}, ${invoiceLabel} has been approved on AiForm Procure. Payment processing can now proceed.`

    await createSupplierNotification({
      supplierId: invoice.supplier_id,
      type: "Invoice Approved",
      title: "Invoice approved",
      message: `${invoiceLabel} has been approved.`,
      link: invoice.id ? `/dashboard/invoices/${invoice.id}` : "/dashboard/invoices",
      metadata: {
        invoice_id: invoice.id ?? null,
        invoice_number: invoice.invoice_number ?? null,
        contract_id: invoice.contract_id ?? null,
      },
    })

    await createWhatsAppDraft({
      supplier,
      alertType: "Invoice Reminder",
      message,
      metadata: { invoice_id: invoice.id ?? null, invoice_number: invoice.invoice_number ?? null },
    })
  } catch (error) {
    warnAutomationFailure("notifyInvoiceApproved", error)
  }
}

export async function notifyPaymentPaid(payment: PaymentAutomation): Promise<void> {
  try {
    const supplier = await getSupplierById(payment.supplier_id)
    const paymentLabel = payment.payment_number || `Payment-${payment.id ?? ""}`.trim() || "A payment"
    const message = `Hi ${getSupplierName(supplier)}, ${paymentLabel} has been marked as paid on AiForm Procure. Payment date: ${formatDate(payment.payment_date)}.`

    await createSupplierNotification({
      supplierId: payment.supplier_id,
      type: "Payment Paid",
      title: "Payment marked paid",
      message: `${paymentLabel} has been marked as paid.`,
      link: payment.id ? `/dashboard/payments/${payment.id}` : "/dashboard/payments",
      metadata: {
        payment_id: payment.id ?? null,
        payment_number: payment.payment_number ?? null,
        invoice_id: payment.invoice_id ?? null,
      },
    })

    await createWhatsAppDraft({
      supplier,
      alertType: "Invoice Reminder",
      message,
      metadata: {
        payment_id: payment.id ?? null,
        payment_number: payment.payment_number ?? null,
        invoice_id: payment.invoice_id ?? null,
      },
    })
  } catch (error) {
    warnAutomationFailure("notifyPaymentPaid", error)
  }
}

export async function notifyComplianceExpiring(profile: SupplierAutomation): Promise<void> {
  try {
    const expiringDocuments = [
      ["Tax clearance", profile.tax_expiry_date],
      ["B-BBEE certificate", profile.bbbee_expiry_date],
      ["CSD registration", profile.csd_expiry_date],
      ["CIDB certificate", profile.cidb_expiry_date],
    ]
      .filter(([, date]) => isWithinDays(date, 30))
      .map(([label, date]) => `${label}: ${formatDate(date)}`)

    if (expiringDocuments.length === 0) return

    const message = `Hi ${getSupplierName(profile)}, AiForm Procure compliance reminder: ${expiringDocuments.join("; ")}. Please update your supplier profile documents.`

    await createSupplierNotification({
      supplierId: profile.id,
      type: "Compliance Expiry Warning",
      title: "Compliance documents expiring",
      message: expiringDocuments.join("; "),
      link: "/dashboard/verification",
      metadata: {
        supplier_id: profile.id ?? null,
        expiring_documents: expiringDocuments,
      },
    })

    await createWhatsAppDraft({
      supplier: profile,
      alertType: "Compliance Reminder",
      message,
      metadata: { expiring_documents: expiringDocuments },
    })
  } catch (error) {
    warnAutomationFailure("notifyComplianceExpiring", error)
  }
}

export async function runClosingSoonCheck(): Promise<AutomationRunResult> {
  if (!supabase) return { processed: 0, errors: ["Supabase is not configured."] }

  const { data, error } = await supabase
    .from("rfqs")
    .select("id, title, category, province, region, deadline, budget, status")
    .in("status", ["Open", "Closing Soon"])

  if (error) return { processed: 0, errors: [error.message] }

  const rfqs = ((data ?? []) as RFQAutomation[]).filter((rfq) =>
    isWithinDays(rfq.deadline, 3)
  )

  const errors: string[] = []
  for (const rfq of rfqs) {
    try {
      await notifyRFQClosingSoon(rfq)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Closing soon automation failed.")
    }
  }

  return { processed: rfqs.length, errors }
}

export async function runComplianceExpiryCheck(): Promise<AutomationRunResult> {
  if (!supabase) return { processed: 0, errors: ["Supabase is not configured."] }

  const { data, error } = await supabase
    .from("profiles")
    .select(SUPPLIER_SELECT)
    .eq("role", "supplier")

  if (error) return { processed: 0, errors: [error.message] }

  const profiles = ((data ?? []) as SupplierAutomation[]).filter((profile) =>
    [profile.tax_expiry_date, profile.bbbee_expiry_date, profile.csd_expiry_date, profile.cidb_expiry_date].some((date) =>
      isWithinDays(date, 30)
    )
  )

  const errors: string[] = []
  for (const profile of profiles) {
    try {
      await notifyComplianceExpiring(profile)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Compliance expiry automation failed.")
    }
  }

  return { processed: profiles.length, errors }
}

export async function runContractExpiryCheck(): Promise<AutomationRunResult> {
  if (!supabase) return { processed: 0, errors: ["Supabase is not configured."] }

  const { data, error } = await supabase
    .from("contracts")
    .select("id, contract_number, supplier_id, supplier_name, rfq_id, purchase_order_id, contract_value, end_date, renewal_date, status")
    .in("status", ["Active", "Expiring Soon", "Renewed"])

  if (error) return { processed: 0, errors: [error.message] }

  const contracts = ((data ?? []) as ContractAutomation[]).filter((contract) =>
    isWithinDays(contract.end_date, 30)
  )

  const errors: string[] = []
  for (const contract of contracts) {
    try {
      await notifyContractExpiring(contract)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Contract expiry automation failed.")
    }
  }

  return { processed: contracts.length, errors }
}

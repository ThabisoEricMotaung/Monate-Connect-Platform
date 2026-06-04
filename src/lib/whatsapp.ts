import { supabase } from "./supabase"

export type WhatsAppAlertType =
  | "New RFQ"
  | "Closing Soon"
  | "Award Notice"
  | "PO Issued"
  | "Invoice Reminder"
  | "Compliance Reminder"

export type WhatsAppRFQ = {
  id?: number | string | null
  title?: string | null
  category?: string | null
  province?: string | null
  deadline?: string | null
  budget?: string | null
}

export type WhatsAppSupplier = {
  id?: string | null
  business_name?: string | null
  phone?: string | null
  province?: string | null
  industry?: string | null
  verification_status?: string | null
}

export function formatSouthAfricanPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d]/g, "")

  if (!digits) return null

  if (digits.startsWith("27") && digits.length >= 11) {
    return digits
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `27${digits.slice(1)}`
  }

  if (digits.length === 9) {
    return `27${digits}`
  }

  return digits.length >= 10 ? digits : null
}

export function createWhatsAppLink({
  phone,
  message,
}: {
  phone: string | null | undefined
  message: string
}): string | null {
  const formattedPhone = formatSouthAfricanPhone(phone)

  if (!formattedPhone) return null

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
}

function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return "the published deadline"

  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return deadline

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function createRFQWhatsAppMessage(
  rfq: WhatsAppRFQ | null | undefined,
  supplier: WhatsAppSupplier | null | undefined,
  alertType: WhatsAppAlertType = "New RFQ"
): string {
  const supplierName = supplier?.business_name || "Supplier"
  const rfqTitle = rfq?.title || `RFQ-${rfq?.id ?? ""}`.trim() || "a procurement opportunity"
  const deadline = formatDeadline(rfq?.deadline)
  const category = rfq?.category ? ` Category: ${rfq.category}.` : ""
  const province = rfq?.province ? ` Province: ${rfq.province}.` : ""
  const budget = rfq?.budget ? ` Budget: ${rfq.budget}.` : ""

  if (alertType === "Closing Soon") {
    return `Hi ${supplierName}, reminder from Monate Connect: ${rfqTitle} is closing soon. Deadline: ${deadline}.${category}${province} Please review and submit your quote if suitable.`
  }

  if (alertType === "Award Notice") {
    return `Hi ${supplierName}, Monate Connect procurement notice: an award update is available for ${rfqTitle}. Please check your dashboard for the official award decision and next steps.`
  }

  if (alertType === "PO Issued") {
    return `Hi ${supplierName}, a purchase order has been issued through Monate Connect for ${rfqTitle}. Please sign in to review and accept the PO.`
  }

  if (alertType === "Invoice Reminder") {
    return `Hi ${supplierName}, Monate Connect reminder: please review outstanding invoice actions linked to ${rfqTitle}. Sign in to confirm status or submit required information.`
  }

  if (alertType === "Compliance Reminder") {
    return `Hi ${supplierName}, Monate Connect compliance reminder: please update your supplier documents and banking/compliance details so procurement teams can continue processing opportunities.`
  }

  return `Hi ${supplierName}, new RFQ available on Monate Connect: ${rfqTitle}. Deadline: ${deadline}.${category}${province}${budget} Please sign in to review and submit a quote if suitable.`
}

export async function logWhatsAppAlert({
  supplier_id,
  supplier_phone,
  alert_type,
  message,
  rfq_id = null,
  metadata = null,
}: {
  supplier_id?: string | null
  supplier_phone?: string | null
  alert_type: WhatsAppAlertType | string
  message: string
  rfq_id?: number | string | null
  metadata?: Record<string, unknown> | null
}): Promise<void> {
  if (!supabase) return

  try {
    const parsedRfqId =
      rfq_id == null || rfq_id === ""
        ? null
        : Number.isFinite(Number(rfq_id))
          ? Number(rfq_id)
          : null
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("whatsapp_alerts").insert([
      {
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        supplier_id: supplier_id ?? null,
        supplier_phone: supplier_phone ?? null,
        alert_type,
        message,
        rfq_id: parsedRfqId,
        metadata,
      },
    ])

    if (error) throw error
  } catch (error) {
    console.warn("WhatsApp alert logging failed:", error)
  }
}

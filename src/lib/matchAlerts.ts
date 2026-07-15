import { emailSignatureText } from "./emailSignature"
import { createNotification } from "./notifications"
import { createWhatsAppLink, formatSouthAfricanPhone } from "./whatsapp"
import { supabase } from "./supabase"

export type MatchAlertSupplier = {
  id: string
  business_name?: string | null
  phone?: string | null
  email?: string | null
}

export type MatchAlertRFQ = {
  id: number
  title?: string | null
  deadline?: string | null
}

export type MatchAlertInput = {
  supplier: MatchAlertSupplier
  rfq: MatchAlertRFQ
  matchScore: number
}

export type MatchAlertResult = {
  attempted: number
  notificationsCreated: number
  whatsappDraftsCreated: number
  whatsappLinks: Array<{
    supplierId: string
    supplierName: string
    link: string
  }>
  errors: string[]
}

export type MatchAlertEmail = {
  subject: string
  body: string
}

export type MatchAlertEmailResult = {
  attempted: number
  sent: number
  failed: number
  emailAlertsCreated: number
  errors: string[]
  results: Array<{
    supplierId: string
    supplierName: string
    status: "sent" | "failed"
    error?: string
  }>
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

export function createMatchAlertMessage(input: MatchAlertInput): string {
  const title = input.rfq.title || `RFQ-${input.rfq.id}`
  return `New RFQ matched to your business: ${title}. Match Score: ${input.matchScore}%. Review and submit your quote before ${formatDeadline(input.rfq.deadline)}.`
}

export function createMatchAlertEmail(input: MatchAlertInput): MatchAlertEmail {
  const supplierName = input.supplier.business_name || "there"
  const title = input.rfq.title || `RFQ-${input.rfq.id}`
  const deadline = formatDeadline(input.rfq.deadline)

  return {
    subject: `New opportunity match: ${title}`,
    body: `Hi ${supplierName},

A new opportunity on AiForm Procure looks like a strong match for your supplier profile.

Opportunity: ${title}
Match score: ${input.matchScore}%
Closing date: ${deadline}

Log in to AiForm Procure to review the opportunity details and decide whether it is a fit for your business.

${emailSignatureText()}`,
  }
}

async function getCurrentActor() {
  if (!supabase) return { userId: null, userEmail: null }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
  }
}

export async function createMatchAlertDrafts(
  inputs: MatchAlertInput[]
): Promise<MatchAlertResult> {
  const result: MatchAlertResult = {
    attempted: inputs.length,
    notificationsCreated: 0,
    whatsappDraftsCreated: 0,
    whatsappLinks: [],
    errors: [],
  }

  if (!supabase || inputs.length === 0) return result

  const actor = await getCurrentActor()

  for (const input of inputs) {
    const supplierName = input.supplier.business_name || "Supplier"
    const rfqLink = `/dashboard/rfqs/${input.rfq.id}`
    const message = createMatchAlertMessage(input)
    const whatsappLink = createWhatsAppLink({
      phone: input.supplier.phone,
      message,
    })

    const notification = await createNotification({
      userId: input.supplier.id,
      type: "RFQ Match",
      title: "New RFQ match",
      message,
      link: rfqLink,
      metadata: {
        rfq_id: input.rfq.id,
        match_score: input.matchScore,
        whatsapp_draft: true,
      },
    })

    if (notification) {
      result.notificationsCreated += 1
    } else {
      result.errors.push(`Notification failed for ${supplierName}.`)
    }

    try {
      const { error } = await supabase.from("whatsapp_alerts").insert([
        {
          user_id: actor.userId,
          user_email: actor.userEmail,
          supplier_id: input.supplier.id,
          supplier_name: supplierName,
          supplier_phone: formatSouthAfricanPhone(input.supplier.phone) ?? input.supplier.phone ?? null,
          alert_type: "RFQ Match Draft",
          message,
          rfq_id: input.rfq.id,
          metadata: {
            status: "draft",
            rfq_link: rfqLink,
            match_score: input.matchScore,
            wa_link: whatsappLink,
            send_policy: "draft_only",
          },
        },
      ])

      if (error) throw error
      result.whatsappDraftsCreated += 1
    } catch (error) {
      result.errors.push(
        `WhatsApp draft failed for ${supplierName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }

    if (whatsappLink) {
      result.whatsappLinks.push({
        supplierId: input.supplier.id,
        supplierName,
        link: whatsappLink,
      })
    }
  }

  return result
}


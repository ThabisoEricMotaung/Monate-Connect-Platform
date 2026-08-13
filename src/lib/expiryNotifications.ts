import type { SupabaseClient } from "@supabase/supabase-js"
import {
  hasComplianceExpiryNotificationBeenSent,
  matchingExpiryWindow,
  recordComplianceExpiryNotification,
  type ComplianceExpiryWindowDays,
} from "@/lib/complianceExpiryNotifications"
import { createNotification, type Notification } from "@/lib/notifications"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const EXPIRING_DOCUMENT_TYPES = ["csd", "bbbee", "tax_clearance", "cidb"] as const

const DOCUMENT_LABELS: Record<(typeof EXPIRING_DOCUMENT_TYPES)[number], string> = {
  csd: "CSD",
  bbbee: "B-BBEE certificate",
  tax_clearance: "Tax clearance certificate",
  cidb: "CIDB registration",
}

const DOCUMENT_MESSAGE_LABELS: Record<string, string> = {
  csd: "CSD registration",
  bbbee: "B-BBEE certificate",
  tax_clearance: "tax clearance certificate",
  cidb: "CIDB registration",
}

export type ExpiringDocumentRecord = {
  id: string
  profile_id: string
  document_type: (typeof EXPIRING_DOCUMENT_TYPES)[number]
  expiry_date: string
  label: string
  window_days: ComplianceExpiryWindowDays
}

type SupplierDocumentRow = Omit<ExpiringDocumentRecord, "label" | "window_days">

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

async function loadExpiringDocumentCandidates(
  daysUntilExpiry: number,
  now: Date,
  client: SupabaseClient | null,
): Promise<ExpiringDocumentRecord[]> {
  if (!client) throw new Error("Supabase service role client is not configured.")

  const today = dateOnly(now)
  const latestExpiry = dateOnly(addDays(now, daysUntilExpiry))
  const { data, error } = await client
    .from("supplier_documents")
    .select("id, profile_id, document_type, expiry_date")
    .in("status", ["approved", "verified"])
    .in("document_type", [...EXPIRING_DOCUMENT_TYPES])
    .gt("expiry_date", today)
    .lte("expiry_date", latestExpiry)

  if (error) throw new Error(`Could not load expiring supplier documents: ${error.message}`)

  return ((data ?? []) as SupplierDocumentRow[]).flatMap((document) => {
    const windowDays = matchingExpiryWindow(document.expiry_date, now)
    if (!windowDays || windowDays > daysUntilExpiry) return []

    return [{
      ...document,
      label: DOCUMENT_LABELS[document.document_type],
      window_days: windowDays,
    }]
  })
}

export async function getExpiringDocuments(
  daysUntilExpiry: number = 30,
  now: Date = new Date(),
  client: SupabaseClient | null = supabaseAdmin,
): Promise<ExpiringDocumentRecord[]> {
  const candidates = await loadExpiringDocumentCandidates(daysUntilExpiry, now, client)
  const duplicateChecks = await Promise.all(
    candidates.map((document) =>
      hasComplianceExpiryNotificationBeenSent(client, {
        recordType: "supplier_document",
        recordId: document.id,
        windowDays: document.window_days,
        notifiedForDate: document.expiry_date,
      }),
    ),
  )

  return candidates.filter((_, index) => !duplicateChecks[index])
}

export async function createExpiryNotification(
  profileId: string,
  documentType: string,
  label: string,
  expiryDate: string,
  windowDays: 30 | 14 | 1,
  client: SupabaseClient | null = supabaseAdmin,
): Promise<Notification | null> {
  if (!client || !profileId) return null

  const { data: profile, error } = await client
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle()

  if (error) throw new Error(`Could not load notification recipient: ${error.message}`)
  if (!profile?.id) return null

  return createNotification(
    {
      userId: profile.id as string,
      type: "Compliance Expiry Warning",
      title: `${label} expires in ${windowDays} ${windowDays === 1 ? "day" : "days"}`,
      message: `Your ${DOCUMENT_MESSAGE_LABELS[documentType] || label} will expire on ${expiryDate}`,
      link: "/dashboard/profile?tab=documents",
      metadata: { document_type: documentType },
    },
    client,
  )
}

export async function processExpiringDocuments(
  daysUntilExpiry: number = 30,
  client: SupabaseClient | null = supabaseAdmin,
): Promise<{ notificationsCreated: number; duplicatesSkipped: number; errors: string[] }> {
  const now = new Date()
  const candidates = await loadExpiringDocumentCandidates(daysUntilExpiry, now, client)
  let notificationsCreated = 0
  let duplicatesSkipped = 0
  const errors: string[] = []

  for (const document of candidates) {
    try {
      const key = {
        recordType: "supplier_document" as const,
        recordId: document.id,
        windowDays: document.window_days,
        notifiedForDate: document.expiry_date,
      }
      if (await hasComplianceExpiryNotificationBeenSent(client, key)) {
        duplicatesSkipped += 1
        continue
      }

      const notification = await createExpiryNotification(
        document.profile_id,
        document.document_type,
        document.label,
        document.expiry_date,
        document.window_days,
        client,
      )
      if (!notification) {
        errors.push(`Skipped ${document.document_type} document ${document.id}: recipient or notification unavailable.`)
        continue
      }

      await recordComplianceExpiryNotification(client, {
        ...key,
        profileId: document.profile_id,
      })
      notificationsCreated += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${document.document_type} document ${document.id}: ${message}`)
    }
  }

  return { notificationsCreated, duplicatesSkipped, errors }
}

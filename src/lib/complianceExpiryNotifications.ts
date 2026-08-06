import type { SupabaseClient } from "@supabase/supabase-js"

// Idempotency ledger for compliance-expiry reminders. One row per
// (record_type, record_id, window_days, notified_for_date) -- the "for date"
// component means editing a record's expiry/end date (e.g. a contract
// renewal) naturally re-arms future reminders instead of staying silenced
// forever against a stale date.
export type ComplianceExpiryRecordType =
  | "supplier_document"
  | "supplier_certification"
  | "supplier_licence"
  | "contract"

export type ComplianceExpiryWindowDays = 30 | 14 | 1

export type ComplianceExpiryNotificationKey = {
  recordType: ComplianceExpiryRecordType
  recordId: string
  windowDays: ComplianceExpiryWindowDays
  notifiedForDate: string
}

export async function hasComplianceExpiryNotificationBeenSent(
  client: SupabaseClient | null,
  key: ComplianceExpiryNotificationKey,
): Promise<boolean> {
  if (!client) return false

  const { data, error } = await client
    .from("compliance_expiry_notifications")
    .select("id")
    .eq("record_type", key.recordType)
    .eq("record_id", key.recordId)
    .eq("window_days", key.windowDays)
    .eq("notified_for_date", key.notifiedForDate)
    .maybeSingle()

  if (error) {
    console.warn("compliance_expiry_notifications lookup failed:", error)
    return false
  }

  return Boolean(data)
}

export async function recordComplianceExpiryNotification(
  client: SupabaseClient | null,
  key: ComplianceExpiryNotificationKey & { profileId: string },
): Promise<void> {
  if (!client) return

  const { error } = await client.from("compliance_expiry_notifications").insert({
    profile_id: key.profileId,
    record_type: key.recordType,
    record_id: key.recordId,
    window_days: key.windowDays,
    notified_for_date: key.notifiedForDate,
  })

  // 23505 = unique_violation: a concurrent run already recorded this window.
  if (error && error.code !== "23505") {
    console.warn("compliance_expiry_notifications insert failed:", error)
  }
}

// Given a record's expiry/end date, returns the single reminder window
// (30, 14, or 1 day out) it currently matches, or null if it matches none.
// A daily cron only needs an exact-day match since it runs once per day.
export function matchingExpiryWindow(
  dateStr: string | null | undefined,
  now = new Date(),
): ComplianceExpiryWindowDays | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  const daysUntil = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil === 30 || daysUntil === 14 || daysUntil === 1) return daysUntil
  return null
}

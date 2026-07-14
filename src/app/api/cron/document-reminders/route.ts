import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type SupplierProfile = {
  id: string
  email: string | null
  first_name: string | null
  full_name: string | null
  preferred_name: string | null
  business_name: string | null
  created_at: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_clearance_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
}

type SupplierDocumentRow = {
  profile_id: string
  document_type: string | null
  file_url: string | null
  status: string | null
}

type ReminderLogRow = {
  profile_id: string
  last_reminder_sent_at: string | null
  reminder_count: number | null
}

const REQUIRED_DOCUMENTS = [
  {
    type: "csd",
    label: "CSD document",
    legacyFields: ["csd_document_url"] as const,
  },
  {
    type: "bbbee",
    label: "BBBEE Certificate",
    legacyFields: ["bbbee_document_url"] as const,
  },
  {
    type: "tax_clearance",
    label: "Tax Clearance",
    legacyFields: ["tax_clearance_url", "tax_document_url"] as const,
  },
  {
    type: "cipc",
    label: "CIPC / company registration document",
    legacyFields: ["company_registration_url"] as const,
  },
] as const

const DAY_MS = 24 * 60 * 60 * 1000
const FIRST_REMINDER_AFTER_MS = DAY_MS
const FOLLOW_UP_AFTER_MS = 7 * DAY_MS
const MAX_PROFILES_PER_RUN = 500

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")

  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function profileName(profile: SupplierProfile): string {
  return (
    profile.preferred_name?.trim() ||
    profile.first_name?.trim() ||
    profile.full_name?.trim()?.split(/\s+/)[0] ||
    profile.business_name?.trim() ||
    "there"
  )
}

function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL

  if (!configured) return "https://www.aiformprocure.co.za"
  return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function documentsByProfile(documents: SupplierDocumentRow[]): Map<string, SupplierDocumentRow[]> {
  const grouped = new Map<string, SupplierDocumentRow[]>()
  for (const document of documents) {
    grouped.set(document.profile_id, [...(grouped.get(document.profile_id) ?? []), document])
  }
  return grouped
}

function hasDocument(
  profile: SupplierProfile,
  documents: SupplierDocumentRow[],
  requirement: (typeof REQUIRED_DOCUMENTS)[number],
): boolean {
  const activeDocument = documents.some(
    (document) =>
      document.document_type === requirement.type &&
      document.status !== "superseded" &&
      hasValue(document.file_url),
  )

  if (activeDocument) return true

  return requirement.legacyFields.some((field) => hasValue(profile[field]))
}

function missingDocuments(profile: SupplierProfile, documents: SupplierDocumentRow[]): string[] {
  return REQUIRED_DOCUMENTS
    .filter((requirement) => !hasDocument(profile, documents, requirement))
    .map((requirement) => requirement.label)
}

function shouldSendReminder(log: ReminderLogRow | undefined, now: Date): boolean {
  if (!log?.last_reminder_sent_at) return true

  const lastSent = new Date(log.last_reminder_sent_at)
  if (Number.isNaN(lastSent.getTime())) return true

  return now.getTime() - lastSent.getTime() >= FOLLOW_UP_AFTER_MS
}

function emailHtml(profile: SupplierProfile, missing: string[], profileLink: string): string {
  const list = missing.map((document) => `<li>${escapeHtml(document)}</li>`).join("")

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#27332d;">
      <h2 style="font-size:21px;line-height:1.3;margin:0 0 14px;color:#1a3a2a;">A quick nudge to finish your supplier documents</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">Hi ${escapeHtml(profileName(profile))},</p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        Thanks again for joining AiForm Procure. Your supplier profile is almost there; we just still need the following document${missing.length === 1 ? "" : "s"} before the verification team can complete their review:
      </p>
      <ul style="font-size:14px;line-height:1.8;margin:0 0 20px 20px;padding:0;">${list}</ul>
      <p style="font-size:14px;line-height:1.7;margin:0 0 22px;">
        You can upload ${missing.length === 1 ? "it" : "them"} directly from your profile documents page:
      </p>
      <p style="margin:0 0 24px;">
        <a href="${profileLink}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">Upload missing documents</a>
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        If you are not sure which file to upload, just reply to this email and we will help you through it.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0;">Warmly,<br />Thabiso and the AiForm Procure team</p>
    </div>
  `
}

function emailText(profile: SupplierProfile, missing: string[], profileLink: string): string {
  return `Hi ${profileName(profile)},

Thanks again for joining AiForm Procure. Your supplier profile is almost there; we just still need:

${missing.map((document) => `- ${document}`).join("\n")}

You can upload ${missing.length === 1 ? "it" : "them"} here:
${profileLink}

If you are not sure which file to upload, just reply to this email and we will help you through it.

Warmly,
Thabiso and the AiForm Procure team`
}

async function upsertReminderLog({
  profileId,
  missing,
  now,
  sent,
  reminderCount,
  error,
}: {
  profileId: string
  missing: string[]
  now: Date
  sent: boolean
  reminderCount: number
  error?: string | null
}) {
  if (!supabaseAdmin) return

  await supabaseAdmin.from("supplier_reminder_log").upsert(
    {
      profile_id: profileId,
      last_reminder_sent_at: sent ? now.toISOString() : undefined,
      reminder_count: reminderCount,
      last_missing_documents: missing,
      last_missing_document_count: missing.length,
      last_checked_at: now.toISOString(),
      completed_at: missing.length === 0 ? now.toISOString() : null,
      last_email_error: error ?? null,
      updated_at: now.toISOString(),
    },
    { onConflict: "profile_id" },
  )
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json({ ok: false, error: "Resend is not configured." }, { status: 500 })
  }

  const now = new Date()
  const signupCutoff = new Date(now.getTime() - FIRST_REMINDER_AFTER_MS).toISOString()

  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, email, first_name, full_name, preferred_name, business_name, created_at, csd_document_url, bbbee_document_url, tax_clearance_url, tax_document_url, company_registration_url",
    )
    .eq("role", "supplier")
    .not("email", "is", null)
    .not("email", "ilike", "%@deleted.local")
    .lte("created_at", signupCutoff)
    .order("created_at", { ascending: true })
    .limit(MAX_PROFILES_PER_RUN)

  if (profilesError) {
    console.error("Document reminder profile query failed:", profilesError)
    return NextResponse.json({ ok: false, error: profilesError.message }, { status: 500 })
  }

  const profiles = (profilesData ?? []) as SupplierProfile[]
  const profileIds = profiles.map((profile) => profile.id)

  if (profileIds.length === 0) {
    console.log("Document reminders run", { checked: 0, incomplete: 0, sent: 0 })
    return NextResponse.json({ ok: true, checked: 0, incomplete: 0, sent: 0, errors: 0 })
  }

  const [documentsResult, logsResult] = await Promise.all([
    supabaseAdmin
      .from("supplier_documents")
      .select("profile_id, document_type, file_url, status")
      .in("profile_id", profileIds),
    supabaseAdmin
      .from("supplier_reminder_log")
      .select("profile_id, last_reminder_sent_at, reminder_count")
      .in("profile_id", profileIds),
  ])

  if (documentsResult.error) {
    console.error("Document reminder supplier_documents query failed:", documentsResult.error)
    return NextResponse.json({ ok: false, error: documentsResult.error.message }, { status: 500 })
  }

  if (logsResult.error) {
    console.error("Document reminder log query failed:", logsResult.error)
    return NextResponse.json({ ok: false, error: logsResult.error.message }, { status: 500 })
  }

  const documentsMap = documentsByProfile((documentsResult.data ?? []) as SupplierDocumentRow[])
  const logsMap = new Map((logsResult.data ?? []).map((log) => [log.profile_id, log as ReminderLogRow]))
  const resend = new Resend(resendApiKey)
  const profileLink = `${siteUrl()}/dashboard/profile?tab=documents`

  let incomplete = 0
  let sent = 0
  let skippedNotDue = 0
  let completed = 0
  let errors = 0

  for (const profile of profiles) {
    const missing = missingDocuments(profile, documentsMap.get(profile.id) ?? [])
    const log = logsMap.get(profile.id)
    const reminderCount = Number(log?.reminder_count ?? 0)

    if (missing.length === 0) {
      completed += 1
      await upsertReminderLog({
        profileId: profile.id,
        missing,
        now,
        sent: false,
        reminderCount,
      })
      continue
    }

    incomplete += 1

    if (!shouldSendReminder(log, now)) {
      skippedNotDue += 1
      await upsertReminderLog({
        profileId: profile.id,
        missing,
        now,
        sent: false,
        reminderCount,
      })
      continue
    }

    try {
      await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: profile.email!,
        subject: "A quick nudge to complete your supplier documents",
        html: emailHtml(profile, missing, profileLink),
        text: emailText(profile, missing, profileLink),
      })

      sent += 1
      await upsertReminderLog({
        profileId: profile.id,
        missing,
        now,
        sent: true,
        reminderCount: reminderCount + 1,
      })
    } catch (error) {
      errors += 1
      const message = error instanceof Error ? error.message : "Unknown email send failure"
      console.error("Document reminder email failed:", { profileId: profile.id, error: message })
      await upsertReminderLog({
        profileId: profile.id,
        missing,
        now,
        sent: false,
        reminderCount,
        error: message,
      })
    }
  }

  const summary = {
    checked: profiles.length,
    incomplete,
    sent,
    skippedNotDue,
    completed,
    errors,
  }
  console.log("Document reminders run", summary)

  return NextResponse.json({ ok: errors === 0, ...summary })
}

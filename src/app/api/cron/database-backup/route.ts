import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getR2Config, r2Delete, r2List, r2Put } from "@/lib/r2"

// Daily backup of the core production tables to Cloudflare R2 (a provider
// separate from Supabase, so a Supabase-side incident can't take out both
// the live database and its backups). Runs once a day (see vercel.json).
//
// Tables backed up: profiles, supplier_documents, rfqs, quotes,
// supplier_bank_details, subscriptions. session_events is intentionally
// excluded — high-volume/ephemeral analytics data, not something we need
// to restore.
//
// profiles rows have their live OTP fields (otp_code, otp_expires_at,
// otp_attempts) nulled out before being written anywhere — a backup file
// should never contain a usable login OTP secret.
//
// Retention: after a successful upload, any backup older than
// RETENTION_DAYS is deleted from R2.
//
// This job never touches any other Supabase project — it only reads from
// the production database (via supabaseAdmin) and writes to R2. Restoring
// a backup is a separate, manually-run script (scripts/restore-backup.mjs)
// that targets a different, explicitly non-production project.

const CORE_TABLES = [
  "profiles",
  "supplier_documents",
  "rfqs",
  "quotes",
  "supplier_bank_details",
  "subscriptions",
] as const

type CoreTable = (typeof CORE_TABLES)[number]

const OTP_FIELDS = ["otp_code", "otp_expires_at", "otp_attempts"] as const

const FETCH_PAGE_SIZE = 1000
const RETENTION_DAYS = 90
const BACKUP_PREFIX = "daily/"
const FAILURE_ALERT_RECIPIENT = "aiformstudio@gmail.com"

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")
  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function isoDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function fetchAllRows(table: CoreTable): Promise<Record<string, unknown>[]> {
  if (!supabaseAdmin) throw new Error("Supabase service role client is not configured.")

  const rows: Record<string, unknown>[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .range(from, from + FETCH_PAGE_SIZE - 1)

    if (error) throw new Error(`Failed to read ${table}: ${error.message}`)

    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < FETCH_PAGE_SIZE) break
    from += FETCH_PAGE_SIZE
  }
  return rows
}

function scrubProfile(row: Record<string, unknown>): Record<string, unknown> {
  const scrubbed = { ...row }
  for (const field of OTP_FIELDS) {
    if (field in scrubbed) scrubbed[field] = null
  }
  return scrubbed
}

async function sendFailureAlert(resendApiKey: string, message: string): Promise<void> {
  try {
    const resend = new Resend(resendApiKey)
    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: FAILURE_ALERT_RECIPIENT,
      subject: "Database backup FAILED",
      text: `The daily database backup job failed.\n\nError:\n${message}\n\nNo new backup was uploaded to R2 for this run. Check the Vercel function logs for the full trace.`,
    })
  } catch (error) {
    // If the alert itself fails to send there's nothing further we can do
    // from inside the cron job; this is logged so it still shows up in
    // Vercel's function logs.
    console.error("Database backup: failure alert email also failed to send:", error)
  }
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const r2Config = getR2Config()

  if (!supabaseAdmin) {
    const message = "Supabase service role client is not configured."
    if (resendApiKey) await sendFailureAlert(resendApiKey, message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }

  if (!r2Config) {
    const message =
      "R2 is not configured. Missing one or more of R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET."
    if (resendApiKey) await sendFailureAlert(resendApiKey, message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }

  const now = new Date()
  const tables: Record<string, Record<string, unknown>[]> = {}
  const rowCounts: Record<string, number> = {}

  try {
    for (const table of CORE_TABLES) {
      const rows = await fetchAllRows(table)
      tables[table] = table === "profiles" ? rows.map(scrubProfile) : rows
      rowCounts[table] = rows.length
    }

    const backup = {
      generated_at: now.toISOString(),
      source_project: "aiform-procure",
      tables,
      row_counts: rowCounts,
    }

    const key = `${BACKUP_PREFIX}${isoDateStamp(now)}.json`
    await r2Put(r2Config, key, JSON.stringify(backup))

    // Retention: delete any backup older than RETENTION_DAYS.
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const existing = await r2List(r2Config, BACKUP_PREFIX)
    const deleted: string[] = []

    for (const object of existing) {
      const dateMatch = object.key.match(/(\d{4}-\d{2}-\d{2})\.json$/)
      if (!dateMatch) continue
      const objectDate = new Date(`${dateMatch[1]}T00:00:00Z`)
      if (objectDate.getTime() < cutoff.getTime()) {
        await r2Delete(r2Config, object.key)
        deleted.push(object.key)
      }
    }

    console.log("Database backup run", { key, rowCounts, deleted })
    return NextResponse.json({ ok: true, key, row_counts: rowCounts, deleted })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backup failure"
    console.error("Database backup failed:", error)
    if (resendApiKey) await sendFailureAlert(resendApiKey, message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

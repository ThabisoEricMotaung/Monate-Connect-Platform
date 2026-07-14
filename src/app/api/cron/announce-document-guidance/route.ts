import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { siteUrl } from "@/lib/weeklyDigest"

// One-off announcement to every supplier: the document-upload flow now has
// "Not sure how to get this?" guidance for every compliance document type
// (TCS PIN, CIPC, BBBEE, CSD, bank confirmation letter, UIF, COID). Triggered
// manually once (not on a schedule) - see vercel.json, which does NOT list
// this route, so it never runs automatically.

const ALERT_TYPE = "Document Guidance Announcement"
const FETCH_PAGE_SIZE = 1000

type SupplierProfile = {
  id: string
  email: string | null
  first_name?: string | null
  full_name?: string | null
  preferred_name?: string | null
  business_name?: string | null
}

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")

  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function supplierFirstName(supplier: SupplierProfile): string {
  return (
    supplier.preferred_name?.trim() ||
    supplier.first_name?.trim() ||
    supplier.full_name?.trim()?.split(/\s+/)[0] ||
    supplier.business_name?.trim() ||
    "there"
  )
}

function buildEmail(supplier: SupplierProfile, profileUrl: string) {
  const name = supplierFirstName(supplier)
  const subject = "New: step-by-step help for your compliance documents"

  const text = `Hi ${name},

We've just added clear, step-by-step guidance for every compliance document on your AiForm Procure profile - including your SARS Tax Compliance Status (TCS) PIN, CIPC certificate, BBBEE certificate, CSD registration, bank confirmation letter, UIF, and COID.

Next time you're not sure how to get a document, look for "Not sure how to get this?" under the document type dropdown on your Documents tab. It explains exactly what the document is, where to get it, and links straight to the right government portal.

Update your documents: ${profileUrl}

We added this because a few suppliers reached out unsure where to start, and we wanted no-cost, always-available help for everyone on the platform - not just the people who happen to ask.

Thanks,
AiForm Procure Team`

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a3a2a; max-width: 560px; margin: 0 auto;">
      <p>Hi ${name},</p>
      <p>We've just added clear, step-by-step guidance for every compliance document on your AiForm Procure profile &mdash; including your SARS Tax Compliance Status (TCS) PIN, CIPC certificate, BBBEE certificate, CSD registration, bank confirmation letter, UIF, and COID.</p>
      <p>Next time you're not sure how to get a document, look for <strong>&ldquo;Not sure how to get this?&rdquo;</strong> under the document type dropdown on your Documents tab. It explains exactly what the document is, where to get it, and links straight to the right government portal.</p>
      <p style="margin: 24px 0;">
        <a href="${profileUrl}" style="background: #1a3a2a; color: #f8f4ec; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Update your documents</a>
      </p>
      <p>We added this because a few suppliers reached out unsure where to start, and we wanted no-cost, always-available help for everyone on the platform &mdash; not just the people who happen to ask.</p>
      <p>Thanks,<br />AiForm Procure Team</p>
    </div>
  `

  return { subject, html, text }
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
  const profileUrl = `${siteUrl()}/dashboard/profile`

  const suppliers: SupplierProfile[] = []
  {
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, first_name, full_name, preferred_name, business_name")
        .eq("role", "supplier")
        .not("email", "is", null)
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        console.error("Document guidance announcement profiles query failed:", error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }

      const rows = (data ?? []) as SupplierProfile[]
      suppliers.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
  }

  if (suppliers.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0, skippedAlreadySent: 0, errors: 0 })
  }

  // One-time announcement: skip anyone who was ever already sent this
  // specific alert type, so re-running this route is always safe.
  const supplierIds = suppliers.map((supplier) => supplier.id)
  const { data: alreadySentData, error: alreadySentError } = await supabaseAdmin
    .from("email_alerts")
    .select("supplier_id")
    .eq("alert_type", ALERT_TYPE)
    .eq("status", "sent")
    .in("supplier_id", supplierIds)

  if (alreadySentError) {
    console.error("Document guidance announcement idempotency query failed:", alreadySentError)
    return NextResponse.json({ ok: false, error: alreadySentError.message }, { status: 500 })
  }

  const alreadySent = new Set((alreadySentData ?? []).map((row) => row.supplier_id as string))

  const resend = new Resend(resendApiKey)
  let sent = 0
  let skippedAlreadySent = 0
  let errors = 0
  const failureDetails: string[] = []

  for (const supplier of suppliers) {
    if (alreadySent.has(supplier.id)) {
      skippedAlreadySent += 1
      continue
    }

    const { subject, html, text } = buildEmail(supplier, profileUrl)

    try {
      const sendResponse = await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: supplier.email!,
        subject,
        html,
        text,
      })

      if (sendResponse.error) throw new Error(sendResponse.error.message)

      sent += 1
      await supabaseAdmin.from("email_alerts").insert([
        {
          supplier_id: supplier.id,
          supplier_name: supplier.business_name ?? supplierFirstName(supplier),
          supplier_email: supplier.email,
          alert_type: ALERT_TYPE,
          subject,
          message: text,
          status: "sent",
          sent_at: now.toISOString(),
          metadata: { resend_id: sendResponse.data?.id ?? null },
        },
      ])
    } catch (error) {
      errors += 1
      const message = error instanceof Error ? error.message : "Unknown email send failure"
      failureDetails.push(`${supplier.business_name ?? supplierFirstName(supplier)} (${supplier.email}): ${message}`)
      console.error("Document guidance announcement email failed:", { profileId: supplier.id, error: message })
      await supabaseAdmin.from("email_alerts").insert([
        {
          supplier_id: supplier.id,
          supplier_name: supplier.business_name ?? supplierFirstName(supplier),
          supplier_email: supplier.email,
          alert_type: ALERT_TYPE,
          subject,
          message: text,
          status: "failed",
          metadata: { error: message },
        },
      ])
    }
  }

  const summary = { checked: suppliers.length, sent, skippedAlreadySent, errors }
  console.log("Document guidance announcement run", summary)

  try {
    const summaryLines = [
      `Suppliers checked: ${summary.checked}`,
      `Sent: ${summary.sent}`,
      `Skipped (already sent): ${summary.skippedAlreadySent}`,
      `Failed: ${summary.errors}`,
    ]
    const failuresBlock =
      failureDetails.length > 0 ? `\n\nFailures:\n${failureDetails.map((line) => `- ${line}`).join("\n")}` : ""

    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: "aiformstudio@gmail.com",
      subject: `Document guidance announcement: ${summary.sent} sent, ${summary.errors} failed`,
      text: `Document guidance announcement run summary\n\n${summaryLines.join("\n")}${failuresBlock}`,
    })
  } catch (error) {
    console.error("Document guidance announcement internal summary email failed:", error)
  }

  return NextResponse.json({ ok: errors === 0, ...summary })
}

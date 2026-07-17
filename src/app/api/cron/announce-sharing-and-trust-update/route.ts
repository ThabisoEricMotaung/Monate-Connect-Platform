import { NextResponse } from "next/server"
import { Resend } from "resend"
import { emailSignatureHtml, emailSignatureText, reviewCopyEmail, SUPPLIER_EMAIL_REVIEW_RECIPIENT } from "@/lib/emailSignature"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { siteUrl } from "@/lib/weeklyDigest"

// One-off announcement to every supplier: opportunities can now be shared
// directly (a real link per listing, plus one-tap WhatsApp/LinkedIn), and
// the Trust Center now explains where eTenders-sourced listings come from,
// including a "Team-reviewed" badge. Triggered manually once (not on a
// schedule) — see vercel.json, which does NOT list this route, so it never
// runs automatically. Same shape as announce-document-guidance.

const ALERT_TYPE = "Sharing & Trust Update Announcement"
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

function buildEmail(supplier: SupplierProfile, opportunitiesUrl: string, trustUrl: string) {
  const name = supplierFirstName(supplier)
  const subject = "New: share any tender with your network in one tap"

  const text = `Hi ${name},

Two updates worth knowing about.

You can now share any opportunity directly. Every listing has its own link, plus one-tap WhatsApp and LinkedIn buttons — so if you spot a tender that's a better fit for someone else in your network, you can send it across in a couple of taps instead of copying and pasting.

We've also added more detail to the Trust Center on where opportunities come from, including a "Team-reviewed" badge on listings sourced from eTenders.gov.za (https://www.etenders.gov.za), so it's clear which ones someone on our side has actually checked before they went live.

Browse open opportunities: ${opportunitiesUrl}
See how sourcing works: ${trustUrl}

${emailSignatureText()}`

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a3a2a; max-width: 560px; margin: 0 auto;">
      <p>Hi ${name},</p>
      <p>Two updates worth knowing about.</p>
      <p>You can now share any opportunity directly. Every listing has its own link, plus one-tap WhatsApp and LinkedIn buttons &mdash; so if you spot a tender that's a better fit for someone else in your network, you can send it across in a couple of taps instead of copying and pasting.</p>
      <p>We've also added more detail to the Trust Center on where opportunities come from, including a <strong>&ldquo;Team-reviewed&rdquo;</strong> badge on listings sourced from <a href="https://www.etenders.gov.za" style="color: #1a3a2a;">eTenders.gov.za</a>, so it's clear which ones someone on our side has actually checked before they went live.</p>
      <p style="margin: 24px 0;">
        <a href="${opportunitiesUrl}" style="background: #1a3a2a; color: #f8f4ec; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-right: 12px;">Browse open opportunities</a>
      </p>
      <p><a href="${trustUrl}" style="color: #1a3a2a; font-weight: 600;">See how sourcing works &rarr;</a></p>
      ${emailSignatureHtml()}
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
  const base = siteUrl()
  const opportunitiesUrl = `${base}/opportunities`
  const trustUrl = `${base}/trust`

  const suppliers: SupplierProfile[] = []
  {
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, first_name, full_name, preferred_name, business_name")
        .eq("role", "supplier")
        .not("email", "is", null)
        .not("email", "ilike", "%@deleted.local")
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        console.error("Sharing/trust announcement profiles query failed:", error)
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
    console.error("Sharing/trust announcement idempotency query failed:", alreadySentError)
    return NextResponse.json({ ok: false, error: alreadySentError.message }, { status: 500 })
  }

  const alreadySent = new Set((alreadySentData ?? []).map((row) => row.supplier_id as string))

  const resend = new Resend(resendApiKey)
  let sent = 0
  let skippedAlreadySent = 0
  let errors = 0
  const failureDetails: string[] = []
  let reviewCopy: { subject: string; html: string; text: string } | null = null

  for (const supplier of suppliers) {
    if (alreadySent.has(supplier.id)) {
      skippedAlreadySent += 1
      continue
    }

    const { subject, html, text } = buildEmail(supplier, opportunitiesUrl, trustUrl)

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
      if (!reviewCopy) {
        reviewCopy = reviewCopyEmail({
          subject,
          html,
          text,
          sourceLabel: supplier.business_name ?? supplierFirstName(supplier),
          runLabel: ALERT_TYPE,
        })
      }
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
      console.error("Sharing/trust announcement email failed:", { profileId: supplier.id, error: message })
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
  console.log("Sharing/trust announcement run", summary)

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
      subject: `Sharing/trust announcement: ${summary.sent} sent, ${summary.errors} failed`,
      text: `Sharing/trust announcement run summary\n\n${summaryLines.join("\n")}${failuresBlock}`,
    })
  } catch (error) {
    console.error("Sharing/trust announcement internal summary email failed:", error)
  }

  if (reviewCopy) {
    try {
      await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: SUPPLIER_EMAIL_REVIEW_RECIPIENT,
        subject: reviewCopy.subject,
        html: reviewCopy.html,
        text: reviewCopy.text,
      })
    } catch (error) {
      console.error("Sharing/trust announcement review copy email failed:", error)
    }
  }

  return NextResponse.json({ ok: errors === 0, ...summary })
}

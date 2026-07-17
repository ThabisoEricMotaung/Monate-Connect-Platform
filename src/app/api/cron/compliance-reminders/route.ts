import { NextResponse } from "next/server"
import { Resend } from "resend"
import { reviewCopyEmail, SUPPLIER_EMAIL_REVIEW_RECIPIENT } from "@/lib/emailSignature"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { siteUrl } from "@/lib/weeklyDigest"
import { buildComplianceReminderEmail } from "@/lib/complianceReminder"

// Daily check for the public B-BBEE expiry reminder lead magnet: anyone
// whose self-reported expiry date falls within the next 30 days, and who
// hasn't already been reminded for this cycle, gets a one-time email. When
// they resubmit a new date (e.g. after renewing), the subscribe route
// clears reminded_at so a fresh cycle can fire. Runs daily (see
// vercel.json), offset from document-reminders so the two don't compete for
// the same Resend window.

type Subscriber = {
  id: string
  email: string
  expiry_date: string
}

const REMINDER_TYPE = "bbbee_expiry"
const REMINDER_WINDOW_DAYS = 30
const FETCH_PAGE_SIZE = 1000

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")
  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysUntil(expiryDate: string, today: Date): number {
  const expiry = new Date(`${expiryDate}T00:00:00`)
  const diffMs = expiry.getTime() - today.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const windowEnd = new Date(today.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const base = siteUrl()
  const signupUrl = `${base}/auth/signup`

  // Due for a reminder: within the next 30 days, not yet reminded this cycle.
  const subscribers: Subscriber[] = []
  {
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("compliance_reminder_subscribers")
        .select("id, email, expiry_date")
        .eq("reminder_type", REMINDER_TYPE)
        .is("unsubscribed_at", null)
        .is("reminded_at", null)
        .gte("expiry_date", isoDate(today))
        .lte("expiry_date", isoDate(windowEnd))
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        console.error("Compliance reminders query failed:", error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }

      const rows = (data ?? []) as Subscriber[]
      subscribers.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
  }

  if (subscribers.length === 0) {
    console.log("Compliance reminders run", { checked: 0, sent: 0, errors: 0 })
    return NextResponse.json({ ok: true, checked: 0, sent: 0, errors: 0 })
  }

  const resend = new Resend(resendApiKey)
  let sent = 0
  let errors = 0
  const failureDetails: string[] = []
  let reviewCopy: { subject: string; html: string; text: string } | null = null

  for (const subscriber of subscribers) {
    const daysLeft = daysUntil(subscriber.expiry_date, today)
    const unsubscribeUrl = `${base}/api/unsubscribe/compliance-reminder?id=${subscriber.id}`
    const { subject, html, text } = buildComplianceReminderEmail({
      expiryDate: subscriber.expiry_date,
      daysLeft,
      signupUrl,
      unsubscribeUrl,
    })

    try {
      const sendResponse = await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: subscriber.email,
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
          sourceLabel: subscriber.email,
          runLabel: "Compliance Reminder",
        })
      }

      await supabaseAdmin
        .from("compliance_reminder_subscribers")
        .update({ reminded_at: now.toISOString() })
        .eq("id", subscriber.id)

      await supabaseAdmin.from("email_alerts").insert([
        {
          user_email: subscriber.email,
          alert_type: "Compliance Reminder",
          subject,
          message: text,
          status: "sent",
          sent_at: now.toISOString(),
          metadata: { subscriber_id: subscriber.id, expiry_date: subscriber.expiry_date, days_left: daysLeft, resend_id: sendResponse.data?.id ?? null },
        },
      ])
    } catch (error) {
      errors += 1
      const message = error instanceof Error ? error.message : "Unknown email send failure"
      failureDetails.push(`${subscriber.email}: ${message}`)
      console.error("Compliance reminder email failed:", { subscriberId: subscriber.id, error: message })
      await supabaseAdmin.from("email_alerts").insert([
        {
          user_email: subscriber.email,
          alert_type: "Compliance Reminder",
          subject,
          message: text,
          status: "failed",
          metadata: { subscriber_id: subscriber.id, expiry_date: subscriber.expiry_date, days_left: daysLeft, error: message },
        },
      ])
    }
  }

  const summary = { checked: subscribers.length, sent, errors }
  console.log("Compliance reminders run", summary)

  try {
    const failuresBlock =
      failureDetails.length > 0 ? `\n\nFailures:\n${failureDetails.map((line) => `- ${line}`).join("\n")}` : ""
    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: "aiformstudio@gmail.com",
      subject: `Compliance reminder run: ${summary.sent} sent, ${summary.errors} failed`,
      text: `Compliance reminder run summary\n\nDue today: ${summary.checked}\nSent: ${summary.sent}\nFailed: ${summary.errors}${failuresBlock}`,
    })
  } catch (error) {
    console.error("Compliance reminder internal summary email failed:", error)
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
      console.error("Compliance reminder review copy email failed:", error)
    }
  }

  return NextResponse.json({ ok: errors === 0, ...summary })
}

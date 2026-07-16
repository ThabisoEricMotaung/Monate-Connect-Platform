import { NextResponse } from "next/server"
import { Resend } from "resend"
import { reviewCopyEmail, SUPPLIER_EMAIL_REVIEW_RECIPIENT } from "@/lib/emailSignature"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { siteUrl } from "@/lib/weeklyDigest"
import { buildPublicDigestEmail, type DigestHighlight } from "@/lib/publicOpportunityDigest"

// Weekly email to everyone who signed up on /opportunities without creating
// a full account: how many new opportunities showed up this week, a handful
// of highlights closing soonest, and a link to browse the rest. The
// account-holder equivalent is weekly-supplier-digest — this is the public,
// no-profile-to-match-against version. Runs Monday mornings (see
// vercel.json), offset from weekly-supplier-digest so the two runs don't
// compete for the same Resend rate limit window.

type OpenRfq = {
  id: number
  title: string | null
  province: string | null
  provinces: string[] | null
  closing_date: string | null
  created_at: string | null
}

type Subscriber = {
  id: string
  email: string
  last_sent_at: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const LOOKBACK_MS = 7 * DAY_MS
const MAX_SUBSCRIBERS_PER_RUN = 5000
const FETCH_PAGE_SIZE = 1000
const HIGHLIGHT_COUNT = 5

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")
  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function provinceLabel(rfq: OpenRfq): string {
  const provinces = Array.isArray(rfq.provinces) ? rfq.provinces.filter(Boolean) : []
  return provinces.length > 0 ? provinces.join(", ") : rfq.province || "South Africa"
}

function closingLabel(rfq: OpenRfq): string {
  if (!rfq.closing_date) return "Deadline TBC"
  const d = new Date(rfq.closing_date)
  if (Number.isNaN(d.getTime())) return "Deadline TBC"
  return `Closes ${d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`
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
  const weekAgo = new Date(now.getTime() - LOOKBACK_MS)
  const base = siteUrl()
  const opportunitiesUrl = `${base}/opportunities`
  const signupUrl = `${base}/auth/signup`

  // Every currently-open, public opportunity.
  const openRfqs: OpenRfq[] = []
  {
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("rfqs")
        .select("id, title, province, provinces, closing_date, created_at")
        .ilike("status", "open")
        .eq("is_public", true)
        .gt("closing_date", now.toISOString())
        .order("closing_date", { ascending: true, nullsFirst: false })
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        console.error("Opportunity digest rfqs query failed:", error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }

      const rows = (data ?? []) as OpenRfq[]
      openRfqs.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
  }

  const totalOpen = openRfqs.length
  const newThisWeek = openRfqs.filter((rfq) => {
    if (!rfq.created_at) return false
    const created = new Date(rfq.created_at)
    return !Number.isNaN(created.getTime()) && created.getTime() >= weekAgo.getTime()
  }).length

  const highlights: DigestHighlight[] = openRfqs.slice(0, HIGHLIGHT_COUNT).map((rfq) => ({
    title: rfq.title ?? "Untitled opportunity",
    province: provinceLabel(rfq),
    closingLabel: closingLabel(rfq),
    url: `${base}/opportunities/${rfq.id}`,
  }))

  // Active (non-unsubscribed) subscribers.
  const subscribers: Subscriber[] = []
  {
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("opportunity_digest_subscribers")
        .select("id, email, last_sent_at")
        .is("unsubscribed_at", null)
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        console.error("Opportunity digest subscribers query failed:", error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }

      const rows = (data ?? []) as Subscriber[]
      subscribers.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE || subscribers.length >= MAX_SUBSCRIBERS_PER_RUN) break
      from += FETCH_PAGE_SIZE
    }
  }

  if (subscribers.length === 0) {
    console.log("Opportunity digest run", { checked: 0, sent: 0, skippedAlreadySent: 0, errors: 0, newThisWeek, totalOpen })
    return NextResponse.json({ ok: true, checked: 0, sent: 0, skippedAlreadySent: 0, errors: 0, newThisWeek, totalOpen })
  }

  // Idempotency: skip anyone already sent this digest in the last 6 days,
  // in case this run is retried manually the same week.
  const idempotencyCutoff = now.getTime() - 6 * DAY_MS

  const resend = new Resend(resendApiKey)
  let sent = 0
  let skippedAlreadySent = 0
  let errors = 0
  const failureDetails: string[] = []
  let reviewCopy: { subject: string; html: string; text: string } | null = null

  for (const subscriber of subscribers) {
    if (subscriber.last_sent_at) {
      const lastSent = new Date(subscriber.last_sent_at).getTime()
      if (!Number.isNaN(lastSent) && lastSent >= idempotencyCutoff) {
        skippedAlreadySent += 1
        continue
      }
    }

    const unsubscribeUrl = `${base}/api/unsubscribe/opportunity-digest?id=${subscriber.id}`
    const { subject, html, text } = buildPublicDigestEmail({
      newThisWeek,
      totalOpen,
      highlights,
      opportunitiesUrl,
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
          runLabel: "Opportunity Digest",
        })
      }

      await supabaseAdmin
        .from("opportunity_digest_subscribers")
        .update({ last_sent_at: now.toISOString() })
        .eq("id", subscriber.id)

      await supabaseAdmin.from("email_alerts").insert([
        {
          user_email: subscriber.email,
          alert_type: "Opportunity Digest",
          subject,
          message: text,
          status: "sent",
          sent_at: now.toISOString(),
          metadata: { subscriber_id: subscriber.id, new_this_week: newThisWeek, total_open: totalOpen, resend_id: sendResponse.data?.id ?? null },
        },
      ])
    } catch (error) {
      errors += 1
      const message = error instanceof Error ? error.message : "Unknown email send failure"
      failureDetails.push(`${subscriber.email}: ${message}`)
      console.error("Opportunity digest email failed:", { subscriberId: subscriber.id, error: message })
      await supabaseAdmin.from("email_alerts").insert([
        {
          user_email: subscriber.email,
          alert_type: "Opportunity Digest",
          subject,
          message: text,
          status: "failed",
          metadata: { subscriber_id: subscriber.id, new_this_week: newThisWeek, total_open: totalOpen, error: message },
        },
      ])
    }
  }

  const summary = {
    checked: subscribers.length,
    sent,
    skippedAlreadySent,
    errors,
    newThisWeek,
    totalOpen,
  }
  console.log("Opportunity digest run", summary)

  try {
    const summaryLines = [
      `Subscribers checked: ${summary.checked}`,
      `Sent: ${summary.sent}`,
      `Skipped (already sent this week): ${summary.skippedAlreadySent}`,
      `Failed: ${summary.errors}`,
      `New opportunities this week: ${summary.newThisWeek}`,
      `Total open opportunities: ${summary.totalOpen}`,
    ]
    const failuresBlock =
      failureDetails.length > 0 ? `\n\nFailures:\n${failureDetails.map((line) => `- ${line}`).join("\n")}` : ""

    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: "aiformstudio@gmail.com",
      subject: `Opportunity digest run: ${summary.sent} sent, ${summary.errors} failed`,
      text: `Opportunity digest run summary\n\n${summaryLines.join("\n")}${failuresBlock}`,
    })
  } catch (error) {
    console.error("Opportunity digest internal summary email failed:", error)
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
      console.error("Opportunity digest review copy email failed:", error)
    }
  }

  return NextResponse.json({ ok: errors === 0, ...summary })
}

import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { buildSubscribeConfirmationEmail } from "@/lib/publicOpportunityDigest"
import { siteUrl } from "@/lib/weeklyDigest"
import { reviewCopyEmail, SUPPLIER_EMAIL_REVIEW_RECIPIENT } from "@/lib/emailSignature"

// Public, no-account signup for the weekly "open opportunities" email —
// the lower-commitment alternative to full registration, offered on the
// /opportunities page. One row per email in opportunity_digest_subscribers;
// re-subscribing an email that previously unsubscribed just clears
// unsubscribed_at on the existing row rather than erroring or duplicating.

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : ""
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("opportunity_digest_subscribers")
    .select("id, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle()

  if (lookupError) {
    console.error("Opportunity digest subscribe lookup failed:", lookupError)
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again shortly." }, { status: 500 })
  }

  let subscriberId: string

  if (existing) {
    subscriberId = existing.id
    if (existing.unsubscribed_at) {
      const { error: reactivateError } = await supabaseAdmin
        .from("opportunity_digest_subscribers")
        .update({ unsubscribed_at: null })
        .eq("id", existing.id)

      if (reactivateError) {
        console.error("Opportunity digest reactivate failed:", reactivateError)
        return NextResponse.json({ ok: false, error: "Something went wrong. Please try again shortly." }, { status: 500 })
      }
    }
  } else {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("opportunity_digest_subscribers")
      .insert([{ email, source: "opportunities_page" }])
      .select("id")
      .single()

    if (insertError || !inserted) {
      console.error("Opportunity digest insert failed:", insertError)
      return NextResponse.json({ ok: false, error: "Something went wrong. Please try again shortly." }, { status: 500 })
    }
    subscriberId = inserted.id
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    const resend = new Resend(resendApiKey)
    const unsubscribeUrl = `${siteUrl()}/api/unsubscribe/opportunity-digest?id=${subscriberId}`
    const { subject, html, text } = buildSubscribeConfirmationEmail({ unsubscribeUrl })

    try {
      const { error: sendError } = await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: email,
        subject,
        html,
        text,
      })
      if (sendError) console.error("Opportunity digest confirmation email failed:", sendError)
    } catch (error) {
      // Subscription itself already succeeded — a failed confirmation email
      // isn't worth failing the request over, just log it.
      console.error("Opportunity digest confirmation email failed:", error)
    }

    try {
      const reviewCopy = reviewCopyEmail({
        subject,
        html,
        text,
        sourceLabel: email,
        runLabel: "Opportunity Digest Subscribe Confirmation",
      })
      await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: SUPPLIER_EMAIL_REVIEW_RECIPIENT,
        subject: reviewCopy.subject,
        html: reviewCopy.html,
        text: reviewCopy.text,
      })
    } catch (error) {
      console.error("Opportunity digest confirmation review copy failed:", error)
    }
  }

  return NextResponse.json({ ok: true })
}

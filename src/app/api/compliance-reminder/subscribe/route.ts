import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { buildComplianceSubscribeConfirmationEmail } from "@/lib/complianceReminder"
import { siteUrl } from "@/lib/weeklyDigest"

// Public, no-account signup for the B-BBEE expiry reminder — a lead magnet
// for people who found the Trust Center but aren't ready to register.
// One row per (email, reminder_type); resubmitting with a new date updates
// the existing row and resets reminded_at so a fresh reminder cycle starts.

const REMINDER_TYPE = "bbbee_expiry"
const MAX_YEARS_AHEAD = 3

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidExpiryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const maxDate = new Date(today)
  maxDate.setFullYear(maxDate.getFullYear() + MAX_YEARS_AHEAD)

  // Allow "yesterday" too — someone whose certificate lapsed a day ago and
  // is about to renew shouldn't be blocked from signing up for the next cycle.
  return d.getTime() >= yesterday.getTime() && d.getTime() <= maxDate.getTime()
}

export async function POST(request: Request) {
  let body: { email?: unknown; expiryDate?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : ""
  const expiryDate = typeof body.expiryDate === "string" ? body.expiryDate.trim() : ""

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 })
  }
  if (!expiryDate || !isValidExpiryDate(expiryDate)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid expiry date." }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("compliance_reminder_subscribers")
    .select("id, expiry_date")
    .ilike("email", email)
    .eq("reminder_type", REMINDER_TYPE)
    .maybeSingle()

  if (lookupError) {
    console.error("Compliance reminder subscribe lookup failed:", lookupError)
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again shortly." }, { status: 500 })
  }

  let subscriberId: string

  if (existing) {
    subscriberId = existing.id
    const dateChanged = existing.expiry_date !== expiryDate
    const { error: updateError } = await supabaseAdmin
      .from("compliance_reminder_subscribers")
      .update({
        expiry_date: expiryDate,
        unsubscribed_at: null,
        updated_at: new Date().toISOString(),
        // A new/changed date starts a fresh reminder cycle.
        ...(dateChanged ? { reminded_at: null } : {}),
      })
      .eq("id", existing.id)

    if (updateError) {
      console.error("Compliance reminder update failed:", updateError)
      return NextResponse.json({ ok: false, error: "Something went wrong. Please try again shortly." }, { status: 500 })
    }
  } else {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("compliance_reminder_subscribers")
      .insert([{ email, expiry_date: expiryDate, reminder_type: REMINDER_TYPE }])
      .select("id")
      .single()

    if (insertError || !inserted) {
      console.error("Compliance reminder insert failed:", insertError)
      return NextResponse.json({ ok: false, error: "Something went wrong. Please try again shortly." }, { status: 500 })
    }
    subscriberId = inserted.id
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    const resend = new Resend(resendApiKey)
    const unsubscribeUrl = `${siteUrl()}/api/unsubscribe/compliance-reminder?id=${subscriberId}`
    const { subject, html, text } = buildComplianceSubscribeConfirmationEmail({ expiryDate, unsubscribeUrl })

    try {
      const { error: sendError } = await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: email,
        subject,
        html,
        text,
      })
      if (sendError) console.error("Compliance reminder confirmation email failed:", sendError)
    } catch (error) {
      console.error("Compliance reminder confirmation email failed:", error)
    }
  }

  return NextResponse.json({ ok: true })
}

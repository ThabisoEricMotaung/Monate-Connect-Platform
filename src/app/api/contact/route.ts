import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"

const resend = new Resend(process.env.RESEND_API_KEY)

const supplierBody = `Thank you for your interest in AiForm Procure.

You can register your supplier business directly at:
https://www.aiformprocure.co.za/auth/signup

Registration takes about 5 minutes. You'll need your B-BBEE level, CSD number, and basic company details. Once your profile is live, verified buyers and procurement teams can find and contact you directly.

The platform is free during our pilot period until October 2026.

If you have any questions, reply to this email.

AiForm Procure Team`

const AUTO_REPLY_TEMPLATES: Record<string, { subject: string; body: string }> = {
  "Supplier Onboarding": {
    subject: "Welcome to AiForm Procure - complete your registration",
    body: supplierBody,
  },
  "Joining as a supplier": {
    subject: "Welcome to AiForm Procure - complete your registration",
    body: supplierBody,
  },
  "Buyer / Procurement Pilot": {
    subject: "AiForm Procure - buyer access enquiry received",
    body: `Thank you for your interest in sourcing through AiForm Procure.

We're currently onboarding verified buyer organisations during our pilot phase. A member of our team will be in touch within 2 business days to discuss your procurement needs and set up your buyer access.

In the meantime, you can browse our verified supplier network at:
https://www.aiformprocure.co.za/suppliers

AiForm Procure Team`,
  },
  "Sourcing as a buyer": {
    subject: "AiForm Procure - buyer access enquiry received",
    body: `Thank you for your interest in sourcing through AiForm Procure.

We're currently onboarding verified buyer organisations during our pilot phase. A member of our team will be in touch within 2 business days to discuss your procurement needs and set up your buyer access.

In the meantime, you can browse our verified supplier network at:
https://www.aiformprocure.co.za/suppliers

AiForm Procure Team`,
  },
  "Municipality Pilot": {
    subject: "AiForm Procure - municipality pilot enquiry received",
    body: `Thank you for your interest in the AiForm Procure municipality pilot.

We're working with a select group of municipalities during our pilot phase to streamline supplier verification and RFQ management. A member of our team will contact you within 2 business days to discuss your requirements.

AiForm Procure Team`,
  },
  "Municipality / Government": {
    subject: "AiForm Procure - municipality and government enquiry received",
    body: `Thank you for your interest in AiForm Procure for public sector procurement.

We're working with verified organisations during our pilot phase to streamline supplier verification and RFQ management. A member of our team will contact you within 2 business days to discuss your requirements.

AiForm Procure Team`,
  },
  "Mining / Enterprise Pilot": {
    subject: "AiForm Procure - enterprise pilot enquiry received",
    body: `Thank you for your interest in AiForm Procure for your enterprise.

We'll be in touch within 2 business days to discuss how AiForm Procure can support your supplier sourcing and verification requirements.

AiForm Procure Team`,
  },
  "Enterprise / Mining": {
    subject: "AiForm Procure - enterprise enquiry received",
    body: `Thank you for your interest in AiForm Procure for your organisation.

We'll be in touch within 2 business days to discuss how AiForm Procure can support your supplier sourcing and verification requirements.

AiForm Procure Team`,
  },
  "Investor / Partnership": {
    subject: "AiForm Procure - partnership enquiry received",
    body: `Thank you for your interest in partnering with AiForm Procure.

We'll review your enquiry and be in touch within 2 business days to explore how we can work together.

AiForm Procure Team`,
  },
  "Partnership or investment": {
    subject: "AiForm Procure - partnership enquiry received",
    body: `Thank you for your interest in partnering with AiForm Procure.

We'll review your enquiry and be in touch within 2 business days to explore how we can work together.

AiForm Procure Team`,
  },
  "Onboarding a supplier network": {
    subject: "AiForm Procure - supplier network enquiry received",
    body: `Thank you for your interest in onboarding your supplier network onto AiForm Procure.

Bulk onboarding partnerships are a priority for us during the pilot phase. A member of our team will be in touch within 2 business days to discuss how we can work together.

AiForm Procure Team`,
  },
  "Partnership or integration": {
    subject: "AiForm Procure - partnership enquiry received",
    body: `Thank you for your interest in partnering with AiForm Procure.

We'll review your enquiry and be in touch within 2 business days.

AiForm Procure Team`,
  },
}

const DEFAULT_TEMPLATE = {
  subject: "AiForm Procure - enquiry received",
  body: `Thank you for getting in touch with AiForm Procure.

We've received your enquiry and will be in touch within 2 business days.

AiForm Procure Team`,
}


export async function POST(request: Request) {
  // Database-backed rate limiting
  const rateLimitClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  let emailForRateLimit: string | null = null
  try {
    const raw = await request.clone().json()
    emailForRateLimit = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : null
  } catch { /* ignore */ }

  if (emailForRateLimit) {
    const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const { count } = await rateLimitClient
      .from("pilot_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", emailForRateLimit)
      .gte("created_at", cutoff)

    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please wait before submitting again." }, { status: 429 })
    }
  }

  // Input validation
  let body: { name?: unknown; email?: unknown; request_type?: unknown; organisation?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : ""
  const request_type = typeof body.request_type === "string" ? body.request_type.trim().slice(0, 100) : ""
  const organisation = typeof body.organisation === "string" ? body.organisation.trim().slice(0, 200) : ""

  if (!name || !email || !request_type) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email address." }, { status: 400 })
  }

  const template = AUTO_REPLY_TEMPLATES[request_type] ?? DEFAULT_TEMPLATE

  try {
    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: email,
      subject: template.subject,
      text: `Hi ${name},\n\n${template.body}`,
    })

    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: "aiformstudio@gmail.com",
      subject: `New pilot request: ${request_type} - ${organisation || name}`,
      text: `New contact form submission:\n\nName: ${name}\nOrganisation: ${organisation || "-"}\nEmail: ${email}\nRequest type: ${request_type}\n\nFull details are in the pilot_requests table in Supabase.`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Resend error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
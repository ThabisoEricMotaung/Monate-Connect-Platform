import { NextResponse } from "next/server"
import { Resend } from "resend"
import { reviewCopyEmail, SUPPLIER_EMAIL_REVIEW_RECIPIENT } from "@/lib/emailSignature"
import { createMatchAlertEmail, type MatchAlertEmailResult, type MatchAlertInput } from "@/lib/matchAlerts"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type EmailAlertRequest = {
  alerts?: MatchAlertInput[]
}

type SupplierRow = {
  id: string
  business_name: string | null
  email: string | null
}

type RFQRow = {
  id: number
  title: string | null
  deadline: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function emailHtml(body: string, rfqId: number): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="font-size:14px;line-height:1.7;margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("")

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#27332d;">
      <h2 style="font-size:21px;line-height:1.3;margin:0 0 14px;color:#1a3a2a;">A new opportunity matches your profile</h2>
      ${paragraphs}
      <p style="margin:0 0 24px;">
        <a href="https://www.aiformprocure.co.za/dashboard/rfqs/${rfqId}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">Review opportunity</a>
      </p>
    </div>
  `
}

function baseResult(attempted: number): MatchAlertEmailResult {
  return {
    attempted,
    sent: 0,
    failed: 0,
    emailAlertsCreated: 0,
    errors: [],
    results: [],
  }
}

async function logEmailAlert({
  actor,
  supplier,
  rfq,
  subject,
  message,
  status,
  error,
  matchScore,
  resendId,
}: {
  actor: { userId: string | null; userEmail: string | null }
  supplier: SupplierRow | null
  rfq: RFQRow
  subject: string
  message: string
  status: "sent" | "failed"
  error?: string | null
  matchScore: number
  resendId?: string | null
}) {
  if (!supabaseAdmin) return false

  const { error: insertError } = await supabaseAdmin.from("email_alerts").insert([
    {
      user_id: actor.userId,
      user_email: actor.userEmail,
      supplier_id: supplier?.id ?? null,
      supplier_name: supplier?.business_name ?? "Supplier",
      supplier_email: supplier?.email ?? null,
      alert_type: "RFQ Match Email",
      subject,
      message,
      rfq_id: rfq.id,
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      metadata: {
        match_score: matchScore,
        resend_id: resendId ?? null,
        error: error ?? null,
      },
    },
  ])

  return !insertError
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json({ error: "Email service is not configured." }, { status: 500 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { data: actorProfile, error: actorProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle()

  if (actorProfileError) {
    return NextResponse.json({ error: actorProfileError.message }, { status: 500 })
  }

  const role = String(actorProfile?.role ?? "").trim().toLowerCase()
  if (role !== "admin" && role !== "buyer") {
    return NextResponse.json({ error: "Admin or buyer access required." }, { status: 403 })
  }

  let body: EmailAlertRequest
  try {
    body = (await request.json()) as EmailAlertRequest
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const alerts = Array.isArray(body.alerts) ? body.alerts : []
  const result = baseResult(alerts.length)
  if (alerts.length === 0) return NextResponse.json(result)

  const resend = new Resend(resendApiKey)
  const actor = {
    userId: user.id,
    userEmail: user.email ?? actorProfile?.email ?? null,
  }
  let reviewCopy: { subject: string; html: string; text: string } | null = null

  for (const alert of alerts) {
    const supplierId = alert.supplier?.id
    const rfqId = Number(alert.rfq?.id)
    const matchScore = Number.isFinite(Number(alert.matchScore)) ? Math.round(Number(alert.matchScore)) : 0

    const rfq: RFQRow = {
      id: rfqId,
      title: alert.rfq?.title ?? null,
      deadline: alert.rfq?.deadline ?? null,
    }

    let supplier: SupplierRow | null = null
    let subject = ""
    let message = ""

    try {
      if (!supplierId || !Number.isFinite(rfqId)) {
        throw new Error("Missing supplier or RFQ reference.")
      }

      const [supplierResult, rfqResult] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, business_name, email")
          .eq("id", supplierId)
          .eq("role", "supplier")
          .maybeSingle(),
        supabaseAdmin
          .from("rfqs")
          .select("id, title, deadline")
          .eq("id", rfqId)
          .maybeSingle(),
      ])

      if (supplierResult.error) throw supplierResult.error
      if (rfqResult.error) throw rfqResult.error
      if (!supplierResult.data) throw new Error("Supplier profile not found.")
      if (!rfqResult.data) throw new Error("RFQ not found.")

      supplier = supplierResult.data as SupplierRow
      const loadedRfq = rfqResult.data as RFQRow
      rfq.title = loadedRfq.title
      rfq.deadline = loadedRfq.deadline

      const email = createMatchAlertEmail({
        supplier,
        rfq,
        matchScore,
      })
      subject = email.subject
      message = email.body

      if (!supplier.email?.trim()) {
        throw new Error("Supplier has no email address on file.")
      }

      const html = emailHtml(message, rfq.id)
      const sendResponse = await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: supplier.email,
        subject,
        html,
        text: message,
      })
      if (sendResponse.error) {
        throw new Error(sendResponse.error.message)
      }

      if (!reviewCopy) {
        reviewCopy = reviewCopyEmail({
          subject,
          html,
          text: message,
          sourceLabel: supplier.business_name ?? "Supplier",
          runLabel: "RFQ Match Alert",
        })
      }

      const logged = await logEmailAlert({
        actor,
        supplier,
        rfq,
        subject,
        message,
        status: "sent",
        matchScore,
        resendId: sendResponse.data?.id ?? null,
      })
      if (logged) result.emailAlertsCreated += 1

      result.sent += 1
      result.results.push({
        supplierId,
        supplierName: supplier.business_name ?? "Supplier",
        status: "sent",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown email send failure"
      const supplierName = supplier?.business_name ?? alert.supplier?.business_name ?? "Supplier"
      result.failed += 1
      result.errors.push(`${supplierName}: ${errorMessage}`)

      if (!subject || !message) {
        const fallback = createMatchAlertEmail({
          supplier: {
            id: supplierId ?? "",
            business_name: supplierName,
            email: supplier?.email ?? alert.supplier?.email ?? null,
          },
          rfq,
          matchScore,
        })
        subject = fallback.subject
        message = fallback.body
      }

      const logged = await logEmailAlert({
        actor,
        supplier: supplier ?? {
          id: supplierId ?? "",
          business_name: supplierName,
          email: alert.supplier?.email ?? null,
        },
        rfq,
        subject,
        message,
        status: "failed",
        error: errorMessage,
        matchScore,
      })
      if (logged) result.emailAlertsCreated += 1

      result.results.push({
        supplierId: supplierId ?? "",
        supplierName,
        status: "failed",
        error: errorMessage,
      })
    }
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
      console.error("Match alert review copy email failed:", error)
    }
  }

  return NextResponse.json(result)
}

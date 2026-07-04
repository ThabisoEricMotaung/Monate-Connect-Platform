import { NextResponse } from "next/server"
import { isPayFastTier, payfastPlans } from "@/lib/payfast-plans"
import {
  generatePayFastSignature,
  getClientIp,
  isAllowedPayFastIp,
  nextBillingDateFromPayload,
  parsePayFastBody,
  statusFromPayFast,
  toPayFastParamString,
  validatePayFastServerConfirmation,
} from "@/lib/payfast-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

type ValidationStatus = "received" | "accepted" | "rejected" | "error"

async function logItn(input: {
  status: ValidationStatus
  errors: string[]
  payload: Record<string, string>
  requestIp: string
}) {
  if (!supabaseAdmin) return

  await supabaseAdmin.from("payfast_itn_logs").insert({
    merchant_payment_id: input.payload.m_payment_id ?? null,
    payfast_payment_id: input.payload.pf_payment_id ?? null,
    request_ip: input.requestIp || null,
    validation_status: input.status,
    validation_errors: input.errors,
    payload: input.payload,
  })
}

function amountMatches(expected: number, fields: Record<string, string>): boolean {
  const rawAmount = fields.amount_gross ?? fields.amount
  const paidAmount = Number(rawAmount)

  return Number.isFinite(paidAmount) && Math.abs(expected - paidAmount) <= 0.01
}

export async function POST(request: Request) {
  const requestIp = getClientIp(request)
  let payload: Record<string, string> = {}
  const errors: string[] = []

  try {
    if (!supabaseAdmin) {
      errors.push("Supabase service role is not configured")
      await logItn({ status: "error", errors, payload, requestIp })
      return new Response(null, { status: 200 })
    }

    const passphrase = process.env.PAYFAST_PASSPHRASE
    if (!passphrase) {
      errors.push("PAYFAST_PASSPHRASE is not configured")
      await logItn({ status: "error", errors, payload, requestIp })
      return new Response(null, { status: 200 })
    }

    payload = parsePayFastBody(await request.text())
    await logItn({ status: "received", errors: [], payload, requestIp })

    const expectedSignature = generatePayFastSignature(payload, passphrase)
    if (!payload.signature || payload.signature !== expectedSignature) {
      errors.push("Invalid PayFast signature")
    }

    if (!(await isAllowedPayFastIp(requestIp))) {
      errors.push(`Invalid PayFast source IP: ${requestIp || "unknown"}`)
    }

    const tier = payload.custom_str2
    if (!isPayFastTier(tier)) {
      errors.push("Invalid or missing subscription tier")
    }

    if (isPayFastTier(tier) && !amountMatches(payfastPlans[tier].amount, payload)) {
      errors.push("PayFast amount does not match the selected plan")
    }

    const serverValidated = await validatePayFastServerConfirmation(toPayFastParamString(payload))
    if (!serverValidated) {
      errors.push("PayFast server confirmation returned INVALID")
    }

    if (errors.length > 0) {
      await logItn({ status: "rejected", errors, payload, requestIp })
      return new Response(null, { status: 200 })
    }

    const userId = payload.custom_str1
    if (!userId || !isPayFastTier(tier)) {
      await logItn({
        status: "rejected",
        errors: ["Missing user ID or tier after validation"],
        payload,
        requestIp,
      })
      return new Response(null, { status: 200 })
    }

    const plan = payfastPlans[tier]
    const status = statusFromPayFast(payload.payment_status, payload.type)
    const nextBillingDate = nextBillingDateFromPayload(payload, tier)

    const { error: upsertError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          tier,
          status,
          payfast_token: payload.token || null,
          payfast_payment_id: payload.pf_payment_id || null,
          merchant_payment_id: payload.m_payment_id || null,
          amount: plan.amount,
          billing_frequency: plan.billingFrequency,
          next_billing_date: nextBillingDate,
          raw_itn_payload: payload,
        },
        { onConflict: "user_id" }
      )

    if (upsertError) {
      await logItn({
        status: "error",
        errors: [upsertError.message],
        payload,
        requestIp,
      })
      return new Response(null, { status: 200 })
    }

    await logItn({ status: "accepted", errors: [], payload, requestIp })
    return new Response(null, { status: 200 })
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown PayFast ITN error")
    await logItn({ status: "error", errors, payload, requestIp })
    return new Response(null, { status: 200 })
  }
}

export function GET() {
  return NextResponse.json({ ok: true, route: "payfast-notify" })
}

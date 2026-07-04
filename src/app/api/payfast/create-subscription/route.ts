import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { isPayFastTier, payfastPlans } from "@/lib/payfast-plans"
import {
  buildPayFastSubscriptionFields,
  getRequiredPayFastEnv,
  PAYFAST_PROCESS_URL,
} from "@/lib/payfast-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const authHeader = request.headers.get("authorization")

  if (!supabaseUrl || !supabaseAnonKey || !supabaseAdmin) {
    return new Response("Supabase is not configured", { status: 500 })
  }

  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 })
  }

  const env = getRequiredPayFastEnv()
  if (!env.ok) {
    return NextResponse.json(
      { error: "PayFast is not configured", missing: env.missing },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""))

  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const tier = body?.tier

  if (!isPayFastTier(tier)) {
    return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 })
  }

  const plan = payfastPlans[tier]
  const fields = buildPayFastSubscriptionFields({
    plan,
    userId: user.id,
    email: user.email,
    appUrl: env.appUrl,
    merchantId: env.merchantId,
    merchantKey: env.merchantKey,
    passphrase: env.passphrase,
  })

  const { error: subscriptionError } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        tier: plan.tier,
        status: "pending",
        amount: plan.amount,
        billing_frequency: plan.billingFrequency,
        merchant_payment_id: fields.m_payment_id,
      },
      { onConflict: "user_id" }
    )

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 500 })
  }

  return NextResponse.json({
    url: PAYFAST_PROCESS_URL,
    fields,
    plan: {
      tier: plan.tier,
      label: plan.label,
      displayPrice: plan.displayPrice,
      billingFrequency: plan.billingFrequency,
    },
  })
}

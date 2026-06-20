import AfricasTalking from "africastalking"
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  OTP_COOLDOWN_SECONDS,
  generateOtpCode,
  hashOtpCode,
  normalizeSAPhone,
  otpExpiryDate,
  otpSentAtFromExpiry,
} from "@/lib/phoneOtp"

type SendOtpRequest = {
  phone?: unknown
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: "Supabase service role client is not configured." },
      { status: 500 }
    )
  }

  const apiKey = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME
  if (!apiKey || !username) {
    return NextResponse.json(
      { success: false, error: "Africa's Talking SMS is not configured." },
      { status: 500 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 })
  }

  let body: SendOtpRequest
  try {
    body = (await request.json()) as SendOtpRequest
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  const phone = normalizeSAPhone(body.phone)
  if (!phone) {
    return NextResponse.json(
      { success: false, error: "Enter a valid South African phone number in +27xxxxxxxxx format." },
      { status: 400 }
    )
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, otp_expires_at")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 })
  }

  const now = new Date()
  const expiresAt = profile.otp_expires_at as string | null
  const sentAt = otpSentAtFromExpiry(expiresAt)
  const isExistingCodeValid = expiresAt ? new Date(expiresAt).getTime() > now.getTime() : false

  if (isExistingCodeValid && sentAt) {
    const elapsedSeconds = Math.floor((now.getTime() - sentAt.getTime()) / 1000)
    if (elapsedSeconds < OTP_COOLDOWN_SECONDS) {
      return NextResponse.json(
        {
          success: false,
          error: "Please wait before requesting a new code",
          retryAfter: OTP_COOLDOWN_SECONDS - elapsedSeconds,
        },
        { status: 429 }
      )
    }
  }

  const otp = generateOtpCode()
  const hashedOtp = hashOtpCode(otp)
  const nextExpiry = otpExpiryDate(now)

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      phone,
      otp_code: hashedOtp,
      otp_expires_at: nextExpiry.toISOString(),
      otp_attempts: 0,
      updated_at: now.toISOString(),
    })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  try {
    const client = AfricasTalking({ apiKey, username })
    await client.SMS.send({
      to: [phone],
      message: `Your AiForm Procure verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      ...(process.env.AT_SENDER_ID ? { senderId: process.env.AT_SENDER_ID } : {}),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not send verification SMS.",
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true })
}

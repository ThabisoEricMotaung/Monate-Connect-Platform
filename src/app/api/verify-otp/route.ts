import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  OTP_MAX_ATTEMPTS,
  hashOtpCode,
  normalizeOtpCode,
  normalizeSAPhone,
} from "@/lib/phoneOtp"

type VerifyOtpRequest = {
  phone?: unknown
  code?: unknown
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: "Supabase service role client is not configured." },
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

  let body: VerifyOtpRequest
  try {
    body = (await request.json()) as VerifyOtpRequest
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  const phone = normalizeSAPhone(body.phone)
  const code = normalizeOtpCode(body.code)

  if (!phone) {
    return NextResponse.json(
      { success: false, error: "Enter a valid South African phone number in +27xxxxxxxxx format." },
      { status: 400 }
    )
  }

  if (!code) {
    return NextResponse.json({ success: false, error: "Enter the 6-digit verification code." }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, otp_code, otp_expires_at, otp_attempts")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 500 })
  }

  if (!profile?.otp_code || !profile.otp_expires_at) {
    return NextResponse.json(
      { success: false, error: "Please request a new verification code." },
      { status: 400 }
    )
  }

  const attempts = Number(profile.otp_attempts ?? 0)
  if (attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please request a new code." },
      { status: 429 }
    )
  }

  if (new Date(profile.otp_expires_at as string).getTime() <= Date.now()) {
    return NextResponse.json(
      { success: false, error: "Code expired. Please request a new one." },
      { status: 400 }
    )
  }

  const submittedHash = hashOtpCode(code)
  if (submittedHash !== profile.otp_code) {
    const nextAttempts = attempts + 1
    const attemptsRemaining = Math.max(OTP_MAX_ATTEMPTS - nextAttempts, 0)
    const { error: attemptsError } = await supabaseAdmin
      .from("profiles")
      .update({ otp_attempts: nextAttempts })
      .eq("id", user.id)

    if (attemptsError) {
      return NextResponse.json({ success: false, error: attemptsError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: false,
        error: `Invalid code. ${attemptsRemaining} attempts remaining.`,
        attemptsRemaining,
      },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      phone,
      phone_verified_at: now,
      otp_code: null,
      otp_expires_at: null,
      otp_attempts: 0,
      updated_at: now,
    })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

import { Resend } from "resend"
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

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json(
      { success: false, error: "Email service is not configured." },
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
    const resend = new Resend(resendApiKey)
    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: user.email!,
      subject: "Your AiForm Procure verification code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <img src="https://www.aiformprocure.co.za/logo.png" alt="AiForm Procure" style="height:36px;margin-bottom:24px;" />
          <h2 style="font-size:20px;font-weight:600;color:#1a3a2a;margin-bottom:8px;">Phone verification code</h2>
          <p style="color:#444;font-size:14px;margin-bottom:24px;">Use the code below to verify your phone number. It expires in 10 minutes.</p>
          <div style="background:#f4f0e8;border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a3a2a;">${otp}</span>
          </div>
          <p style="color:#888;font-size:12px;">Do not share this code with anyone. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not send verification email.",
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true })
}

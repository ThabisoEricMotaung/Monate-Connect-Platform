"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import BrandMark from "@/components/BrandMark"
import { formatSAPhoneInput, phoneBlurValue, phoneFocusValue, validateSAPhone } from "@/lib/formValidation"
import { supabase } from "@/lib/supabase"

const OTP_LENGTH = 6
const MAX_ATTEMPTS = 5

type SendOtpResponse = {
  success?: boolean
  error?: string
  retryAfter?: number
}

type VerifyOtpResponse = {
  success?: boolean
  error?: string
  attemptsRemaining?: number
}

function digitArrayFromCode(code: string) {
  return Array.from({ length: OTP_LENGTH }, (_, index) => code[index] ?? "")
}

export default function VerifyPhonePage() {
  const router = useRouter()
  const digitRefs = useRef<Array<HTMLInputElement | null>>([])
  const [checking, setChecking] = useState(true)
  const [phone, setPhone] = useState("+27")
  const [otp, setOtp] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [verified, setVerified] = useState(false)

  const digits = useMemo(() => digitArrayFromCode(otp), [otp])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const phoneParam = params.get("phone")
    if (phoneParam) setPhone(formatSAPhoneInput(phoneParam).slice(0, 12))
  }, [])

  useEffect(() => {
    async function guardPage() {
      if (!supabase) {
        router.replace("/auth/login")
        return
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        router.replace("/auth/login")
        return
      }

      const provider = session.user.app_metadata?.provider
      if (provider === "google" || provider === "azure") {
        router.replace("/dashboard")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, phone_verified_at")
        .eq("id", session.user.id)
        .maybeSingle()

      if (profile?.phone_verified_at) {
        sessionStorage.removeItem("phone_skipped")
        router.replace("/dashboard")
        return
      }

      if (profile?.phone && !new URLSearchParams(window.location.search).get("phone")) {
        setPhone(formatSAPhoneInput(profile.phone).slice(0, 12))
      }

      setChecking(false)
    }

    guardPage()
  }, [router])

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (!verified) return

    const timer = window.setTimeout(() => {
      router.replace("/dashboard")
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [router, verified])

  const updatePhone = (value: string) => {
    const formatted = formatSAPhoneInput(value)
    setPhone(formatted.slice(0, 12))
    setError(null)
  }

  const handleSendCode = async () => {
    setError(null)
    setAttemptsRemaining(null)

    const formattedPhone = formatSAPhoneInput(phone).slice(0, 12)
    if (!validateSAPhone(formattedPhone)) {
      setError("Enter a valid South African mobile number, for example +27821234567.")
      return
    }

    setPhone(formattedPhone)
    setSending(true)

    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone }),
      })
      const payload = (await response.json()) as SendOtpResponse

      if (!response.ok || !payload.success) {
        setCooldown(typeof payload.retryAfter === "number" ? payload.retryAfter : 0)
        setError(payload.error ?? "Could not send verification code.")
        return
      }

      setCodeSent(true)
      setOtp("")
      setCooldown(60)
      window.setTimeout(() => digitRefs.current[0]?.focus(), 100)
    } catch {
      setError("Could not send verification code. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formattedPhone = formatSAPhoneInput(phone).slice(0, 12)
    if (!validateSAPhone(formattedPhone)) {
      setError("Enter a valid South African mobile number.")
      return
    }

    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code sent to your phone.")
      return
    }

    setVerifying(true)

    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, code: otp }),
      })
      const payload = (await response.json()) as VerifyOtpResponse

      if (!response.ok || !payload.success) {
        setError(payload.error ?? "Could not verify code.")
        if (typeof payload.attemptsRemaining === "number") {
          setAttemptsRemaining(payload.attemptsRemaining)
        }
        return
      }

      setAttemptsRemaining(null)
      sessionStorage.removeItem("phone_skipped")
      setVerified(true)
    } catch {
      setError("Could not verify code. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  const updateDigit = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, "")
    const nextDigits = digitArrayFromCode(otp)

    if (value.length > 1) {
      const pastedDigits = value.slice(0, OTP_LENGTH).split("")
      setOtp(pastedDigits.join(""))
      digitRefs.current[Math.min(pastedDigits.length, OTP_LENGTH) - 1]?.focus()
      return
    }

    nextDigits[index] = value
    setOtp(nextDigits.join("").slice(0, OTP_LENGTH))
    setError(null)

    if (value && index < OTP_LENGTH - 1) {
      digitRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }

  const handleSkipForNow = () => {
    sessionStorage.setItem("phone_skipped", "true")
    router.replace("/dashboard")
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f4ec] px-4 text-[#1a3a2a]">
        <div className="rounded-md border border-[#c8a060]/40 bg-white px-6 py-5 text-sm font-semibold shadow-sm">
          Checking phone verification...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-4 py-10 font-sans text-[#1a3a2a]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-md border border-[#c8a060]/35 bg-white p-6 shadow-[0_20px_70px_rgba(26,58,42,0.14)] sm:p-8">
          <div className="mb-7 flex flex-col items-center text-center">
            <BrandMark className="h-16 w-16" imageClassName="h-10 w-auto" />
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-[#c8a060]">
              AiForm Procure
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-[#1a3a2a]">
              Verify your phone number
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#466253]">
              Enter your South African mobile number to receive a verification code.
            </p>
          </div>

          {verified ? (
            <div className="rounded-md border border-[#5DCAA5]/40 bg-[#5DCAA5]/10 px-5 py-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#5DCAA5] text-3xl font-bold text-[#1a3a2a]">
                ✓
              </div>
              <h2 className="mt-4 font-display text-3xl font-semibold text-[#1a3a2a]">Phone verified!</h2>
              <p className="mt-2 text-sm text-[#466253]">Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1a3a2a]" htmlFor="phone">
                  Mobile number
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => updatePhone(event.target.value)}
                  onFocus={() => setPhone(phoneFocusValue(phone).slice(0, 12))}
                  onBlur={() => setPhone(phoneBlurValue(phone).slice(0, 12) || "+27")}
                  placeholder="+27821234567"
                  className="mt-2 w-full rounded-md border border-[#c8a060]/45 bg-[#f8f4ec] px-4 py-3 text-base font-semibold text-[#1a3a2a] outline-none transition placeholder:text-[#466253]/55 focus:border-[#5DCAA5] focus:ring-2 focus:ring-[#5DCAA5]/30"
                />
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending || cooldown > 0}
                className="w-full rounded-md bg-[#1a3a2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#123020] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {sending ? "Sending code..." : cooldown > 0 ? `Send Code (${cooldown}s)` : codeSent ? "Send Code Again" : "Send Code"}
              </button>

              {codeSent && (
                <div>
                  <label className="block text-sm font-semibold text-[#1a3a2a]">Verification code</label>
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {digits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          digitRefs.current[index] = element
                        }}
                        aria-label={`Verification digit ${index + 1}`}
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => updateDigit(index, event)}
                        onKeyDown={(event) => handleDigitKeyDown(index, event.key)}
                        className="h-12 rounded-md border border-[#c8a060]/55 bg-[#f8f4ec] text-center text-xl font-bold text-[#1a3a2a] outline-none transition focus:border-[#5DCAA5] focus:ring-2 focus:ring-[#5DCAA5]/30"
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      disabled={cooldown > 0 || sending}
                      onClick={handleSendCode}
                      className="w-fit font-semibold text-[#1a3a2a] underline-offset-4 transition hover:text-[#c8a060] hover:underline disabled:cursor-not-allowed disabled:text-[#466253]/50 disabled:no-underline"
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                    </button>
                    {attemptsRemaining !== null && (
                      <p className="font-semibold text-[#466253]">
                        {attemptsRemaining} of {MAX_ATTEMPTS} attempts remaining
                      </p>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              {codeSent && (
                <button
                  type="submit"
                  disabled={verifying || otp.length !== OTP_LENGTH}
                  className="w-full rounded-md bg-[#5DCAA5] px-5 py-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#4bb995] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {verifying ? "Verifying..." : "Verify Code"}
                </button>
              )}

              <button
                type="button"
                onClick={handleSkipForNow}
                className="block w-full text-center text-xs font-semibold text-[#466253] underline-offset-4 transition hover:text-[#1a3a2a] hover:underline"
              >
                Skip for now
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

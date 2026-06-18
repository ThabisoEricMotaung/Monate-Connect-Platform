"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import BrandMark from "@/components/BrandMark"
import { supabase } from "@/lib/supabase"

function VerifyEmailLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">
      <p className="text-sm text-secondary">Checking your account status…</p>
    </main>
  )
}

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams.get("email") ?? ""

  const [email, setEmail] = useState(emailFromQuery)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")
  const [resendError, setResendError] = useState("")
  const [checking, setChecking] = useState(true)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  useEffect(() => {
    async function checkVerified() {
      if (!supabase) { setChecking(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      const provider = user?.app_metadata?.provider
      if (user?.email && !emailFromQuery) {
        setEmail(user.email)
      }
      if (user && (provider !== "email" || user.email_confirmed_at)) {
        router.replace("/dashboard")
      } else {
        setChecking(false)
      }
    }
    checkVerified()
  }, [emailFromQuery, router])

  useEffect(() => {
    if (cooldownSeconds <= 0) return

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [cooldownSeconds])

  const handleResend = async () => {
    if (!supabase) {
      setResendError("Supabase environment variables are not configured.")
      return
    }

    if (!email) {
      setResendError("Email address not found. Please return to the registration page.")
      return
    }

    setResending(true)
    setResendMessage("")
    setResendError("")
    const { error } = await supabase.auth.resend({ type: "signup", email })
    if (error) {
      setResendError(error.message)
    } else {
      setResendMessage("Verification email sent")
      setCooldownSeconds(60)
    }
    setResending(false)
  }

  if (checking) {
    return <VerifyEmailLoading />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-10 text-primary">
      <div className="w-full max-w-lg rounded-3xl border border-panel bg-panel p-8 shadow-panel text-center">
        <div className="mx-auto mb-6 flex w-fit items-center justify-center">
          <BrandMark className="h-16 w-16" imageClassName="h-9 w-auto" />
        </div>

        <p className="text-xs uppercase tracking-[0.24em] text-accent">Supplier onboarding</p>
        <h1 className="mt-3 text-4xl font-semibold text-primary">Check your email</h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-secondary">
          We&apos;ve sent a verification link to{" "}
          {email ? (
            <strong className="text-primary">{email}</strong>
          ) : (
            "your email address"
          )}
          . Click the link in that email to activate your account before continuing.
        </p>

        {resendMessage && (
          <div className="mt-5 rounded-2xl border border-success bg-success/10 px-5 py-3">
            <p className="text-sm font-semibold text-success">{resendMessage}</p>
          </div>
        )}

        {resendError && (
          <div className="mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-3">
            <p className="text-sm font-semibold text-rose-700">{resendError}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldownSeconds > 0}
            className="w-full rounded-2xl border border-panel bg-surface py-4 text-sm font-semibold text-secondary transition duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent disabled:opacity-50"
          >
            {resending
              ? "Sending..."
              : cooldownSeconds > 0
                ? `Resend verification email (${cooldownSeconds}s)`
                : "Resend verification email"}
          </button>

          <Link
            href="/auth/login"
            className="block text-sm font-semibold text-accent transition hover:text-accent-strong"
          >
            Back to login
          </Link>
        </div>

      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  )
}

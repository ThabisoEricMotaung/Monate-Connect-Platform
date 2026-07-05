"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function BillingReturnPage() {
  const router = useRouter()

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      router.replace("/dashboard")
    }, 6000)

    return () => window.clearTimeout(redirectTimer)
  }, [router])

  return (
    <main className="flex min-h-screen items-center bg-[#f0ebe0] bg-[radial-gradient(circle_at_top_left,_rgba(200,160,96,0.24),_transparent_34%),linear-gradient(135deg,_#f7f1e6_0%,_#f0ebe0_48%,_#dfe8dc_100%)] px-6 py-16 text-[#1a3a2a]">
      <section className="mx-auto w-full max-w-3xl rounded-lg border border-white/70 bg-white/70 p-8 shadow-[0_24px_80px_rgba(26,58,42,0.16)] backdrop-blur md:p-10">
        <p className="inline-flex rounded-full border border-[#c8a060]/40 bg-[#fff8ea]/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#168567]">
          Payment submitted
        </p>
        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-[#1a3a2a] md:text-5xl">
          PayFast is confirming your subscription.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#53665c] md:text-base">
          Your payment was submitted on PayFast. The subscription will become active after
          PayFast sends the server confirmation to AiForm Procure.
        </p>
        <p className="mt-4 text-sm font-semibold text-[#1a3a2a]">
          We will send you to your dashboard automatically in a few seconds.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-md bg-[#1a3a2a] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#10251b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a060]"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  )
}

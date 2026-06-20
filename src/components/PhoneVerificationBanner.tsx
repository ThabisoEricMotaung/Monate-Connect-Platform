"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

function remainingLabel(expiresAt: string) {
  const remainingMs = Math.max(new Date(expiresAt).getTime() - Date.now(), 0)
  const totalMinutes = Math.ceil(remainingMs / 60000)

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`
}

export default function PhoneVerificationBanner({ graceExpiresAt }: { graceExpiresAt: string }) {
  const [label, setLabel] = useState(() => remainingLabel(graceExpiresAt))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLabel(remainingLabel(graceExpiresAt))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [graceExpiresAt])

  return (
    <div className="mb-5 rounded-md border border-[#1a3a2a]/20 bg-[#c8a060] px-4 py-3 text-[#1a3a2a] shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold">
          Verify your phone number to maintain access. Your grace period expires in {label}.
        </p>
        <Link
          href="/auth/verify-phone"
          className="inline-flex w-fit items-center justify-center rounded-md bg-[#1a3a2a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#123020]"
        >
          Verify Now
        </Link>
      </div>
    </div>
  )
}

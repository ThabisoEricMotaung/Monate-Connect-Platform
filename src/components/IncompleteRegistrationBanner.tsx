"use client"

import Link from "next/link"
import { useRegistrationStatus } from "@/hooks/useRegistrationStatus"

export default function IncompleteRegistrationBanner() {
  const registrationStatus = useRegistrationStatus()

  if (registrationStatus.state !== "incomplete") return null

  return (
    <section className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold leading-6">
          Your registration is incomplete &mdash; please complete your profile to access your dashboard.
        </p>
        <Link
          href="/register?source=oauth"
          className="inline-flex w-fit items-center justify-center rounded-md bg-[#c8960c] px-4 py-2 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d8a91c]"
        >
          Complete registration
        </Link>
      </div>
    </section>
  )
}

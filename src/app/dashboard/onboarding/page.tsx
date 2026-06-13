"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type OnboardingProfile = {
  full_name: string | null
  business_name: string | null
  csd_number: string | null
  bbbee_level: string | null
  bbbee_document_url: string | null
  banking_verified: boolean | null
  bank_verified: boolean | null
  onboarding_seen: boolean | null
}

type ChecklistItem = {
  label: string
  href: string
  done: boolean
}

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <path d="m5 12 5 5 9-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        </svg>
      </span>
    )
  }
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-panel bg-surface">
      <span className="sr-only">Incomplete</span>
    </span>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingDone, setMarkingDone] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) { router.replace("/auth/login"); return }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { router.replace("/auth/login"); return }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, business_name, csd_number, bbbee_level, bbbee_document_url, banking_verified, bank_verified, onboarding_seen")
        .eq("id", user.id)
        .maybeSingle()

      setProfile(data as OnboardingProfile | null)
      setLoading(false)

      // Mark onboarding as seen (non-blocking)
      if (data && !data.onboarding_seen) {
        supabase.from("profiles").update({ onboarding_seen: true }).eq("id", user.id).then(() => {})
      }
    }
    load()
  }, [router])

  const firstName = profile?.full_name?.split(" ")[0] ?? "there"

  const checklist: ChecklistItem[] = profile
    ? [
        {
          label: "Complete business profile",
          href: "/dashboard/profile",
          done: Boolean(profile.business_name),
        },
        {
          label: "Upload BBBEE certificate",
          href: "/dashboard/profile?tab=verification",
          done: Boolean(profile.bbbee_document_url),
        },
        {
          label: "Confirm CSD number",
          href: "/dashboard/profile?tab=verification",
          done: Boolean(profile.csd_number),
        },
        {
          label: "Add banking details",
          href: "/dashboard/profile?tab=banking",
          done: Boolean(profile.banking_verified || profile.bank_verified),
        },
        {
          label: "Browse open RFQs",
          href: "/dashboard/rfqs",
          done: false,
        },
      ]
    : []

  const completedCount = checklist.filter((item) => item.done).length

  const handleGotoDashboard = async () => {
    setMarkingDone(true)
    if (supabase && profile !== null) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("profiles").update({ onboarding_seen: true }).eq("id", user.id)
      }
    }
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-secondary">Loading your workspace…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">

      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-accent">Supplier onboarding</p>
        <h1 className="mt-3 text-4xl font-semibold text-primary">
          Welcome to AiForm Procure, {firstName}.
        </h1>
        <p className="mt-3 text-sm leading-7 text-secondary">
          Your account is active. Complete the steps below to get matched with procurement opportunities.
        </p>
      </div>

      <div className="rounded-2xl border border-panel bg-card p-6 shadow-panel">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-heading">Onboarding checklist</h2>
          <span className="text-sm font-semibold text-accent">{completedCount} / {checklist.length} complete</span>
        </div>

        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-panel">
          <div
            className="h-2 rounded-full bg-success transition-all"
            style={{ width: checklist.length > 0 ? `${(completedCount / checklist.length) * 100}%` : "0%" }}
          />
        </div>

        <ul className="space-y-3">
          {checklist.map((item, index) => (
            <li key={item.href + index}>
              <Link
                href={item.href}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  item.done
                    ? "border-success/20 bg-success/5 text-heading"
                    : "border-panel bg-surface text-secondary hover:border-accent hover:text-primary"
                }`}
              >
                <CheckIcon done={item.done} />
                <span className={item.done ? "line-through opacity-60" : ""}>{item.label}</span>
                {!item.done && (
                  <span className="ml-auto text-xs text-accent">?</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {completedCount === checklist.length && (
        <div className="mt-5 rounded-2xl border border-success/30 bg-success/10 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-success">
            All steps complete — your profile is fully set up!
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleGotoDashboard}
          disabled={markingDone}
          className="flex-1 rounded-2xl bg-accent py-4 font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50"
        >
          {markingDone ? "Loading dashboard…" : "Go to dashboard ?"}
        </button>
        <Link
          href="/dashboard/profile"
          className="flex-1 rounded-2xl border border-panel bg-surface py-4 text-center font-semibold text-secondary transition hover:border-accent hover:text-accent"
        >
          Complete profile
        </Link>
      </div>

    </div>
  )
}
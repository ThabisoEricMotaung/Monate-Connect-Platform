"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import {
  fetchSupplierDocumentsForProfile,
  requiredSupplierDocumentProgress,
  type RequiredSupplierDocumentProgressStatus,
  type SupplierDocument,
} from "@/lib/supplierDocuments"
import { isRegistrationExemptAccount } from "@/lib/registration"
import { projectSupplierSmartScoreWithApprovedDocuments } from "@/lib/supplierScoreAssembly"
import { getCanonicalSupplierSmartScore } from "@/lib/supplierScoring"

type OnboardingProfile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  business_name: string | null
  csd_number: string | null
  bbbee_level: string | null
  csd_document_url?: string | null
  tax_clearance_url?: string | null
  tax_document_url?: string | null
  company_registration_url?: string | null
}

type ChecklistItem = {
  label: string
  href: string
  status: RequiredSupplierDocumentProgressStatus
}

function CheckIcon({ status }: { status: RequiredSupplierDocumentProgressStatus }) {
  if (status === "approved") {
    return (
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <path d="m5 12 5 5 9-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        </svg>
      </span>
    )
  }
  if (status === "under_review") {
    return (
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-warning/40 bg-warning-soft text-xs font-bold text-warning">
        …
        <span className="sr-only">Under review</span>
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
  const [documents, setDocuments] = useState<SupplierDocument[]>([])
  const [currentSmartScore, setCurrentSmartScore] = useState<number | null>(null)
  const [potentialSmartScore, setPotentialSmartScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingDone, setMarkingDone] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) { router.replace("/auth/login"); return }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { router.replace("/auth/login"); return }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, full_name, business_name, csd_number, bbbee_level, csd_document_url, bbbee_document_url, tax_clearance_url, tax_document_url, company_registration_url")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.warn("Onboarding profile failed to load:", profileError.message)
      }

      const [documents, canonicalScore] = data
        ? await Promise.all([
            fetchSupplierDocumentsForProfile(user.id),
            getCanonicalSupplierSmartScore(user.id, supabase).catch((error) => {
              console.warn("Onboarding SmartScore projection failed:", error)
              return null
            }),
          ])
        : [{ documents: [], error: null }, null]
      if (data && isRegistrationExemptAccount(data.email)) {
        router.replace("/dashboard")
        return
      }
      setProfile(data as OnboardingProfile | null)
      setDocuments(documents.documents)
      if (canonicalScore) {
        setCurrentSmartScore(canonicalScore.result.score)
        setPotentialSmartScore(
          projectSupplierSmartScoreWithApprovedDocuments({
            input: canonicalScore.input,
            activity: canonicalScore.activity,
          }).score,
        )
      }
      setLoading(false)

    }
    load()
  }, [router])

  const displayName =
    profile?.first_name?.trim() ||
    profile?.business_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.email?.split("@")[0] ||
    "there"

  const checklist: ChecklistItem[] = profile
    ? requiredSupplierDocumentProgress(profile as unknown as Record<string, unknown>, documents).map((item) => ({
        label: item.type === "csd"
          ? "Upload CSD document"
          : item.type === "bbbee"
            ? "Upload B-BBEE certificate"
            : item.type === "tax_clearance"
              ? "Upload tax-clearance evidence"
              : item.type === "cipc"
                ? "Upload CIPC/company-registration document"
                : "Add banking details and upload a bank letter",
        href: "/dashboard/profile?tab=documents",
        status: item.status,
      }))
    : []

  const completedCount = checklist.filter((item) => item.status !== "not_uploaded").length

  const handleGotoDashboard = () => {
    setMarkingDone(true)
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
          Welcome to AiForm Procure, {displayName}.
        </h1>
        <p className="mt-3 text-sm leading-7 text-secondary">
          Your account is active. Complete the steps below to get matched with procurement opportunities.
        </p>
      </div>

      <div className="rounded-2xl border border-panel bg-card p-6 shadow-panel">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-heading">Onboarding checklist</h2>
            <p className="mt-1 text-sm font-semibold text-accent">{completedCount} / {checklist.length} complete</p>
          </div>
          {currentSmartScore !== null && potentialSmartScore !== null && (
            <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]" aria-label="SmartScore current and projected values">
              <div className="rounded-xl border border-panel bg-surface px-4 py-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">Current</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-heading">{currentSmartScore}</p>
              </div>
              <div
                className="rounded-xl border border-accent/35 bg-accent/10 px-4 py-3"
                title="Projection based on all five checklist documents being uploaded and approved."
              >
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-accent">Potential</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-heading">~{potentialSmartScore}</p>
              </div>
            </div>
          )}
        </div>

        {currentSmartScore !== null && potentialSmartScore !== null && (
          <p className="mb-5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs leading-5 text-secondary">
            Potential SmartScore is projected using your current profile and activity, assuming all five checklist documents are approved. CIPC evidence is informational and adds no SmartScore points.
          </p>
        )}

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
                  item.status === "approved"
                    ? "border-success/20 bg-success/5 text-heading"
                    : "border-panel bg-surface text-secondary hover:border-accent hover:text-primary"
                }`}
              >
                <CheckIcon status={item.status} />
                <span className={item.status === "approved" ? "line-through opacity-60" : ""}>{item.label}</span>
                <span className={`ml-auto text-xs font-bold ${
                  item.status === "approved" ? "text-success" : item.status === "under_review" ? "text-warning" : "text-accent"
                }`}>
                  {item.status === "approved" ? "Approved" : item.status === "under_review" ? "Under review" : "Not uploaded"}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex gap-3 rounded-xl border border-panel bg-surface px-4 py-3 text-xs leading-5 text-secondary">
          <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24">
            <path d="M12 8v4l2.5 1.5M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
          <p>Once your documents are approved, we&apos;ll email you 30, 14, and 1 day before anything expires, so nothing lapses without warning.</p>
        </div>
      </div>

      {completedCount === checklist.length && (
        <div className="mt-5 rounded-2xl border border-success/30 bg-success/10 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-success">
            All required documents are on file. Any items under review will update automatically once approved.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleGotoDashboard}
          disabled={markingDone}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50"
        >
          {markingDone ? "Loading dashboard…" : (
            <>
              <span>Go to dashboard</span>
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </>
          )}
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

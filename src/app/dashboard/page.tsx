"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getCurrentProfile } from "@/lib/auth"
import { getSupplierMatches, type SupplierMatchResult } from "@/lib/matchingEngine"
import {
  getPurchaseOrders,
  normalizePurchaseOrderStatus,
} from "@/lib/purchaseOrders"
import {
  getSmartScoreColour,
} from "@/lib/smartScore"
import { getCanonicalSupplierSmartScore } from "@/lib/supplierScoring"
import { supabase } from "@/lib/supabase"
import {
  requiredSupplierDocumentProgress,
  type RequiredSupplierDocumentProgress,
} from "@/lib/supplierDocuments"
import { isRegistrationExemptAccount } from "@/lib/registration"

function formatDeadline(dateStr: string | null | undefined): string {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function displayNameFromProfile(
  profile: { preferred_name?: string | null; first_name?: string | null; last_name?: string | null; full_name?: string | null } | null | undefined,
  fallbackFullName?: string | null
): string {
  const preferredName = profile?.preferred_name?.trim()
  if (preferredName) return preferredName

  const splitName = [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(" ")
  if (splitName) return splitName.split(/\s+/)[0] || "there"

  const fullName = profile?.full_name?.trim() || fallbackFullName?.trim() || ""
  return fullName.split(/\s+/)[0] || "there"
}

function isMissingGreetingProfileColumnError(error: { message?: string } | null): boolean {
  const message = error?.message ?? ""

  return (
    message.includes("dashboard_welcome_seen") ||
    message.includes("schema cache") ||
    message.includes("Could not find")
  )
}

export default function DashboardPage() {
  const [smartScore, setSmartScore] = useState<number | null>(null)
  const [recommendedOpportunities, setRecommendedOpportunities] = useState<SupplierMatchResult[]>([])
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true)
  const [purchaseOrderMetrics, setPurchaseOrderMetrics] = useState({ active: 0, delivered: 0, outstanding: 0, completed: 0 })

  const [firstName, setFirstName] = useState("")
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
  const [profileLoadError, setProfileLoadError] = useState("")
  const [openRFQCount, setOpenRFQCount] = useState<number | null>(null)
  const [openRFQsClosingThisWeek, setOpenRFQsClosingThisWeek] = useState<number | null>(null)
  const [quoteCount, setQuoteCount] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [smartScoreLoading, setSmartScoreLoading] = useState(true)
  const [smartScoreError, setSmartScoreError] = useState("")
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)
  const [documentProgress, setDocumentProgress] = useState<RequiredSupplierDocumentProgress[]>([])
  const [passportCardGlow, setPassportCardGlow] = useState(false)

  // Attention glow for the Compliance Passport card: plays once per browser
  // session (sessionStorage, not localStorage/DB) since this is a purely
  // cosmetic "new feature" nudge, not state worth persisting across devices
  // or forever. Clears itself after the CSS animation's fixed duration so it
  // never lingers or re-triggers on re-render.
  useEffect(() => {
    if (typeof window === "undefined") return
    const key = "passport-card-glow-shown"
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, "1")
    setPassportCardGlow(true)
    const timer = window.setTimeout(() => setPassportCardGlow(false), 4500)
    return () => window.clearTimeout(timer)
  }, [])

  // Load greeting + real stat values
  useEffect(() => {
    async function loadStats() {
      try {
        if (!supabase) {
          setProfileLoadError("Dashboard data is not configured.")
          return
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) {
          setProfileLoadError("Sign in to load your dashboard profile.")
          return
        }

        const meta = user.user_metadata
        const name: string = meta?.full_name ?? ""

        const now = new Date()
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)

        const [initialProfileRes, rfqRes, closingWeekRes, quoteRes] = await Promise.all([
          supabase.from("profiles").select("verification_status, first_name, last_name, full_name, preferred_name, dashboard_welcome_seen").eq("id", user.id).maybeSingle(),
          supabase
            .from("rfqs")
            .select("id", { count: "exact", head: true })
            .ilike("status", "open")
            .eq("is_public", true)
            .gt("closing_date", now.toISOString()),
          supabase
            .from("rfqs")
            .select("id", { count: "exact", head: true })
            .ilike("status", "open")
            .eq("is_public", true)
            .gt("closing_date", now.toISOString())
            .lte("closing_date", nextWeek.toISOString()),
          supabase.from("quotes").select("id", { count: "exact", head: true }).eq("supplier_id", user.id),
        ])
        let profileRes = initialProfileRes

        if (profileRes.error && isMissingGreetingProfileColumnError(profileRes.error)) {
          profileRes = await supabase
            .from("profiles")
            .select("verification_status, full_name, preferred_name")
            .eq("id", user.id)
            .maybeSingle()
        }

        if (profileRes.error) {
          console.error("Dashboard profile fetch failed:", profileRes.error)
          setProfileLoadError("We couldn't load your profile details. Dashboard navigation remains available.")
        } else if (profileRes.data) {
          setProfileLoadError("")
          setVerificationStatus(profileRes.data.verification_status ?? null)
          setFirstName(displayNameFromProfile(profileRes.data, name))
          setShowWelcomeBanner("dashboard_welcome_seen" in profileRes.data && profileRes.data.dashboard_welcome_seen === false)
        } else {
          setProfileLoadError("We couldn't find a profile for this account yet.")
        }

        setOpenRFQCount(rfqRes.count ?? 0)
        setOpenRFQsClosingThisWeek(closingWeekRes.count ?? 0)
        setQuoteCount(quoteRes.count ?? 0)
      } catch (error) {
        console.error("Dashboard stats load failed:", error)
        setProfileLoadError("We couldn't load your profile details. Dashboard navigation remains available.")
        setOpenRFQCount(0)
        setOpenRFQsClosingThisWeek(0)
        setQuoteCount(0)
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [])
  useEffect(() => {
    async function loadSmartScore() {
      try {
        if (!supabase) {
          setSmartScore(0)
          setSmartScoreError("SmartScore data is not configured.")
          return
        }
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) {
          setSmartScore(0)
          setSmartScoreError("Sign in to load your SmartScore.")
          return
        }

        const canonicalScore = await getCanonicalSupplierSmartScore(user.id, supabase)

        if (!canonicalScore) {
          setSmartScore(0)
          setSmartScoreError("We couldn't find a profile record yet. Complete onboarding to calculate your SmartScore.")
          return
        }

        const displayScore = canonicalScore.result.score
        const requiredDocuments = isRegistrationExemptAccount(canonicalScore.input.email)
          ? []
          : requiredSupplierDocumentProgress(
              canonicalScore.input as unknown as Record<string, unknown>,
              canonicalScore.input.supplier_documents ?? [],
            )

        setSmartScore(displayScore)
        setDocumentProgress(requiredDocuments)
        setSmartScoreError("")

        if (displayScore !== Number(canonicalScore.input.smart_score ?? 0)) {
          void supabase
            .from("profiles")
            .update({ smart_score: displayScore, updated_at: new Date().toISOString() })
            .eq("id", user.id)
        }
      } finally {
        setSmartScoreLoading(false)
      }
    }
    loadSmartScore().catch((e) => {
      console.error("SmartScore load failed:", e)
      setSmartScore(0)
      setSmartScoreError("We couldn't load your SmartScore profile data.")
      setSmartScoreLoading(false)
    })
  }, [])

  useEffect(() => {
    async function loadPurchaseOrderMetrics() {
      try {
        const purchaseOrders = await getPurchaseOrders()
        const statuses = purchaseOrders.map((po) => normalizePurchaseOrderStatus(po.status))
        const activeStatuses = ["Issued", "Accepted", "In Progress", "Ready for Delivery"]
        setPurchaseOrderMetrics({
          active: statuses.filter((s) => activeStatuses.includes(s)).length,
          delivered: statuses.filter((s) => s === "Delivered").length,
          outstanding: statuses.filter((s) => activeStatuses.includes(s)).length,
          completed: statuses.filter((s) => s === "Completed").length,
        })
      } catch (e) { console.error(e) }
    }
    loadPurchaseOrderMetrics()
  }, [])

  useEffect(() => {
    async function loadRecommendedOpportunities() {
      try {
        const profile = await getCurrentProfile()
        if (!profile?.id || profile.role === "admin" || profile.role === "buyer") {
          return
        }

        const matches = await getSupplierMatches(profile.id)
        setRecommendedOpportunities(matches.filter((m) => m.match_score >= 40).slice(0, 5))
      } catch (e) { console.error("Recommended opportunities failed:", e) }
      finally { setOpportunitiesLoading(false) }
    }
    loadRecommendedOpportunities()
  }, [])

  const smartScoreLabel =
    smartScoreLoading
      ? "Calculating..."
      : smartScore === null
      ? "Profile unavailable"
      : smartScore >= 90
      ? "Excellent standing"
      : smartScore >= 75
      ? "Good standing"
      : smartScore >= 50
      ? "Building trust"
      : "Complete your profile"
  const smartScoreTone = getSmartScoreColour(smartScore ?? 0)
  const outstandingDocuments = documentProgress.filter((item) => item.status !== "approved")
  const notUploadedCount = outstandingDocuments.filter((item) => item.status === "not_uploaded").length
  const underReviewCount = outstandingDocuments.filter((item) => item.status === "under_review").length
  const smartScoreTextClass =
    smartScoreTone === "success" ? "text-success" : smartScoreTone === "warning" ? "text-warning" : "text-rose-700"
  const smartScoreBgClass =
    smartScoreTone === "success"
      ? "border-success/30 bg-success-soft"
      : smartScoreTone === "warning"
      ? "border-warning/40 bg-warning-soft"
      : "border-rose-500/30 bg-rose-500/10"

  async function dismissWelcomeBanner() {
    setShowWelcomeBanner(false)
    if (!supabase) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    void supabase
      .from("profiles")
      .update({ dashboard_welcome_seen: true })
      .eq("id", user.id)
  }

  return (
    <div>
      {outstandingDocuments.length > 0 && (
        <div className="mb-6 flex flex-col gap-4 rounded-md border border-warning/40 bg-warning-soft p-5 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-heading">
              Your registration is complete, but {outstandingDocuments.length} verification document{outstandingDocuments.length === 1 ? " is" : "s are"} still outstanding.
            </p>
            <p className="mt-1 text-xs leading-5 text-secondary">
              {notUploadedCount > 0 ? `${notUploadedCount} not uploaded` : ""}
              {notUploadedCount > 0 && underReviewCount > 0 ? " · " : ""}
              {underReviewCount > 0 ? `${underReviewCount} under review` : ""}
            </p>
          </div>
          <Link
            href="/dashboard/profile?tab=documents"
            className="inline-flex w-fit shrink-0 rounded-md border border-accent bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-button transition hover:bg-accent-strong"
          >
            Upload documents
          </Link>
        </div>
      )}

      {showWelcomeBanner && firstName && (
        <div className="mb-6 flex flex-col gap-4 rounded-md border border-accent/25 bg-accent/10 p-4 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-heading">
              Welcome to AiForm Procure, {firstName}.
            </span>{" "}
            Your supplier profile is ready to complete.
          </p>
          <button
            type="button"
            onClick={dismissWelcomeBanner}
            className="w-fit rounded-md border border-accent/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent transition hover:bg-accent hover:text-button"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="relative mb-10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.15]"
          style={{
            background: "url('https://design.canva.ai/GB320ny3MyEuntW') center / cover no-repeat",
            borderRadius: "inherit",
          }}
        />
        <div className="relative z-[1]">
          <p className="mb-3 text-xs md:text-sm uppercase tracking-[0.3em] text-accent">PROCUREMENT OPERATIONS</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-primary">{greeting()}, {firstName || "there"}</h1>
          <p className="mt-4 max-w-3xl text-base md:text-lg text-secondary">
            Manage procurement opportunities, supplier verification, RFQ participation, and quote submissions from your workspace.
          </p>
        </div>
      </div>

      {profileLoadError && !statsLoading && (
        <div className="mb-6 rounded-md border border-warning/35 bg-warning-soft px-5 py-4">
          <p className="text-sm font-semibold text-warning">Profile data unavailable</p>
          <p className="mt-1 text-sm leading-6 text-secondary">{profileLoadError}</p>
        </div>
      )}

      <div className="mb-8">
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">
            <p className="text-sm uppercase tracking-widest text-secondary">SmartScore</p>
            <div className="mt-5 flex items-center gap-4">
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border ${smartScoreBgClass}`}>
                <span className={`text-3xl font-bold tabular-nums ${smartScoreTextClass}`}>
                  {smartScore === null ? "—" : smartScore}
                </span>
              </div>
              <div>
                {outstandingDocuments.length > 0 ? (
                  <Link href="/dashboard/profile?tab=documents" className={`text-sm font-semibold underline decoration-current/40 underline-offset-4 ${smartScoreTextClass}`}>
                    {smartScoreLabel}
                  </Link>
                ) : (
                  <p className={`text-sm font-semibold ${smartScoreTextClass}`}>{smartScoreLabel}</p>
                )}
                <p className="mt-1 text-xs leading-5 text-secondary">
                  {outstandingDocuments.length > 0
                    ? `${outstandingDocuments.length} required document${outstandingDocuments.length === 1 ? "" : "s"} still need attention.`
                    : "Stored score is refreshed in the background when your profile changes."}
                </p>
                {smartScoreError && (
                  <p className="mt-2 text-xs font-semibold leading-5 text-warning">{smartScoreError}</p>
                )}
              </div>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-secondary">Purchase Order Lifecycle</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Active POs", purchaseOrderMetrics.active],
                ["Delivered POs", purchaseOrderMetrics.delivered],
                ["Outstanding POs", purchaseOrderMetrics.outstanding],
                ["Completed POs", purchaseOrderMetrics.completed],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-panel bg-surface p-5 shadow-panel">
                  <p className="text-sm uppercase tracking-widest text-secondary">{label}</p>
                  <h2 className="mt-3 text-3xl font-bold tabular-nums text-primary">{value}</h2>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-6 rounded-xl border border-[#c8a060]/25 bg-[#1a3a2a] p-6 shadow-panel ${passportCardGlow ? "feature-glow-once" : ""}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 lg:shrink-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c8a060]/40 bg-[#c8a060]/15">
                <svg className="h-6 w-6 text-[#c8a060]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-[#c8a060]">Compliance Passport</p>
                <p className="mt-0.5 text-xs text-[#f8f4ec]/60">Your complete supplier record</p>
              </div>
            </div>

            <ul className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-center lg:gap-5">
              {["Certifications", "Licences", "Service categories", "Operating areas", "Past projects", "References"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[#f8f4ec]/85">
                  <svg className="h-4 w-4 shrink-0 text-[#c8a060]" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/dashboard/profile?tab=passport"
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-[#c8a060] bg-[#c8a060] px-5 py-2.5 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d8b36f]"
            >
              View compliance passport
            </Link>
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-panel bg-card p-6 shadow-panel">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-panel pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-secondary">Supplier Intelligence</p>
            <h2 className="mt-2 text-lg md:text-2xl font-semibold text-heading">Recommended Opportunities</h2>
          </div>
          <Link href="/dashboard/rfqs" className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent w-fit">
            View All RFQs
          </Link>
        </div>
        {opportunitiesLoading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-md bg-panel" />)}
          </div>
        ) : recommendedOpportunities.length === 0 ? (
          <p className="mt-5 text-sm leading-7 text-secondary">
            No recommended opportunities are available yet. Complete your supplier profile, province, industry, and compliance details to improve matching.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {recommendedOpportunities.map((match) => (
              <article key={match.rfq.id} className="rounded-md border border-panel bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-heading">{match.rfq.title ?? `RFQ-${match.rfq.id}`}</h3>
                    <p className="mt-1 text-xs text-secondary">
                      {match.rfq.category ?? "No category"} <span aria-hidden="true">&middot;</span> {match.rfq.province ?? match.rfq.region ?? "No province"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums text-heading">{match.match_score}%</p>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-secondary">Match</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted">Province</p>
                    <p className="mt-1 text-sm font-semibold text-heading">{match.rfq.province ?? match.rfq.region ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted">Category</p>
                    <p className="mt-1 text-sm font-semibold text-heading">{match.rfq.category ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-muted">Deadline</p>
                    <p className="mt-1 text-sm font-semibold text-heading">{formatDeadline(match.rfq.deadline)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/dashboard/rfqs/${match.rfq.id}`} className="inline-flex rounded-md border border-accent bg-accent px-3 py-2 text-xs font-bold text-button transition hover:bg-accent-strong">
                    View RFQ
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">
          <p className="text-sm uppercase tracking-widest text-secondary">Verification</p>
          <h2 className={`mt-4 text-3xl font-bold ${verificationStatus === "Verified" ? "text-success" : "text-accent"}`}>
            {statsLoading ? "—" : (verificationStatus ?? "Pending")}
          </h2>
        </div>
        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">
          <p className="text-sm uppercase tracking-widest text-secondary">Open RFQs</p>
          <h2 className="mt-4 text-3xl font-bold tabular-nums text-primary">
            {statsLoading ? "—" : (openRFQCount ?? 0)}
          </h2>
          <p className="mt-2 text-sm text-secondary">
            {statsLoading ? "Loading..." : `${openRFQsClosingThisWeek ?? 0} closing this week`}
          </p>
        </div>
        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">
          <p className="text-sm uppercase tracking-widest text-secondary">Submitted Quotes</p>
          <h2 className="mt-4 text-3xl font-bold tabular-nums text-primary">
            {statsLoading ? "—" : (quoteCount ?? 0)}
          </h2>
        </div>
        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">
          <p className="text-sm uppercase tracking-widest text-secondary">Supplier Status</p>
          <h2 className={`mt-4 text-3xl font-bold ${verificationStatus === "Verified" ? "text-success" : "text-accent"}`}>
            {statsLoading ? "—" : (verificationStatus === "Verified" ? "Verified" : "Active")}
          </h2>
        </div>
      </div>

    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import { getSupplierMatches, type SupplierMatchResult } from "@/lib/matchingEngine"
import {
  getPurchaseOrders,
  normalizePurchaseOrderStatus,
} from "@/lib/purchaseOrders"
import {
  calculateSmartScore,
  getSmartScoreColour,
} from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

function isMissingRoleColumnError(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("'role' column") ||
      error?.message?.includes("schema cache") ||
      error?.message?.includes("profiles' in the schema")
  )
}

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
  profile: { preferred_name?: string | null; full_name?: string | null } | null | undefined,
  fallbackFullName?: string | null
): string {
  const preferredName = profile?.preferred_name?.trim()
  if (preferredName) return preferredName

  const fullName = profile?.full_name?.trim() || fallbackFullName?.trim() || ""
  return fullName.split(/\s+/)[0] || "there"
}

export default function DashboardPage() {
  const router = useRouter()
  const [smartScore, setSmartScore] = useState<number | null>(null)
  const [recommendedOpportunities, setRecommendedOpportunities] = useState<SupplierMatchResult[]>([])
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true)
  const [purchaseOrderMetrics, setPurchaseOrderMetrics] = useState({ active: 0, delivered: 0, outstanding: 0, completed: 0 })

  const [firstName, setFirstName] = useState("")
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
  const [openRFQCount, setOpenRFQCount] = useState<number | null>(null)
  const [openRFQsClosingThisWeek, setOpenRFQsClosingThisWeek] = useState<number | null>(null)
  const [quoteCount, setQuoteCount] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)

  useEffect(() => {
    async function ensureSupplierProfile() {
      if (!supabase) { router.push("/auth/login"); return }
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) { router.push("/auth/login"); return }
      const user = userData.user
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()
      if (profile) return
      const profilePayload = {
        id: user.id,
        business_name: user.user_metadata.business_name,
        email: user.email,
        province: user.user_metadata.province,
        industry: user.user_metadata.industry,
        phone: user.user_metadata.phone,
        role: user.user_metadata.role || "supplier",
        verification_status: "Pending Review",
      }
      const { error: profileInsertError } = await supabase.from("profiles").insert([profilePayload])
      if (!profileInsertError || !isMissingRoleColumnError(profileInsertError)) return
      const { id, business_name, email, province, industry, phone, verification_status } = profilePayload
      await supabase.from("profiles").insert([{ id, business_name, email, province, industry, phone, verification_status }])
    }
    ensureSupplierProfile()
  }, [router])

  // Load greeting + real stat values
  useEffect(() => {
    async function loadStats() {
      if (!supabase) { setStatsLoading(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatsLoading(false); return }

      const meta = user.user_metadata
      const name: string = meta?.full_name ?? ""
      setFirstName(displayNameFromProfile(null, name))

      const now = new Date()
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)

      const [profileRes, rfqRes, closingWeekRes, quoteRes] = await Promise.all([
        supabase.from("profiles").select("verification_status, full_name, preferred_name, dashboard_welcome_seen").eq("id", user.id).maybeSingle(),
        supabase
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .eq("is_public", true)
          .gt("closing_date", now.toISOString()),
        supabase
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .eq("is_public", true)
          .gt("closing_date", now.toISOString())
          .lte("closing_date", nextWeek.toISOString()),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("supplier_id", user.id),
      ])

      if (profileRes.data) {
        setVerificationStatus(profileRes.data.verification_status ?? null)
        setFirstName(displayNameFromProfile(profileRes.data, name))
        setShowWelcomeBanner(profileRes.data.dashboard_welcome_seen === false)
      }

      setOpenRFQCount(rfqRes.count ?? 0)
      setOpenRFQsClosingThisWeek(closingWeekRes.count ?? 0)
      setQuoteCount(quoteRes.count ?? 0)
      setStatsLoading(false)
    }
    loadStats()
  }, [])
  useEffect(() => {
    async function loadSmartScore() {
      if (!supabase) {
        setSmartScore(0)
        return
      }
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSmartScore(0)
        return
      }

      const [profileRes, bankRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, preferred_name, business_name, province, provinces, industry, phone, email, description, role, verification_status, smart_score, csd_number, csd_verified, bbbee_level, bbbee_verified, tax_status, tax_verified, tax_clearance_url, tax_document_url, banking_verified, bank_verified, director_verified, capability_statement_url, updated_at"
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("supplier_bank_details")
          .select("bank_name, account_number, verification_status")
          .eq("supplier_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      const profileData = profileRes.data
      const profileError = profileRes.error
      const bankData = bankRes.data
      const bankError = bankRes.error
      console.log("SmartScore profile fetch:", profileData, profileError)
      console.log("SmartScore bank fetch:", bankData, bankError)

      if (!profileRes.data) {
        setSmartScore(calculateSmartScore({
          business_name: user.user_metadata.business_name,
          province: user.user_metadata.province,
          industry: user.user_metadata.industry,
          phone: user.user_metadata.phone,
          email: user.email,
          verification_status: user.user_metadata.verification_status,
        }))
        return
      }

      const storedScoreRaw = Number(profileRes.data.smart_score ?? 0)
      const storedScore = storedScoreRaw > 100 ? Math.round(storedScoreRaw / 10) : storedScoreRaw
      const calculatedScore = calculateSmartScore({
        ...profileRes.data,
        bank_name: bankRes.data?.bank_name ?? null,
        bank_account_number: bankRes.data?.account_number ?? null,
        bank_verification_status: bankRes.data?.verification_status ?? null,
      })
      const displayScore = storedScore > 0 ? storedScore : calculatedScore

      setSmartScore(displayScore)

      if (displayScore !== storedScoreRaw) {
        void supabase
          .from("profiles")
          .update({ smart_score: displayScore, updated_at: new Date().toISOString() })
          .eq("id", user.id)
      }
    }
    loadSmartScore().catch((e) => {
      console.error("SmartScore load failed:", e)
      setSmartScore(0)
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
      const profile = await getCurrentProfile()
      if (!profile?.id || profile.role === "admin" || profile.role === "buyer") {
        setOpportunitiesLoading(false)
        return
      }
      try {
        const matches = await getSupplierMatches(profile.id)
        setRecommendedOpportunities(matches.filter((m) => m.match_score >= 40).slice(0, 5))
      } catch (e) { console.error("Recommended opportunities failed:", e) }
      finally { setOpportunitiesLoading(false) }
    }
    loadRecommendedOpportunities()
  }, [])

  const smartScoreLabel =
    smartScore === null
      ? "Calculating..."
      : smartScore >= 90
      ? "Excellent standing"
      : smartScore >= 75
      ? "Good standing"
      : smartScore >= 50
      ? "Building trust"
      : "Complete your profile"
  const smartScoreTone = getSmartScoreColour(smartScore ?? 0)
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
      {showWelcomeBanner && firstName && (
        <div className="mb-6 flex flex-col gap-4 rounded-md border border-accent/25 bg-accent/10 p-4 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-heading">
              Welcome to Monate Connect, {firstName}.
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

      <div className="mb-10">
        <p className="mb-3 text-xs md:text-sm uppercase tracking-[0.3em] text-accent">PROCUREMENT OPERATIONS</p>
        <h1 className="text-3xl md:text-5xl font-bold text-primary">{greeting()}, {firstName || "there"}</h1>
        <p className="mt-4 max-w-3xl text-base md:text-lg text-secondary">
          Manage procurement opportunities, supplier verification, RFQ participation, and quote submissions from your workspace.
        </p>
      </div>

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
                <p className={`text-sm font-semibold ${smartScoreTextClass}`}>{smartScoreLabel}</p>
                <p className="mt-1 text-xs leading-5 text-secondary">
                  Stored score is refreshed in the background when your profile changes.
                </p>
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
                  <h2 className="mt-3 text-3xl font-bold text-primary">{value}</h2>
                </div>
              ))}
            </div>
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
                    <p className="text-xl font-bold text-heading">{match.match_score}%</p>
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
          <h2 className="mt-4 text-3xl font-bold text-primary">
            {statsLoading ? "—" : (openRFQCount ?? 0)}
          </h2>
          <p className="mt-2 text-sm text-secondary">
            {statsLoading ? "Loading..." : `${openRFQsClosingThisWeek ?? 0} closing this week`}
          </p>
        </div>
        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">
          <p className="text-sm uppercase tracking-widest text-secondary">Submitted Quotes</p>
          <h2 className="mt-4 text-3xl font-bold text-primary">
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

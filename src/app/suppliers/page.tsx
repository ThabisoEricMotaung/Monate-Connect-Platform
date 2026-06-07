"use client"

import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { getSavedSuppliers, saveSupplier, unsaveSupplier } from "@/lib/savedSuppliers"

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicSupplier = {
  id: string
  business_name: string | null
  description: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  smart_score?: number | string | null
  bbbee_level?: string | null
  csd_number?: string | null
  tax_status?: string | null
  banking_verification_status?: string | null
  bank_verified?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

type BuyerRFQ = { id: number; title: string | null; status: string | null }
type SortKey = "score" | "az" | "recent" | "bbbee"
type ViewMode = "list" | "grid"
type BBBEEFilter = "level1to2" | "level3to4" | "level5to8" | "eme"
type VerificationFilter = "csd" | "tax" | "banking"
type ScoreFilter = "excellent" | "good" | "building"

// ─── Constants ────────────────────────────────────────────────────────────────

const SA_PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Mpumalanga",
  "Limpopo", "Eastern Cape", "Free State", "North West", "Northern Cape",
]

const BBBEE_OPTIONS: { key: BBBEEFilter; label: string }[] = [
  { key: "level1to2", label: "Level 1-2" },
  { key: "level3to4", label: "Level 3-4" },
  { key: "level5to8", label: "Level 5-8" },
  { key: "eme", label: "Exempt micro enterprise (EME)" },
]

const VERIFICATION_OPTIONS: { key: VerificationFilter; label: string }[] = [
  { key: "csd", label: "CSD verified" },
  { key: "tax", label: "Tax clearance verified" },
  { key: "banking", label: "Banking verified" },
]

const SCORE_OPTIONS: { key: ScoreFilter; label: string }[] = [
  { key: "excellent", label: "90+ (Excellent)" },
  { key: "good", label: "75-89 (Good)" },
  { key: "building", label: "50-74 (Building)" },
]

const INDUSTRY_MAP: { keywords: string[]; bg: string; text: string }[] = [
  { keywords: ["mining", "resource", "mineral", "coal", "gold", "platinum"], bg: "bg-amber-100", text: "text-amber-800" },
  { keywords: ["construction", "infrastructure", "civil", "build", "engineering"], bg: "bg-teal-100", text: "text-teal-800" },
  { keywords: ["it", "technology", "tech", "software", "ict", "digital", "data"], bg: "bg-blue-100", text: "text-blue-800" },
  { keywords: ["facility", "facilities", "property", "real estate", "cleaning", "security"], bg: "bg-purple-100", text: "text-purple-800" },
  { keywords: ["health", "medical", "pharma", "hospital", "clinic"], bg: "bg-rose-100", text: "text-rose-800" },
  { keywords: ["education", "training", "school", "learn", "academ"], bg: "bg-indigo-100", text: "text-indigo-800" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function toggleItem<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function getInitials(name: string | null): string {
  if (!name?.trim()) return "??"
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function getIndustryColors(industry: string | null): { bg: string; text: string } {
  const norm = normalize(industry)
  for (const m of INDUSTRY_MAP) {
    if (m.keywords.some((k) => norm.includes(k))) return { bg: m.bg, text: m.text }
  }
  return { bg: "bg-gray-100", text: "text-gray-700" }
}

function parseBBBEELevel(value: string | null | undefined): number | null {
  if (!value) return null
  if (normalize(value).includes("non-compliant")) return 9
  const m = value.match(/level\s*(\d)/i)
  return m ? Number(m[1]) : null
}

function isEME(value: string | null | undefined): boolean {
  const n = normalize(value)
  return n.includes("eme") || n.includes("exempt micro")
}

function getBBBEEBucket(s: PublicSupplier): BBBEEFilter | null {
  if (isEME(s.bbbee_level)) return "eme"
  const level = parseBBBEELevel(s.bbbee_level)
  if (!level) return null
  if (level <= 2) return "level1to2"
  if (level <= 4) return "level3to4"
  return "level5to8"
}

function getScore100(s: PublicSupplier): number | null {
  const score = numberValue(s.smart_score)
  if (score === null) return null
  return Math.min(100, Math.max(0, Math.round(score)))
}

function getScoreBucket(s: PublicSupplier): ScoreFilter | null {
  const score = getScore100(s)
  if (score === null) return null
  if (score >= 90) return "excellent"
  if (score >= 75) return "good"
  if (score >= 50) return "building"
  return null
}

function getScoreStroke(score100: number): string {
  if (score100 >= 75) return "#16a34a"
  if (score100 >= 50) return "#d97706"
  return "#dc2626"
}

function getScoreSurface(score100: number): string {
  if (score100 >= 75) return "bg-success-soft text-success"
  if (score100 >= 50) return "bg-warning-soft text-warning"
  return "bg-rose-500/10 text-rose-700"
}

function isTaxVerified(s: PublicSupplier): boolean {
  const n = normalize(s.tax_status)
  return n.includes("valid") || n.includes("verified") || n.includes("clear")
}

function isBankingVerified(s: PublicSupplier): boolean {
  return Boolean(s.bank_verified) || normalize(s.banking_verification_status).includes("verified")
}

function formatYearsActive(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (years < 1) return "< 1 year active"
  return years + " yr" + (years === 1 ? "" : "s") + " active"
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchVerifiedSuppliers(): Promise<PublicSupplier[]> {
  if (!supabase) return []

  const full = await supabase
    .from("profiles")
    .select("id,business_name,description,province,industry,verification_status,smart_score,bbbee_level,csd_number,tax_status,banking_verification_status,bank_verified,created_at,updated_at")
    .eq("verification_status", "Verified")
    .order("smart_score", { ascending: false, nullsFirst: false })

  if (!full.error) return (full.data ?? []) as PublicSupplier[]

  const partial = await supabase
    .from("profiles")
    .select("id,business_name,description,province,industry,verification_status,smart_score,bbbee_level,csd_number,tax_status,created_at,updated_at")
    .eq("verification_status", "Verified")
    .order("smart_score", { ascending: false, nullsFirst: false })

  if (!partial.error) return (partial.data ?? []) as PublicSupplier[]

  const { data } = await supabase
    .from("profiles")
    .select("id,business_name,province,industry,verification_status,smart_score")
    .eq("verification_status", "Verified")
    .order("smart_score", { ascending: false, nullsFirst: false })

  return (data ?? []) as PublicSupplier[]
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function ListViewIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className={"h-4 w-4 " + (active ? "text-accent" : "text-muted")} fill="none" viewBox="0 0 24 24">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function GridViewIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className={"h-4 w-4 " + (active ? "text-accent" : "text-muted")} fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

// ─── MiniScore circle ─────────────────────────────────────────────────────────

function MiniScore({ score100 }: { score100: number | null }) {
  if (score100 === null) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-panel bg-panel">
        <span className="text-[0.55rem] font-bold uppercase tracking-wide text-muted">N/A</span>
      </div>
    )
  }
  const r = 22
  const circ = 2 * Math.PI * r
  const strokeColor = getScoreStroke(score100)
  const surfaceClass = getScoreSurface(score100)
  return (
    <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${surfaceClass}`}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-label={"SmartScore " + score100}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={strokeColor} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score100 / 100)}
          transform="rotate(-90 28 28)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[0.72rem] font-bold tabular-nums leading-none">{score100}</span>
      </div>
    </div>
  )
}

// ─── FilterCheckbox ───────────────────────────────────────────────────────────

function FilterCheckbox({ label, count, checked, onChange }: {
  label: string; count: number; checked: boolean; onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-secondary transition hover:bg-surface hover:text-primary">
      <span className="flex min-w-0 items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onChange}
          className="h-4 w-4 shrink-0 rounded border-panel accent-[var(--accent)]" />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-xs font-semibold text-muted">{count}</span>
    </label>
  )
}

// ─── CardSkeleton ─────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-panel" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-panel" />
          <div className="h-3 w-32 animate-pulse rounded bg-panel" />
          <div className="h-3 w-full animate-pulse rounded bg-panel" />
        </div>
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-panel" />
      </div>
      <div className="mt-4 border-t border-panel pt-3 flex items-center justify-between">
        <div className="flex gap-6">
          {[0, 1, 2].map((i) => <div key={i} className="h-8 w-20 animate-pulse rounded bg-panel" />)}
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-8 w-20 animate-pulse rounded bg-panel" />)}
        </div>
      </div>
    </div>
  )
}

// ─── FilterBody ───────────────────────────────────────────────────────────────

function FilterBody({
  all, industries,
  industryFilters, setIndustryFilters,
  provinceFilters, setProvinceFilters,
  bbbeeFilters, setBbeeFilters,
  verificationFilters, setVerificationFilters,
  scoreFilters, setScoreFilters,
  onReset,
}: {
  all: PublicSupplier[]; industries: string[]
  industryFilters: string[]; setIndustryFilters: (v: string[]) => void
  provinceFilters: string[]; setProvinceFilters: (v: string[]) => void
  bbbeeFilters: BBBEEFilter[]; setBbeeFilters: (v: BBBEEFilter[]) => void
  verificationFilters: VerificationFilter[]; setVerificationFilters: (v: VerificationFilter[]) => void
  scoreFilters: ScoreFilter[]; setScoreFilters: (v: ScoreFilter[]) => void
  onReset: () => void
}) {
  const [showMoreIndustries, setShowMoreIndustries] = useState(false)
  const [showMoreProvinces, setShowMoreProvinces] = useState(false)

  const visIndustries = showMoreIndustries ? industries : industries.slice(0, 5)
  const visProvinces = showMoreProvinces ? SA_PROVINCES : SA_PROVINCES.slice(0, 5)

  const hasActive = industryFilters.length > 0 || provinceFilters.length > 0 ||
    bbbeeFilters.length > 0 || verificationFilters.length > 0 || scoreFilters.length > 0

  const cInd = (ind: string) => all.filter((s) => normalize(s.industry) === normalize(ind)).length
  const cProv = (p: string) => all.filter((s) => normalize(s.province).includes(normalize(p))).length
  const cBBBEE = (f: BBBEEFilter) => all.filter((s) => getBBBEEBucket(s) === f).length
  const cVerif = (f: VerificationFilter) =>
    f === "csd" ? all.filter((s) => Boolean(s.csd_number)).length
    : f === "tax" ? all.filter((s) => isTaxVerified(s)).length
    : all.filter((s) => isBankingVerified(s)).length
  const cScore = (f: ScoreFilter) => all.filter((s) => getScoreBucket(s) === f).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary">Filters</h2>
        {hasActive && (
          <button onClick={onReset} className="text-xs font-semibold text-accent hover:underline">Reset all</button>
        )}
      </div>

      {industries.length > 0 && (
        <div>
          <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">Industry</p>
          <div className="space-y-0.5">
            {visIndustries.map((ind) => (
              <FilterCheckbox key={ind} label={ind} count={cInd(ind)}
                checked={industryFilters.length === 0 || industryFilters.includes(ind)}
                onChange={() => setIndustryFilters(toggleItem(industryFilters, ind))} />
            ))}
          </div>
          {industries.length > 5 && (
            <button onClick={() => setShowMoreIndustries(!showMoreIndustries)}
              className="mt-1 px-2 text-xs font-semibold text-accent hover:underline">
              {showMoreIndustries ? "Show less" : "+" + (industries.length - 5) + " more"}
            </button>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">Province</p>
        <div className="space-y-0.5">
          {visProvinces.map((p) => (
            <FilterCheckbox key={p} label={p} count={cProv(p)}
              checked={provinceFilters.length === 0 || provinceFilters.includes(p)}
              onChange={() => setProvinceFilters(toggleItem(provinceFilters, p))} />
          ))}
        </div>
        {SA_PROVINCES.length > 5 && (
          <button onClick={() => setShowMoreProvinces(!showMoreProvinces)}
            className="mt-1 px-2 text-xs font-semibold text-accent hover:underline">
            {showMoreProvinces ? "Show less" : "Show all provinces"}
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">BBBEE level</p>
        <div className="space-y-0.5">
          {BBBEE_OPTIONS.map(({ key, label }) => (
            <FilterCheckbox key={key} label={label} count={cBBBEE(key)}
              checked={bbbeeFilters.length === 0 || bbbeeFilters.includes(key)}
              onChange={() => setBbeeFilters(toggleItem(bbbeeFilters, key) as BBBEEFilter[])} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">Verification status</p>
        <div className="space-y-0.5">
          {VERIFICATION_OPTIONS.map(({ key, label }) => (
            <FilterCheckbox key={key} label={label} count={cVerif(key)}
              checked={verificationFilters.length === 0 || verificationFilters.includes(key)}
              onChange={() => setVerificationFilters(toggleItem(verificationFilters, key) as VerificationFilter[])} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">SmartScore</p>
        <div className="space-y-0.5">
          {SCORE_OPTIONS.map(({ key, label }) => (
            <FilterCheckbox key={key} label={label} count={cScore(key)}
              checked={scoreFilters.length === 0 || scoreFilters.includes(key)}
              onChange={() => setScoreFilters(toggleItem(scoreFilters, key) as ScoreFilter[])} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── InviteModal ──────────────────────────────────────────────────────────────

function InviteModal({ supplier, userId, onClose }: {
  supplier: PublicSupplier; userId: string | null; onClose: () => void
}) {
  const [rfqs, setRfqs] = useState<BuyerRFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRFQ, setSelectedRFQ] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadRFQs() {
      if (!supabase || !userId) { setLoading(false); return }
      // Try common buyer-id column names
      const { data, error: e } = await supabase
        .from("rfqs")
        .select("id,title,status")
        .in("status", ["Open", "Closing Soon"])
        .order("id", { ascending: false })
      if (!e && data) {
        setRfqs((data as BuyerRFQ[]).slice(0, 20))
      }
      setLoading(false)
    }
    loadRFQs()
  }, [userId])

  async function handleSend() {
    if (!selectedRFQ || !supabase || !userId) return
    setSending(true)
    setError("")
    try {
      const rfq = rfqs.find((r) => r.id === selectedRFQ)
      await supabase.from("notifications").insert({
        recipient_id: supplier.id,
        type: "RFQ Match",
        title: "You have been invited to quote",
        message: "You have been invited to submit a quote on: " + (rfq?.title ?? "an RFQ"),
        link: "/dashboard/rfqs/" + selectedRFQ,
        metadata: { rfq_id: selectedRFQ, buyer_id: userId, invited: true },
        read: false,
      })
      setSent(true)
    } catch {
      setError("Failed to send invitation. Please try again.")
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-xl border border-panel bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-muted hover:bg-surface hover:text-primary">
          <CloseIcon />
        </button>
        {sent ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-heading">Invitation sent</p>
            <p className="mt-1.5 text-sm text-secondary">
              {supplier.business_name} has been notified and can view the RFQ in their portal.
            </p>
            <button onClick={onClose} className="mt-5 masthead__btn-primary w-full">Done</button>
          </div>
        ) : (
          <>
            <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">Invite to RFQ</p>
            <h2 className="mb-4 text-base font-bold text-heading">
              Select an RFQ to invite {supplier.business_name ?? "this supplier"} to quote on
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-panel" />)}
              </div>
            ) : rfqs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-panel bg-surface p-5 text-center">
                <p className="text-sm font-semibold text-heading">No open RFQs found</p>
                <p className="mt-1 text-sm text-secondary">Create an RFQ first to invite suppliers.</p>
                <Link href="/dashboard/admin/rfqs/new" className="mt-4 masthead__btn-primary inline-block">
                  Create RFQ
                </Link>
              </div>
            ) : (
              <>
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {rfqs.map((rfq) => (
                    <label key={rfq.id} className={"flex cursor-pointer items-center gap-3 rounded-md border p-3 transition " + (selectedRFQ === rfq.id ? "border-accent bg-accent/5" : "border-panel bg-surface hover:bg-panel")}>
                      <input type="radio" name="rfq" value={rfq.id}
                        checked={selectedRFQ === rfq.id}
                        onChange={() => setSelectedRFQ(rfq.id)}
                        className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-heading truncate">{rfq.title ?? "Untitled RFQ"}</span>
                        <span className="text-xs text-muted">{rfq.status}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
                <div className="mt-5 flex gap-3">
                  <button onClick={onClose} className="flex-1 rounded-md border border-panel bg-surface px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-panel">
                    Cancel
                  </button>
                  <button onClick={handleSend} disabled={!selectedRFQ || sending}
                    className="flex-1 masthead__btn-primary disabled:opacity-60">
                    {sending ? "Sending..." : "Send invitation"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── AuthPromptModal ──────────────────────────────────────────────────────────

function AuthPromptModal({ action, onClose }: { action: "shortlist" | "invite"; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-xl border border-panel bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-muted hover:bg-surface">
          <CloseIcon />
        </button>
        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
          {action === "shortlist" ? "Shortlist suppliers" : "Invite to RFQ"}
        </p>
        <h2 className="mb-2 text-base font-bold text-heading">
          {action === "shortlist" ? "Sign in to save suppliers to your shortlist" : "Sign in to invite suppliers to your RFQ"}
        </h2>
        <p className="mb-5 text-sm text-secondary">
          Create a free buyer account or sign in to access supplier management features.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/auth/signup" className="masthead__btn-primary text-center">Register as buyer</Link>
          <Link href="/auth/login" className="masthead__btn-secondary text-center">Sign in</Link>
        </div>
      </div>
    </div>
  )
}

// ─── SupplierListCard ─────────────────────────────────────────────────────────

function SupplierListCard({ supplier, isAuth, savedIds, savingId, onShortlist, onInvite }: {
  supplier: PublicSupplier
  isAuth: boolean
  savedIds: Set<string>
  savingId: string | null
  onShortlist: (s: PublicSupplier) => void
  onInvite: (s: PublicSupplier) => void
}) {
  const { bg, text } = getIndustryColors(supplier.industry)
  const score100 = getScore100(supplier)
  const isSaved = savedIds.has(supplier.id)
  const isSaving = savingId === supplier.id
  const bbbee = supplier.bbbee_level
  const yearsActive = formatYearsActive(supplier.created_at)
  const taxVerified = isTaxVerified(supplier)
  const taxPending = Boolean(supplier.tax_status?.trim()) && !taxVerified

  return (
    <article className="rounded-md border border-panel bg-card shadow-panel transition hover:shadow-md">
      <div className="flex items-start gap-4 p-5">
        {/* Avatar */}
        <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-white " + bg + " " + text}>
          {getInitials(supplier.business_name)}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-heading">{supplier.business_name ?? "Verified supplier"}</h3>
                {/* Badges */}
                {supplier.csd_number && (
                  <span className="rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-success">CSD verified</span>
                )}
                {bbbee && (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-blue-700">{bbbee}</span>
                )}
                {taxVerified && (
                  <span className="rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-success">Tax clearance</span>
                )}
                {taxPending && (
                  <span className="rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-warning">Tax clearance pending</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-secondary">
                {supplier.industry ?? "General"}{supplier.province ? " · " + supplier.province : ""}
              </p>
              {supplier.description && (
                <p className="mt-2 text-xs leading-relaxed text-secondary line-clamp-2">{supplier.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {supplier.province && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-panel bg-surface px-2.5 py-0.5 text-xs text-secondary">
                    <PinIcon />{supplier.province}
                  </span>
                )}
                {yearsActive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-panel bg-surface px-2.5 py-0.5 text-xs text-secondary">{yearsActive}</span>
                )}
              </div>
            </div>
            {/* SmartScore */}
            <div className="shrink-0 text-center">
              <MiniScore score100={score100} />
              <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">SmartScore</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-panel px-5 py-3">
        {/* Stats */}
        <div className="flex gap-5">
          {[["RFQs won", "—"], ["Quote rate", "—"], ["Buyer rating", "—"]].map(([label, val]) => (
            <div key={label} className="text-center">
              <p className="text-sm font-bold text-heading">{val}</p>
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted">{label}</p>
            </div>
          ))}
        </div>
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={"/suppliers/" + supplier.id}
            className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-panel hover:text-heading">
            View profile
          </Link>
          <button onClick={() => onShortlist(supplier)} disabled={isSaving}
            className={"flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 " + (isSaved ? "border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20" : "border-panel bg-surface text-secondary hover:bg-panel hover:text-heading")}>
            <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24">
              <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
            {isSaved ? "Shortlisted" : "Shortlist"}
          </button>
          <button onClick={() => onInvite(supplier)}
            className="masthead__btn-primary text-xs whitespace-nowrap">
            Invite to RFQ
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── SupplierGridCard ─────────────────────────────────────────────────────────

function SupplierGridCard({ supplier, isAuth, savedIds, savingId, onShortlist, onInvite }: {
  supplier: PublicSupplier
  isAuth: boolean
  savedIds: Set<string>
  savingId: string | null
  onShortlist: (s: PublicSupplier) => void
  onInvite: (s: PublicSupplier) => void
}) {
  const { bg, text } = getIndustryColors(supplier.industry)
  const score100 = getScore100(supplier)
  const isSaved = savedIds.has(supplier.id)
  const isSaving = savingId === supplier.id

  return (
    <article className="flex flex-col rounded-md border border-panel bg-card p-5 shadow-panel transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-white " + bg + " " + text}>
          {getInitials(supplier.business_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-snug text-heading line-clamp-2">{supplier.business_name ?? "Verified supplier"}</h3>
          <p className="mt-0.5 text-xs text-secondary">{supplier.industry ?? "General"}</p>
        </div>
        <MiniScore score100={score100} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {supplier.csd_number && (
          <span className="rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-success">CSD verified</span>
        )}
        {supplier.bbbee_level && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-blue-700">{supplier.bbbee_level}</span>
        )}
      </div>

      <div className="mt-auto flex gap-2 pt-4">
        <Link href={"/suppliers/" + supplier.id}
          className="flex-1 rounded-md border border-panel bg-surface px-3 py-2 text-center text-xs font-semibold text-secondary transition hover:bg-panel hover:text-heading">
          View profile
        </Link>
        <button onClick={() => onInvite(supplier)}
          className="flex-1 masthead__btn-primary text-xs">
          Invite
        </button>
      </div>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<PublicSupplier[]>([])
  const [isAuth, setIsAuth] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showShortlistedOnly, setShowShortlistedOnly] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<PublicSupplier | null>(null)
  const [authPromptAction, setAuthPromptAction] = useState<"shortlist" | "invite" | null>(null)
  const [view, setView] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("score")
  const [industryFilters, setIndustryFilters] = useState<string[]>([])
  const [provinceFilters, setProvinceFilters] = useState<string[]>([])
  const [bbbeeFilters, setBbeeFilters] = useState<BBBEEFilter[]>([])
  const [verificationFilters, setVerificationFilters] = useState<VerificationFilter[]>([])
  const [scoreFilters, setScoreFilters] = useState<ScoreFilter[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const [data, authResult] = await Promise.all([
        fetchVerifiedSuppliers(),
        supabase ? supabase.auth.getUser() : Promise.resolve(null),
      ])
      setSuppliers(data)
      const user = authResult?.data?.user ?? null
      setIsAuth(!!user)
      if (user) {
        setUserId(user.id)
        try {
          const saved = await getSavedSuppliers()
          setSavedIds(new Set(saved.map((s) => s.supplier_id)))
        } catch {
          setSavedIds(new Set())
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const industries = useMemo(
    () => Array.from(new Set(suppliers.map((s) => s.industry).filter(Boolean) as string[])).sort(),
    [suppliers]
  )

  const totalVerified = suppliers.length
  const provincesCount = useMemo(
    () => new Set(suppliers.map((s) => s.province).filter(Boolean)).size,
    [suppliers]
  )
  const topIndustriesLabel = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of suppliers) {
      const ind = s.industry?.trim()
      if (ind) counts[ind] = (counts[ind] ?? 0) + 1
    }
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([ind]) => ind)
    return top.length > 0 ? top.join(", ") + " top sectors" : ""
  }, [suppliers])

  const filtered = useMemo(() => {
    let result = suppliers

    if (showShortlistedOnly) {
      result = result.filter((s) => savedIds.has(s.id))
    }

    if (search.trim()) {
      const q = normalize(search)
      result = result.filter(
        (s) =>
          normalize(s.business_name).includes(q) ||
          normalize(s.industry).includes(q) ||
          normalize(s.description).includes(q) ||
          normalize(s.province).includes(q)
      )
    }

    if (industryFilters.length > 0) {
      result = result.filter((s) => industryFilters.map(normalize).includes(normalize(s.industry)))
    }

    if (provinceFilters.length > 0) {
      result = result.filter((s) =>
        provinceFilters.some((p) => normalize(s.province).includes(normalize(p)))
      )
    }

    if (bbbeeFilters.length > 0) {
      result = result.filter((s) => {
        const bucket = getBBBEEBucket(s)
        return bucket !== null && bbbeeFilters.includes(bucket)
      })
    }

    if (verificationFilters.length > 0) {
      result = result.filter((s) => {
        if (verificationFilters.includes("csd") && !s.csd_number) return false
        if (verificationFilters.includes("tax") && !isTaxVerified(s)) return false
        if (verificationFilters.includes("banking") && !isBankingVerified(s)) return false
        return true
      })
    }

    if (scoreFilters.length > 0) {
      result = result.filter((s) => {
        const bucket = getScoreBucket(s)
        return bucket !== null && scoreFilters.includes(bucket)
      })
    }

    return [...result].sort((a, b) => {
      if (sort === "score") {
        return (numberValue(b.smart_score) ?? -1) - (numberValue(a.smart_score) ?? -1)
      }
      if (sort === "az") {
        return (a.business_name ?? "").localeCompare(b.business_name ?? "")
      }
      if (sort === "recent") {
        return (b.updated_at ?? "").localeCompare(a.updated_at ?? "")
      }
      // bbbee: lower level = better
      return (parseBBBEELevel(a.bbbee_level) ?? 99) - (parseBBBEELevel(b.bbbee_level) ?? 99)
    })
  }, [suppliers, showShortlistedOnly, savedIds, search, industryFilters, provinceFilters, bbbeeFilters, verificationFilters, scoreFilters, sort])

  function resetFilters() {
    setSearch("")
    setIndustryFilters([])
    setProvinceFilters([])
    setBbeeFilters([])
    setVerificationFilters([])
    setScoreFilters([])
    setShowShortlistedOnly(false)
  }

  async function handleShortlist(supplier: PublicSupplier) {
    if (!isAuth) { setAuthPromptAction("shortlist"); return }
    setSavingId(supplier.id)
    try {
      if (savedIds.has(supplier.id)) {
        await unsaveSupplier(supplier.id)
        setSavedIds((prev) => { const next = new Set(prev); next.delete(supplier.id); return next })
      } else {
        await saveSupplier(supplier.id)
        setSavedIds((prev) => new Set([...prev, supplier.id]))
      }
    } catch { /* silent */ }
    setSavingId(null)
  }

  function handleInvite(supplier: PublicSupplier) {
    if (!isAuth) { setAuthPromptAction("invite"); return }
    setInviteTarget(supplier)
  }

  const hasActiveFilters = industryFilters.length > 0 || provinceFilters.length > 0 ||
    bbbeeFilters.length > 0 || verificationFilters.length > 0 || scoreFilters.length > 0 || showShortlistedOnly
  const filterBadgeCount = industryFilters.length + provinceFilters.length + bbbeeFilters.length +
    verificationFilters.length + scoreFilters.length
  const shortlistCount = suppliers.filter((s) => savedIds.has(s.id)).length

  const filterBodyProps = {
    all: suppliers, industries,
    industryFilters, setIndustryFilters,
    provinceFilters, setProvinceFilters,
    bbbeeFilters, setBbeeFilters,
    verificationFilters, setVerificationFilters,
    scoreFilters, setScoreFilters,
    onReset: resetFilters,
  }

  const cardProps = { isAuth, savedIds, savingId, onShortlist: handleShortlist, onInvite: handleInvite }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        {/* Hero */}
        <section className="border-b border-panel bg-card py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="newspaper-kicker mb-2">Supplier directory</p>
            <h1 className="newspaper-headline mb-4">Verified supplier directory</h1>
            <p className="newspaper-body mb-6 max-w-2xl text-secondary">
              Browse CSD-registered, BBBEE-compliant suppliers across South Africa. Filter by
              industry, province, and compliance level to find the right supplier for your RFQ.
            </p>
            <div className="relative mb-6 max-w-xl">
              <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24">
                <path d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              <input type="search" placeholder="Search by business name, capability, or keyword..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-panel bg-panel py-3 pl-11 pr-4 text-sm text-primary outline-none placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30" />
            </div>
            {!loading && (
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-4 py-1.5 text-sm font-semibold text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />{totalVerified} verified suppliers
                </span>
                {provincesCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-surface px-4 py-1.5 text-sm font-semibold text-secondary">
                    <PinIcon />{provincesCount} provinces covered
                  </span>
                )}
                {topIndustriesLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-surface px-4 py-1.5 text-sm font-semibold text-secondary">
                    {topIndustriesLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-4 py-1.5 text-sm font-semibold text-success">
                  CSD verified suppliers only
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Body */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Desktop filter sidebar */}
            <aside className="hidden w-52 shrink-0 lg:block">
              <div className="sticky top-6 rounded-xl border border-panel bg-card p-5 shadow-panel">
                <FilterBody {...filterBodyProps} />
              </div>
            </aside>

            {/* Card list */}
            <div className="min-w-0 flex-1">
              {/* Sort row */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setFiltersOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel lg:hidden">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                    Filters
                    {filterBadgeCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.6rem] font-bold text-white">{filterBadgeCount}</span>
                    )}
                  </button>
                  {shortlistCount > 0 && (
                    <button onClick={() => setShowShortlistedOnly(!showShortlistedOnly)}
                      className={"flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition " + (showShortlistedOnly ? "border-sky-500/30 bg-sky-500/10 text-sky-700" : "border-panel bg-surface text-secondary hover:bg-panel")}>
                      <svg className="h-4 w-4" fill={showShortlistedOnly ? "currentColor" : "none"} viewBox="0 0 24 24">
                        <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                      </svg>
                      Shortlist ({shortlistCount})
                    </button>
                  )}
                  <p className="text-sm text-secondary">
                    {loading ? "Loading..." : filtered.length + " verified supplier" + (filtered.length === 1 ? "" : "s")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-secondary">Sort by</label>
                    <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
                      className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs text-primary outline-none focus:border-accent">
                      <option value="score">SmartScore (highest)</option>
                      <option value="az">A-Z</option>
                      <option value="recent">Most recently active</option>
                      <option value="bbbee">BBBEE level</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1 rounded-md border border-panel bg-surface p-0.5">
                    <button onClick={() => setView("list")} title="List view"
                      className={"rounded p-1.5 transition " + (view === "list" ? "bg-card shadow" : "hover:bg-panel")}>
                      <ListViewIcon active={view === "list"} />
                    </button>
                    <button onClick={() => setView("grid")} title="Grid view"
                      className={"rounded p-1.5 transition " + (view === "grid" ? "bg-card shadow" : "hover:bg-panel")}>
                      <GridViewIcon active={view === "grid"} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              {loading ? (
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-panel bg-card py-16 text-center">
                  <p className="text-lg font-semibold text-heading">No suppliers match your current filters</p>
                  <p className="mt-2 text-sm text-secondary">Try adjusting or clearing your filters</p>
                  {hasActiveFilters && (
                    <button onClick={resetFilters}
                      className="mt-4 rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-primary transition hover:bg-panel">
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : view === "list" ? (
                <div className="space-y-3">
                  {filtered.map((s) => <SupplierListCard key={s.id} supplier={s} {...cardProps} />)}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((s) => <SupplierGridCard key={s.id} supplier={s} {...cardProps} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-panel bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-secondary">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="rounded-md p-1 text-muted hover:bg-surface hover:text-primary">
                <CloseIcon />
              </button>
            </div>
            <FilterBody {...filterBodyProps} />
            <button onClick={() => setFiltersOpen(false)} className="mt-6 w-full masthead__btn-primary">
              {"Show " + filtered.length + " results"}
            </button>
          </div>
        </div>
      )}

      {inviteTarget && (
        <InviteModal supplier={inviteTarget} userId={userId} onClose={() => setInviteTarget(null)} />
      )}
      {authPromptAction && (
        <AuthPromptModal action={authPromptAction} onClose={() => setAuthPromptAction(null)} />
      )}

      <PublicFooter />
    </>
  )
}

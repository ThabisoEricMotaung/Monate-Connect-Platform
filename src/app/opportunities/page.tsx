"use client"

import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

// --- Types --------------------------------------------------------------------

type PublicRFQ = {
  id: number
  title: string | null
  description: string | null
  province?: string | null
  provinces?: string[] | null
  category?: string | null
  industry?: string | null
  budget?: string | number | null
  estimated_value_min?: number | null
  estimated_value_max?: number | null
  deadline?: string | null
  closing_date?: string | null
  status: string | null
  created_at?: string | null
  published_date?: string | null
  buyer_name?: string | null
  buyer?: string | null
  buyer_org?: string | null
  organization_name?: string | null
  bbbee_requirement?: string | null
  bbee_requirement?: string | null
  bbbee_level?: string | null
}

type SortKey = "deadline" | "newest" | "value"
type DeadlineFilter = "week" | "twoWeeks" | "month"
type BBBEEFilter = "level1to2" | "level3to4" | "level5to8" | "any"

// --- Constants ----------------------------------------------------------------

const SA_PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Mpumalanga",
  "Limpopo",
  "Eastern Cape",
  "Free State",
  "North West",
  "Northern Cape",
]

const DEADLINE_OPTIONS: { key: DeadlineFilter; label: string }[] = [
  { key: "week", label: "Closing this week" },
  { key: "twoWeeks", label: "Next 2 weeks" },
  { key: "month", label: "This month" },
]

const BBBEE_OPTIONS: { key: BBBEEFilter; label: string }[] = [
  { key: "level1to2", label: "Level 1–2 (Preferred)" },
  { key: "level3to4", label: "Level 3–4" },
  { key: "level5to8", label: "Level 5–8" },
  { key: "any", label: "Any level / not specified" },
]

// --- Helpers ------------------------------------------------------------------

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function normalizeArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function toggleItem<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
}

function formatDaysLeft(daysLeft: number | null): string {
  if (daysLeft === null) return "Deadline TBC"
  if (daysLeft < 0) return "Closed"
  if (daysLeft === 0) return "Due today"
  if (daysLeft === 1) return "1 day left"
  return `${daysLeft} days left`
}

function formatBudget(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Value TBC"
  if (typeof value === "number") {
    return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
  }
  const num = Number(value.toString().replace(/[^\d.]/g, ""))
  if (Number.isNaN(num) || num === 0) return String(value)
  return `R${num.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Deadline TBC"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

function formatValueRange(rfq: PublicRFQ): string {
  const min = rfq.estimated_value_min
  const max = rfq.estimated_value_max

  if (typeof min === "number" && typeof max === "number") {
    return `${formatBudget(min)} - ${formatBudget(max)}`
  }

  if (typeof min === "number") return `From ${formatBudget(min)}`
  if (typeof max === "number") return `Up to ${formatBudget(max)}`

  return formatBudget(rfq.budget)
}

function getClosingDate(rfq: PublicRFQ): string | null {
  return rfq.closing_date || rfq.deadline || null
}

function getPublishedDate(rfq: PublicRFQ): string | null {
  return rfq.published_date || rfq.created_at || null
}

function getBuyerName(rfq: PublicRFQ): string {
  return rfq.buyer_org || rfq.buyer_name || rfq.buyer || rfq.organization_name || "Government / Public entity"
}

function getRFQProvince(rfq: PublicRFQ): string {
  const provinces = normalizeArray(rfq.provinces)
  return provinces.length > 0 ? provinces.join(", ") : rfq.province || "South Africa"
}

function getRFQIndustry(rfq: PublicRFQ): string {
  return rfq.industry || rfq.category || "General procurement"
}

function getBBBEEReq(rfq: PublicRFQ): string | null {
  return rfq.bbbee_requirement || rfq.bbee_requirement || rfq.bbbee_level || null
}

function parseBBBEELevel(value: string | null | undefined): number | null {
  if (!value) return null
  if (normalize(value).includes("non-compliant")) return 9
  const m = value.match(/level\s*(\d)/i)
  return m ? Number(m[1]) : null
}

function getBBBEEBucket(rfq: PublicRFQ): BBBEEFilter {
  const level = parseBBBEELevel(getBBBEEReq(rfq))
  if (!level) return "any"
  if (level <= 2) return "level1to2"
  if (level <= 4) return "level3to4"
  return "level5to8"
}

function isPostedWithin48h(value: string | null | undefined): boolean {
  if (!value) return false
  const posted = new Date(value)
  if (Number.isNaN(posted.getTime())) return false
  return Date.now() - posted.getTime() <= 48 * 60 * 60 * 1000
}

function deadlineBucketMatches(daysLeft: number | null, filter: DeadlineFilter): boolean {
  if (daysLeft === null || daysLeft < 0) return false
  if (filter === "week") return daysLeft <= 7
  if (filter === "twoWeeks") return daysLeft >= 8 && daysLeft <= 14
  return daysLeft >= 15 && daysLeft <= 30
}

// --- Data fetching ------------------------------------------------------------

async function fetchPublicRFQs(): Promise<PublicRFQ[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("rfqs")
    .select(
      "id,title,description,buyer_name,buyer_org,industry,provinces,bbbee_requirement,estimated_value_min,estimated_value_max,closing_date,published_date,status,quote_count"
    )
    .eq("status", "open")
    .gt("closing_date", new Date().toISOString())
    .eq("is_public", true)
    .order("closing_date", { ascending: true, nullsFirst: false })
  if (error) {
    console.warn("Public opportunities fetch failed:", error.message)
    return []
  }
  return (data ?? []) as PublicRFQ[]
}

// --- Icons --------------------------------------------------------------------

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function IndustryIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M5 8h14M7 8V5h10v3M7 8v11M17 8v11M9 12h6M9 16h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function RandIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M7 19V5h6.5a4 4 0 0 1 0 8H7M13 13l4 6M7 13h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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

// --- Small shared components --------------------------------------------------

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-surface px-3 py-1 text-xs text-secondary">
      {icon}
      {label}
    </span>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-72 animate-pulse rounded bg-panel" />
          <div className="h-3 w-40 animate-pulse rounded bg-panel" />
        </div>
        <div className="h-5 w-20 animate-pulse rounded bg-panel" />
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="h-3 w-full animate-pulse rounded bg-panel" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-panel" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-6 w-28 animate-pulse rounded-full bg-panel" />
        ))}
      </div>
    </div>
  )
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string
  count: number
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-secondary transition hover:bg-surface hover:text-primary">
      <span className="flex min-w-0 items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 shrink-0 rounded border-panel accent-[var(--accent)]"
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="text-xs font-semibold text-muted">{count}</span>
    </label>
  )
}

// --- Filter sidebar body ------------------------------------------------------

function FilterBody({
  all,
  industries,
  industryFilters,
  setIndustryFilters,
  provinceFilters,
  setProvinceFilters,
  deadlineFilters,
  setDeadlineFilters,
  bbeeFilters,
  setBbeeFilters,
  onReset,
}: {
  all: PublicRFQ[]
  industries: string[]
  industryFilters: string[]
  setIndustryFilters: (v: string[]) => void
  provinceFilters: string[]
  setProvinceFilters: (v: string[]) => void
  deadlineFilters: DeadlineFilter[]
  setDeadlineFilters: (v: DeadlineFilter[]) => void
  bbeeFilters: BBBEEFilter[]
  setBbeeFilters: (v: BBBEEFilter[]) => void
  onReset: () => void
}) {
  const [showAllProvinces, setShowAllProvinces] = useState(false)
  const [showAllIndustries, setShowAllIndustries] = useState(false)

  const visibleProvinces = showAllProvinces ? SA_PROVINCES : SA_PROVINCES.slice(0, 5)
  const visibleIndustries = showAllIndustries ? industries : industries.slice(0, 6)

  const hasActive =
    industryFilters.length > 0 ||
    provinceFilters.length > 0 ||
    deadlineFilters.length > 0 ||
    bbeeFilters.length > 0

  function countByProvince(p: string) {
    return all.filter((r) => normalize(getRFQProvince(r)).includes(normalize(p))).length
  }
  function countByIndustry(ind: string) {
    return all.filter((r) => normalize(getRFQIndustry(r)) === normalize(ind)).length
  }
  function countByDeadline(f: DeadlineFilter) {
    return all.filter((r) => deadlineBucketMatches(daysUntil(getClosingDate(r)), f)).length
  }
  function countByBBBEE(f: BBBEEFilter) {
    return all.filter((r) => getBBBEEBucket(r) === f).length
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary">
          Filters
        </h2>
        {hasActive && (
          <button onClick={onReset} className="text-xs font-semibold text-accent hover:underline">
            Reset all
          </button>
        )}
      </div>

      {/* Industry */}
      {industries.length > 0 && (
        <div>
          <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
            Industry
          </p>
          <div className="space-y-0.5">
            {visibleIndustries.map((ind) => (
              <FilterCheckbox
                key={ind}
                label={ind}
                count={countByIndustry(ind)}
                checked={industryFilters.length === 0 || industryFilters.includes(ind)}
                onChange={() => setIndustryFilters(toggleItem(industryFilters, ind))}
              />
            ))}
          </div>
          {industries.length > 6 && (
            <button
              onClick={() => setShowAllIndustries(!showAllIndustries)}
              className="mt-1 px-2 text-xs font-semibold text-accent hover:underline"
            >
              {showAllIndustries ? "Show less" : `+${industries.length - 6} more`}
            </button>
          )}
        </div>
      )}

      {/* Province */}
      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
          Province
        </p>
        <div className="space-y-0.5">
          {visibleProvinces.map((p) => (
            <FilterCheckbox
              key={p}
              label={p}
              count={countByProvince(p)}
              checked={provinceFilters.length === 0 || provinceFilters.includes(p)}
              onChange={() => setProvinceFilters(toggleItem(provinceFilters, p))}
            />
          ))}
        </div>
        {SA_PROVINCES.length > 5 && (
          <button
            onClick={() => setShowAllProvinces(!showAllProvinces)}
            className="mt-1 px-2 text-xs font-semibold text-accent hover:underline"
          >
            {showAllProvinces ? "Show less" : "Show all provinces"}
          </button>
        )}
      </div>

      {/* Closing date */}
      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
          Closing date
        </p>
        <div className="space-y-0.5">
          {DEADLINE_OPTIONS.map(({ key, label }) => (
            <FilterCheckbox
              key={key}
              label={label}
              count={countByDeadline(key)}
              checked={deadlineFilters.length === 0 || deadlineFilters.includes(key)}
              onChange={() =>
                setDeadlineFilters(toggleItem(deadlineFilters, key) as DeadlineFilter[])
              }
            />
          ))}
        </div>
      </div>

      {/* BBBEE requirement */}
      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
          BBBEE requirement
        </p>
        <div className="space-y-0.5">
          {BBBEE_OPTIONS.map(({ key, label }) => (
            <FilterCheckbox
              key={key}
              label={label}
              count={countByBBBEE(key)}
              checked={bbeeFilters.length === 0 || bbeeFilters.includes(key)}
              onChange={() =>
                setBbeeFilters(toggleItem(bbeeFilters, key) as BBBEEFilter[])
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Preview modal (unauthenticated) -----------------------------------------

function PreviewModal({ rfq, onClose }: { rfq: PublicRFQ | null; onClose: () => void }) {
  if (!rfq) return null
  const daysLeft = daysUntil(getClosingDate(rfq))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-panel bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted hover:bg-surface hover:text-primary"
        >
          <CloseIcon />
        </button>
        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
          {getRFQIndustry(rfq)}
        </p>
        <h2 className="mb-1.5 text-lg font-bold text-heading">{rfq.title ?? "Untitled RFQ"}</h2>
        <p className="mb-4 text-sm text-secondary">Issued by {getBuyerName(rfq)}</p>
        <p className="mb-4 text-sm leading-relaxed text-secondary">
          {rfq.description ?? "No description provided."}
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          <MetaChip icon={<PinIcon />} label={getRFQProvince(rfq)} />
          <MetaChip icon={<RandIcon />} label={formatValueRange(rfq)} />
          {getBBBEEReq(rfq) && (
            <MetaChip icon={<ShieldIcon />} label={"BBBEE: " + getBBBEEReq(rfq)} />
          )}
          <MetaChip icon={<CalendarIcon />} label={formatDaysLeft(daysLeft)} />
        </div>
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
          <p className="mb-1.5 text-sm font-semibold text-heading">
            Register to respond to this opportunity
          </p>
          <p className="mb-4 text-sm text-secondary">
            Create a free supplier account to submit quotes, track deadlines, and access all
            active tenders on AiForm Procure.
          </p>
          <div className="flex gap-3">
            <Link href="/auth/signup" className="masthead__btn-primary text-sm">
              Create free account
            </Link>
            <Link href="/auth/login" className="masthead__btn-secondary text-sm">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Registration CTA banner (unauthenticated only) ---------------------------

function CTABanner() {
  return (
    <div className="rounded-xl border border-accent/20 bg-gradient-to-r from-accent/10 to-accent/5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
            Free supplier registration
          </p>
          <h3 className="mt-1 text-lg font-bold text-heading">
            Respond to tenders and win more contracts
          </h3>
          <p className="mt-1 text-sm text-secondary">
            Join thousands of verified South African suppliers — submit quotes, get matched to
            opportunities, and grow your business on AiForm Procure.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link href="/auth/signup" className="masthead__btn-primary whitespace-nowrap">
            Register free
          </Link>
          <Link href="/auth/login" className="text-sm font-medium text-accent hover:underline">
            Already registered? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

// --- RFQ card -----------------------------------------------------------------

function RFQCard({
  rfq,
  idx,
  isAuth,
  onPreview,
}: {
  rfq: PublicRFQ
  idx: number
  isAuth: boolean
  onPreview: (rfq: PublicRFQ) => void
}) {
  const daysLeft = daysUntil(getClosingDate(rfq))
  const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
  const isNew = isPostedWithin48h(getPublishedDate(rfq))
  const blurDesc = !isAuth && (idx + 1) % 3 === 0

  // left-border accent: blue =2 days (=48h), amber =3 days
  const borderAccent =
    daysLeft !== null && daysLeft >= 0 && daysLeft <= 2
      ? "border-l-4 border-l-sky-500"
      : daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
      ? "border-l-4 border-l-amber-400"
      : ""

  return (
    <article
      className={
        "rounded-md border border-panel bg-card p-5 shadow-panel transition hover:shadow-md " +
        borderAccent
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {(isNew || isClosingSoon) && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {isNew && (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-sky-700">
                  New
                </span>
              )}
              {isClosingSoon && (
                <span className="rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-warning">
                  Closing soon
                </span>
              )}
            </div>
          )}
          <h3 className="font-bold text-heading line-clamp-2">
            {rfq.title ?? "Untitled opportunity"}
          </h3>
          <p className="mt-0.5 text-sm text-secondary">{getBuyerName(rfq)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-heading">{formatDaysLeft(daysLeft)}</p>
          <p className="mt-0.5 text-xs text-muted">{formatValueRange(rfq)}</p>
        </div>
      </div>

      {/* Description — blurred for every 3rd card when unauthenticated */}
      <div className="relative mt-3">
        <p
          className={
            "text-sm leading-relaxed text-secondary line-clamp-2" +
            (blurDesc ? " select-none blur-sm" : "")
          }
        >
          {rfq.description ?? "No description provided."}
        </p>
        {blurDesc && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => onPreview(rfq)}
              className="rounded-full border border-panel bg-card px-4 py-1.5 text-xs font-semibold text-secondary shadow hover:bg-surface hover:text-primary"
            >
              Preview opportunity
            </button>
          </div>
        )}
      </div>

      {/* Meta chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <MetaChip icon={<PinIcon />} label={getRFQProvince(rfq)} />
        <MetaChip icon={<IndustryIcon />} label={getRFQIndustry(rfq)} />
        {getBBBEEReq(rfq) && (
          <MetaChip icon={<ShieldIcon />} label={"BBBEE " + getBBBEEReq(rfq)} />
        )}
        <MetaChip icon={<RandIcon />} label={formatValueRange(rfq)} />
      </div>

      {/* Action row */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-panel pt-3">
        <p className="text-xs text-muted">Closes {formatDate(getClosingDate(rfq))}</p>
        {isAuth ? (
          <Link
            href={"/dashboard/rfqs?open=" + rfq.id}
            className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel hover:text-heading"
          >
            View &amp; quote
          </Link>
        ) : (
          <button
            onClick={() => onPreview(rfq)}
            className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel hover:text-heading"
          >
            Preview
          </button>
        )}
      </div>
    </article>
  )
}

// --- Main page ----------------------------------------------------------------

export default function OpportunitiesPage() {
  const [rfqs, setRfqs] = useState<PublicRFQ[]>([])
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("deadline")
  const [industryFilters, setIndustryFilters] = useState<string[]>([])
  const [provinceFilters, setProvinceFilters] = useState<string[]>([])
  const [deadlineFilters, setDeadlineFilters] = useState<DeadlineFilter[]>([])
  const [bbeeFilters, setBbeeFilters] = useState<BBBEEFilter[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [previewRFQ, setPreviewRFQ] = useState<PublicRFQ | null>(null)

  useEffect(() => {
    async function load() {
      const [data, authResult] = await Promise.all([
        fetchPublicRFQs(),
        supabase ? supabase.auth.getUser() : Promise.resolve(null),
      ])
      setRfqs(data)
      setIsAuth(!!(authResult?.data?.user))
      setLoading(false)
    }
    load()
  }, [])

  const industries = useMemo(
    () => Array.from(new Set(rfqs.map((r) => getRFQIndustry(r)))).sort(),
    [rfqs]
  )

  const totalOpen = rfqs.length
  const closingSoonCount = rfqs.filter((r) => {
    const d = daysUntil(getClosingDate(r))
    return d !== null && d >= 0 && d <= 7
  }).length
  const newRecentCount = rfqs.filter((r) => isPostedWithin48h(getPublishedDate(r))).length

  const filtered = useMemo(() => {
    let result = rfqs

    if (search.trim()) {
      const q = normalize(search)
      result = result.filter(
        (r) =>
          normalize(r.title).includes(q) ||
          normalize(r.description).includes(q) ||
          normalize(getBuyerName(r)).includes(q) ||
          normalize(getRFQIndustry(r)).includes(q) ||
          normalize(getRFQProvince(r)).includes(q)
      )
    }

    if (industryFilters.length > 0) {
      result = result.filter((r) =>
        industryFilters.map(normalize).includes(normalize(getRFQIndustry(r)))
      )
    }

    if (provinceFilters.length > 0) {
      result = result.filter((r) =>
        provinceFilters.some((p) => normalize(getRFQProvince(r)).includes(normalize(p)))
      )
    }

    if (deadlineFilters.length > 0) {
      result = result.filter((r) =>
        deadlineFilters.some((f) => deadlineBucketMatches(daysUntil(getClosingDate(r)), f))
      )
    }

    if (bbeeFilters.length > 0) {
      result = result.filter((r) => bbeeFilters.includes(getBBBEEBucket(r)))
    }

    return [...result].sort((a, b) => {
      if (sort === "deadline") {
        const da = daysUntil(getClosingDate(a)) ?? 99999
        const db = daysUntil(getClosingDate(b)) ?? 99999
        return da - db
      }
      if (sort === "newest") {
        return (getPublishedDate(b) ?? "").localeCompare(getPublishedDate(a) ?? "")
      }
      const numA = a.estimated_value_max ?? Number(String(a.budget ?? "0").replace(/[^\d]/g, ""))
      const numB = b.estimated_value_max ?? Number(String(b.budget ?? "0").replace(/[^\d]/g, ""))
      return numB - numA
    })
  }, [rfqs, search, industryFilters, provinceFilters, deadlineFilters, bbeeFilters, sort])

  function resetFilters() {
    setIndustryFilters([])
    setProvinceFilters([])
    setDeadlineFilters([])
    setBbeeFilters([])
  }

  const hasActiveFilters =
    industryFilters.length > 0 ||
    provinceFilters.length > 0 ||
    deadlineFilters.length > 0 ||
    bbeeFilters.length > 0

  const filterBadgeCount =
    industryFilters.length +
    provinceFilters.length +
    deadlineFilters.length +
    bbeeFilters.length

  const filterBodyProps = {
    all: rfqs,
    industries,
    industryFilters,
    setIndustryFilters,
    provinceFilters,
    setProvinceFilters,
    deadlineFilters,
    setDeadlineFilters,
    bbeeFilters,
    setBbeeFilters,
    onReset: resetFilters,
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        {/* Hero strip */}
        <section className="border-b border-panel bg-card py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="newspaper-kicker mb-2">Live procurement &middot; South Africa</p>
            <h1 className="newspaper-headline mb-4">
              Find tenders and RFQs across South Africa
            </h1>
            <p className="newspaper-body mb-6 max-w-2xl text-secondary">
              Browse verified procurement opportunities from government entities and private buyers.
              Register free to respond and win contracts.
            </p>

            {/* Search */}
            <div className="relative mb-6 max-w-xl">
              <svg
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
              <input
                type="search"
                placeholder="Search by keyword, industry, province or buyer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-panel bg-panel py-3 pl-11 pr-4 text-sm text-primary outline-none placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>

            {/* Stat chips */}
            {!loading && (
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-4 py-1.5 text-sm font-semibold text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {totalOpen} active {totalOpen === 1 ? "tender" : "tenders"}
                </span>
                {closingSoonCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning bg-warning-soft px-4 py-1.5 text-sm font-semibold text-warning">
                    <CalendarIcon />
                    {closingSoonCount} closing this week
                  </span>
                )}
                {newRecentCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm font-semibold text-sky-700">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {newRecentCount} new in last 48h
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Body: sidebar + card list */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {!loading && !isAuth && (
            <div className="mb-6 flex flex-col gap-3 rounded-md border border-accent/20 bg-accent/10 p-4 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
              <p>
                You&apos;re browsing as a guest. Register free to submit quotes and get matched RFQs.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-button transition hover:bg-accent-strong"
                >
                  Register free
                </Link>
                <Link
                  href="/auth/login"
                  className="rounded-md border border-panel bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary transition hover:text-accent"
                >
                  Log in
                </Link>
              </div>
            </div>
          )}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFiltersOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel lg:hidden"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M3 6h18M7 12h10M11 18h2"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2"
                      />
                    </svg>
                    Filters
                    {hasActiveFilters && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.6rem] font-bold text-white">
                        {filterBadgeCount}
                      </span>
                    )}
                  </button>
                  <p className="text-sm text-secondary">
                    {loading
                      ? "Loading…"
                      : filtered.length === 1
                      ? "1 opportunity"
                      : `${filtered.length} opportunities`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-secondary">Sort by</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs text-primary outline-none focus:border-accent"
                  >
                    <option value="deadline">Closing soonest</option>
                    <option value="newest">Newest first</option>
                    <option value="value">Highest value</option>
                  </select>
                </div>
              </div>

              {/* Cards */}
              {loading ? (
                <div className="space-y-4">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-panel bg-card py-16 text-center">
                  <p className="text-lg font-semibold text-heading">No opportunities found</p>
                  <p className="mt-2 text-sm text-secondary">
                    Try adjusting your search or clearing active filters
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="mt-4 rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-primary transition hover:bg-panel"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((rfq, idx) => (
                    <div key={rfq.id}>
                      <RFQCard
                        rfq={rfq}
                        idx={idx}
                        isAuth={isAuth}
                        onPreview={setPreviewRFQ}
                      />
                      {!isAuth && idx === 3 && (
                        <div className="mt-4">
                          <CTABanner />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-panel bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-secondary">
                Filters
              </h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-md p-1 text-muted hover:bg-surface hover:text-primary"
              >
                <CloseIcon />
              </button>
            </div>
            <FilterBody {...filterBodyProps} />
            <button
              onClick={() => setFiltersOpen(false)}
              className="mt-6 w-full masthead__btn-primary"
            >
              {`Show ${filtered.length} results`}
            </button>
          </div>
        </div>
      )}

      <PreviewModal rfq={previewRFQ} onClose={() => setPreviewRFQ(null)} />
      <PublicFooter />
    </>
  )
}

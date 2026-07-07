"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { getSavedRFQs, saveRFQ, unsaveRFQ } from "@/lib/savedRFQs"
import { calculateRFQMatch } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type TabKey = "matched" | "all" | "saved" | "submitted"
type SortKey = "deadline" | "newest" | "match"
type DeadlineFilter = "week" | "twoWeeks" | "month"
type BBBEEFilter = "level1to2" | "level3to4" | "level5to8" | "any"

type RFQ = {
  id: number
  title: string | null
  description: string | null
  region?: string | null
  province?: string | null
  provinces?: string[] | null
  category?: string | null
  industry?: string | null
  budget?: string | null
  estimated_value_min?: number | null
  estimated_value_max?: number | null
  status: string | null
  deadline?: string | null
  closing_date?: string | null
  created_at?: string | null
  published_date?: string | null
  buyer_name?: string | null
  buyer?: string | null
  buyer_org?: string | null
  organization_name?: string | null
  bbee_requirement?: string | null
  bbbee_requirement?: string | null
  bbbee_level?: string | null
  quote_count?: number | null
}

type SupplierProfile = {
  id: string
  province: string | null
  provinces?: string[] | null
  industry: string | null
  bbbee_level?: string | null
}

type QuoteSummary = {
  id: number
  rfq_id: number | null
  supplier_id: string | null
}

type MarketplaceRFQ = {
  rfq: RFQ
  displayStatus: string
  daysLeft: number | null
  isClosingSoon: boolean
  isNewToday: boolean
  isSaved: boolean
  hasQuote: boolean
  matchScore: number
  isMatched: boolean
}

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

const DEADLINE_FILTERS: { key: DeadlineFilter; label: string }[] = [
  { key: "week", label: "Closing this week" },
  { key: "twoWeeks", label: "Next 2 weeks" },
  { key: "month", label: "This month" },
]

const BBBEE_FILTERS: { key: BBBEEFilter; label: string }[] = [
  { key: "level1to2", label: "Level 1-2" },
  { key: "level3to4", label: "Level 3-4" },
  { key: "level5to8", label: "Level 5-8" },
  { key: "any", label: "Any level / not specified" },
]

const statusStyles: Record<string, string> = {
  Open: "border-success/30 bg-success-soft text-success",
  "Closing soon": "border-warning bg-warning-soft text-warning",
  "New today": "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Saved: "border-panel bg-panel text-secondary",
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function parseList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : []
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

function isPostedRecently(value: string | null | undefined): boolean {
  if (!value) return false

  const posted = new Date(value)
  if (Number.isNaN(posted.getTime())) return false

  return Date.now() - posted.getTime() <= 48 * 60 * 60 * 1000
}

function formatDaysLeft(daysLeft: number | null): string {
  if (daysLeft === null) return "Deadline TBC"
  if (daysLeft < 0) return "Closed"
  if (daysLeft === 0) return "Due today"
  if (daysLeft === 1) return "1 day left"
  return `${daysLeft} days left`
}

function formatRand(amount: string | null | undefined): string {
  if (!amount) return "Value TBC"

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  })}`
}

function formatValueRange(rfq: RFQ): string {
  const min = rfq.estimated_value_min
  const max = rfq.estimated_value_max

  if (typeof min === "number" && typeof max === "number") {
    return `${formatRand(String(min))} - ${formatRand(String(max))}`
  }

  if (typeof min === "number") return `From ${formatRand(String(min))}`
  if (typeof max === "number") return `Up to ${formatRand(String(max))}`

  return formatRand(rfq.budget)
}

function getClosingDate(rfq: RFQ): string | null {
  return rfq.closing_date || rfq.deadline || null
}

function getPublishedDate(rfq: RFQ): string | null {
  return rfq.published_date || rfq.created_at || null
}

function getBuyerName(rfq: RFQ): string {
  return (
    rfq.buyer_org ||
    rfq.buyer_name ||
    rfq.buyer ||
    rfq.organization_name ||
    "Procurement buyer"
  )
}

function getRFQProvince(rfq: RFQ): string {
  const provinces = normalizeArray(rfq.provinces)
  return provinces.length > 0 ? provinces.join(", ") : rfq.province || rfq.region || "South Africa"
}

function getRFQIndustry(rfq: RFQ): string {
  return rfq.industry || rfq.category || "General procurement"
}

function getRFQBBBEERequirement(rfq: RFQ): string | null {
  return rfq.bbee_requirement || rfq.bbbee_requirement || rfq.bbbee_level || null
}

function parseBBBEELevel(value: string | null | undefined): number | null {
  if (!value) return null
  if (normalize(value).includes("non-compliant")) return 9

  const match = value.match(/level\s*(\d)/i)
  return match ? Number(match[1]) : null
}

function getBBBEEBucket(rfq: RFQ): BBBEEFilter {
  const level = parseBBBEELevel(getRFQBBBEERequirement(rfq))

  if (!level) return "any"
  if (level <= 2) return "level1to2"
  if (level <= 4) return "level3to4"
  return "level5to8"
}

function supplierQualifiesForBBBEE(profile: SupplierProfile | null, rfq: RFQ): boolean {
  const requiredLevel = parseBBBEELevel(getRFQBBBEERequirement(rfq))
  if (!requiredLevel) return true

  const supplierLevel = parseBBBEELevel(profile?.bbbee_level)
  if (!supplierLevel) return false

  return supplierLevel <= requiredLevel
}

function hasIndustryMatch(profile: SupplierProfile | null, rfq: RFQ): boolean {
  const supplierIndustry = normalize(profile?.industry)
  const rfqIndustry = normalize(getRFQIndustry(rfq))

  return Boolean(
    supplierIndustry &&
      rfqIndustry &&
      (supplierIndustry === rfqIndustry ||
        supplierIndustry.includes(rfqIndustry) ||
        rfqIndustry.includes(supplierIndustry))
  )
}

function hasProvinceMatch(profile: SupplierProfile | null, rfq: RFQ): boolean {
  const supplierProvinces = [
    ...normalizeArray(profile?.provinces),
    ...parseList(profile?.province),
  ].map(normalize)
  const rfqProvinces = [
    ...normalizeArray(rfq.provinces),
    ...parseList(getRFQProvince(rfq)),
  ].map(normalize)

  return supplierProvinces.some((province) => rfqProvinces.includes(province))
}

function calculateMatchScore(profile: SupplierProfile | null, rfq: RFQ): number {
  return calculateRFQMatch(profile, rfq)
}

function isMatchedRFQ(profile: SupplierProfile | null, rfq: RFQ): boolean {
  return (
    hasIndustryMatch(profile, rfq) &&
    hasProvinceMatch(profile, rfq) &&
    supplierQualifiesForBBBEE(profile, rfq)
  )
}

function deadlineBucketMatches(daysLeft: number | null, filter: DeadlineFilter): boolean {
  if (daysLeft === null) return false
  if (filter === "week") return daysLeft <= 7
  if (filter === "twoWeeks") return daysLeft >= 8 && daysLeft <= 14
  return daysLeft >= 15 && daysLeft <= 30
}

function metadataIcon(type: "pin" | "industry" | "shield" | "rand") {
  const common = "h-3.5 w-3.5 shrink-0"

  if (type === "pin") {
    return (
      <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24">
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === "shield") {
    return (
      <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24">
        <path d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === "rand") {
    return (
      <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24">
        <path d="M7 19V5h6.5a4 4 0 0 1 0 8H7M13 13l4 6M7 13h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className={common} fill="none" viewBox="0 0 24 24">
      <path d="M5 8h14M7 8V5h10v3M7 8v11M17 8v11M9 12h6M9 16h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function RFQListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-4 w-72 animate-pulse rounded bg-panel" />
              <div className="h-3 w-40 animate-pulse rounded bg-panel" />
            </div>
            <div className="h-5 w-20 animate-pulse rounded bg-panel" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-7 w-28 animate-pulse rounded-full bg-panel" />
            ))}
          </div>
        </div>
      ))}
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

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [profile, setProfile] = useState<SupplierProfile | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("matched")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("deadline")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [industryFilters, setIndustryFilters] = useState<string[]>([])
  const [provinceFilters, setProvinceFilters] = useState<string[]>(SA_PROVINCES)
  const [deadlineFilters, setDeadlineFilters] = useState<DeadlineFilter[]>([
    "week",
    "twoWeeks",
    "month",
  ])
  const [bbeeFilters, setBbeeFilters] = useState<BBBEEFilter[]>([
    "level1to2",
    "level3to4",
    "level5to8",
    "any",
  ])

  useEffect(() => {
    async function loadSupplierRFQs() {
      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      const userId = userData.user?.id ?? null

      if (userId) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, province, provinces, industry, bbbee_level")
          .eq("id", userId)
          .maybeSingle()

        if (profileError) {
          setError(profileError.message)
          setLoading(false)
          return
        }

        setProfile((profileData ?? null) as SupplierProfile | null)
      }

      const { data, error: rfqError } = await supabase
        .from("rfqs")
        .select(
          "id,title,description,buyer_name,buyer_org,industry,category,province,provinces,bbbee_requirement,estimated_value_min,estimated_value_max,closing_date,published_date,status,quote_count"
        )
        .ilike("status", "open")
        .eq("is_public", true)
        .gt("closing_date", new Date().toISOString())
        .order("closing_date", { ascending: true, nullsFirst: false })

      if (rfqError) {
        setError(rfqError.message)
        setLoading(false)
        return
      }

      if (userId) {
        try {
          const saved = await getSavedRFQs()
          setSavedIds(new Set(saved.map((item) => item.rfq_id)))
        } catch {
          setSavedIds(new Set())
        }

        const { data: quoteData } = await supabase
          .from("quotes")
          .select("id, rfq_id, supplier_id")
          .eq("supplier_id", userId)

        setSubmittedIds(
          new Set(
            ((quoteData ?? []) as QuoteSummary[])
              .map((quote) => quote.rfq_id)
              .filter((id): id is number => typeof id === "number")
          )
        )
      }

      const rows = (data ?? []) as RFQ[]
      setRfqs(rows)
      setIndustryFilters(
        Array.from(new Set(rows.map((rfq) => getRFQIndustry(rfq)).filter(Boolean))).sort()
      )
      setLoading(false)
    }

    loadSupplierRFQs()
  }, [])

  useEffect(() => {
    if (activeTab !== "matched" && sort === "match") {
      setSort("deadline")
    }
  }, [activeTab, sort])

  const marketplaceRFQs = useMemo<MarketplaceRFQ[]>(
    () =>
      rfqs.map((rfq) => {
        const closingDate = getClosingDate(rfq)
        const displayStatus = getRFQDisplayStatus(rfq.status, closingDate)
        const daysLeft = daysUntil(closingDate)
        const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3

        return {
          rfq,
          displayStatus,
          daysLeft,
          isClosingSoon,
          isNewToday: isPostedRecently(getPublishedDate(rfq)),
          isSaved: savedIds.has(rfq.id),
          hasQuote: submittedIds.has(rfq.id),
          matchScore: calculateMatchScore(profile, rfq),
          isMatched: isMatchedRFQ(profile, rfq),
        }
      }),
    [profile, rfqs, savedIds, submittedIds]
  )

  const openRFQs = useMemo(
    () => marketplaceRFQs.filter((item) => item.displayStatus !== "Closed"),
    [marketplaceRFQs]
  )

  const industryOptions = useMemo(
    () =>
      Array.from(new Set(openRFQs.map((item) => getRFQIndustry(item.rfq)).filter(Boolean))).sort(),
    [openRFQs]
  )

  const countMatching = useCallback(
    (predicate: (item: MarketplaceRFQ) => boolean) =>
      openRFQs.filter(predicate).length,
    [openRFQs]
  )

  const industryCounts = useMemo(
    () =>
      Object.fromEntries(
        industryOptions.map((industry) => [
          industry,
          countMatching((item) => getRFQIndustry(item.rfq) === industry),
        ])
      ),
    [countMatching, industryOptions]
  )

  const provinceCounts = useMemo(
    () =>
      Object.fromEntries(
        SA_PROVINCES.map((province) => [
          province,
          countMatching((item) =>
            parseList(getRFQProvince(item.rfq)).map(normalize).includes(normalize(province))
          ),
        ])
      ),
    [countMatching]
  )

  const deadlineCounts = useMemo(
    () =>
      Object.fromEntries(
        DEADLINE_FILTERS.map((filter) => [
          filter.key,
          countMatching((item) => deadlineBucketMatches(item.daysLeft, filter.key)),
        ])
      ) as Record<DeadlineFilter, number>,
    [countMatching]
  )

  const bbeeCounts = useMemo(
    () =>
      Object.fromEntries(
        BBBEE_FILTERS.map((filter) => [
          filter.key,
          countMatching((item) => getBBBEEBucket(item.rfq) === filter.key),
        ])
      ) as Record<BBBEEFilter, number>,
    [countMatching]
  )

  const tabCounts = useMemo(
    () => ({
      matched: openRFQs.filter((item) => item.isMatched).length,
      all: openRFQs.length,
      saved: openRFQs.filter((item) => item.isSaved).length,
      submitted: openRFQs.filter((item) => item.hasQuote).length,
    }),
    [openRFQs]
  )

  const tabbedRFQs = useMemo(() => {
    if (activeTab === "matched") return openRFQs.filter((item) => item.isMatched)
    if (activeTab === "saved") return openRFQs.filter((item) => item.isSaved)
    if (activeTab === "submitted") return openRFQs.filter((item) => item.hasQuote)
    return openRFQs
  }, [activeTab, openRFQs])

  const filteredRFQs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return tabbedRFQs
      .filter((item) => {
        const industryMatch =
          industryFilters.length === 0 ||
          industryFilters.includes(getRFQIndustry(item.rfq))
        const provinceMatch =
          provinceFilters.length === 0 ||
          parseList(getRFQProvince(item.rfq))
            .map(normalize)
            .some((province) => provinceFilters.map(normalize).includes(province))
        const deadlineMatch =
          deadlineFilters.length === 0 ||
          deadlineFilters.some((filter) => deadlineBucketMatches(item.daysLeft, filter))
        const bbeeMatch =
          bbeeFilters.length === 0 || bbeeFilters.includes(getBBBEEBucket(item.rfq))
        const searchMatch =
          !query ||
          [item.rfq.title, getBuyerName(item.rfq), item.rfq.description]
            .some((value) => normalize(value).includes(query))

        return industryMatch && provinceMatch && deadlineMatch && bbeeMatch && searchMatch
      })
      .sort((a, b) => {
        if (sort === "match") return b.matchScore - a.matchScore
        if (sort === "newest") {
          return (
            new Date(getPublishedDate(b.rfq) ?? 0).getTime() -
            new Date(getPublishedDate(a.rfq) ?? 0).getTime()
          )
        }

        return (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER)
      })
  }, [
    bbeeFilters,
    deadlineFilters,
    industryFilters,
    provinceFilters,
    search,
    sort,
    tabbedRFQs,
  ])

  const resultText =
    activeTab === "matched"
      ? `${filteredRFQs.length} RFQs matched to your profile`
      : activeTab === "saved"
        ? `${filteredRFQs.length} saved RFQs`
        : activeTab === "submitted"
          ? `${filteredRFQs.length} quotes submitted`
          : `${filteredRFQs.length} open RFQs available`

  const toggleArrayFilter = <T extends string>(
    value: T,
    values: T[],
    setter: (next: T[]) => void
  ) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  const clearFilters = () => {
    setSearch("")
    setIndustryFilters(industryOptions)
    setProvinceFilters(SA_PROVINCES)
    setDeadlineFilters(["week", "twoWeeks", "month"])
    setBbeeFilters(["level1to2", "level3to4", "level5to8", "any"])
  }

  async function toggleSaved(rfqId: number) {
    const wasSaved = savedIds.has(rfqId)
    const nextSavedIds = new Set(savedIds)

    if (wasSaved) nextSavedIds.delete(rfqId)
    else nextSavedIds.add(rfqId)

    setSavedIds(nextSavedIds)

    try {
      if (wasSaved) await unsaveRFQ(rfqId)
      else await saveRFQ(rfqId)
    } catch (err) {
      const revertedIds = new Set(nextSavedIds)
      if (wasSaved) revertedIds.add(rfqId)
      else revertedIds.delete(rfqId)
      setSavedIds(revertedIds)
      console.warn("RFQ bookmark update failed:", err)
    }
  }

  const FiltersContent = (
    <div className="space-y-6">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
          Industry
        </p>
        <div className="mt-3 space-y-1">
          {industryOptions.map((industry) => (
            <FilterCheckbox
              key={industry}
              label={industry}
              count={industryCounts[industry] ?? 0}
              checked={industryFilters.includes(industry)}
              onChange={() => toggleArrayFilter(industry, industryFilters, setIndustryFilters)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
          Province
        </p>
        <div className="mt-3 space-y-1">
          {SA_PROVINCES.map((province) => (
            <FilterCheckbox
              key={province}
              label={province}
              count={provinceCounts[province] ?? 0}
              checked={provinceFilters.includes(province)}
              onChange={() => toggleArrayFilter(province, provinceFilters, setProvinceFilters)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
          Deadline
        </p>
        <div className="mt-3 space-y-1">
          {DEADLINE_FILTERS.map((filter) => (
            <FilterCheckbox
              key={filter.key}
              label={filter.label}
              count={deadlineCounts[filter.key] ?? 0}
              checked={deadlineFilters.includes(filter.key)}
              onChange={() => toggleArrayFilter(filter.key, deadlineFilters, setDeadlineFilters)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
          BBBEE requirement
        </p>
        <div className="mt-3 space-y-1">
          {BBBEE_FILTERS.map((filter) => (
            <FilterCheckbox
              key={filter.key}
              label={filter.label}
              count={bbeeCounts[filter.key] ?? 0}
              checked={bbeeFilters.includes(filter.key)}
              onChange={() => toggleArrayFilter(filter.key, bbeeFilters, setBbeeFilters)}
            />
          ))}
        </div>
      </div>
    </div>
  )

  function EmptyState() {
    if (activeTab === "matched") {
      return (
        <div className="rounded-md border border-panel bg-card p-8 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No RFQs currently match your profile.</p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Browse all RFQs or update your profile to improve matching.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
            >
              Browse all RFQs
            </button>
            <Link
              href="/dashboard/profile"
              className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
            >
              Update profile
            </Link>
          </div>
        </div>
      )
    }

    if (activeTab === "saved") {
      return (
        <div className="rounded-md border border-panel bg-card p-8 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">You haven&apos;t saved any RFQs yet.</p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Bookmark RFQs to revisit them later.
          </p>
        </div>
      )
    }

    if (activeTab === "submitted") {
      return (
        <div className="rounded-md border border-panel bg-card p-8 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">You haven&apos;t submitted any quotes yet.</p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Browse open RFQs to get started.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className="mt-5 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Browse RFQs
          </button>
        </div>
      )
    }

    return (
      <div className="rounded-md border border-panel bg-card p-8 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">No RFQs match your current filters.</p>
        <button
          type="button"
          onClick={clearFilters}
          className="mt-5 rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
        >
          Clear filters
        </button>
      </div>
    )
  }

  function RFQCard({ item }: { item: MarketplaceRFQ }) {
    const rfq = item.rfq
    const primaryPill = item.isClosingSoon
      ? "Closing soon"
      : item.isNewToday
        ? "New today"
        : "Open"
    const accentClass = item.isClosingSoon
      ? "border-l-2 border-l-warning"
      : item.isNewToday
        ? "border-l-2 border-l-sky-500"
        : ""

    return (
      <article
        className={`rounded-md border border-panel bg-card p-5 shadow-panel transition-colors hover:border-accent/60 hover:bg-surface ${accentClass}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-6 text-heading">{rfq.title || `RFQ-${rfq.id}`}</h2>
            <p className="mt-1 text-xs font-semibold text-muted">{getBuyerName(rfq)}</p>
          </div>
          <p
            className={`shrink-0 text-xs font-bold ${
              item.isClosingSoon ? "text-warning" : "text-muted"
            }`}
          >
            {formatDaysLeft(item.daysLeft)}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { icon: "pin" as const, label: getRFQProvince(rfq) },
            { icon: "industry" as const, label: getRFQIndustry(rfq) },
            { icon: "shield" as const, label: getRFQBBBEERequirement(rfq) || "BBBEE any level" },
            { icon: "rand" as const, label: formatValueRange(rfq) },
          ].map((meta) => (
            <span
              key={`${rfq.id}-${meta.icon}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-panel px-3 py-1.5 text-[0.68rem] font-semibold text-muted"
            >
              {metadataIcon(meta.icon)}
              {meta.label}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-panel pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusStyles[primaryPill]}`}
            >
              {primaryPill}
            </span>
            {item.isSaved && (
              <span className={`inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${statusStyles.Saved}`}>
                Saved
              </span>
            )}
            {activeTab === "matched" && (
              <span className="inline-flex rounded-md border border-success/30 bg-success-soft px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-success">
                {item.matchScore}% match
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => toggleSaved(rfq.id)}
              aria-label={item.isSaved ? "Remove bookmark" : "Bookmark RFQ"}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition ${
                item.isSaved
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill={item.isSaved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </button>
            <Link
              href={`/dashboard/rfqs/${rfq.id}`}
              className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface hover:text-primary"
            >
              View details
            </Link>
            <Link
              href={`/dashboard/rfqs/${rfq.id}/submit`}
              className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
            >
              Submit quote -&gt;
            </Link>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Dashboard &gt; RFQs
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-heading">
          RFQ marketplace
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Browse and respond to open requests for quotation.
        </p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "matched" as const, label: "Matched for you", count: tabCounts.matched },
            { key: "all" as const, label: "All RFQs", count: tabCounts.all },
            { key: "saved" as const, label: "Saved", count: tabCounts.saved },
            { key: "submitted" as const, label: "Quotes submitted", count: tabCounts.submitted },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "border-accent bg-accent text-button"
                  : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent"
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-surface/70 px-2 py-0.5 text-xs text-primary">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading && <RFQListSkeleton />}

      {!loading && error && (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-6">
          <p className="text-sm font-medium text-rose-700">Failed to load RFQs</p>
          <p className="mt-1 text-xs text-rose-700/80">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden rounded-md border border-panel bg-card p-4 shadow-panel lg:block">
            {FiltersContent}
          </aside>

          {filtersOpen && (
            <div className="fixed inset-0 z-50 bg-black/35 p-4 lg:hidden">
              <div className="ml-auto h-full max-w-sm overflow-y-auto rounded-md border border-panel bg-card p-5 shadow-panel">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-heading">Filters</p>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="rounded-md border border-panel bg-panel px-3 py-1.5 text-sm font-semibold text-secondary"
                  >
                    Close
                  </button>
                </div>
                {FiltersContent}
              </div>
            </div>
          )}

          <section className="min-w-0">
            <div className="mb-4 flex justify-end lg:hidden">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
              >
                Filters
              </button>
            </div>

            <div className="rounded-md border border-panel bg-card p-4 shadow-panel">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search RFQs by title, buyer or keyword..."
                className="w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-secondary">{resultText}</p>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="rounded-md border border-panel bg-panel px-3 py-2 text-sm font-semibold text-heading outline-none transition focus:border-accent"
                >
                  <option value="deadline">Deadline (soonest)</option>
                  <option value="newest">Newest first</option>
                  {activeTab === "matched" && <option value="match">Best match</option>}
                </select>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {filteredRFQs.length === 0 ? (
                <EmptyState />
              ) : (
                filteredRFQs.map((item) => <RFQCard key={item.rfq.id} item={item} />)
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

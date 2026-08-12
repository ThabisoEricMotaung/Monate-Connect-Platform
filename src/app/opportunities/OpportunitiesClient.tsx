"use client"

import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import CopyLinkButton from "./[id]/CopyLinkButton"
import DigestSignupForm from "./DigestSignupForm"
import { normalizeOpportunityTitleCase } from "@/lib/externalOpportunity"
import { localeFormatTag, normalizeLocale } from "@/i18n/config"
import type { PublicRFQ } from "@/lib/publicOpportunities"

const SITE_URL = "https://www.aiformprocure.co.za"

// --- Types --------------------------------------------------------------------

type OpportunityStats = {
  closingThisWeek: number
}

type SortKey = "deadline" | "newest" | "value"
type DeadlineFilter = "week" | "twoWeeks" | "month"
type BBBEEFilter = "level1to2" | "level3to4" | "level5to8" | "any"
type SupplierMatchProfile = {
  industry: string | null
  province: string | null
  provinces: string[] | null
}

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

function formatBudget(value: string | number | null | undefined, locale: string, unavailable: string): string {
  if (value === null || value === undefined || value === "") return unavailable
  if (typeof value === "number") {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value)
  }
  const num = Number(value.toString().replace(/[^\d.]/g, ""))
  if (Number.isNaN(num) || num === 0) return String(value)
  return new Intl.NumberFormat(locale, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(num)
}

function formatDate(value: string | null | undefined, locale: string, unavailable: string): string {
  if (!value) return unavailable
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
}

function formatValueRange(rfq: PublicRFQ, locale: string, unavailable: string): string {
  const min = rfq.estimated_value_min
  const max = rfq.estimated_value_max

  if (typeof min === "number" && typeof max === "number") {
    return `${formatBudget(min, locale, unavailable)} - ${formatBudget(max, locale, unavailable)}`
  }

  if (typeof min === "number") return formatBudget(min, locale, unavailable)
  if (typeof max === "number") return formatBudget(max, locale, unavailable)

  return formatBudget(rfq.budget, locale, unavailable)
}

function getClosingDate(rfq: PublicRFQ): string | null {
  return rfq.closing_date || rfq.deadline || null
}

function getPublishedDate(rfq: PublicRFQ): string | null {
  return rfq.published_date || rfq.created_at || null
}

function getBuyerName(rfq: PublicRFQ): string {
  return rfq.buyer_org || rfq.buyer_name || rfq.buyer || rfq.organization_name || "Buyer not specified"
}

function getRFQProvince(rfq: PublicRFQ): string {
  const provinces = normalizeArray(rfq.provinces)
  return provinces.length > 0 ? provinces.join(", ") : rfq.province || "South Africa"
}

function getRFQIndustry(rfq: PublicRFQ): string {
  return rfq.industry || rfq.category || "General procurement"
}

function normalizedProvinceSet(
  province: string | null | undefined,
  provinces: string[] | null | undefined,
): Set<string> {
  const values = normalizeArray(provinces)
  if (province) values.push(province)

  return new Set(
    values.map(normalize).map((value) =>
      value === "south africa" || value === "all provinces" ? "national" : value,
    ),
  )
}

function opportunityMatchScore(
  rfq: PublicRFQ,
  profile: SupplierMatchProfile | null,
): number {
  if (!profile) return 0

  const industryMatches =
    Boolean(normalize(profile.industry)) &&
    normalize(profile.industry) === normalize(getRFQIndustry(rfq))
  const supplierProvinces = normalizedProvinceSet(profile.province, profile.provinces)
  const opportunityProvinces = normalizedProvinceSet(rfq.province, rfq.provinces)
  const provinceMatches = Array.from(supplierProvinces).some((province) =>
    opportunityProvinces.has(province),
  )

  return Number(industryMatches) + Number(provinceMatches)
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

// --- Client-only data (stats + auth/profile) -----------------------------------

async function fetchOpportunityStats(): Promise<OpportunityStats | null> {
  const response = await fetch("/api/opportunities/stats", { cache: "no-store" })
  if (!response.ok) return null
  return response.json() as Promise<OpportunityStats>
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

function PersonIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12.5 13 21 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function BadgeCheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9.5 12.2l1.8 1.8 3.2-3.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M6 9a6 6 0 1 1 12 0c0 3 1 4.5 1.5 5.5H4.5C5 13.5 6 12 6 9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24">
      <rect x="5" y="10.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10.5V7.5a4 4 0 1 1 8 0v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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

function FilterSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 border-b border-panel pb-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-heading">
        {children}
      </p>
    </div>
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
  const t = useTranslations("opportunities")
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
    const norm = normalize(p)
    return all.filter((r) => {
      const provinces = normalizeArray(r.provinces)
      if (provinces.length > 0) {
        return provinces.some((prov) => normalize(prov).includes(norm))
      }
      return normalize(r.province ?? "").includes(norm)
    }).length
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
          {t("filters")}
        </h2>
        {hasActive && (
          <button onClick={onReset} className="text-xs font-semibold text-accent hover:underline">
            {t("resetAll")}
          </button>
        )}
      </div>

      {/* Industry */}
      {industries.length > 0 && (
        <div>
          <FilterSectionTitle>{t("industry")}</FilterSectionTitle>
          <div className="space-y-0.5">
            {visibleIndustries.map((ind) => (
              <FilterCheckbox
                key={ind}
                label={ind}
                count={countByIndustry(ind)}
                checked={industryFilters.includes(ind)}
                onChange={() => setIndustryFilters(toggleItem(industryFilters, ind))}
              />
            ))}
          </div>
          {industries.length > 6 && (
            <button
              onClick={() => setShowAllIndustries(!showAllIndustries)}
              className="mt-1 px-2 text-xs font-semibold text-accent hover:underline"
            >
              {showAllIndustries ? t("showLess") : t("more", { count: industries.length - 6 })}
            </button>
          )}
        </div>
      )}

      {/* Province */}
      <div>
        <FilterSectionTitle>{t("province")}</FilterSectionTitle>
        <div className="space-y-0.5">
          {visibleProvinces.map((p) => (
            <FilterCheckbox
              key={p}
              label={p}
              count={countByProvince(p)}
              checked={provinceFilters.includes(p)}
              onChange={() => setProvinceFilters(toggleItem(provinceFilters, p))}
            />
          ))}
        </div>
        {SA_PROVINCES.length > 5 && (
          <button
            onClick={() => setShowAllProvinces(!showAllProvinces)}
            className="mt-1 px-2 text-xs font-semibold text-accent hover:underline"
          >
            {showAllProvinces ? t("showLess") : t("showAllProvinces")}
          </button>
        )}
      </div>

      {/* Closing date */}
      <div>
        <FilterSectionTitle>{t("closingDate")}</FilterSectionTitle>
        <div className="space-y-0.5">
          {DEADLINE_OPTIONS.map(({ key }) => (
            <FilterCheckbox
              key={key}
              label={t(key === "week" ? "deadlineWeek" : key === "twoWeeks" ? "deadlineTwoWeeks" : "deadlineMonth")}
              count={countByDeadline(key)}
              checked={deadlineFilters.includes(key)}
              onChange={() =>
                setDeadlineFilters(toggleItem(deadlineFilters, key) as DeadlineFilter[])
              }
            />
          ))}
        </div>
      </div>

      {/* BBBEE requirement */}
      <div>
        <FilterSectionTitle>{t("bbbeeRequirement")}</FilterSectionTitle>
        <div className="space-y-0.5">
          {BBBEE_OPTIONS.map(({ key }) => (
            <FilterCheckbox
              key={key}
              label={t(key === "level1to2" ? "bbbeeLevel12" : key === "level3to4" ? "bbbeeLevel34" : key === "level5to8" ? "bbbeeLevel58" : "bbbeeAny")}
              count={countByBBBEE(key)}
              checked={bbeeFilters.includes(key)}
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

function PreviewModal({
  rfq,
  isAuth,
  onClose,
}: {
  rfq: PublicRFQ | null
  isAuth: boolean
  onClose: () => void
}) {
  const t = useTranslations("opportunities")
  const formatLocale = localeFormatTag(normalizeLocale(useLocale()))
  if (!rfq) return null
  const daysLeft = daysUntil(getClosingDate(rfq))
  const isExternalOpportunity = Boolean(rfq.is_external_opportunity)

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
        <h2 className="mb-1.5 text-lg font-bold text-heading">{rfq.title ? normalizeOpportunityTitleCase(rfq.title) : t("untitledRfq")}</h2>
        <p className="mb-4 text-sm text-secondary">{t("issuedBy", { buyer: getBuyerName(rfq) })}</p>
        <p className="mb-4 text-sm leading-relaxed text-secondary">
          {rfq.description ?? t("noDescription")}
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          <MetaChip icon={<PinIcon />} label={getRFQProvince(rfq)} />
          <MetaChip icon={<RandIcon />} label={formatValueRange(rfq, formatLocale, t("valueTbc"))} />
          {getBBBEEReq(rfq) && (
            <MetaChip icon={<ShieldIcon />} label={"BBBEE: " + getBBBEEReq(rfq)} />
          )}
          <MetaChip icon={<CalendarIcon />} label={daysLeft === null ? t("deadlineTbc") : daysLeft < 0 ? t("closed") : daysLeft === 0 ? t("closesToday") : t("daysLeft", { count: daysLeft })} />
        </div>
        {isAuth ? (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            {isExternalOpportunity && rfq.original_source_url ? (
              <>
                <p className="mb-1.5 text-sm font-semibold text-heading">
                  {t("externalOpportunity")}
                </p>
                <p className="mb-4 text-sm text-secondary">
                  {t("externalSubmission", { source: rfq.source_name?.trim() || t("external") })}
                </p>
                <a
                  href={rfq.original_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="masthead__btn-primary text-sm"
                >
                  {t("viewOriginalTender")}
                </a>
              </>
            ) : (
              <Link href={"/dashboard/rfqs?open=" + rfq.id} className="masthead__btn-primary text-sm">
                {t("viewAndQuote")}
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <p className="mb-1.5 text-sm font-semibold text-heading">
              {t("registerRespond")}
            </p>
            <p className="mb-4 text-sm text-secondary">
              {t("registerRespondBody")}
            </p>
            <div className="flex gap-3">
              <Link href="/auth/signup" className="masthead__btn-primary text-sm">
                {t("createFreeAccount")}
              </Link>
              <Link href="/auth/login" className="masthead__btn-secondary text-sm">
                {t("signIn")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Registration CTA banner (unauthenticated only) ---------------------------

function CTABanner() {
  const t = useTranslations("opportunities")
  return (
    <div className="rounded-md border border-accent/20 bg-accent/10 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
            {t("freeRegistration")}
          </p>
          <h3 className="mt-1 text-lg font-bold text-heading">
            {t("ctaTitle")}
          </h3>
          <p className="mt-1 text-sm text-secondary">
            {t("ctaBody")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link href="/auth/signup" className="masthead__btn-primary whitespace-nowrap">
            {t("registerFree")}
          </Link>
          <Link href="/auth/login" className="text-sm font-medium text-accent hover:underline">
            {t("alreadyRegistered")}
          </Link>
          <Link href="/auth/login?role=buyer" className="text-sm font-medium text-secondary hover:underline">
            {t("buyerLogin")}
          </Link>
        </div>
      </div>
    </div>
  )
}

// --- RFQ card -----------------------------------------------------------------

function RFQCard({
  rfq,
  isAuth,
  matchesProfile,
  onPreview,
}: {
  rfq: PublicRFQ
  isAuth: boolean
  matchesProfile: boolean
  onPreview: (rfq: PublicRFQ) => void
}) {
  const t = useTranslations("opportunities")
  const formatLocale = localeFormatTag(normalizeLocale(useLocale()))
  const daysLeft = daysUntil(getClosingDate(rfq))
  const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
  const isNew = isPostedWithin48h(getPublishedDate(rfq))
  const isExternalOpportunity = Boolean(rfq.is_external_opportunity)
  const externalLabel = rfq.source_name?.trim() || t("external")

  return (
    <article
      className={
        "rounded-md border bg-card p-5 shadow-panel transition hover:border-accent/30 hover:shadow-md " +
        (matchesProfile ? "border-accent/50 bg-accent/5 ring-1 ring-accent/10" : "border-panel")
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-success">
              {t("publicOpportunity")}
            </span>
            {matchesProfile && (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-accent-strong">
                {t("matchesProfile")}
              </span>
            )}
            {isNew && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-sky-700">
                {t("new")}
              </span>
            )}
            {isClosingSoon && (
              <span className="rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-warning">
                {t("closingSoon")}
              </span>
            )}
            {isExternalOpportunity && (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-accent-strong">
                {externalLabel}
              </span>
            )}
            {isExternalOpportunity && rfq.curation_status === "approved" && (
              <span
                title={t("screenedHelp")}
                className="rounded-full border border-panel bg-surface px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-secondary"
              >
                {t("screened")}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-heading line-clamp-2">
            <Link href={`/opportunities/${rfq.id}`} className="hover:text-accent-strong hover:underline">
              {rfq.title ? normalizeOpportunityTitleCase(rfq.title) : t("untitledOpportunity")}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-secondary">{getBuyerName(rfq)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="rounded-full border border-panel bg-surface px-3 py-1 text-xs font-bold text-heading">
            {daysLeft === null ? t("deadlineTbc") : daysLeft < 0 ? t("closed") : daysLeft === 0 ? t("closesToday") : t("daysLeft", { count: daysLeft })}
          </p>
          <p className="mt-0.5 text-xs text-muted">{formatValueRange(rfq, formatLocale, t("valueTbc"))}</p>
        </div>
      </div>

      {/* Meta chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <MetaChip icon={<PinIcon />} label={getRFQProvince(rfq)} />
        <MetaChip icon={<IndustryIcon />} label={getRFQIndustry(rfq)} />
        {getBBBEEReq(rfq) && (
          <MetaChip icon={<ShieldIcon />} label={"BBBEE " + getBBBEEReq(rfq)} />
        )}
        <MetaChip icon={<RandIcon />} label={formatValueRange(rfq, formatLocale, t("valueTbc"))} />
      </div>

      {/* Action row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-panel pt-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">{t("closesOn", { date: formatDate(getClosingDate(rfq), formatLocale, t("deadlineTbc")) })}</p>
          <CopyLinkButton url={`${SITE_URL}/opportunities/${rfq.id}`} title={rfq.title ? normalizeOpportunityTitleCase(rfq.title) : undefined} />
          {rfq.description && (
            <button
              onClick={() => onPreview(rfq)}
              className="text-xs font-semibold text-accent transition hover:text-accent-strong"
            >
              {t("readFullScope")} &rarr;
            </button>
          )}
        </div>
        {isAuth ? (
          isExternalOpportunity && rfq.original_source_url ? (
            <a
              href={rfq.original_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel hover:text-heading"
            >
              {t("viewOriginalTender")}
            </a>
          ) : (
            <Link
              href={"/dashboard/rfqs?open=" + rfq.id}
              className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel hover:text-heading"
            >
              {t("viewAndQuote")}
            </Link>
          )
        ) : (
          <button
            onClick={() => onPreview(rfq)}
            className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel hover:text-heading"
          >
            {t("preview")}
          </button>
        )}
      </div>
    </article>
  )
}

// --- Main client component ------------------------------------------------

export default function OpportunitiesClient({ initialRfqs }: { initialRfqs: PublicRFQ[] }) {
  const t = useTranslations("opportunities")
  const locale = useLocale()
  const [rfqs] = useState<PublicRFQ[]>(initialRfqs)
  const [isAuth, setIsAuth] = useState(false)
  const [supplierProfile, setSupplierProfile] = useState<SupplierMatchProfile | null>(null)
  // rfqs/filtered are already populated from server-fetched props, so cards
  // and stats render immediately -- this only gates the auth-dependent guest
  // banner/CTA, to avoid flashing it at a signed-in user before the client
  // auth check resolves.
  const [authChecked, setAuthChecked] = useState(false)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("deadline")
  const [industryFilters, setIndustryFilters] = useState<string[]>([])
  const [provinceFilters, setProvinceFilters] = useState<string[]>([])
  const [deadlineFilters, setDeadlineFilters] = useState<DeadlineFilter[]>([])
  const [bbeeFilters, setBbeeFilters] = useState<BBBEEFilter[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [previewRFQ, setPreviewRFQ] = useState<PublicRFQ | null>(null)
  const [opportunityStats, setOpportunityStats] = useState<OpportunityStats | null>(null)

  useEffect(() => {
    async function load() {
      const [stats, authResult] = await Promise.all([
        fetchOpportunityStats(),
        supabase ? supabase.auth.getUser() : Promise.resolve(null),
      ])
      setOpportunityStats(stats)
      const user = authResult?.data?.user
      setIsAuth(Boolean(user))

      if (supabase && user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, industry, province, provinces")
          .eq("id", user.id)
          .maybeSingle()

        if (error) {
          console.error("Opportunity profile matching failed:", error)
        } else if (normalize(profile?.role) === "supplier") {
          setSupplierProfile({
            industry: profile?.industry ?? null,
            province: profile?.province ?? null,
            provinces: Array.isArray(profile?.provinces) ? profile.provinces : null,
          })
        }
      }
      setAuthChecked(true)
    }
    load()
  }, [])

  const industries = useMemo(
    () => Array.from(new Set(rfqs.map((r) => getRFQIndustry(r)))).sort(),
    [rfqs]
  )

  const totalOpen = rfqs.length
  const closingSoonCount = opportunityStats?.closingThisWeek ?? 0
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
      result = result.filter((r) => {
        const provinces = normalizeArray(r.provinces)
        return provinceFilters.some((p) => {
          const norm = normalize(p)
          if (provinces.length > 0) {
            return provinces.some((prov) => normalize(prov).includes(norm))
          }
          return normalize(r.province ?? "").includes(norm)
        })
      })
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
      const matchDifference =
        opportunityMatchScore(b, supplierProfile) -
        opportunityMatchScore(a, supplierProfile)
      if (matchDifference !== 0) return matchDifference

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
  }, [
    rfqs,
    search,
    industryFilters,
    provinceFilters,
    deadlineFilters,
    bbeeFilters,
    sort,
    supplierProfile,
  ])

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
      <main className="min-h-screen bg-white text-primary">
        {/* Hero strip */}
        <section className="border-b border-panel bg-white py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-4">
              <BackLink label={t("backLabel")} />
            </div>
             <p className="newspaper-kicker mb-2">{t("title")}</p>
            <h1 className="newspaper-headline mb-4">
               {t("title")}
            </h1>
            <p className="newspaper-body mb-6 max-w-2xl text-secondary">
               {t("subtitle")}
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
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-panel bg-panel py-3 pl-11 pr-4 text-sm text-primary outline-none placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>

            {/* Stat chips */}
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-4 py-1.5 text-sm font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                {totalOpen} active {totalOpen === 1 ? "tender" : "tenders"}
              </span>
              {closingSoonCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-warning bg-warning-soft px-4 py-1.5 text-sm font-semibold text-warning">
                  <CalendarIcon />
                  {t("closingThisWeek", { count: closingSoonCount })}
                </span>
              )}
              {newRecentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm font-semibold text-sky-700">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  {t("newLast48", { count: newRecentCount })}
                </span>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              {t("sourceExplanation")}
            </p>
          </div>
        </section>

        {/* Body: sidebar + card list */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {authChecked && !isAuth && (
            <div className="mb-6 overflow-hidden rounded-xl border border-panel bg-card shadow-panel">
              {/* Register / log in */}
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-secondary">
                    <PersonIcon />
                  </span>
                  <div>
                    <p className="font-bold text-heading">{t("guestTitle")}</p>
                    <p className="mt-0.5 text-sm text-secondary">
                      {t("guestBody")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Link
                    href="/auth/signup"
                    className="rounded-md bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-button transition hover:bg-accent-strong"
                  >
                    {t("registerFree")}
                  </Link>
                  <Link
                    href="/auth/login"
                    className="rounded-md border border-panel bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary transition hover:text-accent"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/auth/login?role=buyer"
                    className="rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#c8a060] transition hover:bg-[#123020]"
                  >
                    {t("buyerLogin")}
                  </Link>
                </div>
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-panel bg-surface/60 px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                  <BadgeCheckIcon />
                  <span><strong className="font-semibold text-heading">{t("freeToJoin")}</strong> &middot; {t("pilotCost")}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                  <TargetIcon />
                  <span><strong className="font-semibold text-heading">{t("publicRfqs")}</strong> &middot; {t("officialListings")}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                  <BellIcon />
                  <span><strong className="font-semibold text-heading">{t("weeklyUpdates")}</strong> &middot; {t("neverMiss")}</span>
                </span>
              </div>

              {/* Lower-commitment path: email only, no account */}
              <div className="flex flex-col gap-3 border-t border-panel bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-strong">
                    <SendIcon />
                  </span>
                  <div>
                    <p className="font-bold text-heading">{t("notReady")}</p>
                    <p className="mt-0.5 text-sm text-secondary">
                      {t("weeklyNoAccount")}
                    </p>
                  </div>
                </div>
                <div>
                  <DigestSignupForm />
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                    <LockIcon /> {t("privacyNote")}
                  </p>
                </div>
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
                     {t("applyFilters")}
                    {hasActiveFilters && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.6rem] font-bold text-white">
                        {filterBadgeCount}
                      </span>
                    )}
                  </button>
                  <p className="text-sm text-secondary">
                    {t("results", { count: filtered.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                   <label className="text-xs text-secondary">{t("sort")}</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs text-primary outline-none focus:border-accent"
                  >
                     <option value="deadline">{t("closingSoon")}</option>
                     <option value="newest">{t("newest")}</option>
                     <option value="value">{t("highestValue")}</option>
                  </select>
                </div>
              </div>

              {/* Cards */}
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-panel bg-card py-16 text-center">
                   <p className="text-lg font-semibold text-heading">{t("noResults")}</p>
                  <p className="mt-2 text-sm text-secondary">
                     {t("noResultsHint")}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="mt-4 rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-primary transition hover:bg-panel"
                    >
                       {t("clearFilters")}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((rfq, idx) => (
                    <div key={rfq.id}>
                      <RFQCard
                        rfq={rfq}
                        isAuth={isAuth}
                        matchesProfile={opportunityMatchScore(rfq, supplierProfile) > 0}
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

        {!isAuth && authChecked && (
          <section className="border-t border-panel bg-[#1a3a2a] px-6 py-10">
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5DCAA5]/20 text-[#5DCAA5]">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-[#f8f4ec]">
                    {t("ctaTitle")}
                  </p>
                  <p className="mt-1 text-xs text-[#f8f4ec]/60">
                    {t("ctaBody")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/auth/signup"
                    className="rounded-md bg-[#c8a060] px-5 py-2.5 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#b8902e]"
                  >
                    {t("registerSupplier")}
                  </Link>
                  <Link
                    href="/auth/login?role=buyer"
                    className="rounded-md border border-[#f8f4ec]/20 px-5 py-2.5 text-sm font-semibold text-[#f8f4ec] transition hover:border-[#f8f4ec]/40"
                  >
                    {t("buyerLogin")}
                  </Link>
                </div>
                <div className="sm:text-right">
                  <p className="mb-1.5 text-xs text-[#f8f4ec]/60">{t("weeklyPrompt")}</p>
                  <DigestSignupForm dark />
                </div>
              </div>
            </div>
          </section>
        )}
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
                {t("filters")}
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
              {t("showResults", { count: filtered.length })}
            </button>
          </div>
        </div>
      )}

       <p className="sr-only" lang={locale}>{t("sourceLanguage")}</p>
       <PreviewModal rfq={previewRFQ} isAuth={isAuth} onClose={() => setPreviewRFQ(null)} />
      <PublicFooter />
    </>
  )
}

import { PROVINCE_IDS } from "@/data/province-meta"

/**
 * One snapshot of live public opportunities, from which every homepage and
 * /tenders headline figure is derived, so they can never disagree.
 *
 * Live = is_public, status open/active, closing date after `now`, not
 * quarantined: the same rule as applyLivePublicOpportunityFilters, which the
 * /tenders list uses. Expired listings are never counted; a passed deadline
 * alone says nothing about evaluation.
 *
 * Regions: each listing is counted once in every province it names, in
 * "National" when it is published as national (e.g. "South Africa"), and in
 * "Province not specified" only when it names neither. A listing naming two
 * provinces appears in both, so regional figures can add up to more than the
 * number of unique live listings; `multiRegionListings` says by how many.
 *
 * Client-safe: no server imports. The fetching side is in
 * liveOpportunitySnapshot.server.ts.
 */

export const CLOSING_SOON_MS = 7 * 24 * 60 * 60 * 1000
export const NEW_LISTING_MS = 48 * 60 * 60 * 1000
export const LIVE_STATUSES = ["open", "active"] as const

export type SnapshotRow = {
  id: number
  province: string | null
  provinces: string[] | null
  closing_date: string | null
  created_at: string | null
  status: string | null
  is_public: boolean | null
  curation_status: string | null
  /** True for tenders collected from external sources; otherwise a platform RFQ. */
  is_external_opportunity?: boolean | null
}

export const SNAPSHOT_COLUMNS = "id,province,provinces,closing_date,created_at,status,is_public,curation_status,is_external_opportunity"

export type RegionCounts = { live: number; closingSoon: number; newIn48Hours: number }

export type LiveOpportunitySnapshot = {
  /** When the snapshot was taken (ISO). Every figure is as of this instant. */
  asOf: string
  live: number
  /** Live split by origin: external tenders vs RFQs posted on the platform. */
  liveBySource: { externalTenders: number; platformRfqs: number }
  closingSoon: number
  newIn48Hours: number
  provinces: Array<RegionCounts & { name: string; id: string }>
  national: RegionCounts
  notSpecified: RegionCounts
  /** Listings counted in more than one region (province or National). */
  multiRegionListings: number
  /** Sum of every regional figure; equals live + the extra memberships. */
  regionalTotal: number
  /** Province values that matched nothing; counted as not specified. */
  unrecognisedProvinceValues: string[]
}

const PROVINCE_NAMES = Object.keys(PROVINCE_IDS)

function key(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_.]/g, " ")
    .replace(/\bprovince\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const PROVINCE_ALIASES: Record<string, string> = {}
for (const name of PROVINCE_NAMES) PROVINCE_ALIASES[key(name)] = name
Object.assign(PROVINCE_ALIASES, {
  ec: "Eastern Cape",
  fs: "Free State",
  freestate: "Free State",
  gp: "Gauteng",
  gt: "Gauteng",
  kzn: "KwaZulu-Natal",
  "kwa zulu natal": "KwaZulu-Natal",
  kwazulunatal: "KwaZulu-Natal",
  natal: "KwaZulu-Natal",
  lp: "Limpopo",
  lim: "Limpopo",
  mp: "Mpumalanga",
  nc: "Northern Cape",
  nw: "North West",
  northwest: "North West",
  wc: "Western Cape",
})

const NATIONAL_VALUES = new Set(["south africa", "national", "nationwide", "countrywide", "all provinces", "rsa", "republic of south africa"])

/** Splits "Gauteng, North West" style values; arrays are split too. */
function tokens(row: Pick<SnapshotRow, "province" | "provinces">): string[] {
  const values = [row.province, ...(Array.isArray(row.provinces) ? row.provinces : [])]
  return values
    .flatMap((value) => (typeof value === "string" ? value.split(/[,;/|]|\s+(?:and|&)\s+/i) : []))
    .map((value) => value.trim())
    .filter(Boolean)
}

export type RegionClassification = { provinces: string[]; national: boolean; unrecognised: string[] }

export function classifyRegions(row: Pick<SnapshotRow, "province" | "provinces">): RegionClassification {
  const provinces = new Set<string>()
  const unrecognised = new Set<string>()
  let national = false
  for (const token of tokens(row)) {
    const normalised = key(token)
    if (!normalised) continue
    const province = PROVINCE_ALIASES[normalised] ?? PROVINCE_ALIASES[normalised.replace(/\s/g, "")]
    if (province) provinces.add(province)
    else if (NATIONAL_VALUES.has(normalised)) national = true
    else unrecognised.add(token)
  }
  return { provinces: [...provinces].sort(), national, unrecognised: [...unrecognised] }
}

/**
 * The live rule, row by row. Mirrors the SQL filter exactly, including that a
 * missing closing date, a missing curation status or a status in another case
 * does not match (SQL comparisons with NULL are not true).
 */
export function isLiveRow(row: SnapshotRow, now: Date): boolean {
  if (row.is_public !== true) return false
  if (!LIVE_STATUSES.includes(row.status as (typeof LIVE_STATUSES)[number])) return false
  if (row.curation_status === null || row.curation_status === "quarantined") return false
  const closing = row.closing_date ? Date.parse(row.closing_date) : NaN
  return Number.isFinite(closing) && closing > now.getTime()
}

const empty = (): RegionCounts => ({ live: 0, closingSoon: 0, newIn48Hours: 0 })

function add(counts: RegionCounts, closingSoon: boolean, isNew: boolean) {
  counts.live += 1
  if (closingSoon) counts.closingSoon += 1
  if (isNew) counts.newIn48Hours += 1
}

export function buildLiveSnapshot(rows: SnapshotRow[], now: Date): LiveOpportunitySnapshot {
  const nowMs = now.getTime()
  const byProvince = new Map(PROVINCE_NAMES.map((name) => [name, empty()]))
  const national = empty()
  const notSpecified = empty()
  const totals = empty()
  const unrecognised = new Set<string>()
  const seen = new Set<number>()
  const liveBySource = { externalTenders: 0, platformRfqs: 0 }
  let multiRegionListings = 0

  for (const row of rows) {
    if (seen.has(row.id) || !isLiveRow(row, now)) continue
    seen.add(row.id)

    const closingSoon = Date.parse(row.closing_date as string) <= nowMs + CLOSING_SOON_MS
    const created = row.created_at ? Date.parse(row.created_at) : NaN
    const isNew = Number.isFinite(created) && created >= nowMs - NEW_LISTING_MS
    add(totals, closingSoon, isNew)
    if (row.is_external_opportunity === true) liveBySource.externalTenders += 1
    else liveBySource.platformRfqs += 1

    const regions = classifyRegions(row)
    regions.unrecognised.forEach((value) => unrecognised.add(value))
    for (const name of regions.provinces) add(byProvince.get(name)!, closingSoon, isNew)
    if (regions.national) add(national, closingSoon, isNew)
    const memberships = regions.provinces.length + (regions.national ? 1 : 0)
    if (memberships === 0) add(notSpecified, closingSoon, isNew)
    if (memberships > 1) multiRegionListings += 1
  }

  const provinces = PROVINCE_NAMES.map((name) => ({ name, id: PROVINCE_IDS[name], ...byProvince.get(name)! }))
  const regionalTotal = provinces.reduce((sum, p) => sum + p.live, 0) + national.live + notSpecified.live

  return {
    asOf: now.toISOString(),
    live: totals.live,
    liveBySource,
    closingSoon: totals.closingSoon,
    newIn48Hours: totals.newIn48Hours,
    provinces,
    national,
    notSpecified,
    multiRegionListings,
    regionalTotal,
    unrecognisedProvinceValues: [...unrecognised].sort(),
  }
}

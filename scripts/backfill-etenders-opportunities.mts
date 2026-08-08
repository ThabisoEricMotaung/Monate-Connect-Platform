import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"
import {
  classifyTerminalNotice,
  resolveExternalBuyerName,
  resolveExternalOpportunityTitle,
} from "../src/lib/externalOpportunity"

nextEnv.loadEnvConfig(process.cwd())

const EXPECTED_PRODUCTION_PROJECT_REF = "enoyrbdflwihxzitpour"
const EXPECTED_FEED_GAPS = [271, 293, 319, 340, 350, 351, 352, 353]
const OCDS_API_BASE = "https://ocds-api.etenders.gov.za/api/OCDSReleases"
const PAGE_SIZE = 1_000
const apply = process.argv.includes("--apply")

type Release = {
  ocid?: string | null
  buyer?: { name?: string | null } | null
  tender?: {
    title?: string | null
    description?: string | null
    procuringEntity?: { name?: string | null } | null
    documents?: Array<{
      title?: string | null
      description?: string | null
      url?: string | null
    }> | null
  } | null
}

type ExistingRfq = {
  id: number
  external_ocid: string
  title: string | null
  description: string | null
  buyer_org: string | null
  original_source_url: string | null
  status: string | null
  is_public: boolean | null
}

type BackfillChange = {
  id: number
  externalReference: string
  title: string
  buyerOrg: string | null
  titleChanged: boolean
  buyerChanged: boolean
  source: "feed" | "stored_fallback"
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
if (projectRef !== EXPECTED_PRODUCTION_PROJECT_REF) {
  throw new Error(
    `Refusing to run against project ${projectRef}; expected ${EXPECTED_PRODUCTION_PROJECT_REF}`,
  )
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin
  .from("rfqs")
  .select("id,external_ocid,title,description,buyer_org,original_source_url,status,is_public")
  .eq("is_external_opportunity", true)
  .not("external_ocid", "is", null)

if (error) throw new Error(`Could not load external opportunities: ${error.message}`)

const existing = (data ?? []) as ExistingRfq[]
const existingByOcid = new Map(existing.map((rfq) => [rfq.external_ocid, rfq]))
const releasesByOcid = new Map<string, Release>()

// Current stored opportunities were imported between July and early August.
// Small daily windows avoid the eTenders API timing out on large monthly JSON
// responses while still covering the sync's original lookback period.
const days: Date[] = []
for (
  let day = new Date("2026-06-01T00:00:00.000Z");
  day <= new Date("2026-08-09T00:00:00.000Z");
  day = new Date(day.getTime() + 86_400_000)
) {
  days.push(day)
}

let nextDay = 0
async function fetchReleasePage(url: string): Promise<{ releases?: Release[] | null }> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) {
        throw new Error(`eTenders backfill fetch failed: ${response.status} ${response.statusText}`)
      }
      return (await response.json()) as { releases?: Release[] | null }
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000))
    }
  }
  throw lastError
}

async function fetchWorker() {
  while (nextDay < days.length) {
    const dateFrom = days[nextDay++]
    const dateTo = new Date(dateFrom.getTime() + 86_400_000 - 1)
    for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      PageNumber: String(page),
      PageSize: String(PAGE_SIZE),
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    })
      const body = await fetchReleasePage(`${OCDS_API_BASE}?${params.toString()}`)
      const releases = body.releases ?? []
      for (const release of releases) {
        const ocid = release.ocid?.trim()
        if (ocid && existingByOcid.has(ocid)) releasesByOcid.set(ocid, release)
      }
      if (releases.length < PAGE_SIZE) break
    }
  }
}

await Promise.all(Array.from({ length: 3 }, () => fetchWorker()))

const changes: BackfillChange[] = existing.flatMap((rfq) => {
  const release = releasesByOcid.get(rfq.external_ocid)
  const tender = release?.tender
  if (!release || !tender) return []

  const terminalReason = classifyTerminalNotice({
    reference: tender.title,
    description: tender.description,
    documents: tender.documents,
  })
  if (terminalReason) return []

  const title = resolveExternalOpportunityTitle(tender.title, tender.description)
  const buyerOrg = resolveExternalBuyerName(release.buyer?.name, tender.procuringEntity?.name)
  if (!title || !tender.title?.trim()) return []

  return [{
    id: rfq.id,
    externalReference: tender.title.trim(),
    title,
    buyerOrg,
    titleChanged: title !== rfq.title,
    buyerChanged: Boolean(buyerOrg && buyerOrg !== rfq.buyer_org),
    source: "feed" as const,
  }]
})

const missingFromFeed = existing
  .filter((rfq) => !releasesByOcid.has(rfq.external_ocid))
  .map((rfq) => rfq.id)

for (const rfq of existing.filter((row) => missingFromFeed.includes(row.id))) {
  const storedTerminalReason = classifyTerminalNotice({
    reference: rfq.title,
    description: rfq.description,
    documents: rfq.original_source_url ? [{ url: rfq.original_source_url }] : [],
  })
  if (storedTerminalReason) {
    throw new Error(
      `Stored-only RFQ ${rfq.id} classified as ${storedTerminalReason}; quarantine it separately before backfill`,
    )
  }

  const title = resolveExternalOpportunityTitle(rfq.title, rfq.description)
  if (!title || !rfq.title?.trim()) continue
  changes.push({
    id: rfq.id,
    externalReference: rfq.title.trim(),
    title,
    buyerOrg: rfq.buyer_org,
    titleChanged: title !== rfq.title,
    buyerChanged: false,
    source: "stored_fallback",
  })
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  storedExternal: existing.length,
  matchedInFeed: releasesByOcid.size,
  eligibleBackfills: changes.length,
  titleChanges: changes.filter((change) => change.titleChanged).length,
  buyerChanges: changes.filter((change) => change.buyerChanged).length,
  missingFromFeedCount: missingFromFeed.length,
  missingFromFeed,
  sample: changes.slice(0, 20),
}, null, 2))

if (!apply) process.exit(0)

const unexpectedFeedGaps = missingFromFeed.filter((id) => !EXPECTED_FEED_GAPS.includes(id))
const unresolvedExpectedGaps = EXPECTED_FEED_GAPS.filter((id) => !missingFromFeed.includes(id))
if (unexpectedFeedGaps.length > 0 || unresolvedExpectedGaps.length > 0) {
  throw new Error(
    `Refusing apply: feed-gap set changed (unexpected: ${unexpectedFeedGaps.join(",") || "none"}; no longer missing: ${unresolvedExpectedGaps.join(",") || "none"})`,
  )
}

for (const change of changes) {
  const { error: updateError } = await admin
    .from("rfqs")
    .update({
      external_reference: change.externalReference,
      title: change.title,
      buyer_org: change.buyerOrg,
    })
    .eq("id", change.id)
    .eq("is_external_opportunity", true)
    .neq("curation_status", "quarantined")

  if (updateError) {
    throw new Error(`Backfill failed for RFQ ${change.id}: ${updateError.message}`)
  }
}

console.log(`Applied ${changes.length} external opportunity backfills.`)

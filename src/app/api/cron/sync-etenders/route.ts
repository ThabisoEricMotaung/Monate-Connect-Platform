import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  classifyTerminalNotice,
  resolveExternalBuyerName,
  resolveExternalOpportunityTitle,
  type TerminalNoticeReason,
} from "@/lib/externalOpportunity"

// Syncs open tender opportunities from the National Treasury eTenders OCDS
// Release API (public, unauthenticated) into public.rfqs as drafts for
// admin review. Never auto-publishes: OCDS is flagged "public beta" by the
// portal and this feed hasn't been reviewed for curation quality, so a
// human still approves before anything goes live, same as the manual
// batches this replaces.

const OCDS_API_BASE = "https://ocds-api.etenders.gov.za/api/OCDSReleases"
const MAX_PAGES_PER_RUN = 10
const PAGE_SIZE = 1000
const DEFAULT_LOOKBACK_DAYS = 14
const SOURCE_NAME = "eTenders.gov.za"

type OcdsValue = {
  amount?: number | null
  currency?: string | null
}

type OcdsDocument = {
  id?: string | null
  title?: string | null
  description?: string | null
  url?: string | null
  documentType?: string | null
}

type OcdsTenderPeriod = {
  startDate?: string | null
  endDate?: string | null
}

type OcdsClassification = {
  scheme?: string | null
  id?: string | null
  description?: string | null
}

type OcdsTenderItem = {
  id?: string | null
  description?: string | null
  quantity?: number | null
  unit?: string | null
}

type OcdsTender = {
  id?: string | null
  title?: string | null
  status?: string | null
  description?: string | null
  province?: string | null
  deliveryLocation?: string | null
  mainProcurementCategory?: string | null
  classification?: OcdsClassification | null
  value?: OcdsValue | null
  tenderPeriod?: OcdsTenderPeriod | null
  items?: OcdsTenderItem[] | null
  documents?: OcdsDocument[] | null
  procuringEntity?: OcdsBuyer | null
}

type OcdsBuyer = {
  id?: string | null
  name?: string | null
}

type OcdsRelease = {
  ocid?: string | null
  id?: string | null
  date?: string | null
  tender?: OcdsTender | null
  buyer?: OcdsBuyer | null
}

type OcdsReleasePackage = {
  releases?: OcdsRelease[] | null
  links?: { next?: string | null; prev?: string | null } | null
}

type SyncStateRow = {
  id: number
  last_synced_at: string | null
}

type RfqUpsertPayload = {
  external_ocid: string
  external_reference: string
  title: string
  description: string
  category: string
  industry: string
  province: string | null
  closing_date: string
  deadline: string
  status: string
  is_external_opportunity: true
  is_public: boolean
  curation_status: "not_required" | "pending" | "approved" | "quarantined"
  curation_reason: string | null
  source_name: string
  original_source_url: string | null
  estimated_value_min: number | null
  estimated_value_max: number | null
  budget: string | null
  buyer_org: string | null
}

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")
  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function isStillOpen(tender: OcdsTender | null | undefined, now: Date): boolean {
  if (!tender) return false

  const status = tender.status?.toLowerCase()
  if (status && !["active", "planning", "planned"].includes(status)) return false

  const endDate = tender.tenderPeriod?.endDate
  if (!endDate) return false

  const end = new Date(endDate)
  if (Number.isNaN(end.getTime())) return false

  return end.getTime() > now.getTime()
}

function buildDescription(tender: OcdsTender): string {
  const parts: string[] = []
  if (tender.description?.trim()) parts.push(tender.description.trim())

  const items = (tender.items ?? []).filter((item) => item.description?.trim())
  if (items.length > 0) {
    parts.push("Items:")
    for (const item of items) {
      const qty = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null
      parts.push(`- ${item.description}${qty ? ` (${qty})` : ""}`)
    }
  }

  parts.push(
    "",
    "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process.",
  )

  return parts.join("\n")
}

function resolveCategory(tender: OcdsTender): string {
  return tender.classification?.description?.trim() || tender.mainProcurementCategory?.trim() || "General"
}

function resolveSourceUrl(tender: OcdsTender): string | null {
  const documentWithUrl = (tender.documents ?? []).find((document) => Boolean(document.url?.trim()))
  return documentWithUrl?.url?.trim() || null
}

function toRfqPayload(release: OcdsRelease): RfqUpsertPayload | null {
  const tender = release.tender
  const ocid = release.ocid?.trim()
  const externalReference = tender?.title?.trim()
  const title = resolveExternalOpportunityTitle(externalReference, tender?.description)
  const endDate = tender?.tenderPeriod?.endDate

  if (!ocid || !tender || !externalReference || !title || !endDate) return null

  const category = resolveCategory(tender)

  return {
    external_ocid: ocid,
    external_reference: externalReference,
    title,
    description: buildDescription(tender),
    category,
    industry: category,
    province: tender.province?.trim() || tender.deliveryLocation?.trim() || null,
    closing_date: endDate,
    deadline: endDate,
    status: "draft",
    is_external_opportunity: true,
    is_public: false,
    curation_status: "pending",
    curation_reason: null,
    source_name: SOURCE_NAME,
    original_source_url: resolveSourceUrl(tender),
    // estimated_value_min/max are the numeric source of truth. `budget` is a
    // separate TEXT column the admin UI actually renders — write both so a
    // disclosed OCDS value doesn't silently show as "Not disclosed" there.
    estimated_value_min: tender.value?.amount ?? null,
    estimated_value_max: tender.value?.amount ?? null,
    budget: tender.value?.amount != null ? String(tender.value.amount) : null,
    buyer_org: resolveExternalBuyerName(release.buyer?.name, tender.procuringEntity?.name),
  }
}

async function fetchReleasePage(params: URLSearchParams): Promise<OcdsReleasePackage> {
  const response = await fetch(`${OCDS_API_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`eTenders OCDS API returned ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as OcdsReleasePackage
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role client is not configured." },
      { status: 500 },
    )
  }

  const now = new Date()

  const { data: stateData, error: stateError } = await supabaseAdmin
    .from("etenders_sync_state")
    .select("id, last_synced_at")
    .eq("id", 1)
    .maybeSingle()

  if (stateError) {
    console.error("eTenders sync state read failed:", stateError)
    return NextResponse.json({ ok: false, error: stateError.message }, { status: 500 })
  }

  const state = stateData as SyncStateRow | null
  const dateFrom = state?.last_synced_at
    ? new Date(state.last_synced_at)
    : new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

  let fetched = 0
  let stillOpen = 0
  let skippedIncomplete = 0
  let skippedTerminal = 0
  const terminalReasons: Partial<Record<TerminalNoticeReason, number>> = {}
  let upserted = 0
  let quarantined = 0
  let errors = 0
  const errorMessages: string[] = []

  try {
    const releasesToUpsert = new Map<string, RfqUpsertPayload>()
    const terminalOcids = new Map<string, TerminalNoticeReason>()
    let nextParams: URLSearchParams | null = new URLSearchParams({
      PageNumber: "1",
      PageSize: String(PAGE_SIZE),
      dateFrom: dateFrom.toISOString(),
      dateTo: now.toISOString(),
    })
    let page = 0

    while (nextParams && page < MAX_PAGES_PER_RUN) {
      page += 1
      const releasePackage: OcdsReleasePackage = await fetchReleasePage(nextParams)
      const releases = releasePackage.releases ?? []
      fetched += releases.length

      for (const release of releases) {
        const terminalReason = classifyTerminalNotice({
          reference: release.tender?.title,
          description: release.tender?.description,
          documents: release.tender?.documents,
        })
        if (terminalReason) {
          skippedTerminal += 1
          terminalReasons[terminalReason] = (terminalReasons[terminalReason] ?? 0) + 1
          const terminalOcid = release.ocid?.trim()
          if (terminalOcid) terminalOcids.set(terminalOcid, terminalReason)
          continue
        }

        if (!isStillOpen(release.tender, now)) continue
        stillOpen += 1

        const payload = toRfqPayload(release)
        if (!payload) {
          skippedIncomplete += 1
          continue
        }

        releasesToUpsert.set(payload.external_ocid, payload)
      }

      if (releases.length < PAGE_SIZE) {
        nextParams = null
      } else {
        nextParams = new URLSearchParams({
          PageNumber: String(page + 1),
          PageSize: String(PAGE_SIZE),
          dateFrom: dateFrom.toISOString(),
          dateTo: now.toISOString(),
        })
      }
    }

    const payloads = [...releasesToUpsert.values()]
    if (payloads.length > 0) {
      // Preserve the review/publication lifecycle when a later compiled OCDS
      // release refreshes an already-curated opportunity.
      for (let offset = 0; offset < payloads.length; offset += 200) {
        const batch = payloads.slice(offset, offset + 200)
        const { data: existingData, error: existingError } = await supabaseAdmin
          .from("rfqs")
          .select("external_ocid,status,is_public,curation_status,curation_reason")
          .in("external_ocid", batch.map((payload) => payload.external_ocid))

        if (existingError) throw existingError
        const existingByOcid = new Map(
          (existingData ?? []).map((row) => [row.external_ocid, row]),
        )

        for (const payload of batch) {
          const existing = existingByOcid.get(payload.external_ocid)
          if (!existing) continue
          payload.status = existing.status ?? payload.status
          payload.is_public = existing.is_public ?? payload.is_public
          payload.curation_status =
            (existing.curation_status as RfqUpsertPayload["curation_status"] | null) ??
            payload.curation_status
          payload.curation_reason = existing.curation_reason ?? payload.curation_reason
        }
      }

      const { error: upsertError, data: upsertData } = await supabaseAdmin
        .from("rfqs")
        .upsert(payloads, { onConflict: "external_ocid" })
        .select("id")

      if (upsertError) {
        errors += 1
        errorMessages.push(upsertError.message)
        console.error("eTenders sync upsert failed:", upsertError)
      } else {
        upserted = upsertData?.length ?? payloads.length
      }
    }

    for (const reason of [
      "regret_letter",
      "award_notice",
      "unsuccessful_bidder_letter",
      "tender_cancellation",
    ] satisfies TerminalNoticeReason[]) {
      const ocids = [...terminalOcids]
        .filter(([, terminalReason]) => terminalReason === reason)
        .map(([ocid]) => ocid)
      if (ocids.length === 0) continue
      const { data: quarantinedData, error: quarantineError } = await supabaseAdmin
        .from("rfqs")
        .update({
          status: "closed",
          is_public: false,
          curation_status: "quarantined",
          curation_reason: reason,
          curated_at: now.toISOString(),
        })
        .in("external_ocid", ocids)
        .eq("is_external_opportunity", true)
        .select("id")

      if (quarantineError) throw quarantineError
      quarantined += quarantinedData?.length ?? 0
    }

    const summary = {
      dateFrom: dateFrom.toISOString(),
      dateTo: now.toISOString(),
      pagesFetched: page,
      fetched,
      stillOpen,
      skippedIncomplete,
      skippedTerminal,
      terminalReasons,
      upserted,
      quarantined,
      errors,
    }

    await supabaseAdmin.from("etenders_sync_state").upsert(
      {
        id: 1,
        last_synced_at: now.toISOString(),
        last_run_at: now.toISOString(),
        last_run_summary: summary,
      },
      { onConflict: "id" },
    )

    console.log("eTenders OCDS sync run", summary)
    return NextResponse.json({ ok: errors === 0, ...summary, errorMessages })
  } catch (error) {
    const message = error instanceof Error ? error.message : "eTenders OCDS sync failed."
    console.error("eTenders OCDS sync failed:", error)

    await supabaseAdmin.from("etenders_sync_state").upsert(
      {
        id: 1,
        last_run_at: now.toISOString(),
        last_run_summary: {
          error: message,
          fetched,
          stillOpen,
          skippedIncomplete,
          skippedTerminal,
          terminalReasons,
        },
      },
      { onConflict: "id" },
    )

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

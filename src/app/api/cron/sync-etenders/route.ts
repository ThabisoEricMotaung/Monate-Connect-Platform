import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { classifyTerminalNotice, type TerminalNoticeReason } from "@/lib/externalOpportunity"
import {
  SyncMetricsCollector,
  advanceEtendersWatermark,
  fetchReleasePages,
  readEtendersWatermark,
  recordEtendersSyncFailure,
} from "@/lib/etendersSync"
import { toRfqPayload, type RfqUpsertPayload } from "@/lib/etendersTransform"

export const maxDuration = 900

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
    || request.headers.get("x-cron-secret") === secret
}

type ExistingLifecycle = {
  external_ocid: string
  status: string | null
  is_public: boolean | null
  curation_status: RfqUpsertPayload["curation_status"] | null
  curation_reason: string | null
}

async function preserveExistingLifecycle(payloads: RfqUpsertPayload[]) {
  if (!supabaseAdmin) return
  for (let offset = 0; offset < payloads.length; offset += 200) {
    const batch = payloads.slice(offset, offset + 200)
    const { data, error } = await supabaseAdmin
      .from("rfqs")
      .select("external_ocid,status,is_public,curation_status,curation_reason")
      .in("external_ocid", batch.map((payload) => payload.external_ocid))
    if (error) throw error

    const existingByOcid = new Map(
      ((data ?? []) as ExistingLifecycle[]).map((row) => [row.external_ocid, row]),
    )
    for (const payload of batch) {
      const existing = existingByOcid.get(payload.external_ocid)
      if (!existing) continue
      payload.status = existing.status ?? payload.status
      payload.is_public = existing.is_public ?? payload.is_public
      payload.curation_status = existing.curation_status ?? payload.curation_status
      payload.curation_reason = existing.curation_reason ?? payload.curation_reason
    }
  }
}

async function quarantineTerminalNotices(
  notices: Map<string, TerminalNoticeReason>,
  now: Date,
): Promise<number> {
  if (!supabaseAdmin) return 0
  let quarantined = 0
  for (const reason of [
    "regret_letter",
    "award_notice",
    "unsuccessful_bidder_letter",
    "tender_cancellation",
  ] satisfies TerminalNoticeReason[]) {
    const ocids = [...notices].filter(([, value]) => value === reason).map(([ocid]) => ocid)
    if (!ocids.length) continue
    const { data, error } = await supabaseAdmin
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
    if (error) throw error
    quarantined += data?.length ?? 0
  }
  return quarantined
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
  const metrics = new SyncMetricsCollector()
  let dateFrom: Date | null = null

  try {
    ;({ dateFrom } = await readEtendersWatermark(supabaseAdmin, now))
    const pageResult = await fetchReleasePages({ dateFrom, dateTo: now, metrics })
    if (!pageResult.completed) {
      throw new Error("eTenders page limit reached before links.next was exhausted")
    }

    const payloadByOcid = new Map<string, RfqUpsertPayload>()
    const terminalNotices = new Map<string, TerminalNoticeReason>()
    const terminalReasons: Partial<Record<TerminalNoticeReason, number>> = {}
    let skippedIncomplete = 0
    let skippedTerminal = 0

    for (const release of pageResult.releases) {
      const terminalReason = classifyTerminalNotice({
        reference: release.tender?.title,
        description: release.tender?.description,
        documents: release.tender?.documents,
      })
      if (terminalReason) {
        skippedTerminal += 1
        terminalReasons[terminalReason] = (terminalReasons[terminalReason] ?? 0) + 1
        const ocid = release.ocid?.trim()
        if (ocid) terminalNotices.set(ocid, terminalReason)
        continue
      }
      const payload = toRfqPayload(release, now)
      if (!payload) {
        skippedIncomplete += 1
        continue
      }
      payloadByOcid.set(payload.external_ocid, payload)
    }

    const payloads = [...payloadByOcid.values()]
    await preserveExistingLifecycle(payloads)
    let upserted = 0
    if (payloads.length) {
      const { data, error } = await supabaseAdmin
        .from("rfqs")
        .upsert(payloads, { onConflict: "external_ocid" })
        .select("id")
      if (error) throw error
      upserted = data?.length ?? payloads.length
    }

    const quarantined = await quarantineTerminalNotices(terminalNotices, now)
    const summary = {
      dateFrom: dateFrom.toISOString(),
      dateTo: now.toISOString(),
      ...metrics.snapshot(),
      uniqueReleases: payloadByOcid.size,
      skippedIncomplete,
      skippedTerminal,
      terminalReasons,
      upserted,
      quarantined,
    }

    await advanceEtendersWatermark(supabaseAdmin, now, summary)
    console.log("eTenders OCDS sync completed", summary)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    metrics.recordError(error)
    const message = error instanceof Error ? error.message : "eTenders OCDS sync failed."
    const failureSummary = {
      error: message,
      dateFrom: dateFrom?.toISOString() ?? null,
      dateTo: now.toISOString(),
      ...metrics.snapshot(),
    }
    console.error("eTenders OCDS sync failed", failureSummary)
    await recordEtendersSyncFailure(supabaseAdmin, now, failureSummary)
    return NextResponse.json({ ok: false, ...failureSummary }, { status: 500 })
  }
}

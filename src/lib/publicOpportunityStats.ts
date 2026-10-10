import "server-only"

import { unstable_cache } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { getLiveOpportunitySnapshot, SNAPSHOT_REVALIDATE_SECONDS } from "./liveOpportunitySnapshot.server"

export type PublicOpportunityStats = {
  /** Public, status open/active, any closing date (includes expired). Not a live figure. */
  totalOpenRfqs: number
  /** Live: the same rule and snapshot as the homepage and the /tenders list. */
  liveOpportunities: number
  /** Live and closing within the next 7 days (rolling). */
  closingThisWeek: number
  /** Live and created on the platform in the last 48 hours. */
  newIn48Hours: number
  /**
   * Closing date has passed and no award or cancellation is recorded. This is
   * NOT evidence of evaluation; label it as "past closing date, no outcome
   * published". The field name is kept for API compatibility.
   */
  underEvaluation: number
  screenedPercent: number | null
  /** When the live figures were taken. */
  asOf?: string
  /**
   * The same figures split by origin (unfiltered stats only): external
   * tenders (is_external_opportunity) vs RFQs posted on the platform.
   */
  bySource?: {
    live: SourceSplit
    openStatusAnyDeadline: SourceSplit
    pastClosingNoOutcome: SourceSplit
  }
}

export type SourceSplit = { externalTenders: number; platformRfqs: number }

type SupplementaryCounts = Pick<PublicOpportunityStats, "totalOpenRfqs" | "underEvaluation" | "screenedPercent"> & {
  openStatusAnyDeadline: SourceSplit
  pastClosingNoOutcome: SourceSplit
}

// Origin filters. "Platform" is everything not marked external, including NULL.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const externalOnly = (query: any) => query.eq("is_external_opportunity", true)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const platformOnly = (query: any) => query.not("is_external_opportunity", "is", true)

async function getSupplementaryCountsUncached(): Promise<SupplementaryCounts | null> {
  try {
    // Use anon key directly (no cookies needed for public stats)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const now = new Date()

    // Public, status open/active, regardless of closing date.
    const openStatus = () =>
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true)
        .neq("curation_status", "quarantined")
        .in("status", ["open", "active"])
    // Closing date passed, no award or cancellation recorded.
    const pastClosing = () =>
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true)
        .neq("curation_status", "quarantined")
        .lte("closing_date", now.toISOString())
        .not("status", "in", "(awarded,closed)")

    const [openExternalRes, openPlatformRes, pastExternalRes, pastPlatformRes, screenedTotalRes, screenedDoneRes] = await Promise.all([
      externalOnly(openStatus()),
      platformOnly(openStatus()),
      externalOnly(pastClosing()),
      platformOnly(pastClosing()),
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("is_external_opportunity", true)
        .not("status", "ilike", "draft"),
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("is_external_opportunity", true)
        .not("status", "ilike", "draft")
        .in("curation_status", ["approved", "quarantined"]),
    ])

    for (const result of [openExternalRes, openPlatformRes, pastExternalRes, pastPlatformRes, screenedTotalRes, screenedDoneRes]) {
      if (result.error) {
        console.warn("Opportunity stats query failed:", result.error.message)
        return null
      }
    }

    const screenedTotal = screenedTotalRes.count ?? 0
    const screenedDone = screenedDoneRes.count ?? 0
    const openStatusAnyDeadline = { externalTenders: openExternalRes.count ?? 0, platformRfqs: openPlatformRes.count ?? 0 }
    const pastClosingNoOutcome = { externalTenders: pastExternalRes.count ?? 0, platformRfqs: pastPlatformRes.count ?? 0 }

    return {
      // Totals are the sum of their halves, so the split always adds up.
      totalOpenRfqs: openStatusAnyDeadline.externalTenders + openStatusAnyDeadline.platformRfqs,
      underEvaluation: pastClosingNoOutcome.externalTenders + pastClosingNoOutcome.platformRfqs,
      screenedPercent: screenedTotal > 0 ? Math.round((screenedDone / screenedTotal) * 100) : null,
      openStatusAnyDeadline,
      pastClosingNoOutcome,
    }
  } catch (error) {
    console.warn("Opportunity stats query failed:", error)
    return null
  }
}

const getSupplementaryCounts = unstable_cache(getSupplementaryCountsUncached, ["public-opportunity-supplementary-v1"], {
  revalidate: SNAPSHOT_REVALIDATE_SECONDS,
})

/**
 * Unfiltered public stats. The live figures come from the shared live
 * snapshot, the same cache entry the homepage renders. The homepage page and
 * this cache each refresh every SNAPSHOT_REVALIDATE_SECONDS, so the two can be
 * up to one refresh cycle apart, never more; `asOf` says which snapshot it is.
 */
export async function getPublicOpportunityStats(): Promise<PublicOpportunityStats | null> {
  const [snapshot, supplementary] = await Promise.all([getLiveOpportunitySnapshot(), getSupplementaryCounts()])
  if (!snapshot || !supplementary) return null
  const { openStatusAnyDeadline, pastClosingNoOutcome, ...counts } = supplementary
  return {
    ...counts,
    liveOpportunities: snapshot.live,
    closingThisWeek: snapshot.closingSoon,
    newIn48Hours: snapshot.newIn48Hours,
    asOf: snapshot.asOf,
    bySource: { live: snapshot.liveBySource, openStatusAnyDeadline, pastClosingNoOutcome },
  }
}

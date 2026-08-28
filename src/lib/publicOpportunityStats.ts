import "server-only"

import { unstable_cache } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { buildBaseOpportunityQuery, getSouthAfricaClosingWeekEnd } from "./opportunityStatsQuery"

export type PublicOpportunityStats = {
  liveOpportunities: number
  closingThisWeek: number
  newIn48Hours: number
  screenedPercent: number | null
}

async function getPublicOpportunityStatsUncached(): Promise<PublicOpportunityStats | null> {
  try {
    // Use anon key directly (no cookies needed for public stats)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const now = new Date()
    const nowIso = now.toISOString()
    const closingWeekEndIso = getSouthAfricaClosingWeekEnd(now).toISOString()
    const ago48HoursIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

    // Use unified base query - ensures homepage matches tenders page counts
    const eligibleBase = () => buildBaseOpportunityQuery(supabase, { now, countOnly: true })

    const [liveRes, closingWeekRes, new48Res, screenedTotalRes, screenedDoneRes] = await Promise.all([
      eligibleBase(),
      eligibleBase().lte("closing_date", closingWeekEndIso),
      eligibleBase().gte("published_date", ago48HoursIso),
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

    for (const result of [liveRes, closingWeekRes, new48Res, screenedTotalRes, screenedDoneRes]) {
      if (result.error) {
        console.warn("Opportunity stats query failed:", result.error.message)
        return null
      }
    }

    const screenedTotal = screenedTotalRes.count ?? 0
    const screenedDone = screenedDoneRes.count ?? 0

    return {
      liveOpportunities: liveRes.count ?? 0,
      closingThisWeek: closingWeekRes.count ?? 0,
      newIn48Hours: new48Res.count ?? 0,
      screenedPercent: screenedTotal > 0 ? Math.round((screenedDone / screenedTotal) * 100) : null,
    }
  } catch (error) {
    console.warn("Opportunity stats query failed:", error)
    return null
  }
}

// Cache stats for 1 minute (60 seconds) to keep homepage stats fresh and in sync with tenders page
export const getPublicOpportunityStats = unstable_cache(
  getPublicOpportunityStatsUncached,
  ["public-opportunity-stats"],
  { revalidate: 60 } // 1 minute
)

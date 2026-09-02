import "server-only"

import { unstable_cache } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { buildBaseOpportunityQuery } from "./opportunityStatsQuery"

export type PublicOpportunityStats = {
  liveOpportunities: number
  closingThisWeek: number
  newIn48Hours: number
  underEvaluation: number
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
    const ago48HoursIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    const sevenDaysFromNowIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const [liveRes, closingWeekRes, new48Res, underEvaluationRes, screenedTotalRes, screenedDoneRes] = await Promise.all([
      buildBaseOpportunityQuery(supabase, { now, countOnly: true }),
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true)
        .in("status", ["open", "active"])
        .gte("closing_date", now.toISOString())
        .lte("closing_date", sevenDaysFromNowIso),
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true)
        .gte("created_at", ago48HoursIso),
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true)
        .lte("closing_date", now.toISOString())
        .not("status", "in", "(awarded,closed)"),
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

    for (const result of [liveRes, closingWeekRes, new48Res, underEvaluationRes, screenedTotalRes, screenedDoneRes]) {
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
      underEvaluation: underEvaluationRes.count ?? 0,
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

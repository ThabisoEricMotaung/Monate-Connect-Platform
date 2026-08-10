import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase-server"

const SOUTH_AFRICA_UTC_OFFSET_MS = 2 * 60 * 60 * 1000

export type PublicOpportunityStats = {
  liveOpportunities: number
  closingThisWeek: number
  newIn48Hours: number
  screenedPercent: number | null
}

export function getSouthAfricaClosingWeekEnd(now = new Date()): Date {
  const southAfricaNow = new Date(now.getTime() + SOUTH_AFRICA_UTC_OFFSET_MS)
  const startOfDayAfterWindowUtc = Date.UTC(
    southAfricaNow.getUTCFullYear(),
    southAfricaNow.getUTCMonth(),
    southAfricaNow.getUTCDate() + 8,
  )

  return new Date(startOfDayAfterWindowUtc - SOUTH_AFRICA_UTC_OFFSET_MS - 1)
}

export async function getPublicOpportunityStats(): Promise<PublicOpportunityStats | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const now = new Date()
    const nowIso = now.toISOString()
    const closingWeekEndIso = getSouthAfricaClosingWeekEnd(now).toISOString()
    const ago48HoursIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

    const eligibleBase = () =>
      supabase
        .from("rfqs")
        .select("id", { count: "exact", head: true })
        .ilike("status", "open")
        .gt("closing_date", nowIso)
        .eq("is_public", true)
        .or("is_external_opportunity.is.null,is_external_opportunity.eq.false,curation_status.eq.approved")

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

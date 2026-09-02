import { createClient } from "@supabase/supabase-js"
import { getPublicOpportunityStats, type PublicOpportunityStats } from "@/lib/publicOpportunityStats"
import { applyLivePublicOpportunityFilters } from "@/lib/opportunityStatsQuery"

export const dynamic = "force-dynamic"

type BudgetRange = "0-5m" | "5-20m" | "20m+" | "unspecified"
const BUDGET_VALUES: readonly BudgetRange[] = ["0-5m", "5-20m", "20m+", "unspecified"]

type OpportunityStatsFilterParams = {
  source?: string
  budget?: BudgetRange
  closingDays?: number
  now?: Date
}

/**
 * Layers the same source/budget/closing narrowing used by /api/tenders onto a
 * stats count query, so the numbers shown alongside the tenders list match the
 * filters currently applied to it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOptionalFilters(query: any, { source, budget, closingDays, now = new Date() }: OpportunityStatsFilterParams) {
  if (source) {
    query = source === "null" ? query.is("source_name", null) : query.ilike("source_name", `%${source}%`)
  }

  if (budget === "unspecified") query = query.is("estimated_budget", null)
  if (budget === "0-5m") query = query.gte("estimated_budget", 0).lt("estimated_budget", 5_000_000)
  if (budget === "5-20m") query = query.gte("estimated_budget", 5_000_000).lt("estimated_budget", 20_000_000)
  if (budget === "20m+") query = query.gte("estimated_budget", 20_000_000)

  if (closingDays && closingDays > 0) {
    const targetDate = new Date(now.getTime() + closingDays * 24 * 60 * 60 * 1000)
    query = query
      .gte("closing_date", now.toISOString())
      .lte("closing_date", targetDate.toISOString())
  }

  return query
}

// Mirrors getPublicOpportunityStatsUncached in src/lib/publicOpportunityStats.ts,
// with source/budget/closing narrowing layered on top of each metric. Intentionally
// not cached (unlike the no-filter path below) — the number of filter combinations
// makes a shared cache key impractical, and these are cheap head-count queries.
async function getFilteredPublicOpportunityStats(
  filters: OpportunityStatsFilterParams,
): Promise<PublicOpportunityStats | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const now = new Date()
    const queryFilters = { ...filters, now }
    const ago48HoursIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    const sevenDaysFromNowIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const [totalOpenRes, liveRes, closingWeekRes, new48Res, underEvaluationRes] = await Promise.all([
      applyOptionalFilters(
        supabase
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("is_public", true)
          .in("status", ["open", "active"]),
        queryFilters,
      ),
      applyOptionalFilters(
        applyLivePublicOpportunityFilters(
          supabase.from("rfqs").select("id", { count: "exact", head: true }),
          now,
        ),
        queryFilters,
      ),
      applyOptionalFilters(
        supabase
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("is_public", true)
          .in("status", ["open", "active"])
          .gte("closing_date", now.toISOString())
          .lte("closing_date", sevenDaysFromNowIso),
        queryFilters,
      ),
      applyOptionalFilters(
        supabase
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("is_public", true)
          .gte("created_at", ago48HoursIso),
        queryFilters,
      ),
      applyOptionalFilters(
        supabase
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("is_public", true)
          .lte("closing_date", now.toISOString())
          .not("status", "in", "(awarded,closed)"),
        queryFilters,
      ),
    ])

    for (const result of [totalOpenRes, liveRes, closingWeekRes, new48Res, underEvaluationRes]) {
      if (result.error) {
        console.warn("Filtered opportunity stats query failed:", result.error.message)
        return null
      }
    }

    return {
      totalOpenRfqs: totalOpenRes.count ?? 0,
      liveOpportunities: liveRes.count ?? 0,
      closingThisWeek: closingWeekRes.count ?? 0,
      newIn48Hours: new48Res.count ?? 0,
      underEvaluation: underEvaluationRes.count ?? 0,
      screenedPercent: null,
    }
  } catch (error) {
    console.warn("Filtered opportunity stats query failed:", error)
    return null
  }
}

function parseBudget(value: string | null): BudgetRange | undefined {
  return BUDGET_VALUES.includes(value as BudgetRange) ? (value as BudgetRange) : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get("source") || undefined
  const budget = parseBudget(searchParams.get("budget"))
  const closingParam = searchParams.get("closing")
  const closingDays = closingParam ? parseInt(closingParam, 10) : undefined

  const hasFilters = Boolean(source || budget || (closingDays && closingDays > 0))

  const stats = hasFilters
    ? await getFilteredPublicOpportunityStats({ source, budget, closingDays })
    : await getPublicOpportunityStats()

  if (!stats) {
    return Response.json({ error: "Opportunity stats are unavailable." }, { status: 503 })
  }

  return Response.json(stats, {
    headers: { "Cache-Control": "no-store" },
  })
}

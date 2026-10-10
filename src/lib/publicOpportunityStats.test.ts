import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock("./liveOpportunitySnapshot.server", () => ({
  SNAPSHOT_REVALIDATE_SECONDS: 60,
  getLiveOpportunitySnapshot: async () => ({
    asOf: "2026-10-09T10:00:00.000Z",
    live: 114,
    liveBySource: { externalTenders: 110, platformRfqs: 4 },
    closingSoon: 16,
    newIn48Hours: 5,
  }),
}))

// Answers each head-count query from the filters it was built with.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => {
      const applied: string[] = []
      const builder: Record<string, unknown> = {}
      for (const method of ["select", "eq", "neq", "in", "lte", "not", "ilike"]) {
        builder[method] = (...args: unknown[]) => {
          applied.push(`${method}:${args.map(String).join(",")}`)
          return builder
        }
      }
      builder.then = (resolve: (value: unknown) => void) => {
        const has = (fragment: string) => applied.some((entry) => entry.includes(fragment))
        const external = has("eq:is_external_opportunity,true")
        const platform = has("not:is_external_opportunity,is,true")
        let count = 0
        if (has("in:status,open,active")) count = external ? 2100 : platform ? 79 : -1
        else if (has("lte:closing_date")) count = external ? 2040 : platform ? 8 : -1
        else if (has("in:curation_status")) count = 1700
        else count = 2000
        resolve({ count, error: null })
      }
      return builder
    },
  }),
}))

import { getPublicOpportunityStats } from "./publicOpportunityStats"

describe("getPublicOpportunityStats", () => {
  it("takes live figures from the shared snapshot and keeps origins distinct", async () => {
    const stats = await getPublicOpportunityStats()
    expect(stats).toMatchObject({ liveOpportunities: 114, closingThisWeek: 16, newIn48Hours: 5, asOf: "2026-10-09T10:00:00.000Z" })
    expect(stats?.bySource).toEqual({
      live: { externalTenders: 110, platformRfqs: 4 },
      openStatusAnyDeadline: { externalTenders: 2100, platformRfqs: 79 },
      pastClosingNoOutcome: { externalTenders: 2040, platformRfqs: 8 },
    })
  })

  it("reports open-status and past-closing totals as exactly the sum of their origins", async () => {
    const stats = await getPublicOpportunityStats()
    expect(stats?.totalOpenRfqs).toBe(2179)
    expect(stats?.underEvaluation).toBe(2048)
    expect(stats?.totalOpenRfqs).not.toBe(stats?.liveOpportunities)
  })
})

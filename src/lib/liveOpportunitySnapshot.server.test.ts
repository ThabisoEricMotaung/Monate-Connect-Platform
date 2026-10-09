import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))

import { buildLiveOpportunitySnapshotUncached, fetchLiveRows } from "./liveOpportunitySnapshot.server"
import type { SnapshotRow } from "./liveOpportunitySnapshot"

const NOW = new Date("2026-10-09T10:00:00.000Z")

function liveRow(id: number, province: string | null = "Gauteng"): SnapshotRow {
  return {
    id,
    province,
    provinces: null,
    closing_date: "2026-11-01T10:00:00.000Z",
    created_at: "2026-09-01T10:00:00.000Z",
    status: "open",
    is_public: true,
    curation_status: "not_required",
  }
}

/**
 * A fake PostgREST client that records the filters applied, caps every
 * response at `cap` rows like Supabase does, and serves `rowsFor(attempt)`.
 */
function fakeClient(options: { rows: (attempt: number) => SnapshotRow[]; count: (attempt: number) => number; cap?: number }) {
  const cap = options.cap ?? 1000
  let attempt = 0
  const filters: string[][] = []
  const orders: string[] = []
  const client = {
    from(table: string) {
      expect(table).toBe("rfqs")
      const applied: string[] = []
      let head = false
      let range: [number, number] | null = null
      const builder = {
        select(_columns: string, opts?: { head?: boolean }) {
          head = Boolean(opts?.head)
          if (head) attempt += 1
          return builder
        },
        eq: (c: string, v: unknown) => (applied.push(`eq ${c} ${v}`), builder),
        neq: (c: string, v: unknown) => (applied.push(`neq ${c} ${v}`), builder),
        in: (c: string, v: unknown[]) => (applied.push(`in ${c} ${v.join("|")}`), builder),
        gt: (c: string, v: unknown) => (applied.push(`gt ${c} ${v}`), builder),
        order: (column: string, opts?: { ascending?: boolean }) => (orders.push(`${column} ${opts?.ascending === false ? "desc" : "asc"}`), builder),
        range(from: number, to: number) {
          range = [from, to]
          return builder
        },
        then(resolve: (value: unknown) => void) {
          filters.push(applied)
          if (head) return resolve({ count: options.count(attempt), error: null })
          const all = options.rows(attempt)
          const [from, to] = range ?? [0, all.length - 1]
          resolve({ data: all.slice(from, Math.min(to + 1, from + cap)), error: null })
        },
      }
      return builder
    },
  }
  return { client, filters, orders, attempts: () => attempt }
}

describe("fetchLiveRows", () => {
  it("reads every row past the 1,000-row response cap, page by page", async () => {
    const rows = Array.from({ length: 2500 }, (_, index) => liveRow(index + 1))
    const { client } = fakeClient({ rows: () => rows, count: () => 2500 })
    const result = await fetchLiveRows(client, NOW)
    expect(result).toHaveLength(2500)
    expect(new Set(result.map((r) => r.id)).size).toBe(2500)
  })

  it("applies the shared live rule to the count and to every page", async () => {
    const { client, filters } = fakeClient({ rows: () => [liveRow(1)], count: () => 1 })
    await fetchLiveRows(client, NOW)
    for (const applied of filters) {
      expect(applied).toEqual([
        "eq is_public true",
        "in status open|active",
        `gt closing_date ${NOW.toISOString()}`,
        "neq curation_status quarantined",
      ])
    }
  })

  it("orders every page by the primary key only, so page boundaries are stable and unique", async () => {
    const rows = Array.from({ length: 2100 }, (_, index) => liveRow(index + 1))
    const { client, orders } = fakeClient({ rows: () => rows, count: () => 2100 })
    await fetchLiveRows(client, NOW)
    expect(orders).toEqual(["id asc", "id asc", "id asc"])
  })

  it("documents the limit of the checks: an offsetting change between pages is not detected", async () => {
    // Page 1 is read, then listing 1000 stops being live and 3001 becomes live:
    // the count still matches and IDs are unique, so the read is accepted.
    // This is why the snapshot is described as complete, not transactional.
    const before = Array.from({ length: 1000 }, (_, index) => liveRow(index + 1))
    const after = [...before.slice(0, 999), ...Array.from({ length: 1000 }, (_, index) => liveRow(1001 + index)), liveRow(3001)]
    let pagesServed = 0
    const { client } = fakeClient({ rows: () => (pagesServed++ === 0 ? [...before, ...after.slice(999)] : after), count: () => 2000 })
    const result = await fetchLiveRows(client, NOW)
    expect(result).toHaveLength(2000)
  })

  it("retries when rows changed between the count and the pages, then succeeds", async () => {
    const { client, attempts } = fakeClient({
      rows: (attempt) => (attempt === 1 ? [liveRow(1)] : [liveRow(1), liveRow(2)]),
      count: () => 2,
    })
    expect(await fetchLiveRows(client, NOW)).toHaveLength(2)
    expect(attempts()).toBe(2)
  })

  it("refuses to report figures from an incomplete read", async () => {
    const { client } = fakeClient({ rows: () => [liveRow(1)], count: () => 5 })
    await expect(fetchLiveRows(client, NOW)).rejects.toThrow(/inconsistent/)
  })

  it("does not let a duplicated row hide a missing one", async () => {
    const { client } = fakeClient({ rows: () => [liveRow(1), liveRow(1)], count: () => 2 })
    await expect(fetchLiveRows(client, NOW)).rejects.toThrow(/inconsistent/)
  })
})

describe("buildLiveOpportunitySnapshotUncached", () => {
  it("derives every figure from the one set of rows read at `now`", async () => {
    const rows = [liveRow(1, "Gauteng, North West"), liveRow(2, null), liveRow(3, "South Africa")]
    const { client } = fakeClient({ rows: () => rows, count: () => 3 })
    const snapshot = await buildLiveOpportunitySnapshotUncached(client, NOW)
    expect(snapshot).toMatchObject({ asOf: NOW.toISOString(), live: 3, multiRegionListings: 1, regionalTotal: 4 })
    expect(snapshot.notSpecified.live).toBe(1)
    expect(snapshot.national.live).toBe(1)
  })
})

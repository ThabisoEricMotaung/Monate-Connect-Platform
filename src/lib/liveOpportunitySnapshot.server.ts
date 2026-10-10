import "server-only"

import { unstable_cache } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { applyLivePublicOpportunityFilters } from "@/lib/opportunityStatsQuery"
import { buildLiveSnapshot, SNAPSHOT_COLUMNS, type LiveOpportunitySnapshot, type SnapshotRow } from "@/lib/liveOpportunitySnapshot"

/** Every public figure (homepage banner, map, /tenders stats) refreshes on this one cycle. */
export const SNAPSHOT_REVALIDATE_SECONDS = 60

// Supabase caps a single response (1,000 rows by default) regardless of
// .limit(); pages are requested explicitly and checked against an exact count.
const PAGE_SIZE = 1000
const MAX_ATTEMPTS = 3

type CountResult = { count: number | null; error: { message: string } | null }
type RowsResult = { data: SnapshotRow[] | null; error: { message: string } | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LiveQueryClient = { from(table: string): any }

/**
 * Reads every live row at `now`, page by page, and confirms the number read
 * matches an exact count taken with the same filter. A mismatch (rows changed
 * between requests, or a page silently capped) is retried, then reported.
 *
 * Ordering: pages are ordered by `id`, the table's primary key (unique, never
 * reassigned), so page boundaries are stable and no row can sort into two
 * positions.
 *
 * Consistency: each request is its own read, not one transaction. The count
 * and duplicate checks prove the pages are complete relative to the count,
 * but not that they are one consistent snapshot: if, between requests, one
 * listing stops being live and another becomes live, the totals still agree
 * and the change goes undetected. The figures are then accurate to within the
 * changes made during the read (normally well under a second). A truly atomic
 * snapshot would need a single SQL statement (for example a database function
 * returning the aggregates), which is a schema change.
 */
export async function fetchLiveRows(client: LiveQueryClient, now: Date): Promise<SnapshotRow[]> {
  let lastMismatch = ""
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const countRes = (await applyLivePublicOpportunityFilters(
      client.from("rfqs").select("id", { count: "exact", head: true }),
      now,
    )) as CountResult
    if (countRes.error) throw new Error(`Live count failed: ${countRes.error.message}`)
    const expected = countRes.count ?? 0

    const rows: SnapshotRow[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = (await applyLivePublicOpportunityFilters(client.from("rfqs").select(SNAPSHOT_COLUMNS), now)
        .order("id", { ascending: true }) // primary key: unique, stable page boundaries
        .range(from, from + PAGE_SIZE - 1)) as RowsResult
      if (page.error) throw new Error(`Live rows failed: ${page.error.message}`)
      const data = page.data ?? []
      rows.push(...data)
      if (data.length === 0 || rows.length >= expected) break
    }

    // Unique IDs, so a row repeated across shifting pages cannot hide a missed one.
    const unique = new Set(rows.map((row) => row.id)).size
    if (unique === expected && rows.length === expected) return rows
    lastMismatch = `read ${unique} unique of ${rows.length} rows, exact count ${expected}`
  }
  throw new Error(`Live opportunity snapshot is inconsistent after ${MAX_ATTEMPTS} attempts (${lastMismatch}).`)
}

export async function buildLiveOpportunitySnapshotUncached(client?: LiveQueryClient, now = new Date()): Promise<LiveOpportunitySnapshot> {
  const supabase =
    client ?? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const rows = await fetchLiveRows(supabase, now)
  return buildLiveSnapshot(rows, now)
}

const cachedSnapshot = unstable_cache(() => buildLiveOpportunitySnapshotUncached(), ["live-opportunity-snapshot-v1"], {
  revalidate: SNAPSHOT_REVALIDATE_SECONDS,
})

/** The shared, cached snapshot. Null when the database cannot be read. */
export async function getLiveOpportunitySnapshot(): Promise<LiveOpportunitySnapshot | null> {
  try {
    return await cachedSnapshot()
  } catch (error) {
    console.warn("Live opportunity snapshot unavailable:", error)
    return null
  }
}

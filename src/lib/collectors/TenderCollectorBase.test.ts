import { beforeAll, describe, expect, it } from "vitest"
import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

type Row = Record<string, unknown>

/** Minimal stand-in for the Supabase client: records upserts, serves existing rows. */
function fakeSupabase(existing: Row[]) {
  const upserts: Row[][] = []
  const client = {
    from(table: string) {
      return {
        select() {
          return {
            in: async (_column: string, ocids: string[]) => ({
              data: existing.filter((row) => ocids.includes(row.external_ocid as string)),
              error: null,
            }),
          }
        },
        upsert(rows: Row[]) {
          upserts.push(rows)
          return { select: async () => ({ data: rows.map((_, id) => ({ id })), error: null }) }
        },
        insert: async () => ({ data: null, error: table === "collector_metrics" ? null : null }),
      }
    },
  }
  return { client, upserts }
}

class FixtureCollector extends TenderCollectorBase {
  constructor(private readonly items: RawTender[]) {
    super("Fixture", "https://example.test")
  }
  async scrapeListings() {
    return this.items
  }
}

const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
const item = (reference: string, review_reason: string | null = null): RawTender => ({
  reference_number: reference,
  title: `Work ${reference}`,
  closing_date: future,
  source_url: "https://example.test",
  buyer: "Buyer",
  review_reason,
})

async function collect(items: RawTender[], existing: Row[]) {
  const collector = new FixtureCollector(items)
  const { client, upserts } = fakeSupabase(existing)
  Object.assign(collector, { supabase: client })
  await collector.collect()
  return new Map((upserts[0] ?? []).map((row) => [row.external_ocid as string, row]))
}

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-key"
})

class FetchingCollector extends TenderCollectorBase {
  constructor(private readonly url: string) {
    super("Fetching", "https://example.test")
  }
  async scrapeListings(): Promise<RawTender[]> {
    await this.fetchSource(this.url)
    return []
  }
}

describe("TenderCollectorBase source fetching", () => {
  it("refuses to fetch once the run's deadline has passed, and reports it as a failed source", async () => {
    const collector = new FetchingCollector("https://example.test/never-fetched")
    collector.deadline = Date.now() - 1
    Object.assign(collector, { supabase: fakeSupabase([]).client })
    const result = await collector.collect()
    expect(result.stage).toBe("fetch-list-page")
    expect(result.error?.message).toMatch(/time budget exhausted/)
  })

  it("aborts a request that outlives its time limit", async () => {
    const collector = new FetchingCollector("https://example.test/slow")
    collector.deadline = Date.now() + 50
    const realFetch = globalThis.fetch
    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)))) as typeof fetch
    try {
      Object.assign(collector, { supabase: fakeSupabase([]).client })
      const result = await collector.collect()
      expect(result.stage).toBe("fetch-list-page")
      expect(result.error?.name).toMatch(/TimeoutError|AbortError/)
    } finally {
      globalThis.fetch = realFetch
    }
  })
})

describe("TenderCollectorBase re-collection and curation", () => {
  it("publishes new ordinary items and holds possible notices for review", async () => {
    const rows = await collect([item("A"), item("N", "possible_award_notice")], [])
    expect(rows.get("A")).toMatchObject({ is_public: true, status: "active", curation_status: "not_required" })
    expect(rows.get("N")).toMatchObject({ is_public: false, status: "draft", curation_status: "pending", curation_reason: "possible_award_notice" })
  })

  it("never republishes a quarantined row, even one whose stored flag says public", async () => {
    const rows = await collect(
      [item("Q1"), item("Q2")],
      [
        { external_ocid: "Q1", status: "closed", is_public: false, curation_status: "quarantined", curation_reason: "terminal_notice" },
        { external_ocid: "Q2", status: "active", is_public: true, curation_status: "quarantined", curation_reason: "terminal_notice" },
      ],
    )
    expect(rows.get("Q1")).toMatchObject({ is_public: false, status: "closed", curation_status: "quarantined", curation_reason: "terminal_notice" })
    expect(rows.get("Q2")).toMatchObject({ is_public: false, curation_status: "quarantined" })
  })

  it("keeps an item pending review in the queue, unpublished", async () => {
    const rows = await collect(
      [item("P")],
      [{ external_ocid: "P", status: "draft", is_public: false, curation_status: "pending", curation_reason: "possible_cancellation_notice" }],
    )
    expect(rows.get("P")).toMatchObject({ is_public: false, status: "draft", curation_status: "pending", curation_reason: "possible_cancellation_notice" })
  })

  it("keeps an approval: an approved item is not sent back to review by its wording", async () => {
    const rows = await collect(
      [item("AP", "possible_award_notice")],
      [{ external_ocid: "AP", status: "active", is_public: true, curation_status: "approved", curation_reason: null }],
    )
    expect(rows.get("AP")).toMatchObject({ is_public: true, status: "active", curation_status: "approved", curation_reason: null })
  })
})

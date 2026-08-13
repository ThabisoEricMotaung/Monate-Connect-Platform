import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  EtendersHttpError,
  SyncMetricsCollector,
  executeWithBackoff,
  fetchReleasePages,
  readEtendersWatermark,
} from "@/lib/etendersSync"

describe("eTenders sync helpers", () => {
  it("follows links.next verbatim instead of inferring pagination from page size", async () => {
    const urls: string[] = []
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      urls.push(url)
      const page = urls.length
      return new Response(JSON.stringify({
        releases: [{ ocid: `ocid-${page}` }],
        links: page === 1 ? { next: "https://feed.test/custom-cursor=abc" } : {},
      }), { status: 200, headers: { "content-type": "application/json" } })
    }) as typeof fetch
    const metrics = new SyncMetricsCollector(100)

    const result = await fetchReleasePages({
      dateFrom: new Date("2026-08-01"),
      dateTo: new Date("2026-08-02"),
      fetchImpl,
      metrics,
    })

    expect(result.completed).toBe(true)
    expect(result.releases.map((item) => item.ocid)).toEqual(["ocid-1", "ocid-2"])
    expect(urls[1]).toBe("https://feed.test/custom-cursor=abc")
    expect(metrics.snapshot(200)).toMatchObject({ pages: 2, records: 2 })
  })

  it("reports an incomplete run when the page cap leaves a next link", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      releases: [], links: { next: "https://feed.test/next" },
    }), { status: 200 })) as typeof fetch
    const result = await fetchReleasePages({
      dateFrom: new Date("2026-08-01"), dateTo: new Date("2026-08-02"), fetchImpl, maxPages: 1,
    })
    expect(result.completed).toBe(false)
  })

  it("retries transient failures with exponential jitter", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new EtendersHttpError(500, "Server Error"))
      .mockRejectedValueOnce(new EtendersHttpError(429, "Rate Limited"))
      .mockResolvedValue("ok")
    const sleep = vi.fn(async () => undefined)
    const metrics = new SyncMetricsCollector()

    await expect(executeWithBackoff(operation, { random: () => 0, sleep, metrics })).resolves.toBe("ok")
    expect(sleep).toHaveBeenNthCalledWith(1, 250)
    expect(sleep).toHaveBeenNthCalledWith(2, 500)
    expect(metrics.retries).toBe(2)
  })

  it("fails fast on non-rate-limit 4xx responses", async () => {
    const operation = vi.fn().mockRejectedValue(new EtendersHttpError(400, "Bad Request"))
    const sleep = vi.fn(async () => undefined)
    await expect(executeWithBackoff(operation, { sleep })).rejects.toMatchObject({ status: 400 })
    expect(operation).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it("reads a watermark with a 48-hour overlap and falls back to 14 days", async () => {
    function clientFor(lastSyncedAt: string | null) {
      const result = Promise.resolve({ data: lastSyncedAt ? { last_synced_at: lastSyncedAt } : null, error: null })
      const query = { select: () => query, eq: () => query, maybeSingle: () => result }
      return { from: () => query } as unknown as SupabaseClient
    }
    const now = new Date("2026-08-14T00:00:00Z")
    await expect(readEtendersWatermark(clientFor("2026-08-10T12:00:00Z"), now)).resolves.toMatchObject({
      dateFrom: new Date("2026-08-08T12:00:00Z"),
    })
    await expect(readEtendersWatermark(clientFor(null), now)).resolves.toMatchObject({
      dateFrom: new Date("2026-07-31T00:00:00Z"),
    })
  })
})

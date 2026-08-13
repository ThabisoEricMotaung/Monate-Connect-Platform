import type { SupabaseClient } from "@supabase/supabase-js"
import type { OcdsRelease, OcdsReleasePackage } from "@/lib/etendersTransform"

export const INITIAL_LOOKBACK_DAYS = 14
export const WATERMARK_LOOKBACK_OFFSET_HOURS = 48
export const MAX_PAGES_PER_RUN = 10
export const RETRY_MAX_ATTEMPTS = 3
export const RETRY_BASE_DELAY_MS = 500
export const RETRY_MAX_DELAY_MS = 30_000
export const FETCH_TIMEOUT_MS = 30_000
export const TOTAL_TIMEOUT_MS = 900_000

export const OCDS_API_BASE = "https://ocds-api.etenders.gov.za/api/OCDSReleases"
const PAGE_SIZE = 1_000
const SYNC_STATE_ID = 1

export type EtendersSyncSummary = {
  pages: number
  records: number
  retries: number
  durationMs: number
  errors: string[]
}

export class SyncMetricsCollector {
  private readonly startedAt: number
  pages = 0
  records = 0
  retries = 0
  errors: string[] = []

  constructor(startedAt = Date.now()) {
    this.startedAt = startedAt
  }

  recordPage(recordCount: number) {
    this.pages += 1
    this.records += recordCount
  }

  recordRetry() {
    this.retries += 1
  }

  recordError(error: unknown) {
    this.errors.push(error instanceof Error ? error.message : String(error))
  }

  snapshot(now = Date.now()): EtendersSyncSummary {
    return {
      pages: this.pages,
      records: this.records,
      retries: this.retries,
      durationMs: Math.max(0, now - this.startedAt),
      errors: [...this.errors],
    }
  }
}

export class EtendersHttpError extends Error {
  constructor(
    public readonly status: number,
    statusText: string,
  ) {
    super(`eTenders OCDS API returned ${status} ${statusText}`.trim())
    this.name = "EtendersHttpError"
  }
}

type BackoffOptions = {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  random?: () => number
  sleep?: (milliseconds: number) => Promise<void>
  metrics?: SyncMetricsCollector
}

function isRetryable(error: unknown): boolean {
  return !(error instanceof EtendersHttpError) || error.status === 429 || error.status >= 500
}

export async function executeWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: BackoffOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? RETRY_MAX_ATTEMPTS
  const baseDelayMs = options.baseDelayMs ?? RETRY_BASE_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? RETRY_MAX_DELAY_MS
  const random = options.random ?? Math.random
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (!isRetryable(error) || attempt === maxAttempts) throw error
      options.metrics?.recordRetry()
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      const delay = Math.floor(exponential * (0.5 + random() * 0.5))
      await sleep(delay)
    }
  }
  throw lastError
}

export async function readEtendersWatermark(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<{ dateFrom: Date; lastSyncedAt: string | null }> {
  const { data, error } = await client
    .from("etenders_sync_state")
    .select("last_synced_at")
    .eq("id", SYNC_STATE_ID)
    .maybeSingle()

  if (error) throw new Error(`eTenders sync state read failed: ${error.message}`)
  const lastSyncedAt = (data as { last_synced_at?: string | null } | null)?.last_synced_at ?? null
  const parsed = lastSyncedAt ? new Date(lastSyncedAt) : null
  const validWatermark = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
  const dateFrom = validWatermark
    ? new Date(validWatermark.getTime() - WATERMARK_LOOKBACK_OFFSET_HOURS * 3_600_000)
    : new Date(now.getTime() - INITIAL_LOOKBACK_DAYS * 86_400_000)

  return { dateFrom, lastSyncedAt }
}

export async function advanceEtendersWatermark(
  client: SupabaseClient,
  completedAt: Date,
  summary: Record<string, unknown>,
): Promise<void> {
  const timestamp = completedAt.toISOString()
  const { error } = await client.from("etenders_sync_state").upsert(
    { id: SYNC_STATE_ID, last_synced_at: timestamp, last_run_at: timestamp, last_run_summary: summary },
    { onConflict: "id" },
  )
  if (error) throw new Error(`eTenders watermark advance failed: ${error.message}`)
}

export async function recordEtendersSyncFailure(
  client: SupabaseClient,
  runAt: Date,
  summary: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from("etenders_sync_state").upsert(
    { id: SYNC_STATE_ID, last_run_at: runAt.toISOString(), last_run_summary: summary },
    { onConflict: "id" },
  )
  if (error) console.error("eTenders failure state write failed", error)
}

export type FetchReleasePagesOptions = {
  dateFrom: Date
  dateTo: Date
  fetchImpl?: typeof fetch
  metrics?: SyncMetricsCollector
  maxPages?: number
  fetchTimeoutMs?: number
  totalTimeoutMs?: number
}

export async function fetchReleasePages({
  dateFrom,
  dateTo,
  fetchImpl = fetch,
  metrics = new SyncMetricsCollector(),
  maxPages = MAX_PAGES_PER_RUN,
  fetchTimeoutMs = FETCH_TIMEOUT_MS,
  totalTimeoutMs = TOTAL_TIMEOUT_MS,
}: FetchReleasePagesOptions): Promise<{ releases: OcdsRelease[]; completed: boolean }> {
  const startedAt = Date.now()
  const params = new URLSearchParams({
    PageNumber: "1",
    PageSize: String(PAGE_SIZE),
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  })
  let nextUrl: string | null = `${OCDS_API_BASE}?${params}`
  const releases: OcdsRelease[] = []

  while (nextUrl && metrics.pages < maxPages) {
    if (Date.now() - startedAt >= totalTimeoutMs) {
      throw new Error(`eTenders sync exceeded total timeout of ${totalTimeoutMs}ms`)
    }
    const requestUrl: string = nextUrl
    const page = await executeWithBackoff(async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs)
      try {
        const response = await fetchImpl(requestUrl, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new EtendersHttpError(response.status, response.statusText)
        return (await response.json()) as OcdsReleasePackage
      } finally {
        clearTimeout(timeout)
      }
    }, { metrics })

    const pageReleases = Array.isArray(page.releases) ? page.releases : []
    releases.push(...pageReleases)
    metrics.recordPage(pageReleases.length)
    nextUrl = page.links?.next?.trim() || null
  }

  return { releases, completed: nextUrl === null }
}

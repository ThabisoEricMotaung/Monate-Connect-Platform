/**
 * Base class for tender collectors
 * Handles common logic: normalization, date parsing, Supabase insertion
 */

import { createClient } from "@supabase/supabase-js"
import { cleanText, extractOrganizationFromTitle } from "@/lib/htmlUtils"

export interface RawTender {
  reference_number: string
  title: string
  description?: string | null
  closing_date?: Date | null
  published_date?: Date | null
  source_url: string
  buyer?: string
  estimated_budget?: number | null
  category?: string | null
  province?: string | null
  /**
   * Set when the item may not be an open opportunity (e.g. it reads like a
   * cancellation or award notice) and a curator should decide. The item is
   * stored as a non-public draft pending review with this reason, never
   * discarded and never published automatically.
   */
  review_reason?: string | null
}

type CurationStatus = "not_required" | "pending" | "approved" | "quarantined"

/** Longest any single request to a tender source may take. */
export const SOURCE_FETCH_TIMEOUT_MS = 30_000

export interface NormalizedTender {
  external_ocid: string // reference_number, dedupe key
  external_reference: string // reference_number, displayed as the tender reference
  title: string
  description?: string | null
  closing_date?: string | null // ISO string
  published_date?: string | null // ISO string
  original_source_url: string
  // rfqs stores the issuing organisation in buyer_org (see etendersTransform.ts
  // and the /api/tenders mapping); no migration defines rfqs.buyer_normalized.
  buyer_org: string
  source_name: string
  is_external_opportunity: boolean
  is_public: boolean
  // "draft" = held for curator review (admin RFQs page lists external drafts).
  status: "active" | "closed" | "draft"
  curation_status: CurationStatus
  curation_reason: string | null
  estimated_budget?: number | null
  category?: string | null
  province?: string | null
}

export abstract class TenderCollectorBase {
  protected sourceName: string
  protected baseUrl: string
  protected supabase: ReturnType<typeof createClient>
  /**
   * Epoch milliseconds after which source requests are refused (set by the
   * cron route so a run fits its time limit). Null means no run-wide limit.
   */
  deadline: number | null = null

  constructor(sourceName: string, baseUrl: string) {
    this.sourceName = sourceName
    this.baseUrl = baseUrl

    // Initialize Supabase client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error("Missing Supabase credentials")
    }

    this.supabase = createClient(url, key)
  }

  /**
   * Main collection method - must be implemented by subclasses
   */
  abstract scrapeListings(): Promise<RawTender[]>

  /**
   * fetch() for source pages: aborted after SOURCE_FETCH_TIMEOUT_MS, or
   * sooner if the run's deadline is nearer, so one slow or hanging site
   * cannot use up the time the other collectors need.
   */
  protected fetchSource(url: string, init: RequestInit = {}): Promise<Response> {
    const remaining = this.deadline === null ? SOURCE_FETCH_TIMEOUT_MS : this.deadline - Date.now()
    if (remaining <= 0) {
      return Promise.reject(new Error(`[${this.sourceName}] time budget exhausted before fetching ${url}`))
    }
    return fetch(url, { ...init, signal: AbortSignal.timeout(Math.min(SOURCE_FETCH_TIMEOUT_MS, remaining)) })
  }

  /**
   * Normalize raw tender to standard format
   */
  protected normalizeTender(raw: RawTender): NormalizedTender {
    const now = new Date()
    const closingDate = raw.closing_date ? new Date(raw.closing_date) : null
    const isClosed = Boolean(closingDate && closingDate < now)
    const needsReview = !isClosed && Boolean(raw.review_reason)

    // Clean and decode title. Not truncated: rfqs.title is TEXT, and cutting
    // official titles loses the work description (listings clamp visually).
    const cleanedTitle = cleanText(raw.title)

    // Clean and decode description
    const cleanedDescription = raw.description
      ? cleanText(raw.description).substring(0, 2000)
      : null

    // Extract or determine buyer name
    const buyerNormalized = raw.buyer
      ? cleanText(raw.buyer)
      : extractOrganizationFromTitle(raw.title, this.sourceName)

    return {
      external_ocid: raw.reference_number,
      external_reference: raw.reference_number,
      title: cleanedTitle,
      description: cleanedDescription,
      closing_date: closingDate?.toISOString() || null,
      published_date: raw.published_date?.toISOString() || null,
      original_source_url: raw.source_url,
      buyer_org: buyerNormalized,
      source_name: this.sourceName,
      is_external_opportunity: true,
      is_public: !needsReview,
      status: isClosed ? "closed" : needsReview ? "draft" : "active",
      curation_status: needsReview ? "pending" : "not_required",
      curation_reason: needsReview ? raw.review_reason! : null,
      estimated_budget: raw.estimated_budget || null,
      category: raw.category || null,
      province: raw.province || null,
    }
  }

  /**
   * Collect and insert tenders into database
   */
  async collect(): Promise<{
    inserted: number
    updated: number
    skipped: number
    stage?: string
    error?: { name: string; message: string; code?: string; cause?: string }
  }> {
    console.log(`[${this.sourceName}] Starting collection...`)

    try {
      // Stage 1: Fetch listings
      let rawTenders: RawTender[] = []
      try {
        console.log(`[${this.sourceName}] Stage: fetch-list-page`)
        rawTenders = await this.scrapeListings()
        console.log(`[${this.sourceName}] Scraped ${rawTenders.length} tenders`)
      } catch (fetchError) {
        const errorObj = this.serializeError(fetchError)
        console.error(`[${this.sourceName}] fetch-list-page failed: ${JSON.stringify(errorObj)}`)
        return {
          inserted: 0,
          updated: 0,
          skipped: 0,
          stage: "fetch-list-page",
          error: errorObj,
        }
      }

      // Stage 2: Normalize
      console.log(`[${this.sourceName}] Stage: normalize`)
      const normalized = rawTenders.map((t) => this.normalizeTender(t))

      // Skip closed tenders (drafts held for review are kept)
      const openTenders = normalized.filter((t) => t.status !== "closed")
      const skipped = normalized.length - openTenders.length

      if (openTenders.length === 0) {
        console.log(`[${this.sourceName}] No open tenders to insert`)
        // Record empty runs too: a scraper that silently finds nothing must be
        // distinguishable from one that has not run.
        await this.logMetrics(0, 0, 0, 0, skipped)
        return { inserted: 0, updated: 0, skipped }
      }

      // Stage 3: Deduplicate and upsert
      try {
        console.log(`[${this.sourceName}] Stage: database-upsert`)

        // Deduplicate by external_ocid (keep last occurrence)
        const uniqueMap = new Map<string, NormalizedTender>()
        for (const tender of openTenders) {
          uniqueMap.set(tender.external_ocid, tender)
        }
        const uniqueTenders = Array.from(uniqueMap.values())
        console.log(`[${this.sourceName}] Deduped ${openTenders.length} to ${uniqueTenders.length} unique tenders`)

        await this.preserveCurationDecisions(uniqueTenders)
        const heldForReview = uniqueTenders.filter((t) => t.curation_status === "pending").length
        if (heldForReview) console.log(`[${this.sourceName}] ${heldForReview} held as non-public drafts pending review`)

        const { data, error } = await this.supabase
          .from("rfqs")
          .upsert(uniqueTenders as never[], { onConflict: "external_ocid" })
          .select("id")

        if (error) {
          throw error
        }

        const count = data?.length || 0
        console.log(`[${this.sourceName}] Inserted/updated ${count} tenders, skipped ${skipped} closed`)

        // Log metrics
        await this.logMetrics(count, 0, 0, openTenders.length - uniqueTenders.length, skipped)

        return { inserted: count, updated: 0, skipped }
      } catch (dbError) {
        const errorObj = this.serializeError(dbError)
        console.error(`[${this.sourceName}] database-upsert failed: ${JSON.stringify(errorObj)}`)

        // Log failure metrics
        await this.logMetrics(0, openTenders.length, 0, 0, skipped, errorObj.message)

        return {
          inserted: 0,
          updated: 0,
          skipped,
          stage: "database-upsert",
          error: errorObj,
        }
      }
    } catch (error) {
      const errorObj = this.serializeError(error)
      console.error(`[${this.sourceName}] unknown stage failed: ${JSON.stringify(errorObj)}`)
      return {
        inserted: 0,
        updated: 0,
        skipped: 0,
        stage: "unknown",
        error: errorObj,
      }
    }
  }

  /**
   * A curation state already recorded on a row (pending review, approved or
   * quarantined) outlives re-collection: the upsert keeps the row's existing
   * visibility, status and curation fields instead of the freshly computed
   * ones. Rows without a curation state ("not_required") are updated as before.
   */
  protected async preserveCurationDecisions(tenders: NormalizedTender[]): Promise<void> {
    for (let offset = 0; offset < tenders.length; offset += 200) {
      const batch = tenders.slice(offset, offset + 200)
      const { data, error } = await this.supabase
        .from("rfqs")
        .select("external_ocid, status, is_public, curation_status, curation_reason")
        .in("external_ocid", batch.map((tender) => tender.external_ocid))
      if (error) throw error

      type Existing = Pick<NormalizedTender, "external_ocid" | "is_public" | "curation_status" | "curation_reason"> & { status: string | null }
      const existingByOcid = new Map(((data ?? []) as Existing[]).map((row) => [row.external_ocid, row]))
      for (const tender of batch) {
        const existing = existingByOcid.get(tender.external_ocid)
        if (!existing?.curation_status || existing.curation_status === "not_required") continue
        // A quarantined row is never public, whatever its stored flag says.
        tender.is_public = existing.curation_status === "quarantined" ? false : existing.is_public
        tender.curation_status = existing.curation_status
        tender.curation_reason = existing.curation_reason
        if (existing.curation_status === "approved") {
          // Approved stays listed while open, even if the item now reads like a notice.
          if (tender.status === "draft") tender.status = "active"
        } else if (existing.status) {
          // Pending and quarantined rows keep their status (a draft stays in the review queue).
          tender.status = existing.status as NormalizedTender["status"]
        }
      }
    }
  }

  /**
   * Log collection metrics to database
   */
  protected async logMetrics(
    imported: number,
    rejected: number,
    incomplete: number,
    duplicated: number,
    stale: number,
    errorMessage?: string,
    durationMs?: number
  ): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.supabase.from("collector_metrics") as any).insert({
        source_name: this.sourceName,
        imported,
        rejected,
        incomplete,
        duplicated,
        stale,
        error_message: errorMessage || null,
        duration_ms: durationMs,
        status: errorMessage ? "failed" : "success",
      })
    } catch (error) {
      console.error(`[${this.sourceName}] Failed to log metrics:`, error)
      // Don't throw - metrics logging failure shouldn't break collection
    }
  }

  /**
   * Serialize error with all diagnostic details
   */
  protected serializeError(error: unknown): {
    name: string
    message: string
    code?: string
    cause?: string
  } {
    if (error instanceof Error) {
      const obj: { name: string; message: string; code?: string; cause?: string } = {
        name: error.name,
        message: error.message,
      }

      // Extract cause details
      if (error.cause) {
        if (typeof error.cause === "object" && error.cause !== null) {
          const cause = error.cause as Record<string, unknown>
          if ("code" in cause) {
            obj.code = String(cause.code)
          }
          if ("errno" in cause || "syscall" in cause) {
            obj.cause = `${cause.syscall || ""} ${cause.code || cause.errno || ""}`.trim()
          }
        } else {
          obj.cause = String(error.cause)
        }
      }

      return obj
    }

    // Handle plain objects (e.g., Supabase errors)
    if (typeof error === "object" && error !== null) {
      const obj = error as Record<string, unknown>
      const result: { name: string; message: string; code?: string; cause?: string } = {
        name: obj.constructor?.name || "Object",
        message: "",
      }

      // Try to extract message from common error properties
      if ("message" in obj) {
        result.message = String(obj.message)
      } else if ("error" in obj) {
        result.message = String(obj.error)
      } else if ("msg" in obj) {
        result.message = String(obj.msg)
      } else {
        result.message = JSON.stringify(obj).substring(0, 200)
      }

      // Extract code if present
      if ("code" in obj) {
        result.code = String(obj.code)
      }

      return result
    }

    return {
      name: typeof error,
      message: String(error),
    }
  }

  /**
   * Helper: Parse date from string
   */
  protected parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null

    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date
      }
    } catch {
      // Fall through
    }

    return null
  }

  /**
   * Helper: Extract numbers from budget string
   */
  protected parseBudget(budgetStr: string | null | undefined): number | null {
    if (!budgetStr) return null

    try {
      const match = budgetStr.match(/[\d,\.]+/)
      if (!match) return null

      const num = parseFloat(match[0].replace(/,/g, ""))
      return isNaN(num) ? null : num
    } catch {
      return null
    }
  }
}

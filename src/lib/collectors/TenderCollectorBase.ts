/**
 * Base class for tender collectors
 * Handles common logic: normalization, date parsing, Supabase insertion
 */

import { createClient } from "@supabase/supabase-js"

export interface RawTender {
  reference_number: string
  title: string
  description?: string | null
  closing_date?: Date | null
  published_date?: Date | null
  source_url: string
  buyer?: string
  estimated_budget?: number | null
}

export interface NormalizedTender {
  external_ocid: string // reference_number
  title: string
  description?: string | null
  closing_date?: string | null // ISO string
  published_date?: string | null // ISO string
  source_url: string
  buyer: string
  source_name: string
  is_external_opportunity: boolean
  is_public: boolean
  status: "active" | "closed"
  estimated_budget?: number | null
}

export abstract class TenderCollectorBase {
  protected sourceName: string
  protected baseUrl: string
  protected supabase: ReturnType<typeof createClient>

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
   * Normalize raw tender to standard format
   */
  protected normalizeTender(raw: RawTender): NormalizedTender {
    const now = new Date()
    const closingDate = raw.closing_date ? new Date(raw.closing_date) : null
    const status = closingDate && closingDate < now ? "closed" : "active"

    return {
      external_ocid: raw.reference_number,
      title: raw.title.substring(0, 200),
      description: raw.description?.substring(0, 2000) || null,
      closing_date: closingDate?.toISOString() || null,
      published_date: raw.published_date?.toISOString() || null,
      source_url: raw.source_url,
      buyer: raw.buyer || "Unknown",
      source_name: this.sourceName,
      is_external_opportunity: true,
      is_public: true,
      status,
      estimated_budget: raw.estimated_budget || null,
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

      // Skip closed tenders
      const openTenders = normalized.filter((t) => t.status === "active")
      const skipped = normalized.length - openTenders.length

      if (openTenders.length === 0) {
        console.log(`[${this.sourceName}] No open tenders to insert`)
        return { inserted: 0, updated: 0, skipped }
      }

      // Stage 3: Upsert
      try {
        console.log(`[${this.sourceName}] Stage: database-upsert`)
        const { data, error } = await this.supabase
          .from("rfqs")
          .upsert(openTenders as never[], { onConflict: "external_ocid" })
          .select("id")

        if (error) {
          throw error
        }

        const count = data?.length || 0
        console.log(`[${this.sourceName}] Inserted/updated ${count} tenders, skipped ${skipped} closed`)

        return { inserted: count, updated: 0, skipped }
      } catch (dbError) {
        const errorObj = this.serializeError(dbError)
        console.error(`[${this.sourceName}] database-upsert failed: ${JSON.stringify(errorObj)}`)
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

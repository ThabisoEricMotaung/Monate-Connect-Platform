import "server-only"

import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Unified query builder for opportunity stats.
 * Used by both homepage stats and tenders API to ensure consistent counts.
 *
 * Key design decisions:
 * - NO curation_status filtering (tenders page is source of truth)
 * - Uses consistent SAST timezone handling
 * - Base query includes all public, active opportunities with closing_date in future
 */

const SOUTH_AFRICA_UTC_OFFSET_MS = 2 * 60 * 60 * 1000

export function getSastAdjustedNow(now = new Date()): Date {
  return new Date(now.getTime() + SOUTH_AFRICA_UTC_OFFSET_MS)
}

export function getSastAdjustedToday(now = new Date()): Date {
  const sastNow = getSastAdjustedNow(now)
  const today = new Date(sastNow)
  today.setUTCHours(0, 0, 0, 0)
  return today
}

/**
 * Calculate closing week end (8 days from now).
 * Used for "closing this week" stats and other time-based calculations.
 */
export function getSouthAfricaClosingWeekEnd(now = new Date()): Date {
  const southAfricaNow = new Date(now.getTime() + SOUTH_AFRICA_UTC_OFFSET_MS)
  const startOfDayAfterWindowUtc = Date.UTC(
    southAfricaNow.getUTCFullYear(),
    southAfricaNow.getUTCMonth(),
    southAfricaNow.getUTCDate() + 8,
  )

  return new Date(startOfDayAfterWindowUtc - SOUTH_AFRICA_UTC_OFFSET_MS - 1)
}

/**
 * Build base opportunity query with unified filters.
 * This ensures both homepage stats and tenders list count the same opportunities.
 */
export function buildBaseOpportunityQuery(
  supabase: SupabaseClient,
  options: {
    now?: Date
    countOnly?: boolean
  } = {}
) {
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()

  if (options.countOnly) {
    return supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("status", "active")
      .gt("closing_date", nowIso)
  }

  return supabase
    .from("rfqs")
    .select("*")
    .eq("is_public", true)
    .eq("status", "active")
    .gt("closing_date", nowIso)
}

/**
 * Build query for a specific date range (used by tenders filtering).
 * Aligns with the base query filters for consistency.
 */
export function buildDateRangeOpportunityQuery(
  supabase: SupabaseClient,
  options: {
    fromDate: Date
    toDate: Date
    countOnly?: boolean
  }
) {
  const { fromDate, toDate, countOnly } = options

  if (countOnly) {
    return supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("status", "active")
      .gte("closing_date", fromDate.toISOString())
      .lte("closing_date", toDate.toISOString())
  }

  return supabase
    .from("rfqs")
    .select("*")
    .eq("is_public", true)
    .eq("status", "active")
    .gte("closing_date", fromDate.toISOString())
    .lte("closing_date", toDate.toISOString())
}

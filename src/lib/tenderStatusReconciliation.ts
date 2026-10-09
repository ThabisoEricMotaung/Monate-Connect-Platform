/**
 * Daily status upkeep for externally sourced tenders (replaces the retired
 * Python reconciliation_daily_status.py).
 *
 * What it does, for rows with is_external_opportunity = true only:
 * - Expiry: an open listing ("active"/"open") whose closing_date has passed
 *   becomes "closed". Listings already drop expired tenders by closing_date;
 *   this keeps status-based counts (e.g. "under evaluation") honest.
 * - closing_soon: true while an open listing closes within CLOSING_SOON_DAYS.
 *
 * What it never does (unlike the Python job it replaces):
 * - touch platform RFQs (is_external_opportunity = false), whose own
 *   workflow statuses (open/awarded/…) must not be rewritten;
 * - reopen anything, or change "draft" (pending review) or "closed" rows;
 * - change is_public or any curation field, so curator decisions stand;
 * - guess a status for rows without a closing date.
 *
 * Date-only deadlines (see southAfricaDateOnlyDeadline) are the last
 * millisecond of their day, so they expire only after that day ends.
 */

export const CLOSING_SOON_DAYS = 7
const OPEN_STATUSES = new Set(["active", "open"])
const DAY_MS = 24 * 60 * 60 * 1000

export interface StatusRow {
  id: number
  status: string | null
  closing_date: string | null
  closing_soon: boolean | null
}

export interface StatusPlan {
  /** Open listings past their deadline: set status "closed", closing_soon false. */
  expire: number[]
  /** Open listings closing within CLOSING_SOON_DAYS not yet flagged. */
  markClosingSoon: number[]
  /** Open listings flagged closing soon that no longer are. */
  clearClosingSoon: number[]
}

export function planStatusReconciliation(rows: StatusRow[], now: Date): StatusPlan {
  const plan: StatusPlan = { expire: [], markClosingSoon: [], clearClosingSoon: [] }
  const soonLimit = now.getTime() + CLOSING_SOON_DAYS * DAY_MS

  for (const row of rows) {
    if (!OPEN_STATUSES.has(String(row.status ?? "").toLowerCase()) || !row.closing_date) continue
    const closing = new Date(row.closing_date).getTime()
    if (Number.isNaN(closing)) continue

    if (closing <= now.getTime()) plan.expire.push(row.id)
    else if (closing <= soonLimit) {
      if (row.closing_soon !== true) plan.markClosingSoon.push(row.id)
    } else if (row.closing_soon === true) plan.clearClosingSoon.push(row.id)
  }
  return plan
}

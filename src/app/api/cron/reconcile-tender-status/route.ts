import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { planStatusReconciliation, type StatusRow } from "@/lib/tenderStatusReconciliation"

/**
 * Daily status upkeep for externally sourced tenders: expiry and closing_soon
 * (rules and limits in src/lib/tenderStatusReconciliation.ts). Replaces the
 * retired Python reconciliation_daily_status.py.
 *
 * ?dryRun=1 reports what would change without writing.
 * Every UPDATE re-checks its condition (external, still open, still past or
 * within the deadline window), so rows changed meanwhile are left alone.
 */
export const dynamic = "force-dynamic"
// Vercel Hobby + Fluid compute maximum. A dry run against ~900 rows took ~5 s.
export const maxDuration = 300

const PAGE_SIZE = 1000
const WRITE_BATCH = 200
const OPEN_STATUSES = ["active", "open", "Active", "Open"]

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
    || request.headers.get("x-cron-secret") === secret
}

function batches(ids: number[]): number[][] {
  const result: number[][] = []
  for (let i = 0; i < ids.length; i += WRITE_BATCH) result.push(ids.slice(i, i + WRITE_BATCH))
  return result
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1"
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const now = new Date()
    const nowIso = now.toISOString()
    const rows: StatusRow[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("rfqs")
        .select("id, status, closing_date, closing_soon")
        .eq("is_external_opportunity", true)
        .in("status", OPEN_STATUSES)
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      rows.push(...((data ?? []) as StatusRow[]))
      if (!data || data.length < PAGE_SIZE) break
    }

    const plan = planStatusReconciliation(rows, now)
    const planned = { expire: plan.expire.length, markClosingSoon: plan.markClosingSoon.length, clearClosingSoon: plan.clearClosingSoon.length }
    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, checked: rows.length, planned, timestamp: nowIso })
    }

    const written = { expire: 0, markClosingSoon: 0, clearClosingSoon: 0 }
    const guarded = (values: Record<string, unknown>, ids: number[]) =>
      supabase
        .from("rfqs")
        .update({ ...values, last_status_check: nowIso })
        .in("id", ids)
        .eq("is_external_opportunity", true)
        .in("status", OPEN_STATUSES)

    for (const ids of batches(plan.expire)) {
      const { data, error } = await guarded({ status: "closed", closing_soon: false }, ids).lte("closing_date", nowIso).select("id")
      if (error) throw error
      written.expire += data?.length ?? 0
    }
    for (const ids of batches(plan.markClosingSoon)) {
      const { data, error } = await guarded({ closing_soon: true }, ids).gt("closing_date", nowIso).select("id")
      if (error) throw error
      written.markClosingSoon += data?.length ?? 0
    }
    for (const ids of batches(plan.clearClosingSoon)) {
      const { data, error } = await guarded({ closing_soon: false }, ids).gt("closing_date", nowIso).select("id")
      if (error) throw error
      written.clearClosingSoon += data?.length ?? 0
    }

    console.log(`[CRON:reconcile-tender-status] checked ${rows.length}; planned ${JSON.stringify(planned)}; written ${JSON.stringify(written)}`)
    return NextResponse.json({ ok: true, checked: rows.length, planned, written, timestamp: nowIso })
  } catch (error) {
    console.error("[CRON:reconcile-tender-status] Failed:", error)
    // Supabase errors are plain objects with a message, not Error instances.
    const message = (error as { message?: string } | null)?.message ?? "Reconciliation failed"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

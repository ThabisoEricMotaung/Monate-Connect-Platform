import { NextResponse } from "next/server"
import type { TenderCollectorBase } from "@/lib/collectors/TenderCollectorBase"
import { EkurhuleniCollector } from "@/lib/collectors/EkurhuleniCollector"
import { CapeownCollector } from "@/lib/collectors/CapeownCollector"
import { CojCollector } from "@/lib/collectors/CojCollector"
import { HealthCollector } from "@/lib/collectors/HealthCollector"
import { DBSACollector } from "@/lib/collectors/DBSACollector"
import { TCTACollector } from "@/lib/collectors/TCTACollector"
import { EskomCollector } from "@/lib/collectors/EskomCollector"
import { SANRALCollector } from "@/lib/collectors/SANRALCollector"

// The project runs on Vercel Hobby with Fluid compute: 300 s is both the
// default and the maximum function duration. Measured fetch + parse for all
// collectors is ~25 s; source requests are capped per request
// (SOURCE_FETCH_TIMEOUT_MS) and by SOURCE_DEADLINE_MS for the whole run, which
// leaves time for the database writes and the response.
export const maxDuration = 300
const SOURCE_DEADLINE_MS = 240_000
// Don't start a collector with less than this left before the deadline.
const MIN_START_BUDGET_MS = 15_000

const COLLECTORS: Array<{ name: string; create: () => TenderCollectorBase }> = [
  { name: "Ekurhuleni", create: () => new EkurhuleniCollector() },
  { name: "Cape Town", create: () => new CapeownCollector() },
  { name: "City of Johannesburg", create: () => new CojCollector() },
  { name: "Department of Health", create: () => new HealthCollector() },
  { name: "DBSA", create: () => new DBSACollector() },
  { name: "TCTA", create: () => new TCTACollector() },
  { name: "Eskom", create: () => new EskomCollector() },
  { name: "SANRAL", create: () => new SANRALCollector() },
]

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
    || request.headers.get("x-cron-secret") === secret
}

/**
 * Daily tender collection endpoint (Vercel Cron)
 * Runs TypeScript-based collectors: Ekurhuleni, Cape Town, Eskom, CoJ, etc.
 * Also triggers eTenders sync-etenders endpoint
 * Scheduled: 0 6 * * * (06:00 UTC = 08:00 SAST daily; Hobby crons fire within that hour)
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()
  const deadline = startTime + SOURCE_DEADLINE_MS
  const results: Record<
    string,
    {
      success: boolean
      inserted?: number
      updated?: number
      skipped?: number
      stage?: string
      durationMs?: number
      error?: { name: string; message: string; code?: string; cause?: string } | string
    }
  > = {}

  try {
    console.log("[CRON:collect-tenders] Starting daily collection at", new Date().toISOString())

    // Each source is independent: a failure, a hung site or an exhausted time
    // budget affects only that source's result.
    for (const { name, create } of COLLECTORS) {
      if (deadline - Date.now() < MIN_START_BUDGET_MS) {
        results[name] = { success: false, stage: "not-started", error: "Time budget exhausted before this collector started" }
        console.warn(`[CRON:${name}] Not started: time budget exhausted`)
        continue
      }
      const collectorStart = Date.now()
      try {
        const collector = create()
        collector.deadline = deadline
        const result = await collector.collect()
        const durationMs = Date.now() - collectorStart
        if (result.error) {
          // Collector reported an error
          results[name] = { success: false, stage: result.stage, error: result.error, durationMs }
          console.log(`[CRON:${name}] Failed at stage ${result.stage}`)
        } else {
          results[name] = { success: true, ...result, durationMs }
          console.log(`[CRON:${name}] Complete in ${durationMs}ms: ${result.inserted} inserted, ${result.skipped} skipped`)
        }
      } catch (error) {
        results[name] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          durationMs: Date.now() - collectorStart,
        }
        console.error(`[CRON:${name}] Exception:`, error)
      }
    }

    const duration = Date.now() - startTime
    const failed = Object.entries(results).filter(([, result]) => !result.success).map(([name]) => name)
    console.log(`[CRON:collect-tenders] Complete in ${duration}ms${failed.length ? `; failed: ${failed.join(", ")}` : ""}`)

    return NextResponse.json({
      // ok: the run completed; per-source success is in `collectors`.
      ok: true,
      failed,
      timestamp: new Date().toISOString(),
      duration,
      collectors: results,
      note: "eTenders collected separately via /api/cron/sync-etenders",
    })
  } catch (error) {
    console.error("[CRON:collect-tenders] Fatal error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Collection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

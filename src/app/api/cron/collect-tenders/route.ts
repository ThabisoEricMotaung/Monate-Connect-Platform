import { NextResponse } from "next/server"
import { EkurhuleniCollector } from "@/lib/collectors/EkurhuleniCollector"
import { CapeownCollector } from "@/lib/collectors/CapeownCollector"

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
 * Scheduled: 0 6 * * * (6 AM SAST daily)
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()
  const results: Record<string, any> = {}

  try {
    console.log("[CRON:collect-tenders] Starting daily collection at", new Date().toISOString())

    // Run TypeScript-based collectors
    const collectors = [
      { name: "Ekurhuleni", collector: new EkurhuleniCollector() },
      { name: "Cape Town", collector: new CapeownCollector() },
      // TODO: Add other collectors as they're migrated
      // { name: "Eskom", collector: new EskomCollector() },
      // { name: "CoJ", collector: new CojCollector() },
      // { name: "DBSA", collector: new DBSACollector() },
      // { name: "TCTA", collector: new TCTACollector() },
      // { name: "SANRAL", collector: new SANRALCollector() },
    ]

    for (const { name, collector } of collectors) {
      try {
        const result = await collector.collect()
        results[name] = { success: true, ...result }
        console.log(`[CRON:${name}] Complete: ${result.inserted} inserted, ${result.skipped} skipped`)
      } catch (error) {
        results[name] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        console.error(`[CRON:${name}] Failed:`, error)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[CRON:collect-tenders] Complete in ${duration}ms`)

    return NextResponse.json({
      ok: true,
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

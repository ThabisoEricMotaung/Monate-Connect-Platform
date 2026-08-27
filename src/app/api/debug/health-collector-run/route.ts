import { NextResponse } from "next/server"
import { HealthCollector } from "@/lib/collectors/HealthCollector"

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  )
}

/**
 * Debug endpoint to run Department of Health collector and return detailed results
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const collector = new HealthCollector()
    const result = await collector.collect()

    return NextResponse.json({
      ok: result.error ? false : true,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      stage: result.stage,
      error: result.error,
      note: result.error ? "Collector reported an error" : "Success",
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      exception: true,
    })
  }
}

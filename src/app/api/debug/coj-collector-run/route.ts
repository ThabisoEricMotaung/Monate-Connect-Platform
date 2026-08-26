import { NextResponse } from "next/server"
import { CojCollector } from "@/lib/collectors/CojCollector"

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  )
}

/**
 * Debug endpoint to run City of Johannesburg collector and return detailed results
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const collector = new CojCollector()
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

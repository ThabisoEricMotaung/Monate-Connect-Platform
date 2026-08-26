import { NextResponse } from "next/server"

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  )
}

/**
 * Debug endpoint to test CoJ fetch and HTML structure
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = "https://joburg.org.za/work_/TendersQuotations/Pages/Tenders.aspx"

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    })

    const html = await response.text()
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []

    // Extract first 3 rows for inspection
    const samples = rows.slice(0, 3).map((row) => {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
      return {
        cellCount: cells.length,
        cells: cells.map((c) => c.replace(/<[^>]*>/g, "").trim().substring(0, 100)),
      }
    })

    return NextResponse.json({
      ok: true,
      status: response.status,
      bytes: html.length,
      rowsFound: rows.length,
      samples,
      htmlPreview: html.substring(0, 2000),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

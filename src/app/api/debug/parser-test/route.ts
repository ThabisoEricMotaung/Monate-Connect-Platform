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
 * Debug endpoint to test Cape Town HTML parsing
 * Fetches the page and attempts to extract tenders
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const url = "https://web1.capetown.gov.za/web1/tenderportal/Tender"

  try {
    // Fetch page
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    })

    const html = await response.text()

    // Test row pattern
    const rows = html.match(/<tr\s+class="gridDetails"[^>]*>[\s\S]*?<\/tr>/gi) || []
    console.log(`[DEBUG:Parser] Found ${rows.length} rows`)

    const extracted = []

    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      const row = rows[i]
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []

      const cellContents = cells.map((c, idx) => ({
        index: idx,
        length: c.length,
        preview: c.substring(0, 100).replace(/\n/g, " "),
      }))

      const ref = cells[0]?.replace(/<[^>]*>/g, "").trim() || "NO_REF"
      const desc = cells[1]?.replace(/<[^>]*>/g, "").trim() || "NO_DESC"
      const dateStr = cells[4]?.replace(/<[^>]*>/g, "").trim() || "NO_DATE"

      extracted.push({
        rowIndex: i,
        cellCount: cells.length,
        reference: ref,
        description: desc.substring(0, 100),
        closingDate: dateStr,
        cellPreviews: cellContents,
      })
    }

    return NextResponse.json({
      ok: true,
      htmlBytes: html.length,
      rowsFound: rows.length,
      samplesExtracted: extracted,
      note: "First 3 rows analyzed",
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

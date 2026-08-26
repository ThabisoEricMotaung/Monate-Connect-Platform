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
 * Debug endpoint to test individual collector fetches
 * GET /api/debug/collector-fetch?source=ekurhuleni
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const source = url.searchParams.get("source")?.toLowerCase()

  if (!source || !["ekurhuleni", "capetown"].includes(source)) {
    return NextResponse.json(
      { ok: false, error: "source must be 'ekurhuleni' or 'capetown'" },
      { status: 400 }
    )
  }

  const urls: Record<string, string> = {
    ekurhuleni: "https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/",
    capetown: "https://web1.capetown.gov.za/web1/tenderportal/Tender",
  }

  const names: Record<string, string> = {
    ekurhuleni: "Ekurhuleni",
    capetown: "Cape Town",
  }

  const sourceUrl = urls[source]
  const sourceName = names[source]

  const startTime = Date.now()

  try {
    console.log(`[DEBUG] Testing ${sourceName} fetch from ${sourceUrl}`)

    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-ZA,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    })

    const contentType = response.headers.get("content-type") || "unknown"
    const contentLength = response.headers.get("content-length")
    const html = await response.text()
    const durationMs = Date.now() - startTime

    return NextResponse.json({
      ok: true,
      source: sourceName,
      requestedUrl: sourceUrl,
      finalUrl: response.url,
      status: response.status,
      statusOk: response.ok,
      contentType,
      bytes: html.length,
      contentLengthHeader: contentLength,
      durationMs,
      preview: html.substring(0, 300),
    })
  } catch (error) {
    const durationMs = Date.now() - startTime

    const errorObj: Record<string, unknown> = {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    }

    if (error instanceof Error && error.cause) {
      if (typeof error.cause === "object" && error.cause !== null) {
        const cause = error.cause as Record<string, unknown>
        if ("code" in cause) {
          errorObj.code = cause.code
        }
        if ("errno" in cause) {
          errorObj.errno = cause.errno
        }
        if ("syscall" in cause) {
          errorObj.syscall = cause.syscall
        }
        if ("hostname" in cause) {
          errorObj.hostname = cause.hostname
        }
        if ("address" in cause) {
          errorObj.address = cause.address
        }
        if ("port" in cause) {
          errorObj.port = cause.port
        }
      } else {
        errorObj.cause = String(error.cause)
      }
    }

    console.error(`[DEBUG] ${sourceName} fetch failed:`, JSON.stringify(errorObj))

    return NextResponse.json({
      ok: false,
      source: sourceName,
      requestedUrl: sourceUrl,
      durationMs,
      error: errorObj,
    })
  }
}

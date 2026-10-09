import { NextResponse } from "next/server"

// Retired. Its only caller (the unmounted UnifiedSupportCenter) was removed,
// and it accepted unauthenticated database writes. It now answers 410 and
// writes nothing. Restore it only with verified authentication.
function gone() {
  return NextResponse.json(
    { ok: false, error: "This feedback endpoint has been retired." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}

export const GET = gone
export const POST = gone

import { NextResponse } from "next/server"

// Retired. Thuso is served only by /api/thuso/chat, which verifies the
// session and enforces record access. This route used to call the model for
// anyone, so it now answers 410 without doing any work.
function gone() {
  return NextResponse.json(
    { error: "This assistant endpoint has been retired." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}

export const GET = gone
export const POST = gone

import { NextResponse } from "next/server"
import { processMiningRecomputeQueue } from "@/lib/miningRecomputeQueue"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`)
}

async function processRequest(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Supabase service role client is not configured." }, { status: 500 })
  }

  try {
    const summary = await processMiningRecomputeQueue(supabaseAdmin, 20)
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mining recompute queue processing failed."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return processRequest(request)
}

// Vercel Cron invokes configured paths with GET. POST remains available for
// explicit operational calls using the same CRON_SECRET authorization.
export async function GET(request: Request) {
  return processRequest(request)
}

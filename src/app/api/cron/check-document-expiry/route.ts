import { NextResponse } from "next/server"
import { processExpiringDocuments } from "@/lib/expiryNotifications"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  )
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role client is not configured." },
      { status: 500 },
    )
  }

  try {
    const result = await processExpiringDocuments(30, supabaseAdmin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document expiry check failed."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

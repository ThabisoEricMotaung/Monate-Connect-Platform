import { NextResponse } from "next/server"
import { runContractExpiryCheck } from "@/lib/automationRules"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 })

  // The manual "Run Contract Expiry Check" button on /dashboard/admin/automation
  // calls runContractExpiryCheck() with no argument, defaulting to the
  // RLS-bound browser client under the admin's session. This cron has no
  // session, so it must pass the service-role client explicitly -- every
  // Supabase call inside runContractExpiryCheck/notifyContractExpiring
  // threads this same client through.
  const result = await runContractExpiryCheck(supabaseAdmin)
  return NextResponse.json(result)
}

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 })

  const { data, error } = await supabaseAdmin.rpc("expire_verification_attestations")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

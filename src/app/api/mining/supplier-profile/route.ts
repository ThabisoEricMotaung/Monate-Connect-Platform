import { NextResponse } from "next/server"
import { enqueueSupplierMiningRecomputes } from "@/lib/miningRecomputeQueue"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import type { MiningSupplierProfile } from "@/types/mining"

const MUTABLE_FIELDS = [
  "black_ownership_pct",
  "black_women_ownership_pct",
  "youth_ownership_pct",
  "hdp_ownership_pct",
  "entity_size",
  "is_sa_manufacturer",
  "sabs_certified",
  "sabs_certificate_url",
  "province",
  "district_municipality",
  "local_municipality",
  "mining_charter_category",
  "bbee_level",
  "bbee_certificate_url",
  "bbee_certificate_expiry",
] as const satisfies readonly (keyof MiningSupplierProfile)[]

export async function PUT(request: Request) {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 500 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "A JSON profile payload is required." }, { status: 400 })

  const changes = Object.fromEntries(MUTABLE_FIELDS.filter((key) => key in body).map((key) => [key, body[key]]))
  const { data, error } = await supabaseAdmin
    .from("mining_supplier_profiles")
    .upsert({ supplier_id: auth.user.id, ...changes }, { onConflict: "supplier_id" })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  try {
    await enqueueSupplierMiningRecomputes(auth.user.id, "profile_updated")
  } catch (enqueueError) {
    return NextResponse.json(
      { profile: data, warning: enqueueError instanceof Error ? enqueueError.message : "Eligibility enqueue failed." },
      { status: 202 },
    )
  }

  return NextResponse.json({ profile: data })
}

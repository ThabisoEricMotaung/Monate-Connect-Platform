import { NextResponse } from "next/server"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: Request) {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 500 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.mine_group || !body?.operation_name || !body?.province) {
    return NextResponse.json({ error: "Mine group, operation name, and province are required." }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("mine_operations")
    .insert({
      mine_group: body.mine_group,
      operation_name: body.operation_name,
      commodity: body.commodity || null,
      province: body.province,
      district_municipality: body.district_municipality || null,
      local_municipality: body.local_municipality || null,
      host_communities: Array.isArray(body.host_communities) ? body.host_communities : [],
      procurement_system: body.procurement_system || null,
      procurement_portal_url: body.procurement_portal_url || null,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ mine_operation: data }, { status: 201 })
}

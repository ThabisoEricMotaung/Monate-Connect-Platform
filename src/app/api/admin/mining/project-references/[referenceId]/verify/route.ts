import { NextResponse } from "next/server"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"
import { enqueueSupplierMiningRecomputes } from "@/lib/miningRecomputeQueue"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ referenceId: string }> },
) {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 500 })

  const { referenceId } = await params
  const body = (await request.json().catch(() => null)) as { action?: unknown } | null
  const action = body?.action === "reject" ? "reject" : body?.action === "verify" ? "verify" : null
  if (!action) return NextResponse.json({ error: "Action must be verify or reject." }, { status: 400 })

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("mining_project_references")
    .select("id, supplier_id, status")
    .eq("id", referenceId)
    .maybeSingle()
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })
  if (!existing) return NextResponse.json({ error: "Mining project reference not found." }, { status: 404 })
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Only pending project references can be reviewed." }, { status: 409 })
  }

  const nextStatus = action === "verify" ? "verified" : "rejected"
  const { data, error } = await supabaseAdmin
    .from("mining_project_references")
    .update({
      status: nextStatus,
      verified_by: auth.user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", referenceId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "This reference has already been reviewed." }, { status: 409 })

  if (nextStatus === "verified") {
    await enqueueSupplierMiningRecomputes(existing.supplier_id, "reference_verified")
  }
  return NextResponse.json({ project_reference: data })
}

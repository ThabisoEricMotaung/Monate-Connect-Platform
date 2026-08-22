import { NextResponse } from "next/server"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"
import { enqueueSupplierMiningRecomputes } from "@/lib/miningRecomputeQueue"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ referenceId: string }> },
) {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 500 })

  const { referenceId } = await params
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("mining_project_references")
    .select("id, supplier_id, status")
    .eq("id", referenceId)
    .maybeSingle()
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })
  if (!existing) return NextResponse.json({ error: "Mining project reference not found." }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from("mining_project_references")
    .update({ status: "verified" })
    .eq("id", referenceId)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (existing.status !== "verified") {
    await enqueueSupplierMiningRecomputes(existing.supplier_id, "reference_verified")
  }
  return NextResponse.json({ project_reference: data })
}

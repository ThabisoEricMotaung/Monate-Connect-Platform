import { NextResponse } from "next/server"
import { recomputeSupplierMiningEligibility } from "@/lib/miningEligibility"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 500 })

  const { documentId } = await params
  const { data, error } = await supabaseAdmin
    .from("mining_compliance_documents")
    .update({ status: "verified", reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", documentId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await recomputeSupplierMiningEligibility(data.supplier_id)
  return NextResponse.json({ document: data })
}

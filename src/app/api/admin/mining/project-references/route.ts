import { NextResponse } from "next/server"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 500 })

  const { data: references, error } = await supabaseAdmin
    .from("mining_project_references")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const supplierIds = [...new Set((references ?? []).map((reference) => reference.supplier_id))]
  const { data: profiles, error: profilesError } = supplierIds.length
    ? await supabaseAdmin.from("profiles").select("id, business_name, full_name, email").in("id", supplierIds)
    : { data: [], error: null }
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 400 })

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return NextResponse.json({
    project_references: (references ?? []).map((reference) => ({
      ...reference,
      supplier: profilesById.get(reference.supplier_id) ?? null,
    })),
  })
}

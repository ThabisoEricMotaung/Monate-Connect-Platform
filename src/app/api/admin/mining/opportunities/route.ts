import { after, NextResponse } from "next/server"
import { recomputeOpportunityMiningEligibility } from "@/lib/miningEligibility"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: Request) {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase service client is not configured." }, { status: 500 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.title) return NextResponse.json({ error: "title is required." }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("mining_opportunities")
    .insert({
      mine_operation_id: body.mine_operation_id ?? null,
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? null,
      source_url: body.source_url ?? null,
      closing_date: body.closing_date ?? null,
      eligibility_rules: body.eligibility_rules ?? {},
      status: body.status ?? "open",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  after(async () => {
    try {
      await recomputeOpportunityMiningEligibility(data.id)
    } catch (recomputeError) {
      console.error("Mining opportunity eligibility batch failed", recomputeError)
    }
  })

  return NextResponse.json({ opportunity: data, eligibility_recompute: "queued" }, { status: 201 })
}

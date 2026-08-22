import { NextResponse } from "next/server"
import { computeMiningEligibility } from "@/lib/miningEligibility"
import { authenticateMiningRequest } from "@/lib/miningApiAuth"

export async function POST(request: Request) {
  const auth = await authenticateMiningRequest()
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.error === "Authentication required." ? 401 : 500 })

  const body = (await request.json().catch(() => null)) as
    | { supplier_id?: string; opportunity_id?: string }
    | null
  const supplierId = body?.supplier_id ?? auth.user.id
  if (!body?.opportunity_id) {
    return NextResponse.json({ error: "opportunity_id is required." }, { status: 400 })
  }
  if (supplierId !== auth.user.id && auth.role !== "admin") {
    return NextResponse.json({ error: "You can only compute your own eligibility." }, { status: 403 })
  }

  try {
    const result = await computeMiningEligibility(supplierId, body.opportunity_id)
    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Eligibility computation failed." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getCanonicalSupplierSmartScoreBatch } from "@/lib/supplierScoring"

type RouteContext = { params: Promise<{ id: string }> }

const CORE_CHECKS = new Set(["csd", "bbbee", "tax", "banking"])

export async function GET(_request: Request, context: RouteContext) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const { id } = await context.params
  const rfqId = Number(id)
  if (!Number.isInteger(rfqId) || rfqId <= 0) {
    return NextResponse.json({ error: "Invalid RFQ reference." }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const [profileResult, rfqResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("rfqs").select("id, created_by").eq("id", rfqId).maybeSingle(),
  ])
  if (profileResult.error || rfqResult.error) {
    return NextResponse.json({ error: "RFQ access could not be verified." }, { status: 500 })
  }
  if (!rfqResult.data) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 })
  }

  const role = String(profileResult.data?.role ?? "").toLowerCase()
  const isAdmin = role === "admin"
  const isOwningBuyer = role === "buyer" && rfqResult.data.created_by === user.id
  if (!isAdmin && !isOwningBuyer) {
    return NextResponse.json({ error: "RFQ owner or admin access required." }, { status: 403 })
  }

  const quoteResult = await supabaseAdmin
    .from("quotes")
    .select("supplier_id")
    .eq("rfq_id", rfqId)
  if (quoteResult.error) {
    return NextResponse.json({ error: "Quoting suppliers could not be loaded." }, { status: 500 })
  }

  const supplierIds = Array.from(new Set(
    (quoteResult.data ?? []).map((quote) => quote.supplier_id).filter((value): value is string => Boolean(value))
  ))

  try {
    const canonicalScores = await getCanonicalSupplierSmartScoreBatch({
      supplierIds,
      client: supabaseAdmin,
    })
    const scores = supplierIds.flatMap((supplierId) => {
      const score = canonicalScores[supplierId]
      if (!score) return []
      const core = (score.result.breakdown ?? []).filter((item) => CORE_CHECKS.has(item.key))
      const approvedCoreChecks = core.filter((item) => item.status === "earned").length
      const hasPendingCoreCheck = core.some((item) => item.status === "pending")
      const verification = approvedCoreChecks === core.length && core.length > 0
        ? "verified"
        : hasPendingCoreCheck
          ? "under_review"
          : approvedCoreChecks > 0
            ? "partially_verified"
            : "unverified"

      return [{
        supplierId,
        smartScore: score.result.score,
        smartScoreLabel: score.result.label,
        verification,
        approvedCoreChecks,
        totalCoreChecks: core.length,
      }]
    })

    return NextResponse.json({ scores }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[quote-supplier-scores] Canonical score load failed", { rfqId, error })
    return NextResponse.json({ error: "Supplier SmartScore data failed to load." }, { status: 500 })
  }
}

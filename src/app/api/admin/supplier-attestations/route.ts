import { NextResponse } from "next/server"
import { authenticateReviewer } from "@/lib/adminReviewAuth"
import { reviewErrorStatus } from "@/lib/supplierReview"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type Body = {
  profileId?: string
  category?: string
  decision?: string
  reason?: string | null
  evidenceReference?: string | null
  expiresAt?: string | null
  expectedReviewedAt?: string | null
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 })
  }
  const auth = await authenticateReviewer(request, supabaseAdmin)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!body.profileId || body.category !== "director" || !["approved", "rejected", "revoked"].includes(body.decision ?? "")) {
    return NextResponse.json({ error: "Invalid attestation review." }, { status: 422 })
  }

  const { data, error } = await supabaseAdmin.rpc("review_verification_attestation", {
    p_profile_id: body.profileId,
    p_reviewer_id: auth.user.id,
    p_category: body.category,
    p_decision: body.decision,
    p_reason: body.reason ?? null,
    p_evidence_reference: body.evidenceReference ?? null,
    p_expires_at: body.expiresAt ?? null,
    p_expected_reviewed_at: body.expectedReviewedAt ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: reviewErrorStatus(error) })
  return NextResponse.json(data)
}

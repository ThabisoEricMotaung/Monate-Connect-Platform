import { NextResponse } from "next/server"
import { authenticateReviewer } from "@/lib/adminReviewAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  reviewErrorStatus,
  validateSupplierDocumentReviewRequest,
  type SupplierDocumentReviewResult,
} from "@/lib/supplierReview"

type Props = { params: Promise<{ documentId: string }> }

export async function POST(request: Request, { params }: Props) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const auth = await authenticateReviewer(request, supabaseAdmin)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }
  const parsed = validateSupplierDocumentReviewRequest(rawBody)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 })

  const { documentId } = await params
  const { data, error } = await supabaseAdmin.rpc("review_supplier_document", {
    p_document_id: documentId,
    p_reviewer_id: auth.user.id,
    p_expected_status: parsed.value.expectedStatus,
    p_expected_reviewed_at: parsed.value.expectedReviewedAt,
    p_decision: parsed.value.decision,
    p_reason: parsed.value.reason ?? null,
    p_expiry_date: parsed.value.expiryDate ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: reviewErrorStatus(error) })
  }
  return NextResponse.json(data as SupplierDocumentReviewResult)
}

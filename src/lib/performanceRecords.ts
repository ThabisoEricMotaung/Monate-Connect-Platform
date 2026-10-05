/**
 * Performance Records Library
 * Manages supplier performance concerns with contextual assessment
 * Aligns with Bergstan judgment: poor performance is relevant but not automatically disqualifying
 */

import { SupabaseClient } from "@supabase/supabase-js"

export type ConcernType =
  | "delivery_delay"
  | "quality_defect"
  | "non_compliance"
  | "safety_breach"
  | "financial_issue"
  | "subcontractor_default"
  | "other"

export type Severity = "critical" | "major" | "minor"
export type RecordStatus = "open" | "under_review" | "resolved" | "disputed" | "dismissed" | "under_appeal"
export type ResponseStatus = "acknowledged" | "under_review" | "accepted" | "rejected" | "requires_clarification"
export type EvidenceType = "correspondence" | "invoice" | "inspection_report" | "legal_notice" | "other"

export type DeliveryRiskAssessment = "low" | "medium" | "high" | "critical" | "unknown"
export type ResolutionOutcome =
  | "accepted_supplier_explanation"
  | "issue_resolved_by_supplier"
  | "compensation_agreed"
  | "contract_terminated"
  | "dismissed_as_unfounded"
  | "escalated_to_legal"
  | "pending"

export type SupplierPerformanceRecord = {
  id: string
  supplier_id: string
  buyer_id: string
  source_contract_title?: string | null
  source_contract_reference?: string | null
  source_tender_id?: string | null
  concern_type: ConcernType
  severity: Severity
  description: string
  documented_evidence_url?: string | null
  evidence_type?: EvidenceType | null
  date_occurred?: string | null
  date_reported: string
  buyer_notes?: string | null
  status: RecordStatus
  created_at: string
  updated_at: string
  created_by?: string | null
}

export type PerformanceResponse = {
  id: string
  performance_record_id: string
  supplier_id: string
  response_text: string
  dispute_claim: boolean
  evidence_url?: string | null
  evidence_type?: EvidenceType | null
  corrective_actions_taken?: string | null
  corrective_actions_planned?: string | null
  timeline_for_resolution?: string | null
  response_date: string
  response_status: ResponseStatus
  admin_notes?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

export type PerformanceResolution = {
  id: string
  performance_record_id: string
  supplier_id: string
  final_assessment?: string | null
  delivery_risk_assessment: DeliveryRiskAssessment
  resolution_outcome: ResolutionOutcome
  resolution_notes?: string | null
  under_appeal: boolean
  appeal_reason?: string | null
  appeal_filed_date?: string | null
  appeal_decision?: string | null
  appeal_resolved_date?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  systemic_issue_identified: boolean
  systemic_issue_notes?: string | null
  created_at: string
  updated_at: string
}

/**
 * Create a performance concern (buyer submission)
 */
export async function submitPerformanceConcern(
  supabase: SupabaseClient,
  concern: Omit<SupplierPerformanceRecord, "id" | "created_at" | "updated_at" | "status">,
  createdBy: string
): Promise<{ ok: true; record: SupplierPerformanceRecord } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from("supplier_performance_records")
      .insert({
        ...concern,
        status: "open",
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    // Log audit
    await logPerformanceAudit(supabase, data.id, "created", "buyer", "concern", "Performance concern submitted")

    return { ok: true, record: data as SupplierPerformanceRecord }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Get all performance records for a supplier
 */
export async function getSupplierPerformanceRecords(
  supabase: SupabaseClient,
  supplierId: string,
  filters?: { status?: RecordStatus; concernType?: ConcernType }
): Promise<SupplierPerformanceRecord[]> {
  let query = supabase
    .from("supplier_performance_records")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.concernType) {
    query = query.eq("concern_type", filters.concernType)
  }

  const { data } = await query
  return (data as SupplierPerformanceRecord[]) || []
}

/**
 * Get a single performance record with responses and resolution
 */
export async function getPerformanceRecordDetail(
  supabase: SupabaseClient,
  recordId: string
): Promise<
  | {
      record: SupplierPerformanceRecord
      response?: PerformanceResponse | null
      resolution?: PerformanceResolution | null
    }
  | { ok: false; error: string }
> {
  try {
    const [recordRes, responseRes, resolutionRes] = await Promise.all([
      supabase.from("supplier_performance_records").select("*").eq("id", recordId).single(),
      supabase.from("performance_responses").select("*").eq("performance_record_id", recordId).single(),
      supabase.from("performance_resolution").select("*").eq("performance_record_id", recordId).single(),
    ])

    if (recordRes.error) return { ok: false, error: recordRes.error.message }

    return {
      record: recordRes.data as SupplierPerformanceRecord,
      response: (responseRes.data as PerformanceResponse) || null,
      resolution: (resolutionRes.data as PerformanceResolution) || null,
    }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Supplier responds to a performance concern
 */
export async function submitPerformanceResponse(
  supabase: SupabaseClient,
  recordId: string,
  supplierId: string,
  response: Omit<PerformanceResponse, "id" | "created_at" | "updated_at" | "response_status" | "response_date" | "performance_record_id" | "supplier_id">
): Promise<{ ok: true; response: PerformanceResponse } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from("performance_responses")
      .insert({
        performance_record_id: recordId,
        supplier_id: supplierId,
        ...response,
        response_status: "acknowledged",
        response_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    // Update parent record status
    await supabase
      .from("supplier_performance_records")
      .update({ status: "under_review" })
      .eq("id", recordId)

    // Log audit
    await logPerformanceAudit(supabase, recordId, "response_added", "supplier", "under_review", response.dispute_claim ? "Supplier disputes concern" : "Supplier responded")

    return { ok: true, response: data as PerformanceResponse }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Admin assesses performance response
 */
export async function reviewPerformanceResponse(
  supabase: SupabaseClient,
  responseId: string,
  status: ResponseStatus,
  notes?: string,
  reviewedBy?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: response, error: fetchError } = await supabase
      .from("performance_responses")
      .select("performance_record_id")
      .eq("id", responseId)
      .single()

    if (fetchError) return { ok: false, error: fetchError.message }

    const { error } = await supabase
      .from("performance_responses")
      .update({
        response_status: status,
        admin_notes: notes,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", responseId)

    if (error) return { ok: false, error: error.message }

    // Log audit
    await logPerformanceAudit(
      supabase,
      response.performance_record_id,
      "status_changed",
      "admin",
      status,
      `Response reviewed: ${status}`
    )

    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Resolve a performance record
 */
export async function resolvePerformanceRecord(
  supabase: SupabaseClient,
  recordId: string,
  resolution: Omit<PerformanceResolution, "id" | "performance_record_id" | "supplier_id" | "created_at" | "updated_at">,
  resolvedBy: string
): Promise<{ ok: true; resolution: PerformanceResolution } | { ok: false; error: string }> {
  try {
    // Get the supplier_id first
    const { data: record, error: recordError } = await supabase
      .from("supplier_performance_records")
      .select("supplier_id")
      .eq("id", recordId)
      .single()

    if (recordError) return { ok: false, error: recordError.message }

    const { data, error } = await supabase
      .from("performance_resolution")
      .insert({
        performance_record_id: recordId,
        supplier_id: record.supplier_id,
        ...resolution,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    // Update parent record status
    const newStatus = resolution.under_appeal ? "under_appeal" : "resolved"
    await supabase.from("supplier_performance_records").update({ status: newStatus }).eq("id", recordId)

    // Log audit
    await logPerformanceAudit(supabase, recordId, "resolved", "admin", newStatus, resolution.final_assessment)

    return { ok: true, resolution: data as PerformanceResolution }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * File an appeal on a resolved performance record
 */
export async function appealPerformanceResolution(
  supabase: SupabaseClient,
  resolutionId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: resolution, error: fetchError } = await supabase
      .from("performance_resolution")
      .select("performance_record_id")
      .eq("id", resolutionId)
      .single()

    if (fetchError) return { ok: false, error: fetchError.message }

    const { error } = await supabase
      .from("performance_resolution")
      .update({
        under_appeal: true,
        appeal_reason: reason,
        appeal_filed_date: new Date().toISOString(),
      })
      .eq("id", resolutionId)

    if (error) return { ok: false, error: error.message }

    // Update parent record
    await supabase
      .from("supplier_performance_records")
      .update({ status: "under_appeal" })
      .eq("id", resolution.performance_record_id)

    // Log audit
    await logPerformanceAudit(supabase, resolution.performance_record_id, "appealed", "supplier", "under_appeal", reason)

    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Audit log helper
 */
async function logPerformanceAudit(
  supabase: SupabaseClient,
  recordId: string,
  action: "created" | "status_changed" | "response_added" | "resolved" | "appealed" | "appeal_resolved" | "dismissed",
  actorType: "supplier" | "buyer" | "admin",
  toStatus?: string,
  notes?: string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  await supabase.from("performance_audit").insert({
    performance_record_id: recordId,
    action,
    actor_id: user.user?.id,
    actor_type: actorType,
    to_status: toStatus,
    notes,
  })
}

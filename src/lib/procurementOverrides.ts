import { supabase } from "./supabase"
import { logAuditAction } from "./audit"

// ─── Types ────────────────────────────────────────────────────────────────────

export type OverrideStatus = "Requested" | "Approved" | "Rejected"

export type ProcurementOverride = {
  id: number
  entity_type: string | null
  entity_id: string | null
  blocked_reason: string | null
  override_reason: string | null
  requested_by: string | null
  requested_by_email: string | null
  approved_by: string | null
  approved_by_email: string | null
  status: string | null
  created_at: string | null
  approved_at: string | null
}

export type RequestOverrideInput = {
  entity_type: string
  entity_id: string
  blocked_reason: string
  override_reason: string
  requested_by?: string | null
  requested_by_email?: string | null
}

// ─── Safe helper ──────────────────────────────────────────────────────────────

function isTableMissing(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("does not exist") ||
    error?.message?.includes("relation")
  )
}

// ─── requestOverride ──────────────────────────────────────────────────────────

export async function requestOverride(
  input: RequestOverrideInput
): Promise<ProcurementOverride | null> {
  if (!supabase) return null

  try {
    // Get current user if email/id not provided
    let requestedBy = input.requested_by
    let requestedEmail = input.requested_by_email

    if (!requestedBy || !requestedEmail) {
      const { data: { user } } = await supabase.auth.getUser()
      requestedBy = requestedBy ?? user?.id ?? null
      requestedEmail = requestedEmail ?? user?.email ?? null
    }

    const { data, error } = await supabase
      .from("procurement_overrides")
      .insert([{
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        blocked_reason: input.blocked_reason.trim(),
        override_reason: input.override_reason.trim(),
        requested_by: requestedBy,
        requested_by_email: requestedEmail,
        status: "Requested",
      }])
      .select("*")
      .single()

    if (error) {
      if (isTableMissing(error)) {
        console.warn("[procurementOverrides] Table not found. Run SQL migration.")
        return null
      }
      console.warn("[procurementOverrides] requestOverride failed:", error.message)
      return null
    }

    try {
      await logAuditAction({
        action: "override.requested",
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        old_values: null,
        new_values: { override_reason: input.override_reason, blocked_reason: input.blocked_reason },
        metadata: { requested_by_email: requestedEmail, override_id: data.id },
      })
    } catch { /* never block */ }

    return data as ProcurementOverride
  } catch (err) {
    console.warn("[procurementOverrides] requestOverride threw:", err)
    return null
  }
}

// ─── approveOverride ──────────────────────────────────────────────────────────

export async function approveOverride(
  id: number,
  approvedById?: string | null,
  approvedByEmail?: string | null
): Promise<ProcurementOverride | null> {
  if (!supabase) return null

  try {
    let finalApproverId = approvedById
    let finalApproverEmail = approvedByEmail

    if (!finalApproverId || !finalApproverEmail) {
      const { data: { user } } = await supabase.auth.getUser()
      finalApproverId = finalApproverId ?? user?.id ?? null
      finalApproverEmail = finalApproverEmail ?? user?.email ?? null
    }

    const { data, error } = await supabase
      .from("procurement_overrides")
      .update({
        status: "Approved",
        approved_by: finalApproverId,
        approved_by_email: finalApproverEmail,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.warn("[procurementOverrides] approveOverride failed:", error.message)
      return null
    }

    const rec = data as ProcurementOverride

    try {
      await logAuditAction({
        action: "override.approved",
        entity_type: rec.entity_type ?? "unknown",
        entity_id: rec.entity_id,
        old_values: { status: "Requested" },
        new_values: { status: "Approved" },
        metadata: {
          approved_by_email: finalApproverEmail,
          override_id: id,
          override_reason: rec.override_reason,
          blocked_reason: rec.blocked_reason,
        },
      })
    } catch { /* never block */ }

    return rec
  } catch (err) {
    console.warn("[procurementOverrides] approveOverride threw:", err)
    return null
  }
}

// ─── rejectOverride ───────────────────────────────────────────────────────────

export async function rejectOverride(
  id: number,
  approvedById?: string | null,
  approvedByEmail?: string | null
): Promise<ProcurementOverride | null> {
  if (!supabase) return null

  try {
    let finalId = approvedById
    let finalEmail = approvedByEmail

    if (!finalId || !finalEmail) {
      const { data: { user } } = await supabase.auth.getUser()
      finalId = finalId ?? user?.id ?? null
      finalEmail = finalEmail ?? user?.email ?? null
    }

    const { data, error } = await supabase
      .from("procurement_overrides")
      .update({
        status: "Rejected",
        approved_by: finalId,
        approved_by_email: finalEmail,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.warn("[procurementOverrides] rejectOverride failed:", error.message)
      return null
    }

    const rec = data as ProcurementOverride

    try {
      await logAuditAction({
        action: "override.rejected",
        entity_type: rec.entity_type ?? "unknown",
        entity_id: rec.entity_id,
        old_values: { status: "Requested" },
        new_values: { status: "Rejected" },
        metadata: { rejected_by_email: finalEmail, override_id: id },
      })
    } catch { /* never block */ }

    return rec
  } catch (err) {
    console.warn("[procurementOverrides] rejectOverride threw:", err)
    return null
  }
}

// ─── getOverrides ─────────────────────────────────────────────────────────────

export async function getOverrides(filters?: {
  status?: string
  entity_type?: string
}): Promise<ProcurementOverride[]> {
  if (!supabase) return []

  try {
    let query = supabase
      .from("procurement_overrides")
      .select("*")
      .order("created_at", { ascending: false })

    if (filters?.status) query = query.eq("status", filters.status)
    if (filters?.entity_type) query = query.eq("entity_type", filters.entity_type)

    const { data, error } = await query

    if (error) {
      if (isTableMissing(error)) return []
      console.warn("[procurementOverrides] getOverrides failed:", error.message)
      return []
    }

    return (data ?? []) as ProcurementOverride[]
  } catch {
    return []
  }
}

// ─── checkApprovedOverride ────────────────────────────────────────────────────

/**
 * Returns the most recent approved override for the given entity, or null.
 * Use this to check whether a blocked action can proceed.
 */
export async function checkApprovedOverride(
  entityType: string,
  entityId: string
): Promise<ProcurementOverride | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("procurement_overrides")
      .select("id, entity_type, entity_id, override_reason, approved_by_email, approved_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "Approved")
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (!isTableMissing(error)) {
        console.warn("[procurementOverrides] checkApprovedOverride:", error.message)
      }
      return null
    }

    return (data as ProcurementOverride | null) ?? null
  } catch {
    return null
  }
}

// ─── getOverrideForEntity ─────────────────────────────────────────────────────

/**
 * Get the most recent override (any status) for a specific entity.
 */
export async function getOverrideForEntity(
  entityType: string,
  entityId: string
): Promise<ProcurementOverride | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("procurement_overrides")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return null
    return (data as ProcurementOverride | null) ?? null
  } catch {
    return null
  }
}

/**
 * Supplier Related Entities Library
 * Manages directors, beneficial owners, and linked enterprises with evidence provenance
 */

import { SupabaseClient } from "@supabase/supabase-js"

export type EntityType = "director" | "beneficial_owner" | "linked_supplier" | "shareholder" | "other"
export type EvidenceType =
  | "self_disclosed"
  | "csd"
  | "cipc"
  | "cidb"
  | "sars"
  | "dha"
  | "user_uploaded"
  | "verified_independent"
export type DisputeStatus = "none" | "disputed_by_supplier" | "under_review" | "resolved"

export type LinkType =
  | "common_director"
  | "common_shareholder"
  | "common_beneficial_owner"
  | "parent_subsidiary"
  | "related_entity"
  | "joint_venture"
  | "other"
export type LinkStrength = "strong" | "medium" | "weak"

export type SupplierRelatedEntity = {
  id: string
  supplier_id: string
  entity_type: EntityType
  entity_id?: string | null
  entity_name: string
  entity_registration_number?: string | null
  relationship_description?: string | null
  evidence_type?: EvidenceType | null
  evidence_url?: string | null
  evidence_uploaded_at?: string | null
  verified: boolean
  verified_by?: string | null
  verified_at?: string | null
  verification_notes?: string | null
  dispute_status: DisputeStatus
  dispute_notes?: string | null
  created_at: string
  updated_at: string
}

export type EnterpriseLink = {
  id: string
  source_supplier_id: string
  target_supplier_id: string
  link_type: LinkType
  strength: LinkStrength
  evidence_url?: string | null
  evidence_verified: boolean
  verified_by?: string | null
  verified_at?: string | null
  verification_notes?: string | null
  created_at: string
  updated_at: string
}

/**
 * Add a related entity (director, beneficial owner, etc.) to a supplier's profile
 */
export async function addSupplierRelatedEntity(
  supabase: SupabaseClient,
  supplierId: string,
  entity: Omit<SupplierRelatedEntity, "id" | "supplier_id" | "created_at" | "updated_at" | "verified" | "verified_by" | "verified_at">
): Promise<{ ok: true; entity: SupplierRelatedEntity } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from("supplier_related_entities")
      .insert({
        supplier_id: supplierId,
        ...entity,
        verified: false,
        dispute_status: "none",
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, entity: data as SupplierRelatedEntity }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Get all related entities for a supplier
 */
export async function getSupplierRelatedEntities(
  supabase: SupabaseClient,
  supplierId: string,
  filters?: { verified?: boolean; entityType?: EntityType }
): Promise<SupplierRelatedEntity[]> {
  let query = supabase.from("supplier_related_entities").select("*").eq("supplier_id", supplierId)

  if (filters?.verified !== undefined) {
    query = query.eq("verified", filters.verified)
  }
  if (filters?.entityType) {
    query = query.eq("entity_type", filters.entityType)
  }

  const { data } = await query.order("created_at", { ascending: false })
  return (data as SupplierRelatedEntity[]) || []
}

/**
 * Find enterprise links for a supplier (both directions)
 */
export async function getEnterpriseLinksForSupplier(
  supabase: SupabaseClient,
  supplierId: string
): Promise<{ outbound: EnterpriseLink[]; inbound: EnterpriseLink[] }> {
  const [outboundRes, inboundRes] = await Promise.all([
    supabase.from("enterprise_links").select("*").eq("source_supplier_id", supplierId),
    supabase.from("enterprise_links").select("*").eq("target_supplier_id", supplierId),
  ])

  return {
    outbound: (outboundRes.data as EnterpriseLink[]) || [],
    inbound: (inboundRes.data as EnterpriseLink[]) || [],
  }
}

/**
 * Link two suppliers (e.g., common director, parent-subsidiary)
 */
export async function createEnterpriseLink(
  supabase: SupabaseClient,
  sourceId: string,
  targetId: string,
  linkType: LinkType,
  strength: LinkStrength = "medium",
  evidenceUrl?: string
): Promise<{ ok: true; link: EnterpriseLink } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from("enterprise_links")
      .insert({
        source_supplier_id: sourceId,
        target_supplier_id: targetId,
        link_type: linkType,
        strength,
        evidence_url: evidenceUrl,
        evidence_verified: false,
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, link: data as EnterpriseLink }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Verify/approve a related entity disclosure
 */
export async function verifyRelatedEntity(
  supabase: SupabaseClient,
  entityId: string,
  verifiedBy: string,
  notes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await supabase
      .from("supplier_related_entities")
      .update({
        verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        verification_notes: notes,
      })
      .eq("id", entityId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Supplier disputes a related entity
 */
export async function disputeRelatedEntity(
  supabase: SupabaseClient,
  entityId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await supabase
      .from("supplier_related_entities")
      .update({
        dispute_status: "disputed_by_supplier",
        dispute_notes: reason,
      })
      .eq("id", entityId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

/**
 * Audit log helper
 */
export async function logEntityAudit(
  supabase: SupabaseClient,
  supplierId: string,
  action: "disclosed" | "verified" | "disputed" | "resolved" | "corrected",
  entityId?: string,
  reason?: string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  await supabase.from("supplier_entity_audit").insert({
    supplier_id: supplierId,
    entity_id: entityId,
    action,
    actor_id: user.user?.id,
    actor_role: "supplier",
    reason,
  })
}

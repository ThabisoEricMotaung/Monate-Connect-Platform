import { supabase } from "./supabase"

// ─── Constants ────────────────────────────────────────────────────────────────

/** Monetary threshold above which POs and payments are automatically escalated */
export const HIGH_VALUE_THRESHOLD = 500_000 // R500,000

export const DECISION_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "More Info Requested",
] as const

export const DECISION_PRIORITIES = ["Normal", "High", "Urgent", "Critical"] as const

export const ITEM_TYPES = [
  "award_recommendation",
  "purchase_order",
  "contract",
  "invoice_approval",
  "payment",
  "supplier_risk",
] as const

export type DecisionStatus = (typeof DECISION_STATUSES)[number]
export type DecisionPriority = (typeof DECISION_PRIORITIES)[number]
export type DecisionItemType = (typeof ITEM_TYPES)[number]

// ─── Types ────────────────────────────────────────────────────────────────────

export type DecisionBoardItem = {
  id: number
  item_type: string | null
  entity_id: string | null
  title: string | null
  description: string | null
  requested_by: string | null
  requested_by_email: string | null
  decision_status: string | null
  priority: string | null
  decision_notes: string | null
  created_at: string | null
  decided_at: string | null
}

export type CreateDecisionItemInput = {
  item_type: DecisionItemType
  entity_id: string
  title: string
  description?: string | null
  requested_by?: string | null
  requested_by_email?: string | null
  priority?: DecisionPriority
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCurrencyValue(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (!value) return 0
  const n = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

export function isHighValue(amount: string | number | null): boolean {
  return parseCurrencyValue(amount) >= HIGH_VALUE_THRESHOLD
}

// ─── createDecisionItem ───────────────────────────────────────────────────────

export async function createDecisionItem(
  input: CreateDecisionItemInput
): Promise<DecisionBoardItem | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("decision_board_items")
      .insert([{
        item_type: input.item_type,
        entity_id: input.entity_id,
        title: input.title,
        description: input.description ?? null,
        requested_by: input.requested_by ?? null,
        requested_by_email: input.requested_by_email ?? null,
        decision_status: "Pending",
        priority: input.priority ?? "Normal",
        decision_notes: null,
      }])
      .select("*")
      .single()

    if (error) {
      // Silently fail if table doesn't exist yet
      if (
        error.message.includes("does not exist") ||
        error.message.includes("relation")
      ) {
        return null
      }
      console.warn("[decisionBoard] createDecisionItem failed:", error.message)
      return null
    }

    return data as DecisionBoardItem
  } catch (err) {
    console.warn("[decisionBoard] createDecisionItem threw:", err)
    return null
  }
}

// ─── getDecisionItems ─────────────────────────────────────────────────────────

export async function getDecisionItems(filters?: {
  status?: string
  priority?: string
  item_type?: string
  requested_by?: string
}): Promise<DecisionBoardItem[]> {
  if (!supabase) return []

  try {
    let query = supabase
      .from("decision_board_items")
      .select("*")
      .order("created_at", { ascending: false })

    if (filters?.status) {
      query = query.eq("decision_status", filters.status)
    }
    if (filters?.priority) {
      query = query.eq("priority", filters.priority)
    }
    if (filters?.item_type) {
      query = query.eq("item_type", filters.item_type)
    }
    if (filters?.requested_by) {
      query = query.eq("requested_by", filters.requested_by)
    }

    const { data, error } = await query

    if (error) {
      if (
        error.message.includes("does not exist") ||
        error.message.includes("relation")
      ) {
        return []
      }
      console.warn("[decisionBoard] getDecisionItems failed:", error.message)
      return []
    }

    return (data ?? []) as DecisionBoardItem[]
  } catch (err) {
    console.warn("[decisionBoard] getDecisionItems threw:", err)
    return []
  }
}

// ─── updateDecisionStatus ─────────────────────────────────────────────────────

export async function updateDecisionStatus(
  id: number,
  status: DecisionStatus,
  notes?: string | null
): Promise<DecisionBoardItem | null> {
  if (!supabase) return null

  try {
    const patch: Record<string, unknown> = {
      decision_status: status,
      decision_notes: notes?.trim() || null,
    }

    if (status === "Approved" || status === "Rejected") {
      patch.decided_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("decision_board_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.warn("[decisionBoard] updateDecisionStatus failed:", error.message)
      return null
    }

    return data as DecisionBoardItem
  } catch (err) {
    console.warn("[decisionBoard] updateDecisionStatus threw:", err)
    return null
  }
}

import { supabase } from "./supabase"
import { createDecisionItem } from "./decisionBoard"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalMatrixRule = {
  id: number
  matrix_name: string | null
  entity_type: string | null
  min_value: number | null
  max_value: number | null
  risk_level: string | null
  required_role: string | null
  required_approvals: number | null
  is_active: boolean | null
  created_at: string | null
}

export type ApprovalRequirement = {
  required: boolean
  rule: ApprovalMatrixRule | null
  required_role: string | null
  required_approvals: number
  message: string | null
}

export type CreateApprovalMatrixRuleInput = {
  matrix_name: string
  entity_type: string
  min_value?: number | null
  max_value?: number | null
  risk_level?: string | null
  required_role: string
  required_approvals?: number
  is_active?: boolean
}

// ─── Schema metadata ──────────────────────────────────────────────────────────

export const MATRIX_ENTITY_TYPES = [
  { value: "rfq",                    label: "RFQ" },
  { value: "purchase_order",         label: "Purchase Order" },
  { value: "contract",               label: "Contract" },
  { value: "invoice_approval",       label: "Invoice Approval" },
  { value: "payment",                label: "Payment" },
  { value: "award_recommendation",   label: "Award Recommendation" },
  { value: "procurement_override",   label: "Procurement Override" },
]

export const REQUIRED_ROLES = [
  { value: "buyer",                label: "Buyer",                   description: "Standard procurement buyer access" },
  { value: "procurement_manager",  label: "Procurement Manager",     description: "Senior procurement official" },
  { value: "finance_manager",      label: "Finance Manager",         description: "Finance department manager" },
  { value: "executive",            label: "Executive",               description: "C-suite or executive delegate" },
  { value: "cfo",                  label: "CFO",                     description: "Chief Financial Officer" },
  { value: "any_admin",            label: "Any Admin or Buyer",      description: "Any user with admin or buyer access" },
]

export const RISK_LEVEL_OPTIONS = [
  { value: "",          label: "Any risk level" },
  { value: "Low",       label: "Low" },
  { value: "Medium",    label: "Medium" },
  { value: "High",      label: "High" },
  { value: "Critical",  label: "Critical" },
]

/** Role hierarchy for strictness ordering (higher index = more senior) */
const ROLE_RANK: Record<string, number> = {
  any_admin: 0,
  buyer: 1,
  procurement_manager: 2,
  finance_manager: 3,
  executive: 4,
  cfo: 5,
}

// ─── Seed rules (shown as examples when table is empty) ───────────────────────

export const SEED_MATRIX_RULES: Omit<ApprovalMatrixRule, "id" | "created_at">[] = [
  {
    matrix_name: "RFQ — standard buyer approval",
    entity_type: "rfq",
    min_value: 0, max_value: 100_000,
    risk_level: null, required_role: "buyer",
    required_approvals: 1, is_active: true,
  },
  {
    matrix_name: "RFQ — procurement manager (mid-value)",
    entity_type: "rfq",
    min_value: 100_001, max_value: 1_000_000,
    risk_level: null, required_role: "procurement_manager",
    required_approvals: 1, is_active: true,
  },
  {
    matrix_name: "RFQ — executive approval (high-value)",
    entity_type: "rfq",
    min_value: 1_000_001, max_value: null,
    risk_level: null, required_role: "executive",
    required_approvals: 2, is_active: true,
  },
  {
    matrix_name: "Purchase Order — buyer approval",
    entity_type: "purchase_order",
    min_value: 0, max_value: 500_000,
    risk_level: null, required_role: "buyer",
    required_approvals: 1, is_active: true,
  },
  {
    matrix_name: "Purchase Order — executive (high-value)",
    entity_type: "purchase_order",
    min_value: 500_001, max_value: null,
    risk_level: null, required_role: "executive",
    required_approvals: 2, is_active: true,
  },
  {
    matrix_name: "Payment — finance manager",
    entity_type: "payment",
    min_value: 500_001, max_value: null,
    risk_level: null, required_role: "finance_manager",
    required_approvals: 1, is_active: true,
  },
  {
    matrix_name: "Award — critical risk escalation",
    entity_type: "award_recommendation",
    min_value: null, max_value: null,
    risk_level: "Critical", required_role: "executive",
    required_approvals: 2, is_active: true,
  },
  {
    matrix_name: "Contract — procurement manager sign-off",
    entity_type: "contract",
    min_value: null, max_value: null,
    risk_level: null, required_role: "procurement_manager",
    required_approvals: 1, is_active: true,
  },
  {
    matrix_name: "Override — executive review required",
    entity_type: "procurement_override",
    min_value: null, max_value: null,
    risk_level: null, required_role: "executive",
    required_approvals: 1, is_active: true,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTableMissing(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("does not exist") ||
    error?.message?.includes("relation")
  )
}

function parseCurrencyVal(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  if (!v) return 0
  const n = Number(String(v).replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function ruleMatchesAmount(rule: ApprovalMatrixRule, amount: number | null): boolean {
  if (amount === null) return true // no amount filter
  const min = rule.min_value ?? 0
  const max = rule.max_value ?? Infinity
  return amount >= min && amount <= max
}

function ruleMatchesRisk(rule: ApprovalMatrixRule, riskLevel: string | null): boolean {
  if (!rule.risk_level) return true // rule applies to any risk level
  if (!riskLevel) return false     // rule requires specific risk but none provided
  return rule.risk_level.toLowerCase() === riskLevel.toLowerCase()
}

// ─── getApprovalMatrix ────────────────────────────────────────────────────────

export async function getApprovalMatrix(): Promise<ApprovalMatrixRule[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from("approval_matrix")
      .select("*")
      .order("entity_type")
      .order("min_value", { ascending: true, nullsFirst: true })

    if (error) {
      if (isTableMissing(error)) return []
      console.warn("[approvalMatrix] getApprovalMatrix:", error.message)
      return []
    }
    return (data ?? []) as ApprovalMatrixRule[]
  } catch { return [] }
}

// ─── evaluateApprovalRequirement ─────────────────────────────────────────────

/**
 * Evaluate which approval level is required for a given entity/amount/risk.
 * Optionally creates a Decision Board item when an approval is required.
 * Never blocks — returns { required: false } on any error.
 */
export async function evaluateApprovalRequirement(
  entityType: string,
  amount?: number | string | null,
  riskLevel?: string | null,
  options?: {
    createBoardItem?: boolean
    entityId?: string
    entityTitle?: string
    requestedBy?: string | null
  }
): Promise<ApprovalRequirement> {
  const none: ApprovalRequirement = { required: false, rule: null, required_role: null, required_approvals: 1, message: null }
  if (!supabase) return none

  const parsedAmount = amount !== undefined && amount !== null
    ? parseCurrencyVal(amount)
    : null

  let rules: ApprovalMatrixRule[] = []
  try {
    const { data, error } = await supabase
      .from("approval_matrix")
      .select("*")
      .eq("entity_type", entityType)
      .eq("is_active", true)

    if (error) return none
    rules = (data ?? []) as ApprovalMatrixRule[]
  } catch { return none }

  // Filter matching rules
  const matching = rules.filter(
    (r) => ruleMatchesAmount(r, parsedAmount) && ruleMatchesRisk(r, riskLevel ?? null)
  )

  if (matching.length === 0) return none

  // Select strictest rule: most approvals required, then most senior role
  const strictest = matching.reduce((best, current) => {
    const bestApprovals  = best.required_approvals ?? 1
    const currApprovals  = current.required_approvals ?? 1
    const bestRoleRank   = ROLE_RANK[best.required_role ?? "any_admin"] ?? 0
    const currRoleRank   = ROLE_RANK[current.required_role ?? "any_admin"] ?? 0

    if (currApprovals > bestApprovals) return current
    if (currApprovals === bestApprovals && currRoleRank > bestRoleRank) return current
    return best
  })

  const roleLabel =
    REQUIRED_ROLES.find((r) => r.value === strictest.required_role)?.label ??
    strictest.required_role ??
    "Authorised approver"

  const approvals = strictest.required_approvals ?? 1

  const amountFormatted = parsedAmount
    ? `R${parsedAmount.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
    : null

  const message = [
    `Approval required: ${roleLabel}`,
    approvals > 1 ? `(${approvals} approvals needed)` : null,
    amountFormatted ? `— Amount: ${amountFormatted}` : null,
    riskLevel ? `— Risk: ${riskLevel}` : null,
    strictest.matrix_name ? `— Rule: ${strictest.matrix_name}` : null,
  ].filter(Boolean).join(" ")

  // Optionally create Decision Board item
  if (options?.createBoardItem && options.entityId) {
    createDecisionItem({
      item_type: entityType as never,
      entity_id: options.entityId,
      title: `Matrix Approval Required: ${options.entityTitle ?? entityType} — ${roleLabel}`,
      description: message,
      requested_by: options.requestedBy ?? undefined,
      priority: approvals >= 2 ? "Urgent" : "High",
    }).catch(() => { /* never block */ })
  }

  return {
    required: true,
    rule: strictest,
    required_role: strictest.required_role,
    required_approvals: approvals,
    message,
  }
}

// ─── createApprovalMatrixRule ─────────────────────────────────────────────────

export async function createApprovalMatrixRule(
  input: CreateApprovalMatrixRuleInput
): Promise<ApprovalMatrixRule | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from("approval_matrix")
      .insert([{
        matrix_name: input.matrix_name.trim(),
        entity_type: input.entity_type,
        min_value: input.min_value ?? null,
        max_value: input.max_value ?? null,
        risk_level: input.risk_level || null,
        required_role: input.required_role,
        required_approvals: input.required_approvals ?? 1,
        is_active: input.is_active ?? true,
      }])
      .select("*")
      .single()

    if (error) {
      if (!isTableMissing(error)) console.warn("[approvalMatrix] create:", error.message)
      return null
    }
    return data as ApprovalMatrixRule
  } catch { return null }
}

// ─── updateApprovalMatrixRule ─────────────────────────────────────────────────

export async function updateApprovalMatrixRule(
  id: number,
  patch: Partial<CreateApprovalMatrixRuleInput> & { is_active?: boolean }
): Promise<ApprovalMatrixRule | null> {
  if (!supabase) return null
  try {
    const update: Record<string, unknown> = {}
    if (patch.matrix_name !== undefined) update.matrix_name = patch.matrix_name.trim()
    if (patch.entity_type !== undefined) update.entity_type = patch.entity_type
    if ("min_value" in patch) update.min_value = patch.min_value ?? null
    if ("max_value" in patch) update.max_value = patch.max_value ?? null
    if ("risk_level" in patch) update.risk_level = patch.risk_level || null
    if (patch.required_role !== undefined) update.required_role = patch.required_role
    if (patch.required_approvals !== undefined) update.required_approvals = patch.required_approvals
    if (patch.is_active !== undefined) update.is_active = patch.is_active

    const { data, error } = await supabase
      .from("approval_matrix")
      .update(update)
      .eq("id", id)
      .select("*")
      .single()

    if (error) { console.warn("[approvalMatrix] update:", error.message); return null }
    return data as ApprovalMatrixRule
  } catch { return null }
}

// ─── Convenience wrapper used by lib functions ────────────────────────────────

/**
 * Fire-and-forget approval matrix check for lib functions.
 * Creates a Decision Board item if approval is required, never blocks.
 */
export function checkAndLogApprovalRequirement(
  entityType: string,
  entityId: string,
  entityTitle: string,
  amount?: number | string | null,
  riskLevel?: string | null,
  requestedBy?: string | null
): void {
  evaluateApprovalRequirement(entityType, amount, riskLevel, {
    createBoardItem: true,
    entityId,
    entityTitle,
    requestedBy,
  }).catch(() => { /* never block */ })
}

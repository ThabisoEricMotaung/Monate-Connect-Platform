import { supabase } from "./supabase"
import { createDecisionItem } from "./decisionBoard"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowRule = {
  id: number
  rule_name: string | null
  rule_type: string | null
  entity_type: string | null
  condition_key: string | null
  condition_operator: string | null
  condition_value: string | null
  action_type: string | null
  action_value: string | null
  is_active: boolean | null
  created_at: string | null
}

export type CreateWorkflowRuleInput = {
  rule_name: string
  rule_type?: string
  entity_type: string
  condition_key: string
  condition_operator: string
  condition_value: string
  action_type: string
  action_value?: string
  is_active?: boolean
}

export type RuleEvalResult = {
  /** True if any active "block" rule was triggered */
  blocked: boolean
  /** Human-readable message from the blocking rule */
  blockMessage: string | null
  /** Rule that caused the block */
  blockingRule: WorkflowRule | null
  /** All rules that fired (any action type) */
  triggeredRules: WorkflowRule[]
  /** True if a require_approval rule fired */
  requiresApproval: boolean
  /** Message from the approval-required rule */
  approvalMessage: string | null
}

// ─── Schema metadata (used by the page builder) ───────────────────────────────

export const ENTITY_TYPES = [
  { value: "purchase_order", label: "Purchase Order" },
  { value: "contract",       label: "Contract" },
  { value: "invoice",        label: "Invoice" },
  { value: "payment",        label: "Payment" },
  { value: "quote",          label: "Quote / Award" },
  { value: "rfq",            label: "RFQ" },
  { value: "supplier",       label: "Supplier" },
]

export const CONDITION_KEYS_BY_ENTITY: Record<
  string,
  Array<{ value: string; label: string; hint?: string }>
> = {
  purchase_order: [
    { value: "amount",         label: "Amount (ZAR)",        hint: "Numeric value without R prefix" },
    { value: "supplier_name",  label: "Supplier Name",       hint: "Text match" },
    { value: "status",         label: "Status",              hint: "e.g. Issued, Accepted" },
  ],
  contract: [
    { value: "contract_value", label: "Contract Value (ZAR)",  hint: "Numeric value" },
    { value: "days_to_expiry", label: "Days to Expiry",        hint: "Calculated from end_date" },
    { value: "status",         label: "Contract Status",       hint: "e.g. Active, Draft" },
  ],
  invoice: [
    { value: "amount",         label: "Invoice Amount (ZAR)",  hint: "Numeric value" },
    { value: "total_amount",   label: "Total with VAT (ZAR)",  hint: "Numeric value" },
    { value: "status",         label: "Invoice Status",        hint: "e.g. Submitted, Approved" },
  ],
  payment: [
    { value: "amount",          label: "Payment Amount (ZAR)",  hint: "Numeric value" },
    { value: "banking_status",  label: "Banking Verification",  hint: "Verified / Unverified / Rejected" },
  ],
  quote: [
    { value: "amount",                label: "Quote Amount (ZAR)",        hint: "Numeric value" },
    { value: "supplier_risk_level",   label: "Supplier Risk Level",       hint: "Low / Medium / High / Critical" },
    { value: "supplier_verification", label: "Supplier Verification",     hint: "Verified / Pending Review" },
    { value: "supplier_smart_score",  label: "Supplier SmartScore",       hint: "Numeric 0–1000" },
  ],
  rfq: [
    { value: "budget",    label: "RFQ Budget (ZAR)", hint: "Numeric value" },
    { value: "category",  label: "Category",         hint: "Text match" },
    { value: "province",  label: "Province",         hint: "Text match" },
    { value: "status",    label: "RFQ Status",       hint: "Open / Closed / Awarded" },
  ],
  supplier: [
    { value: "smart_score",          label: "SmartScore (0–1000)",    hint: "Numeric value" },
    { value: "risk_level",           label: "Risk Level",             hint: "Low / Medium / High / Critical" },
    { value: "verification_status",  label: "Verification Status",    hint: "Verified / Pending Review" },
    { value: "banking_status",       label: "Banking Verification",   hint: "Verified / Unverified" },
  ],
}

export const CONDITION_OPERATORS = [
  { value: ">",             label: "greater than (>)" },
  { value: "<",             label: "less than (<)" },
  { value: ">=",            label: "greater than or equal (≥)" },
  { value: "<=",            label: "less than or equal (≤)" },
  { value: "=",             label: "equals (=)" },
  { value: "!=",            label: "not equals (≠)" },
  { value: "contains",      label: "contains (text)" },
  { value: "not_contains",  label: "does not contain (text)" },
  { value: "is_empty",      label: "is empty / missing" },
  { value: "is_not_empty",  label: "is present / not empty" },
]

export const ACTION_TYPES = [
  { value: "block",            label: "Block Action",          description: "Prevent the action entirely and show an error." },
  { value: "require_approval", label: "Require Board Approval", description: "Create a Decision Board item — action still proceeds." },
  { value: "create_alert",     label: "Create Alert",           description: "Log an alert without blocking the action." },
  { value: "flag_risk",        label: "Flag as Risk",           description: "Mark the entity as risky without blocking." },
]

// ─── Default seed rules (shown in UI as examples) ─────────────────────────────

export const SEED_RULES: Omit<WorkflowRule, "id" | "created_at">[] = [
  {
    rule_name: "High-value PO board approval",
    rule_type: "approval",
    entity_type: "purchase_order",
    condition_key: "amount",
    condition_operator: ">",
    condition_value: "1000000",
    action_type: "require_approval",
    action_value: "Purchase orders above R1,000,000 require Decision Board approval.",
    is_active: true,
  },
  {
    rule_name: "Block payment without verified banking",
    rule_type: "block",
    entity_type: "payment",
    condition_key: "banking_status",
    condition_operator: "!=",
    condition_value: "Verified",
    action_type: "block",
    action_value: "Supplier banking details must be Verified before payment can be processed.",
    is_active: true,
  },
  {
    rule_name: "Block award to Critical-risk supplier",
    rule_type: "block",
    entity_type: "quote",
    condition_key: "supplier_risk_level",
    condition_operator: "=",
    condition_value: "Critical",
    action_type: "block",
    action_value: "Awards to suppliers with Critical risk rating are blocked. Resolve outstanding risk issues before proceeding.",
    is_active: true,
  },
  {
    rule_name: "High-value invoice board approval",
    rule_type: "approval",
    entity_type: "invoice",
    condition_key: "total_amount",
    condition_operator: ">",
    condition_value: "500000",
    action_type: "require_approval",
    action_value: "Invoices above R500,000 require Decision Board review before payment release.",
    is_active: true,
  },
  {
    rule_name: "Low SmartScore supplier flag",
    rule_type: "alert",
    entity_type: "quote",
    condition_key: "supplier_smart_score",
    condition_operator: "<",
    condition_value: "500",
    action_type: "flag_risk",
    action_value: "Supplier SmartScore below 500. Review supplier capability and compliance before awarding.",
    is_active: true,
  },
  {
    rule_name: "Contract expiry alert",
    rule_type: "alert",
    entity_type: "contract",
    condition_key: "days_to_expiry",
    condition_operator: "<=",
    condition_value: "30",
    action_type: "create_alert",
    action_value: "Contract expires within 30 days. Initiate renewal or procurement review.",
    is_active: true,
  },
]

// ─── Condition evaluator ──────────────────────────────────────────────────────

function parseCurrencyVal(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  if (!v) return 0
  const n = Number(String(v).replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function resolveEntityValue(
  entity: Record<string, unknown>,
  key: string
): unknown {
  // Support dot-notation for nested keys
  const parts = key.split(".")
  let val: unknown = entity
  for (const p of parts) {
    if (val == null || typeof val !== "object") return undefined
    val = (val as Record<string, unknown>)[p]
  }
  return val
}

function evaluateCondition(
  entity: Record<string, unknown>,
  rule: WorkflowRule
): boolean {
  if (!rule.condition_key || !rule.condition_operator) return false

  const raw = resolveEntityValue(entity, rule.condition_key)
  const condVal = rule.condition_value ?? ""

  switch (rule.condition_operator) {
    case ">":
      return parseCurrencyVal(raw as string | number) > Number(condVal)
    case "<":
      return parseCurrencyVal(raw as string | number) < Number(condVal)
    case ">=":
      return parseCurrencyVal(raw as string | number) >= Number(condVal)
    case "<=":
      return parseCurrencyVal(raw as string | number) <= Number(condVal)
    case "=":
    case "==":
      return String(raw ?? "").toLowerCase().trim() === condVal.toLowerCase().trim()
    case "!=":
      return String(raw ?? "").toLowerCase().trim() !== condVal.toLowerCase().trim()
    case "contains":
      return String(raw ?? "").toLowerCase().includes(condVal.toLowerCase())
    case "not_contains":
      return !String(raw ?? "").toLowerCase().includes(condVal.toLowerCase())
    case "is_empty":
      return raw == null || String(raw).trim() === ""
    case "is_not_empty":
      return raw != null && String(raw).trim() !== ""
    default:
      return false
  }
}

// ─── getWorkflowRules ─────────────────────────────────────────────────────────

export async function getWorkflowRules(): Promise<WorkflowRule[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from("workflow_rules")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        return []
      }
      console.warn("[workflowRules] getWorkflowRules:", error.message)
      return []
    }
    return (data ?? []) as WorkflowRule[]
  } catch {
    return []
  }
}

// ─── evaluateWorkflowRules ────────────────────────────────────────────────────

export async function evaluateWorkflowRules(
  entityType: string,
  entity: Record<string, unknown>,
  requestedBy?: string | null
): Promise<RuleEvalResult> {
  const empty: RuleEvalResult = {
    blocked: false,
    blockMessage: null,
    blockingRule: null,
    triggeredRules: [],
    requiresApproval: false,
    approvalMessage: null,
  }

  if (!supabase) return empty

  let rules: WorkflowRule[] = []
  try {
    const { data, error } = await supabase
      .from("workflow_rules")
      .select("*")
      .eq("entity_type", entityType)
      .eq("is_active", true)
    if (error) return empty
    rules = (data ?? []) as WorkflowRule[]
  } catch {
    return empty
  }

  const triggered: WorkflowRule[] = []
  let blocked = false
  let blockMessage: string | null = null
  let blockingRule: WorkflowRule | null = null
  let requiresApproval = false
  let approvalMessage: string | null = null

  for (const rule of rules) {
    if (!evaluateCondition(entity, rule)) continue
    triggered.push(rule)

    const actionType = rule.action_type ?? ""
    const actionValue = rule.action_value ?? `Rule "${rule.rule_name}" was triggered.`

    switch (actionType) {
      case "block":
        if (!blocked) {
          blocked = true
          blockMessage = actionValue
          blockingRule = rule
        }
        break

      case "require_approval":
        requiresApproval = true
        approvalMessage = approvalMessage ?? actionValue
        // Create decision board item (never blocking, fire-and-forget)
        createDecisionItem({
          item_type: (entityType as never) ?? "purchase_order",
          entity_id: String(entity.id ?? entity.entity_id ?? "unknown"),
          title: `Rule Triggered: ${rule.rule_name ?? "Unnamed Rule"}`,
          description: `${actionValue}\nEntity type: ${entityType}. Condition: ${rule.condition_key} ${rule.condition_operator} ${rule.condition_value}.`,
          requested_by: requestedBy ?? undefined,
          priority: "High",
        }).catch(() => { /* never block */ })
        break

      case "flag_risk":
      case "create_alert":
        // Non-blocking — logged via console for now; could be extended to notifications
        console.info(`[workflowRules] Rule "${rule.rule_name}" triggered (${actionType}):`, actionValue)
        break
    }
  }

  return { blocked, blockMessage, blockingRule, triggeredRules: triggered, requiresApproval, approvalMessage }
}

// ─── createWorkflowRule ───────────────────────────────────────────────────────

export async function createWorkflowRule(
  input: CreateWorkflowRuleInput
): Promise<WorkflowRule | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from("workflow_rules")
      .insert([{
        rule_name: input.rule_name.trim(),
        rule_type: input.rule_type ?? input.action_type,
        entity_type: input.entity_type,
        condition_key: input.condition_key,
        condition_operator: input.condition_operator,
        condition_value: input.condition_value.trim(),
        action_type: input.action_type,
        action_value: input.action_value?.trim() ?? null,
        is_active: input.is_active ?? true,
      }])
      .select("*")
      .single()
    if (error) {
      console.warn("[workflowRules] createWorkflowRule:", error.message)
      return null
    }
    return data as WorkflowRule
  } catch {
    return null
  }
}

// ─── updateWorkflowRule ───────────────────────────────────────────────────────

export async function updateWorkflowRule(
  id: number,
  patch: Partial<CreateWorkflowRuleInput> & { is_active?: boolean }
): Promise<WorkflowRule | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from("workflow_rules")
      .update({
        ...patch,
        rule_name: patch.rule_name?.trim(),
        condition_value: patch.condition_value?.trim(),
        action_value: patch.action_value?.trim(),
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) {
      console.warn("[workflowRules] updateWorkflowRule:", error.message)
      return null
    }
    return data as WorkflowRule
  } catch {
    return null
  }
}

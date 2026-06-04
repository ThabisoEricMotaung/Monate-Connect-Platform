import { supabase } from "./supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

export type DelegationAuthority = {
  id: number
  user_id: string | null
  user_email: string | null
  role: string | null
  authority_area: string | null
  min_value: number | null
  max_value: number | null
  can_approve_rfqs: boolean | null
  can_approve_awards: boolean | null
  can_approve_contracts: boolean | null
  can_approve_invoices: boolean | null
  can_approve_payments: boolean | null
  can_approve_overrides: boolean | null
  is_active: boolean | null
  created_at: string | null
}

export type CreateDelegationAuthorityInput = {
  user_id?: string | null
  user_email: string
  role: string
  authority_area: string
  min_value?: number | null
  max_value?: number | null
  can_approve_rfqs?: boolean
  can_approve_awards?: boolean
  can_approve_contracts?: boolean
  can_approve_invoices?: boolean
  can_approve_payments?: boolean
  can_approve_overrides?: boolean
  is_active?: boolean
}

// ─── Schema metadata ──────────────────────────────────────────────────────────

/**
 * Values must match the `can_approve_*` column name suffixes.
 * e.g. "rfqs" → can_approve_rfqs, "invoices" → can_approve_invoices
 */
export const AUTHORITY_AREAS = [
  { value: "rfqs",       label: "RFQs",                  description: "Request for Quotation management and publishing" },
  { value: "awards",     label: "Contract Awards",        description: "Award recommendations and quote award decisions" },
  { value: "contracts",  label: "Contracts",              description: "Contract creation, renewal, and termination" },
  { value: "invoices",   label: "Invoice Approvals",      description: "Supplier invoice review and approval" },
  { value: "payments",   label: "Payment Authorisation",  description: "Payment generation and release to suppliers" },
  { value: "overrides",  label: "Compliance Overrides",   description: "Override blocked compliance checks and policy rules" },
]

export const APPROVAL_ROLES = [
  { value: "buyer",                label: "Buyer",                description: "Standard procurement buyer" },
  { value: "procurement_manager",  label: "Procurement Manager",  description: "Senior procurement official" },
  { value: "finance_manager",      label: "Finance Manager",      description: "Finance department manager" },
  { value: "executive",            label: "Executive",            description: "C-suite or authorised executive delegate" },
  { value: "cfo",                  label: "CFO",                  description: "Chief Financial Officer" },
  { value: "ceo",                  label: "CEO",                  description: "Chief Executive Officer" },
]

// ─── Flag field by approval type ─────────────────────────────────────────────

function approvalFlagField(
  approvalType: string
): keyof DelegationAuthority | null {
  switch (approvalType.toLowerCase()) {
    case "rfq":
    case "rfqs":      return "can_approve_rfqs"
    case "award":
    case "awards":    return "can_approve_awards"
    case "contract":
    case "contracts": return "can_approve_contracts"
    case "invoice":
    case "invoices":  return "can_approve_invoices"
    case "payment":
    case "payments":  return "can_approve_payments"
    case "override":
    case "overrides": return "can_approve_overrides"
    default:          return null
  }
}

// ─── Table missing helper ─────────────────────────────────────────────────────

function isTableMissing(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("does not exist") ||
    error?.message?.includes("relation")
  )
}

// ─── getDelegationAuthority ───────────────────────────────────────────────────

/**
 * Fetch all delegation authority records, ordered by user_email.
 * Returns [] gracefully if the table doesn't exist.
 */
export async function getDelegationAuthority(): Promise<DelegationAuthority[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("delegation_authority")
    .select("*")
    .order("user_email")
  if (error) {
    if (!isTableMissing(error)) throw error
    return []
  }
  return (data ?? []) as DelegationAuthority[]
}

// ─── canUserApprove ───────────────────────────────────────────────────────────

/**
 * Check whether a given user has delegation authority for a specific
 * approval type and transaction amount.
 *
 * Returns true when:
 * - No delegation records exist in the system (legacy / unconfigured mode), OR
 * - The user has an active record matching the approval type and amount range.
 *
 * Returns false when:
 * - The table exists with records but the user has no matching active record.
 *
 * Never throws — returns true on any database error so existing workflows
 * are never accidentally blocked.
 */
export async function canUserApprove(
  userId: string | null | undefined,
  approvalType: string,
  amount?: number | null
): Promise<boolean> {
  if (!supabase) return true // no DB configured → allow

  try {
    // Count total active records in the system
    const { count: totalActive, error: countErr } = await supabase
      .from("delegation_authority")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)

    if (countErr) {
      if (isTableMissing(countErr)) return true // table doesn't exist → allow
      console.warn("[delegationAuthority] canUserApprove count:", countErr.message)
      return true // DB error → fail open
    }

    // No records configured → legacy mode, allow all
    if (!totalActive || totalActive === 0) return true

    // No userId → deny (delegation is configured but user unidentifiable)
    if (!userId) return false

    const flagField = approvalFlagField(approvalType)
    if (!flagField) return true // unknown type → allow

    // Fetch all active records for this user, then filter by flag in JS
    // (Supabase's type system doesn't support dynamic column names in .eq())
    let userEmail: string | null = null
    let profileRole: string | null = null

    const { data: authData } = await supabase.auth.getUser()
    if (authData.user?.id === userId) {
      userEmail = authData.user.email?.trim().toLowerCase() ?? null
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role,email")
      .eq("id", userId)
      .maybeSingle()

    if (profileData) {
      const profile = profileData as { role?: string | null; email?: string | null }
      profileRole = profile.role ?? null
      userEmail = userEmail ?? profile.email?.trim().toLowerCase() ?? null
    }

    const { data: allActiveRecords, error: recordsErr } = await supabase
      .from("delegation_authority")
      .select("*")
      .eq("is_active", true)

    if (recordsErr) {
      console.warn("[delegationAuthority] canUserApprove fetch:", recordsErr.message)
      return true // DB error → fail open
    }

    const records = ((allActiveRecords ?? []) as DelegationAuthority[]).filter((r) => {
      const recordEmail = r.user_email?.trim().toLowerCase() ?? null
      const matchesUser = r.user_id === userId
      const matchesEmail = Boolean(userEmail && recordEmail === userEmail)
      const matchesRole = Boolean(profileRole && r.role === profileRole)
      return (matchesUser || matchesEmail || matchesRole) && r[flagField] === true
    })

    if (records.length === 0) return false // user has no matching authority

    // Check amount range (if amount provided)
    if (amount !== null && amount !== undefined && amount > 0) {
      const matchesAmount = records.some((r) => {
        const min = r.min_value ?? 0
        const max = r.max_value ?? Infinity
        return amount >= min && amount <= max
      })
      return matchesAmount
    }

    // No amount filter — any matching record grants authority
    return true
  } catch (err) {
    console.warn("[delegationAuthority] canUserApprove threw:", err)
    return true // never block on unexpected errors
  }
}

// ─── createDelegationRecord ───────────────────────────────────────────────────

export async function createDelegationRecord(
  input: CreateDelegationAuthorityInput
): Promise<DelegationAuthority | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from("delegation_authority")
      .insert([{
        user_id: input.user_id ?? null,
        user_email: input.user_email.trim().toLowerCase(),
        role: input.role,
        authority_area: input.authority_area,
        min_value: input.min_value ?? null,
        max_value: input.max_value ?? null,
        can_approve_rfqs: input.can_approve_rfqs ?? false,
        can_approve_awards: input.can_approve_awards ?? false,
        can_approve_contracts: input.can_approve_contracts ?? false,
        can_approve_invoices: input.can_approve_invoices ?? false,
        can_approve_payments: input.can_approve_payments ?? false,
        can_approve_overrides: input.can_approve_overrides ?? false,
        is_active: input.is_active ?? true,
      }])
      .select("*")
      .single()

    if (error) {
      if (!isTableMissing(error)) console.warn("[delegationAuthority] create:", error.message)
      return null
    }
    return data as DelegationAuthority
  } catch { return null }
}

// ─── updateDelegationRecord ───────────────────────────────────────────────────

export async function updateDelegationRecord(
  id: number,
  patch: Partial<CreateDelegationAuthorityInput> & { is_active?: boolean }
): Promise<DelegationAuthority | null> {
  if (!supabase) return null
  try {
    const update: Record<string, unknown> = {}
    if (patch.user_email !== undefined) update.user_email = patch.user_email.trim().toLowerCase()
    if (patch.role !== undefined) update.role = patch.role
    if (patch.authority_area !== undefined) update.authority_area = patch.authority_area
    if ("min_value" in patch) update.min_value = patch.min_value ?? null
    if ("max_value" in patch) update.max_value = patch.max_value ?? null
    if (patch.can_approve_rfqs !== undefined) update.can_approve_rfqs = patch.can_approve_rfqs
    if (patch.can_approve_awards !== undefined) update.can_approve_awards = patch.can_approve_awards
    if (patch.can_approve_contracts !== undefined) update.can_approve_contracts = patch.can_approve_contracts
    if (patch.can_approve_invoices !== undefined) update.can_approve_invoices = patch.can_approve_invoices
    if (patch.can_approve_payments !== undefined) update.can_approve_payments = patch.can_approve_payments
    if (patch.can_approve_overrides !== undefined) update.can_approve_overrides = patch.can_approve_overrides
    if (patch.is_active !== undefined) update.is_active = patch.is_active

    const { data, error } = await supabase
      .from("delegation_authority")
      .update(update)
      .eq("id", id)
      .select("*")
      .single()

    if (error) { console.warn("[delegationAuthority] update:", error.message); return null }
    return data as DelegationAuthority
  } catch { return null }
}

// ─── getDelegationForUser ─────────────────────────────────────────────────────

/**
 * Retrieve all active delegation records for a specific user.
 */
export async function getDelegationForUser(
  userId: string
): Promise<DelegationAuthority[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from("delegation_authority")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
    if (error) return []
    return (data ?? []) as DelegationAuthority[]
  } catch { return [] }
}

// ─── getAuthorityForApprovalType ──────────────────────────────────────────────

/**
 * Get the delegation record(s) that allow the given user to approve a
 * specific type of procurement action. Returns null if none found.
 */
export async function getAuthorityForApprovalType(
  userId: string,
  approvalType: string,
  amount?: number | null
): Promise<DelegationAuthority | null> {
  if (!supabase) return null
  try {
    const flagField = approvalFlagField(approvalType)
    if (!flagField) return null

    const { data, error } = await supabase
      .from("delegation_authority")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq(flagField as string, true)

    if (error || !data) return null

    const records = (data as DelegationAuthority[]).filter((r) => {
      if (amount === null || amount === undefined) return true
      const min = r.min_value ?? 0
      const max = r.max_value ?? Infinity
      return amount >= min && amount <= max
    })

    return records[0] ?? null
  } catch { return null }
}

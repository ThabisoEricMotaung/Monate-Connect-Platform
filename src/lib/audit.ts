import { getCurrentProfile, hasAdminOrBuyerAccess } from "./auth"
import { supabase } from "./supabase"

export type AuditValues = Record<string, unknown> | null

export type AuditLog = {
  id?: number
  user_id: string | null
  user_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: AuditValues
  new_values: AuditValues
  metadata: AuditValues
  created_at: string | null
}

export type LogAuditActionInput = {
  action: string
  entity_type: string
  entity_id: string | number | null
  old_values?: AuditValues
  new_values?: AuditValues
  metadata?: AuditValues
}

export type AuditLogFilters = {
  action?: string
  entity_type?: string
  user_email?: string
  start_date?: string
  end_date?: string
}

const AUDIT_SELECT = `
  id,
  user_id,
  user_email,
  action,
  entity_type,
  entity_id,
  old_values,
  new_values,
  metadata,
  created_at
`

function isMissingAuditTableError(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("audit_logs") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
}

export async function logAuditAction({
  action,
  entity_type,
  entity_id,
  old_values = null,
  new_values = null,
  metadata = null,
}: LogAuditActionInput): Promise<void> {
  if (!supabase) return

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError

    const { error } = await supabase.from("audit_logs").insert([
      {
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        action,
        entity_type,
        entity_id: entity_id == null ? null : String(entity_id),
        old_values,
        new_values,
        metadata,
      },
    ])

    if (error) throw error
  } catch (auditError) {
    console.warn("Audit logging failed:", auditError)
  }
}

export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLog[]> {
  if (!supabase) return []

  const profile = await getCurrentProfile()

  if (!hasAdminOrBuyerAccess(profile)) {
    return []
  }

  let query = supabase
    .from("audit_logs")
    .select(AUDIT_SELECT)
    .order("created_at", { ascending: false })
    .limit(250)

  if (filters.action?.trim()) {
    query = query.ilike("action", `%${filters.action.trim()}%`)
  }

  if (filters.entity_type?.trim()) {
    query = query.ilike("entity_type", `%${filters.entity_type.trim()}%`)
  }

  if (filters.user_email?.trim()) {
    query = query.ilike("user_email", `%${filters.user_email.trim()}%`)
  }

  if (filters.start_date) {
    query = query.gte("created_at", new Date(filters.start_date).toISOString())
  }

  if (filters.end_date) {
    const endDate = new Date(filters.end_date)
    endDate.setHours(23, 59, 59, 999)
    query = query.lte("created_at", endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    if (isMissingAuditTableError(error)) {
      console.warn("Audit logs table unavailable:", error)
      return []
    }

    throw error
  }

  return (data ?? []) as AuditLog[]
}

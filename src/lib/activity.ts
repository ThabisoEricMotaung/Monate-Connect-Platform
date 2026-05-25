import { supabase } from "@/lib/supabase"

type ActivityMetadata = Record<string, unknown>

type LogActivityInput = {
  action: string
  entity_type: string
  entity_id: string | number | null
  metadata?: ActivityMetadata
}

export async function logActivity({
  action,
  entity_type,
  entity_id,
  metadata = {},
}: LogActivityInput) {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { error } = await supabase.from("activity_logs").insert([
    {
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action,
      entity_type,
      entity_id: entity_id == null ? null : String(entity_id),
      metadata,
    },
  ])

  if (error) {
    throw error
  }
}

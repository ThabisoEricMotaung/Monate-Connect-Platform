import { supabase } from "@/lib/supabase"

export type SavedRFQ = {
  id: number
  user_id: string
  rfq_id: number
  notes: string | null
  created_at: string | null
}

async function getCurrentUserId(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error("User not authenticated")

  return user.id
}

export async function saveRFQ(rfqId: number, notes = ""): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { error } = await supabase.from("saved_rfqs").upsert(
    [
      {
        user_id: userId,
        rfq_id: rfqId,
        notes: notes.trim() || null,
      },
    ],
    { onConflict: "user_id,rfq_id" }
  )

  if (error) throw error
}

export async function unsaveRFQ(rfqId: number): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("saved_rfqs")
    .delete()
    .eq("user_id", userId)
    .eq("rfq_id", rfqId)

  if (error) throw error
}

export async function getSavedRFQs(): Promise<SavedRFQ[]> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("saved_rfqs")
    .select("id, user_id, rfq_id, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []) as SavedRFQ[]
}

export async function isRFQSaved(rfqId: number): Promise<boolean> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("saved_rfqs")
    .select("id")
    .eq("user_id", userId)
    .eq("rfq_id", rfqId)
    .maybeSingle()

  if (error) throw error

  return Boolean(data)
}

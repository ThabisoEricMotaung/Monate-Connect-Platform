import { supabase } from "@/lib/supabase"

export type SavedSupplier = {
  id: number
  user_id: string
  supplier_id: string
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

export async function saveSupplier(supplierId: string, notes = "") {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { error } = await supabase.from("saved_suppliers").upsert(
    [
      {
        user_id: userId,
        supplier_id: supplierId,
        notes: notes.trim() || null,
      },
    ],
    { onConflict: "user_id,supplier_id" }
  )

  if (error) throw error
}

export async function unsaveSupplier(supplierId: string) {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("saved_suppliers")
    .delete()
    .eq("user_id", userId)
    .eq("supplier_id", supplierId)

  if (error) throw error
}

export async function getSavedSuppliers(): Promise<SavedSupplier[]> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("saved_suppliers")
    .select("id, user_id, supplier_id, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []) as SavedSupplier[]
}

export async function isSupplierSaved(supplierId: string): Promise<boolean> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("saved_suppliers")
    .select("id")
    .eq("user_id", userId)
    .eq("supplier_id", supplierId)
    .maybeSingle()

  if (error) throw error

  return Boolean(data)
}

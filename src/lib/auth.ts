import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export type ProfileRole = "supplier" | "buyer" | "admin"

export type AuthProfile = {
  id: string
  role: ProfileRole | string | null
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  return user
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  if (!supabase) return null

  const user = await getCurrentUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !data) return null

  return data as AuthProfile
}

export async function requireAuth(): Promise<User | null> {
  return getCurrentUser()
}

export async function requireAdminOrBuyer(): Promise<AuthProfile | null> {
  const profile = await getCurrentProfile()
  const role = profile?.role

  if (role === "admin" || role === "buyer") {
    return profile
  }

  return null
}

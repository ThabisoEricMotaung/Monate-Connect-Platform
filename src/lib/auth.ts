import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export type ProfileRole = "supplier" | "buyer" | "admin"

export type AuthProfile = {
  id: string
  role: ProfileRole | string | null
}

function isMissingRoleColumnError(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("'role' column") ||
      error?.message?.includes("schema cache") ||
      error?.message?.includes("profiles' in the schema")
  )
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

  if (error) {
    if (!isMissingRoleColumnError(error)) return null

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()

    if (fallbackError || !fallbackData) return null

    return {
      id: fallbackData.id as string,
      role: "supplier",
    }
  }

  if (!data) return null

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

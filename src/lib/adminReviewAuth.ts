import type { SupabaseClient, User } from "@supabase/supabase-js"

type AdminClient = SupabaseClient

export function bearerToken(request: Request): string | null {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
}

export async function authenticateReviewer(
  request: Request,
  client: AdminClient,
): Promise<
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403 | 500; error: string }
> {
  const token = bearerToken(request)
  if (!token) return { ok: false, status: 401, error: "Missing authorization token." }

  const { data: userData, error: userError } = await client.auth.getUser(token)
  if (userError || !userData.user) return { ok: false, status: 401, error: "Invalid authorization token." }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle() as { data: { role?: string | null } | null; error: { message: string } | null }
  if (profileError) return { ok: false, status: 500, error: profileError.message }

  const role = String(profile?.role ?? "").trim().toLowerCase()
  if (role !== "admin" && role !== "reviewer") {
    return { ok: false, status: 403, error: "Reviewer role required." }
  }
  return { ok: true, user: userData.user }
}

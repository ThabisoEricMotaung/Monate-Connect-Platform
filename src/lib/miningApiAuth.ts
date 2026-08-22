import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function authenticateMiningRequest() {
  const client = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error || !user) return { user: null, role: null, error: "Authentication required." }
  if (!supabaseAdmin) return { user: null, role: null, error: "Supabase service client is not configured." }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) return { user: null, role: null, error: profileError.message }
  return { user, role: String(profile?.role ?? "supplier").trim().toLowerCase(), error: null }
}

import type { SupabaseClient } from "@supabase/supabase-js"

type DeleteAccountResult =
  | { success: true }
  | { success: false; error: string }

function isMissingColumnError(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("company_name") ||
      error?.message?.includes("schema cache") ||
      error?.message?.includes("column")
  )
}

export async function deleteAccount(
  userId: string,
  supabaseAdmin: SupabaseClient | null
): Promise<DeleteAccountResult> {
  if (!supabaseAdmin) {
    return { success: false, error: "Supabase service role client is not configured." }
  }

  const anonymisedEmail = `deleted_${userId}@deleted.local`
  const basePayload = {
    full_name: "Deleted User",
    email: anonymisedEmail,
    phone: null,
    business_name: null,
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ ...basePayload, company_name: null })
    .eq("id", userId)

  if (profileError) {
    if (!isMissingColumnError(profileError)) {
      return { success: false, error: profileError.message }
    }

    const { error: fallbackProfileError } = await supabaseAdmin
      .from("profiles")
      .update(basePayload)
      .eq("id", userId)

    if (fallbackProfileError) {
      return { success: false, error: fallbackProfileError.message }
    }
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: anonymisedEmail,
    ban_duration: "876000h",
  })

  if (authError) {
    return { success: false, error: authError.message }
  }

  return { success: true }
}

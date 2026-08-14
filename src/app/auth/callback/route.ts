import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { OAUTH_INTENT_COOKIE, readOAuthIntent } from "@/lib/oauthIntent"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/auth/post-oauth"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const intendedRole = readOAuthIntent(cookieStore.get(OAUTH_INTENT_COOKIE)?.value)
      if (intendedRole) {
        const { data: { user } } = await supabase.auth.getUser()
        const { error: intentError } = user && supabaseAdmin
          ? await supabaseAdmin.from("profiles").update({ intended_role: intendedRole, role: null }).eq("id", user.id).eq("registration_status", "draft")
          : { error: new Error("OAuth role handoff service is unavailable.") }
        if (intentError) {
          console.error("OAuth intended-role handoff failed:", intentError.message)
          const failed = NextResponse.redirect(`${origin}/auth/login?error=oauth_role_handoff_failed`)
          failed.cookies.delete(OAUTH_INTENT_COOKIE)
          return failed
        }
      }
      const response = NextResponse.redirect(`${origin}${next}`)
      response.cookies.delete(OAUTH_INTENT_COOKIE)
      return response
    }
    console.error("OAuth code exchange failed:", error.message)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth_callback_failed`)
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function getPostOAuthPath(role?: string | null): string | null {
  const normalizedRole = role?.trim().toLowerCase()
  if (!normalizedRole) return null
  if (normalizedRole === "admin") return "/dashboard/admin"
  if (normalizedRole === "buyer") return "/dashboard/buyer"
  if (normalizedRole === "supplier") return "/dashboard"
  return "/dashboard"
}

export default function PostOAuthPage() {
  const router = useRouter()

  useEffect(() => {
    setTimeout(async () => {
      if (!supabase) {
        console.error("Post OAuth failed: Supabase client is not configured")
        router.replace("/auth/login?error=supabase_not_configured")
        return
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Post OAuth session lookup failed", sessionError)
      }

      if (!session) {
        console.error("Post OAuth missing session")
        router.replace("/auth/login?error=oauth_failed")
        return
      }

      const provider =
        session.user.app_metadata?.provider ??
        session.user.identities?.[0]?.provider ??
        "unknown"

      console.log("Post OAuth session user", session.user)
      console.log("Post OAuth provider", provider)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()

      if (profileError) {
        console.error("Post OAuth profile role lookup failed", profileError)
      }

      const role = profile?.role?.trim()
      console.log("Post OAuth profile role", role ?? null)

      if (!role) {
        router.replace(
          `/auth/signup?oauth=true&email=${encodeURIComponent(session.user.email ?? "")}`
        )
        return
      }
      router.replace(getPostOAuthPath(role) ?? "/dashboard")
    }, 800)
  }, [router])

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "inherit",
        color: "#1a3a2a",
        fontSize: "15px",
      }}
    >
      Completing sign in…
    </div>
  )
}

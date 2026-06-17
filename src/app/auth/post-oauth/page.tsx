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
    let isMounted = true
    let hasHandledSession = false
    let authSubscription: { unsubscribe: () => void } | null = null
    let authStateTimer: ReturnType<typeof setTimeout> | null = null
    let failureTimer: ReturnType<typeof setTimeout> | null = null

    const completePostOAuth = async () => {
      if (!supabase || !isMounted) return
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Post OAuth session lookup failed", sessionError)
      }

      if (!session || !isMounted) {
        return
      }

      hasHandledSession = true

      const provider =
        session.user.app_metadata?.provider ??
        session.user.identities?.[0]?.provider ??
        "unknown"

      console.log("Post OAuth session user", session.user)
      console.log("Post OAuth provider", provider)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .limit(1)
        .maybeSingle()

      if (profileError) {
        console.error("Post OAuth profile lookup failed", profileError)
        router.replace("/auth/login?error=oauth_failed")
        return
      }

      if (!profile) {
        router.replace("/register?source=oauth")
        return
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
    }

    if (!supabase) {
      console.error("Post OAuth failed: Supabase client is not configured")
      router.replace("/auth/login?error=supabase_not_configured")
      return () => {
        isMounted = false
      }
    }

    void (async () => {
      await completePostOAuth()
      if (!isMounted || hasHandledSession) return

      authStateTimer = setTimeout(() => {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            void completePostOAuth()
          }
        })

        authSubscription = subscription
      }, 1000)

      failureTimer = setTimeout(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session && isMounted && !hasHandledSession) {
          console.error("Post OAuth missing session")
          router.replace("/auth/login?error=oauth_failed")
        }
      }, 5000)
    })()

    return () => {
      isMounted = false
      if (authStateTimer) clearTimeout(authStateTimer)
      if (failureTimer) clearTimeout(failureTimer)
      authSubscription?.unsubscribe()
    }
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

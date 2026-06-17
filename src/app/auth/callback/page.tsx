"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function AuthCallbackContent() {
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let authSubscription: { unsubscribe: () => void } | null = null
    let authStateTimer: ReturnType<typeof setTimeout> | null = null
    let failureTimer: ReturnType<typeof setTimeout> | null = null

    const redirectToPostOAuth = () => {
      if (isMounted) router.replace("/auth/post-oauth")
    }

    if (!supabase) {
      console.error("OAuth callback failed: Supabase client is not configured")
      router.replace("/auth/login?error=supabase_not_configured")
      return () => {
        isMounted = false
      }
    }

    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error("OAuth callback session lookup failed", error)
      }

      if (session) {
        redirectToPostOAuth()
        return true
      }

      return false
    }

    void (async () => {
      const hasSession = await checkSession()
      if (hasSession || !isMounted) return

      authStateTimer = setTimeout(async () => {
        const hasSessionAfterWait = await checkSession()
        if (hasSessionAfterWait || !isMounted) return

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            redirectToPostOAuth()
          }
        })

        authSubscription = subscription
      }, 1000)

      failureTimer = setTimeout(async () => {
        const hasSessionBeforeFailure = await checkSession()
        if (!hasSessionBeforeFailure && isMounted) {
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
      }}
    >
      Completing sign in…
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "inherit",
            color: "#1a3a2a",
          }}
        >
          Completing sign in…
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

"use client"

import { Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasExchangedCode = useRef(false)

  useEffect(() => {
    if (hasExchangedCode.current) return
    hasExchangedCode.current = true

    const code = searchParams.get("code")
    const callbackError = searchParams.get("error")
    const callbackErrorDescription = searchParams.get("error_description")

    if (!code) {
      console.error("OAuth callback missing code", {
        error: callbackError,
        errorDescription: callbackErrorDescription,
      })
      router.replace("/auth/login?error=no_code")
      return
    }

    if (!supabase) {
      console.error("OAuth callback failed: Supabase client is not configured")
      router.replace("/auth/login?error=supabase_not_configured")
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error, data }) => {
      if (error) {
        console.error("OAuth code exchange failed", error)
        router.replace("/auth/login?error=oauth_failed")
        return
      }

      console.log("OAuth code exchange succeeded", {
        userId: data.session?.user.id,
        provider: data.session?.user.app_metadata?.provider,
        providers: data.session?.user.app_metadata?.providers,
      })
      router.replace("/auth/post-oauth")
    })
  }, [searchParams, router])

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

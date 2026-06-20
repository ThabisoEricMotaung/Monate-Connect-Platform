"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

function getPostOAuthPath(role?: string | null): string | null {
  const normalizedRole = role?.trim().toLowerCase()
  if (!normalizedRole) return null
  if (normalizedRole === "admin") return "/dashboard/admin"
  if (normalizedRole === "buyer") return "/dashboard/buyer"
  if (normalizedRole === "supplier") return "/dashboard"
  return "/dashboard"
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function PostOAuthPage() {
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    let fallbackAuthCleanup: (() => void) | null = null

    if (!supabase) {
      const redirectTarget = "/auth/login?error=supabase_not_configured"
      console.error("Post OAuth failed: Supabase client is not configured")
      console.log("Redirecting to:", redirectTarget)
      router.replace(redirectTarget)
      return () => {
        isMounted = false
      }
    }

    async function waitForSession(maxAttempts = 10, delayMs = 500) {
      if (!supabase) return null

      for (let i = 0; i < maxAttempts; i++) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Post OAuth session lookup failed", sessionError)
        }

        if (session) return session

        console.log(`Session attempt ${i + 1} of ${maxAttempts} - waiting...`)
        await sleep(delayMs)
      }

      return null
    }

    function waitForSignedInEvent(timeoutMs = 5000) {
      if (!supabase) return Promise.resolve(null)

      return new Promise<Session | null>((resolve) => {
        let settled = false
        let subscription: { unsubscribe: () => void } | null = null

        const finish = (session: Session | null) => {
          if (settled) return
          settled = true
          clearTimeout(timeout)
          subscription?.unsubscribe()
          fallbackAuthCleanup = null
          resolve(session)
        }

        const timeout = setTimeout(() => {
          finish(null)
        }, timeoutMs)

        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            finish(session)
          }
        })

        subscription = authSubscription
        fallbackAuthCleanup = () => finish(null)
      })
    }

    const completePostOAuth = async () => {
      if (!supabase || !isMounted) return

      let session = await waitForSession()

      if (!session && isMounted) {
        console.log("Post OAuth waiting for SIGNED_IN fallback")
        session = await waitForSignedInEvent()
      }

      if (!session || !isMounted) {
        const redirectTarget = "/auth/login?error=oauth_failed"
        console.log("Post OAuth missing session after all retries")
        console.log("Redirecting to:", redirectTarget)
        router.replace(redirectTarget)
        return
      }

      const provider =
        session.user.app_metadata?.provider ??
        session.user.identities?.[0]?.provider ??
        "unknown"
      const metadataProviders =
        (session.user.app_metadata?.providers as string[] | undefined) ?? []
      const identityProviders =
        session.user.identities?.map((identity) => identity.provider).filter(Boolean) ?? []
      const providersList = Array.from(
        new Set([...metadataProviders, ...identityProviders, provider].map((item) => item.toLowerCase()))
      )
      const isMicrosoftOAuthProvider =
        providersList.includes("azure") || providersList.includes("microsoft")
      const isKnownOAuthProvider = providersList.some((item) =>
        ["google", "azure", "microsoft"].includes(item)
      )

      console.log("Post OAuth session user", session.user)
      console.log("Post OAuth provider", provider)
      console.log("Post OAuth providers", providersList, {
        isKnownOAuthProvider,
        isMicrosoftOAuthProvider,
      })
      console.log("Provider:", provider)

      await sleep(1000)
      if (!isMounted) return

      const lookupProfile = () =>
        supabase
          .from("profiles")
          .select("id, role")
          .eq("id", session.user.id)
          .limit(1)
          .maybeSingle()

      let { data: profile, error: profileError } = await lookupProfile()

      if ((profileError || !profile) && isMounted) {
        if (profileError) {
          console.error("Post OAuth profile lookup failed, retrying", profileError)
        } else {
          console.log("Post OAuth profile missing, retrying once")
        }

        await sleep(500)
        if (!isMounted) return

        const retryResult = await lookupProfile()
        profile = retryResult.data
        profileError = retryResult.error
      }

      console.log("Profile found:", !!profile)

      if (profileError) {
        const redirectTarget = "/auth/login?error=oauth_failed"
        console.error("Post OAuth profile lookup failed", profileError)
        console.log("Redirecting to:", redirectTarget)
        router.replace(redirectTarget)
        return
      }

      if (!profile) {
        const redirectTarget = "/register?source=oauth"
        console.log("Redirecting to:", redirectTarget)
        router.replace(redirectTarget)
        return
      }

      const role = profile?.role?.trim()
      console.log("Post OAuth profile role", role ?? null)

      if (!role) {
        const redirectTarget = `/auth/signup?oauth=true&email=${encodeURIComponent(session.user.email ?? "")}`
        console.log("Redirecting to:", redirectTarget)
        router.replace(redirectTarget)
        return
      }

      const redirectTarget = getPostOAuthPath(role) ?? "/dashboard"
      console.log("Redirecting to:", redirectTarget)
      router.replace(redirectTarget)
    }

    void completePostOAuth()

    return () => {
      isMounted = false
      fallbackAuthCleanup?.()
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
      Completing sign in...
    </div>
  )
}

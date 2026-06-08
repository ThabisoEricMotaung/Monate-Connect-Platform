"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function exchange() {
      if (!supabase) {
        router.replace("/auth/login")
        return
      }

      const hash = window.location.hash
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      } else {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get("code")
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
      }

      router.replace("/dashboard")
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/dashboard")
      }
    })

    exchange()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-primary">
      <div className="text-center">
        <p className="text-sm text-secondary">Verifying your account…</p>
        <p className="mt-2 text-xs text-muted">You will be redirected automatically.</p>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

type VerifyState = "verifying" | "success"

function getPostVerifyPath(role?: string | null): string {
  const r = role?.trim().toLowerCase()
  if (r === "admin") return "/dashboard/admin"
  if (r === "buyer") return "/dashboard/buyer"
  if (r === "supplier") return "/dashboard"
  return "/dashboard/onboarding"
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [state, setState] = useState<VerifyState>("verifying")

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    async function handleCallback() {
      if (!supabase) {
        router.replace("/auth/login?verified=1")
        return
      }

      // Hash-based token (older Supabase implicit flow)
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash)
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      } else {
        // PKCE code flow
        const code = new URLSearchParams(window.location.search).get("code")
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        // Confirmation acknowledged but no auto-login — send to login with verified flag
        router.replace("/auth/login?verified=1")
        return
      }

      // Route by the database profile role only. Login UI choices and auth
      // metadata are not authoritative for workspace access.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()

      if (profileError) {
        console.error(profileError)
      }

      setState("success")
      timer = setTimeout(() => {
        router.replace(getPostVerifyPath(profile?.role ?? null))
      }, 1800)
    }

    handleCallback()

    return () => {
      clearTimeout(timer)
    }
  }, [router])

  if (state === "success") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-heading">Email verified</h1>
          <p className="mt-2 text-sm text-secondary">
            Welcome to Monate Connect — opening your workspace&hellip;
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="text-center">
        <p className="text-sm text-secondary">Verifying your email&hellip;</p>
        <p className="mt-2 text-xs text-muted">You will be redirected automatically.</p>
      </div>
    </main>
  )
}

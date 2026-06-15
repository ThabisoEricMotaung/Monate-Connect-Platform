"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

export default function PostOAuthPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/auth/login?error=oauth_failed")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
      const role = profile?.role?.trim()
      if (!role) {
        router.replace(
          `/auth/signup?oauth=true&email=${encodeURIComponent(session.user.email ?? "")}`
        )
        return
      }
      switch (role) {
        case "admin":
          router.replace("/dashboard/admin")
          break
        case "buyer":
          router.replace("/dashboard/buyer")
          break
        case "supplier":
          router.replace("/dashboard/supplier")
          break
        default:
          router.replace("/dashboard")
      }
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

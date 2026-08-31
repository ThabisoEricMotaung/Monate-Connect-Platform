"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function HelpPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirectToThuso() {
      try {
        if (!supabase) return
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.replace("/auth/login")
          return
        }
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
        const normalizedRole = data?.role?.trim().toLowerCase()
        if (normalizedRole === "buyer" || normalizedRole === "admin") {
          router.replace("/dashboard/buyer/workspace?rfqId=1")
        } else {
          router.replace("/dashboard/supplier/workspace?rfqId=1")
        }
      } catch (error) {
        router.replace("/dashboard")
      }
    }
    redirectToThuso()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Redirecting to Command Centre...</p>
    </div>
  )
}

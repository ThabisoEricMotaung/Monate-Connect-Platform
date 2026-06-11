"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"

type RoleState = {
  role: string | null
  loading: boolean
}

function roleHomePath(role: string | null): string {
  const r = role?.trim().toLowerCase()
  if (r === "admin") return "/dashboard/admin"
  if (r === "buyer") return "/dashboard/buyer"
  return "/dashboard"
}

export function useRequireRole(allowed: string[]): RoleState {
  const router = useRouter()
  const [state, setState] = useState<RoleState>({ role: null, loading: true })

  useEffect(() => {
    let cancelled = false
    const normalizedAllowed = allowed.map((r) => r.toLowerCase())

    async function check() {
      const profile = await getCurrentProfile()
      const role = profile?.role?.trim().toLowerCase() ?? null

      if (cancelled) return

      if (!role || !normalizedAllowed.includes(role)) {
        router.replace(roleHomePath(role))
        return
      }

      setState({ role, loading: false })
    }

    check()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}

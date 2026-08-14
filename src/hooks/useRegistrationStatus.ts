"use client"

import { useEffect, useState } from "react"
import { roleHomeHref } from "@/lib/navigation"
import { supabase } from "@/lib/supabase"
import { hasCompletedRegistration } from "@/lib/registration"

type RegistrationState = "loading" | "signed-out" | "complete" | "incomplete"

type RegistrationStatus = {
  dashboardHref: string | null
  state: RegistrationState
}

export function useRegistrationStatus(): RegistrationStatus {
  const [status, setStatus] = useState<RegistrationStatus>({
    dashboardHref: null,
    state: "loading",
  })

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      if (!supabase) {
        if (!cancelled) setStatus({ dashboardHref: null, state: "signed-out" })
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        if (!cancelled) setStatus({ dashboardHref: null, state: "signed-out" })
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, registration_status")
        .eq("id", session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error("Homepage registration status check failed:", error)
        setStatus({ dashboardHref: null, state: "incomplete" })
        return
      }

      if (!data) {
        setStatus({ dashboardHref: null, state: "incomplete" })
        return
      }

      if (!hasCompletedRegistration(data)) {
        setStatus({ dashboardHref: null, state: "incomplete" })
      } else {
        setStatus({ dashboardHref: roleHomeHref(data.role), state: "complete" })
      }
    }

    loadStatus()

    return () => {
      cancelled = true
    }
  }, [])

  return status
}

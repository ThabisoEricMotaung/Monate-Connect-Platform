"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

export async function logEvent(
  eventType: string,
  metadata?: Record<string, unknown>,
) {
  if (!supabase) return

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("session_events").insert({
      user_id: user.id,
      event_type: eventType,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      metadata: metadata ?? null,
    })
  } catch {
    // Session logging should never interrupt the user's workflow.
  }
}

export function usePageTracking() {
  const pathname = usePathname()
  const enteredAt = useRef(Date.now())
  const lastPath = useRef(pathname)

  useEffect(() => {
    const now = Date.now()
    const duration = Math.round((now - enteredAt.current) / 1000)

    if (lastPath.current !== pathname && duration > 1) {
      void logEvent("page_exit", {
        path: lastPath.current,
        duration_seconds: duration,
      })
    }

    void logEvent("page_view", { path: pathname })
    enteredAt.current = now
    lastPath.current = pathname
  }, [pathname])
}

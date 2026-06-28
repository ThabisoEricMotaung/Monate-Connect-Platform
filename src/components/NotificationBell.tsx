"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getNotifications, type Notification } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"

export default function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      const loadedNotifications = await getNotifications(20)

      if (!cancelled) {
        setNotifications(loadedNotifications)
      }
    }

    loadNotifications()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications()
      }
    }, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    const client = supabase
    let channel: ReturnType<typeof client.channel> | null = null

    async function subscribe() {
      const {
        data: { user },
      } = await client.auth.getUser()

      if (!user) return

      channel = client
        .channel(`notification-bell-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            setNotifications(await getNotifications(20))
          },
        )
        .subscribe()
    }

    subscribe()

    return () => {
      if (channel) {
        client.removeChannel(channel)
      }
    }
  }, [])

  return (
    <button
      type="button"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      onClick={() => router.push("/dashboard/messages?notifications=1")}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-panel bg-panel text-heading shadow-sm transition hover:border-accent hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30"
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022 23.848 23.848 0 0 0 5.455 1.31m5.714 0a3 3 0 0 1-5.714 0"
        />
      </svg>
      {unreadCount > 0 && (
        <>
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-600" />
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-panel bg-rose-600 px-1 text-[0.65rem] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        </>
      )}
    </button>
  )
}


"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getNotifications,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications"
import { supabase } from "@/lib/supabase"

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "Just now"

  return new Date(dateStr).toLocaleString("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function notificationTone(type: string): string {
  if (type.includes("Awarded") || type.includes("Approved") || type.includes("Issued")) {
    return "border-success bg-success-soft text-success"
  }

  if (type.includes("Rejected") || type.includes("Deadline")) {
    return "border-warning bg-warning-soft text-warning"
  }

  return "border-accent-soft bg-accent-soft text-accent-strong"
}

export default function NotificationBell() {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      setLoading(true)
      const loadedNotifications = await getNotifications(8)

      if (!cancelled) {
        setNotifications(loadedNotifications)
        setLoading(false)
      }
    }

    loadNotifications()

    return () => {
      cancelled = true
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
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          async () => {
            setNotifications(await getNotifications(8))
          }
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

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)

    return () => document.removeEventListener("mousedown", handleDocumentClick)
  }, [open])

  async function handleOpenNotification(notification: Notification) {
    if (!notification.read) {
      await markNotificationRead(notification.id)
      setNotifications((currentNotifications) =>
        currentNotifications.map((currentNotification) =>
          currentNotification.id === notification.id
            ? { ...currentNotification, read: true }
            : currentNotification
        )
      )
    }

    setOpen(false)

    if (notification.link) {
      router.push(notification.link)
    }
  }

  async function handleMarkRead(notificationId: number) {
    await markNotificationRead(notificationId)
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        onClick={() => setOpen((current) => !current)}
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
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-panel bg-warning px-1 text-[0.65rem] font-bold text-button">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="flex items-center justify-between gap-4 border-b border-panel bg-panel px-4 py-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">
                Procurement Alerts
              </p>
              <p className="mt-1 text-sm font-semibold text-heading">
                Notification Center
              </p>
            </div>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-accent transition hover:text-accent-strong"
            >
              View all
            </Link>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-md bg-panel"
                  />
                ))}
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-heading">
                  No notifications yet.
                </p>
                <p className="mt-2 text-xs text-muted">
                  Procurement updates will appear here in real time.
                </p>
              </div>
            )}

            {!loading &&
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`border-b border-panel p-4 transition hover:bg-surface ${
                    notification.read ? "opacity-75" : "bg-surface/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] ${notificationTone(notification.type)}`}
                      >
                        {notification.type}
                      </span>
                      <span className="whitespace-nowrap text-[0.68rem] text-muted">
                        {formatDateTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-heading">
                      {notification.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-secondary">
                      {notification.message}
                    </p>
                  </button>
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification.id)}
                      className="mt-3 text-xs font-semibold text-accent transition hover:text-accent-strong"
                    >
                      Mark read
                    </button>
                  )}
                </article>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

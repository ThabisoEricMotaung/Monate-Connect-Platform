"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getNotifications,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications"

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
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

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadNotifications() {
      setNotifications(await getNotifications(50))
      setLoading(false)
    }

    loadNotifications()
  }, [])

  async function handleOpen(notification: Notification) {
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
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Live Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Notifications
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review real-time procurement alerts for RFQs, quotes, verification,
          purchase orders, and clarification responses.
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-md border border-panel bg-card shadow-panel"
            />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No notifications yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            New procurement events will appear here as they happen.
          </p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`border-b border-panel p-5 last:border-b-0 ${
                notification.read ? "" : "bg-surface"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <button
                  type="button"
                  onClick={() => handleOpen(notification)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${notificationTone(notification.type)}`}
                    >
                      {notification.type}
                    </span>
                    {!notification.read && (
                      <span className="rounded-md border border-warning bg-warning-soft px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-warning">
                        New
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-heading">
                    {notification.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
                    {notification.message}
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    {formatDateTime(notification.created_at)}
                  </p>
                </button>

                <div className="flex flex-wrap gap-2">
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification.id)}
                      className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
                    >
                      Mark read
                    </button>
                  )}
                  {notification.link && (
                    <button
                      type="button"
                      onClick={() => handleOpen(notification)}
                      className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

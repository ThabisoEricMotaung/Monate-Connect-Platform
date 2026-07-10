import { getInboxMessages, inboxChangedEvent } from "@/lib/messages"
import { getNotifications, notificationReadEvent } from "@/lib/notifications"

export type InboxUnreadCounts = {
  unreadMessages: number
  unreadNotifications: number
  total: number
}

export async function getInboxUnreadCounts(): Promise<InboxUnreadCounts> {
  const [messages, notifications] = await Promise.all([
    getInboxMessages(),
    getNotifications(),
  ])

  const unreadMessages = messages.filter((message) => !message.is_read).length
  const unreadNotifications = notifications.filter((notification) => !notification.read).length

  return {
    unreadMessages,
    unreadNotifications,
    total: unreadMessages + unreadNotifications,
  }
}

/**
 * Keeps sidebar/bell unread badges honest: they otherwise only refresh on a
 * 30s poll, so actions like restoring or deleting a message on the Messages
 * page leave every other badge on screen showing a stale count until the
 * next poll tick.
 *
 * This is driven entirely by the window events messages.ts/notifications.ts
 * dispatch right after a mutation succeeds - they fire in-tab regardless of
 * Supabase project configuration. An earlier version of this also opened
 * postgres_changes channels as a "best effort" layer on top, but this
 * project's "messages" and "notifications" tables were never added to the
 * supabase_realtime publication, so those channels never delivered a single
 * event - and because dashboard/layout.tsx and its admin/buyer child layout
 * both call this for the same user on the same page, they raced to open a
 * channel with the same name and crashed with "cannot add postgres_changes
 * callbacks ... after subscribe()". Removed rather than deduped: it did
 * nothing functional and was actively breaking the page.
 */
export function subscribeToInboxActivity(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  window.addEventListener(inboxChangedEvent, onChange)
  window.addEventListener(notificationReadEvent, onChange)

  return () => {
    window.removeEventListener(inboxChangedEvent, onChange)
    window.removeEventListener(notificationReadEvent, onChange)
  }
}

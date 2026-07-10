import { getInboxMessages, inboxChangedEvent } from "@/lib/messages"
import { getNotifications, notificationReadEvent } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"

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
 * The window events (dispatched by messages.ts/notifications.ts right after
 * a mutation succeeds) are the primary signal - they fire in-tab regardless
 * of Supabase project configuration. The postgres_changes subscriptions are
 * best-effort on top of that: this project's "messages" and "notifications"
 * tables are not currently added to the supabase_realtime publication, so
 * those events never arrive today, but subscribing is harmless and picks up
 * automatically (including cross-tab updates) once that's turned on.
 */
export function subscribeToInboxActivity(userId: string, onChange: () => void): () => void {
  if (typeof window !== "undefined") {
    window.addEventListener(inboxChangedEvent, onChange)
    window.addEventListener(notificationReadEvent, onChange)
  }

  let removeRealtimeChannels = () => {}
  if (supabase && userId) {
    const client = supabase
    const messagesChannel = client
      .channel(`inbox-activity-messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        onChange,
      )
      .subscribe()

    const notificationsChannel = client
      .channel(`inbox-activity-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe()

    removeRealtimeChannels = () => {
      client.removeChannel(messagesChannel)
      client.removeChannel(notificationsChannel)
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(inboxChangedEvent, onChange)
      window.removeEventListener(notificationReadEvent, onChange)
    }
    removeRealtimeChannels()
  }
}

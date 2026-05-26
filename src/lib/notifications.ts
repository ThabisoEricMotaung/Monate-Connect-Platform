import { supabase } from "@/lib/supabase"

export type NotificationType =
  | "RFQ Match"
  | "RFQ Deadline"
  | "Quote Submitted"
  | "Quote Awarded"
  | "Verification Approved"
  | "Verification Rejected"
  | "Purchase Order Issued"
  | "Clarification Response"
  | "Compliance Expiry Warning"

export type Notification = {
  id: number
  recipient_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export type CreateNotificationInput = {
  recipientId: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, unknown> | null
}

export async function createNotification({
  recipientId,
  type,
  title,
  message,
  link = null,
  metadata = null,
}: CreateNotificationInput): Promise<Notification | null> {
  if (!supabase || !recipientId) return null

  const { data, error } = await supabase
    .from("notifications")
    .insert([
      {
        recipient_id: recipientId,
        type,
        title,
        message,
        link,
        metadata,
        read: false,
      },
    ])
    .select("id, recipient_id, type, title, message, link, read, metadata, created_at")
    .single()

  if (error) {
    console.error("Notification creation failed:", error)
    return null
  }

  return data as Notification
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  if (!supabase) return []

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return []

  const { data, error } = await supabase
    .from("notifications")
    .select("id, recipient_id, type, title, message, link, read, metadata, created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Notifications failed to load:", error)
    return []
  }

  return (data ?? []) as Notification[]
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)

  if (error) {
    console.error("Notification read update failed:", error)
  }
}

export async function createNotificationsForRoles(
  roles: string[],
  notification: Omit<CreateNotificationInput, "recipientId">
): Promise<void> {
  if (!supabase || roles.length === 0) return

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .in("role", roles)

  if (error) {
    console.error("Notification recipient lookup failed:", error)
    return
  }

  await Promise.all(
    (data ?? []).map((profile) =>
      createNotification({
        ...notification,
        recipientId: profile.id as string,
      })
    )
  )
}

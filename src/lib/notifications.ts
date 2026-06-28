import { supabase } from "@/lib/supabase"

export type NotificationType =
  | "RFQ Match"
  | "RFQ Deadline"
  | "Quote Submitted"
  | "Quote Awarded"
  | "Verification Approved"
  | "Verification Rejected"
  | "Purchase Order Issued"
  | "Contract Expiring"
  | "Invoice Approved"
  | "Payment Paid"
  | "Clarification Response"
  | "Compliance Expiry Warning"

export type Notification = {
  id: number
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string | null
}

export type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, unknown>
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
}: CreateNotificationInput): Promise<Notification | null> {
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from("notifications")
    .insert([{ user_id: userId, type, title, message, link, is_read: false }])
    .select("id, user_id, type, title, message, link, is_read, created_at")
    .single()

  if (error) {
    console.error("Notification creation failed:", error)
    return null
  }

  return { ...data, read: data.is_read } as Notification
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
    .select("id, user_id, type, title, message, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Notifications failed to load:", error)
    return []
  }

  return (data ?? []).map((n) => ({ ...n, read: n.is_read })) as Notification[]
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)

  if (error) {
    console.error("Notification read update failed:", error)
  }
}

export async function createNotificationsForRoles(
  roles: string[],
  notification: Omit<CreateNotificationInput, "userId">
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
      createNotification({ ...notification, userId: profile.id as string })
    )
  )
}

import { supabase } from "@/lib/supabase"
import { createNotification } from "@/lib/notifications"

export type ProcurementMessage = {
  id: number
  sender_id: string
  receiver_id: string
  subject: string
  message: string
  rfq_id: number | null
  quote_id: number | null
  is_read: boolean
  deleted_by_sender: boolean | null
  deleted_by_receiver: boolean | null
  created_at: string | null
}

export type SendMessageInput = {
  receiverId: string
  subject: string
  message: string
  rfqId?: number | string | null
  quoteId?: number | string | null
}

const messageSelect =
  "id, sender_id, receiver_id, subject, message, rfq_id, quote_id, is_read, deleted_by_sender, deleted_by_receiver, created_at"
const legacyMessageSelect =
  "id, sender_id, receiver_id, subject, message, rfq_id, quote_id, is_read, created_at"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function describeSupabaseError(error: {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}) {
  return [
    error.message,
    error.code ? `Code: ${error.code}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ]
    .filter(Boolean)
    .join(" | ")
}

function normalizeOptionalNumericId(
  value: number | string | null | undefined,
  label: string
): number | null {
  if (value == null || value === "") return null

  const numericValue = typeof value === "number" ? value : Number(value)

  if (!Number.isSafeInteger(numericValue) || numericValue < 1) {
    throw new Error(`${label} must be a number.`)
  }

  return numericValue
}

export async function sendMessage({
  receiverId,
  subject,
  message,
  rfqId = null,
  quoteId = null,
}: SendMessageInput): Promise<ProcurementMessage> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.")
  }

  if (!receiverId.trim()) {
    throw new Error("Receiver ID is required.")
  }

  if (!subject.trim()) {
    throw new Error("Subject is required.")
  }

  if (!message.trim()) {
    throw new Error("Message body is required.")
  }

  const normalizedReceiverId = receiverId.trim()

  if (!uuidPattern.test(normalizedReceiverId)) {
    throw new Error("Receiver ID must be a valid UUID.")
  }

  const normalizedRfqId = normalizeOptionalNumericId(rfqId, "RFQ ID")
  const normalizedQuoteId = normalizeOptionalNumericId(quoteId, "Quote ID")

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("Message auth lookup failed:", userError)
    throw new Error(describeSupabaseError(userError))
  }

  if (!user) {
    throw new Error("User not authenticated.")
  }

  const payload = {
    sender_id: user.id,
    receiver_id: normalizedReceiverId,
    rfq_id: normalizedRfqId,
    quote_id: normalizedQuoteId,
    subject: subject.trim(),
    message: message.trim(),
    is_read: false,
  }

  console.log("Message insert payload:", {
    table: "messages",
    payload,
  })

  const { data, error } = await supabase
    .from("messages")
    .insert([payload])
    .select(legacyMessageSelect)
    .single()

  if (error) {
    console.error("Message insert error:", error)
    console.error("Message send failed:", {
      table: "messages",
      payload,
      error,
    })
    throw new Error(error.message)
  }

  await createNotification({
    userId: normalizedReceiverId,
    type: "Message Received",
    title: subject.trim(),
    message: message.trim(),
    link: `/dashboard/messages?thread_message=${data.id}`,
  })

  return {
    ...data,
    deleted_by_sender: false,
    deleted_by_receiver: false,
  } as ProcurementMessage
}

export async function getInboxMessages(): Promise<ProcurementMessage[]> {
  if (!supabase) return []

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return []

  const { data, error } = await supabase
    .from("messages")
    .select(messageSelect)
    .eq("receiver_id", user.id)
    .or("deleted_by_receiver.is.null,deleted_by_receiver.eq.false")
    .order("created_at", { ascending: false })

  if (error) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("messages")
      .select(legacyMessageSelect)
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })

    if (legacyError) {
      console.error("Inbox messages failed to load:", legacyError)
      return []
    }

    return (legacyData ?? []).map((message) => ({
      ...message,
      deleted_by_sender: null,
      deleted_by_receiver: null,
    })) as ProcurementMessage[]
  }

  return (data ?? []) as ProcurementMessage[]
}

export async function getSentMessages(): Promise<ProcurementMessage[]> {
  if (!supabase) return []

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return []

  const { data, error } = await supabase
    .from("messages")
    .select(messageSelect)
    .eq("sender_id", user.id)
    .or("deleted_by_sender.is.null,deleted_by_sender.eq.false")
    .order("created_at", { ascending: false })

  if (error) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("messages")
      .select(legacyMessageSelect)
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })

    if (legacyError) {
      console.error("Sent messages failed to load:", legacyError)
      return []
    }

    return (legacyData ?? []).map((message) => ({
      ...message,
      deleted_by_sender: null,
      deleted_by_receiver: null,
    })) as ProcurementMessage[]
  }

  return (data ?? []) as ProcurementMessage[]
}

export async function markMessageRead(messageId: number): Promise<void> {
  if (!supabase) return

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("id", messageId)
    .eq("receiver_id", user.id)

  if (error) {
    console.error("Message read update failed:", error)
  }
}

export async function removeMessageFromInbox(messageId: number): Promise<void> {
  if (!supabase) throw new Error("Supabase environment variables are not configured.")

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error("User not authenticated.")

  const { data: message, error: lookupError } = await supabase
    .from("messages")
    .select("sender_id, receiver_id")
    .eq("id", messageId)
    .maybeSingle()

  if (lookupError || !message) {
    throw new Error(lookupError?.message || "Message was not found.")
  }

  const field =
    message.sender_id === user.id
      ? "deleted_by_sender"
      : message.receiver_id === user.id
        ? "deleted_by_receiver"
        : null

  if (!field) throw new Error("You cannot remove this message.")

  const { error } = await supabase
    .from("messages")
    .update({ [field]: true })
    .eq("id", messageId)

  if (error) throw new Error(error.message)
}

export async function removeThreadFromInbox(messageIds: number[]): Promise<void> {
  await Promise.all(messageIds.map((messageId) => removeMessageFromInbox(messageId)))
}

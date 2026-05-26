import { supabase } from "@/lib/supabase"

export type ProcurementMessage = {
  id: number
  sender_id: string
  receiver_id: string
  subject: string
  message: string
  rfq_id: number | null
  quote_id: number | null
  read: boolean
  created_at: string | null
}

export type SendMessageInput = {
  receiverId: string
  subject: string
  message: string
  rfqId?: number | null
  quoteId?: number | null
}

const messageSelect =
  "id, sender_id, receiver_id, subject, message, rfq_id, quote_id, read, created_at"

export async function sendMessage({
  receiverId,
  subject,
  message,
  rfqId = null,
  quoteId = null,
}: SendMessageInput): Promise<ProcurementMessage | null> {
  if (!supabase || !receiverId || !subject.trim() || !message.trim()) {
    return null
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        sender_id: user.id,
        receiver_id: receiverId,
        subject: subject.trim(),
        message: message.trim(),
        rfq_id: rfqId,
        quote_id: quoteId,
        read: false,
      },
    ])
    .select(messageSelect)
    .single()

  if (error) {
    console.error("Message send failed:", error)
    return null
  }

  return data as ProcurementMessage
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
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Inbox messages failed to load:", error)
    return []
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
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Sent messages failed to load:", error)
    return []
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
    .update({ read: true })
    .eq("id", messageId)
    .eq("receiver_id", user.id)

  if (error) {
    console.error("Message read update failed:", error)
  }
}

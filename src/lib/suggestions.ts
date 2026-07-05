import { cleanSuggestionAttachmentFileName } from "@/lib/suggestionAttachments"
import { supabase } from "@/lib/supabase"

export type SuggestionCategory = "Feature idea" | "Bug report" | "General"

export type SuggestionRecord = {
  id: number
  user_id: string | null
  display_name: string | null
  category: string | null
  message: string
  attachment_path: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: string | null
  attachment_size: number | null
  admin_response: string | null
  admin_reaction: string | null
  admin_rating: number | null
  admin_responded_at: string | null
  created_at: string
}

type SuggestionAttachment = {
  attachment_path: string
  attachment_url: string
  attachment_name: string
  attachment_type: string
  attachment_size: number
}

export type SubmitSuggestionInput = {
  userId: string
  displayName: string
  email: string | null
  category: SuggestionCategory
  message: string
  file?: File | null
}

export const suggestionSelect =
  "id, user_id, display_name, category, message, attachment_path, attachment_url, attachment_name, attachment_type, attachment_size, admin_response, admin_reaction, admin_rating, admin_responded_at, created_at"

export async function uploadSuggestionAttachment(
  currentUserId: string,
  file: File | null,
): Promise<SuggestionAttachment | null> {
  if (!file || !supabase) return null

  const path = `${currentUserId}/${Date.now()}-${cleanSuggestionAttachmentFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from("suggestion-attachments")
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("suggestion-attachments").getPublicUrl(path)

  return {
    attachment_path: path,
    attachment_url: data.publicUrl || path,
    attachment_name: file.name,
    attachment_type: file.type,
    attachment_size: file.size,
  }
}

export async function submitSuggestion(input: SubmitSuggestionInput): Promise<SuggestionRecord> {
  if (!supabase) throw new Error("Suggestion capture is not configured yet.")
  if (!input.userId) throw new Error("Please sign in to submit a suggestion.")

  const message = input.message.trim()
  if (!message) throw new Error("Please enter a suggestion.")

  const attachment = await uploadSuggestionAttachment(input.userId, input.file ?? null)
  const payload = {
    user_id: input.userId,
    display_name: input.displayName,
    email: input.email,
    category: input.category,
    message,
    created_at: new Date().toISOString(),
    ...(attachment ?? {}),
  }

  const { data, error: insertError } = await supabase
    .from("suggestions")
    .insert(payload)
    .select(suggestionSelect)
    .single()

  if (insertError) throw insertError

  return data as SuggestionRecord
}

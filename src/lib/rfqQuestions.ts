import { supabase } from "@/lib/supabase"

export type RFQQuestion = {
  id: number
  rfq_id: number
  supplier_id: string | null
  supplier_email: string | null
  question: string
  answer: string | null
  answered_at: string | null
  answered_by: string | null
  created_at: string | null
}

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

export async function createRFQQuestion({
  rfq_id,
  question,
}: {
  rfq_id: number
  question: string
}) {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error("User not authenticated")

  const payload = {
    rfq_id,
    question: question.trim(),
    supplier_id: user.id,
    supplier_email: user.email ?? null,
  }

  const { data, error } = await supabase
    .from("rfq_questions")
    .insert([payload])
    .select("id, rfq_id, supplier_id, supplier_email, question, answer, answered_at, answered_by, created_at")
    .single()

  if (error) {
    console.error("RFQ question insert failed:", {
      table: "rfq_questions",
      payload,
      error,
    })
    throw new Error(describeSupabaseError(error))
  }

  return data as RFQQuestion
}

export async function getRFQQuestions(rfq_id: number): Promise<RFQQuestion[]> {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const { data, error } = await supabase
    .from("rfq_questions")
    .select("id, rfq_id, supplier_id, supplier_email, question, answer, answered_at, answered_by, created_at")
    .eq("rfq_id", rfq_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("RFQ questions load failed:", {
      table: "rfq_questions",
      rfq_id,
      error,
    })
    throw new Error(describeSupabaseError(error))
  }

  return (data ?? []) as RFQQuestion[]
}

export async function answerRFQQuestion(questionId: number, answer: string) {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error("User not authenticated")

  const payload = {
    answer: answer.trim(),
    answered_at: new Date().toISOString(),
    answered_by: user.id,
  }

  const { data, error } = await supabase
    .from("rfq_questions")
    .update(payload)
    .eq("id", questionId)
    .select("id, rfq_id, supplier_id, supplier_email, question, answer, answered_at, answered_by, created_at")
    .single()

  if (error) {
    console.error("RFQ question answer update failed:", {
      table: "rfq_questions",
      questionId,
      payload,
      error,
    })
    throw new Error(describeSupabaseError(error))
  }

  return data as RFQQuestion
}

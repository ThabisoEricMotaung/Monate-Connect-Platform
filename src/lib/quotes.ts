import { supabase } from "./supabase"
import { logActivity } from "./activity"
import { logAuditAction } from "./audit"
import { notifyQuoteSubmitted } from "./automationRules"

export async function submitQuote(data: {
  rfq_id: number
  supplier_name: string
  amount: string
  message: string
}) {
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  const { data: quoteData, error } = await supabase
    .from("quotes")
    .insert([
      {
        ...data,
        supplier_id: user.id,
        status: "Pending",
      },
    ])
    .select("id")
    .single()

  if (error) {
    console.error(error)
    throw error
  }

  try {
    await logAuditAction({
      action: "quote.submitted",
      entity_type: "quote",
      entity_id: quoteData?.id ?? null,
      old_values: null,
      new_values: {
        ...data,
        supplier_id: user.id,
        status: "Pending",
      },
      metadata: {
        rfq_id: data.rfq_id,
        supplier_name: data.supplier_name,
        amount: data.amount,
      },
    })
    await logActivity({
      action: "quote.submitted",
      entity_type: "quote",
      entity_id: quoteData?.id ?? null,
      metadata: {
        rfq_id: data.rfq_id,
        supplier_name: data.supplier_name,
        amount: data.amount,
      },
    })
  } catch (auditError) {
    console.warn("Quote submission audit/activity logging failed:", auditError)
  }

  await notifyQuoteSubmitted({
    id: quoteData?.id ?? null,
    ...data,
    supplier_id: user.id,
    status: "Pending",
  })
}

export async function getQuotes() {
  if (!supabase) {
    return []
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from("quotes")
    .select(`
      *,
      rfqs (
        title
      )
    `)
    .eq("supplier_id", user.id)
    .order("id", { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data
}

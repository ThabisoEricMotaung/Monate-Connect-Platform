import { supabase } from "./supabase"

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

  const { error } = await supabase
    .from("quotes")
    .insert([
      {
        ...data,
        supplier_id: user.id,
        status: "Pending",
      },
    ])

  if (error) {
    console.error(error)
    throw error
  }
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

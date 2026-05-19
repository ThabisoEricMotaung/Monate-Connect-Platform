import { supabase } from "./supabase"

export async function submitQuote(data: {
  rfq_id: number
  supplier_name: string
  amount: string
  message: string
}) {

  const { error } = await supabase
    .from("quotes")
    .insert([
      {
        ...data,
        status: "Pending",
      },
    ])

  if (error) {
    console.error(error)
    throw error
  }
}

export async function getQuotes() {

  const { data, error } = await supabase
    .from("quotes")
    .select(`
      *,
      rfqs (
        title
      )
    `)
    .order("id", { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data
}
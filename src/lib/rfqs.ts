import { supabase } from "./supabase"

export async function getRFQs() {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from("rfqs")
    .select("*")
    .order("id")

  if (error) {
    console.error(error)
    return []
  }

  return data
}

export async function getRFQById(id: string) {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from("rfqs")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error(error)
    return null
  }

  return data
}

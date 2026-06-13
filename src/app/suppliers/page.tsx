import { createClient } from "@supabase/supabase-js"
import SupplierDirectory, { type PublicSupplierDirectoryRow } from "./SupplierDirectory"

async function getPublicSuppliers(): Promise<PublicSupplierDirectoryRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return []

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await supabase
    .from("public_supplier_directory")
    .select(
      "id,business_name,province,provinces,industry,bbbee_level,cidb_grade,smart_score,csd_verified,bbbee_verified,tax_verified,banking_verified,bank_verified,director_verified,website,description,employee_count,linkedin_url,founded_year,created_at"
    )
    .order("smart_score", { ascending: false, nullsFirst: false })
    .order("business_name", { ascending: true })

  if (error) {
    console.error("Public supplier directory fetch failed:", error)
    return []
  }

  return (data ?? []) as PublicSupplierDirectoryRow[]
}

export default async function SuppliersPage() {
  const suppliers = await getPublicSuppliers()

  return <SupplierDirectory suppliers={suppliers} />
}

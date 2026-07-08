import { createClient } from "@supabase/supabase-js"
import SupplierDirectory, { type PublicSupplierDirectoryRow } from "./SupplierDirectory"

async function getPublicSuppliers(): Promise<PublicSupplierDirectoryRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured")
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const baseSelect =
    "id,business_name,province,provinces,industry,bbbee_level,cidb_grade,smart_score,csd_verified,bbbee_verified,tax_verified,banking_verified,bank_verified,director_verified,website,description,employee_count,linkedin_url,founded_year,created_at"
  let { data, error } = await supabase
    .from("profiles")
    .select(`${baseSelect},company_logo_url`)
    .eq("role", "supplier")
    .order("smart_score", { ascending: false, nullsFirst: false })
    .order("business_name", { ascending: true })

  if (error?.code === "42703") {
    const retry = await supabase
      .from("profiles")
      .select(baseSelect)
      .eq("role", "supplier")
      .order("smart_score", { ascending: false, nullsFirst: false })
      .order("business_name", { ascending: true })
    data = retry.data?.map((supplier) => ({ ...supplier, company_logo_url: null })) ?? null
    error = retry.error
  }

  if (error) {
    console.error("Public supplier directory fetch failed:", error)
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as PublicSupplierDirectoryRow[]
}

export default async function SuppliersPage() {
  let suppliers: PublicSupplierDirectoryRow[] = []
  let errorMessage = ""

  try {
    suppliers = await getPublicSuppliers()
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Supplier directory is temporarily unavailable."
  }

  return <SupplierDirectory suppliers={suppliers} errorMessage={errorMessage} />
}

import { createClient } from "@supabase/supabase-js"
import { buildSupplierActivityById } from "@/lib/intelligence"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { isVerifiedStatus } from "@/lib/supplierStatus"
import SupplierDirectory, { type PublicSupplierDirectoryRow } from "./SupplierDirectory"

export const dynamic = "force-dynamic"

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
    "id,business_name,province,provinces,industry,phone,email,verification_status,bbbee_level,cidb_grade,smart_score,csd_number,csd_verified,bbbee_verified,tax_status,tax_verified,company_registration,director_verified,banking_verified,bank_verified,website,description,employee_count,linkedin_url,founded_year,created_at,updated_at,csd_document_url,bbbee_document_url,tax_document_url,company_registration_url,cidb_document_url,capability_statement_url"
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

  const rows = (data ?? []) as Array<PublicSupplierDirectoryRow & {
    phone?: string | null
    email?: string | null
    csd_number?: string | null
    tax_status?: string | null
    company_registration?: string | null
    updated_at?: string | null
    csd_document_url?: string | null
    bbbee_document_url?: string | null
    tax_document_url?: string | null
    company_registration_url?: string | null
    cidb_document_url?: string | null
    capability_statement_url?: string | null
  }>
  const verifiedRows = rows.filter((supplier) => isVerifiedStatus(supplier.verification_status))
  const supplierIds = verifiedRows.map((supplier) => supplier.id)
  if (supplierIds.length === 0) return []

  const [quoteRes, contractRes, invoiceRes, paymentRes, bankingRes] = await Promise.all([
    supabase.from("quotes").select("id, supplier_id, status").in("supplier_id", supplierIds),
    supabase.from("contracts").select("id, supplier_id, status").in("supplier_id", supplierIds),
    supabase.from("invoices").select("id, supplier_id, status").in("supplier_id", supplierIds),
    supabase.from("payments").select("id, supplier_id, status").in("supplier_id", supplierIds),
    supabase.from("supplier_bank_details").select("supplier_id, verification_status").in("supplier_id", supplierIds),
  ])
  const activityBySupplier = buildSupplierActivityById({
    supplierIds,
    quotes: (quoteRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    contracts: (contractRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    invoices: (invoiceRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    payments: (paymentRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
  })
  const bankingRows = (bankingRes.data ?? []) as Array<{ supplier_id: string | null; verification_status: string | null }>

  return verifiedRows
    .map((supplier) => {
      const bankVerified = bankingRows.some(
        (bank) => bank.supplier_id === supplier.id && isVerifiedStatus(bank.verification_status),
      )
      const smartScore = calculateSupplierSmartScore(
        {
          ...supplier,
          bank_verified: Boolean(supplier.bank_verified || supplier.banking_verified || bankVerified),
        },
        activityBySupplier[supplier.id] ?? {},
      ).score

      return {
        id: supplier.id,
        business_name: supplier.business_name,
        province: supplier.province,
        provinces: supplier.provinces,
        industry: supplier.industry,
        verification_status: supplier.verification_status,
        bbbee_level: supplier.bbbee_level,
        cidb_grade: supplier.cidb_grade,
        smart_score: smartScore,
        csd_verified: supplier.csd_verified,
        bbbee_verified: supplier.bbbee_verified,
        tax_verified: supplier.tax_verified,
        banking_verified: supplier.banking_verified,
        bank_verified: Boolean(supplier.bank_verified || bankVerified),
        director_verified: supplier.director_verified,
        website: supplier.website,
        description: supplier.description,
        employee_count: supplier.employee_count,
        linkedin_url: supplier.linkedin_url,
        founded_year: supplier.founded_year,
        created_at: supplier.created_at,
        company_logo_url: supplier.company_logo_url,
      } satisfies PublicSupplierDirectoryRow
    })
    .sort((a, b) => Number(b.smart_score ?? 0) - Number(a.smart_score ?? 0))
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

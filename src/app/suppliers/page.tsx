import { createClient } from "@supabase/supabase-js"
import { SUPPLIER_SMART_SCORE_PROFILE_SELECT } from "@/lib/smartScore"
import { getCanonicalSupplierSmartScoreBatch } from "@/lib/supplierScoring"
import type { SupplierDocument } from "@/lib/supplierDocuments"
import {
  deriveSupplierVerificationState,
  getSupplierDirectoryVerificationStatus,
} from "@/lib/supplierVerification"
import SupplierDirectory, { type PublicSupplierDirectoryRow } from "./SupplierDirectory"
import { deriveDirectorVerificationState, groupAttestationsByProfile, type VerificationAttestation } from "@/lib/verificationAttestations"

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

  const coreSelect = `${SUPPLIER_SMART_SCORE_PROFILE_SELECT}, cidb_grade, website, employee_count, linkedin_url, founded_year`
  let { data, error } = await supabase
    .from("profiles")
    .select(`${coreSelect}, company_logo_url`)
    .eq("role", "supplier")
    .order("smart_score", { ascending: false, nullsFirst: false })
    .order("business_name", { ascending: true })

  if (error?.code === "42703") {
    const retry = await supabase
      .from("profiles")
      .select(`${coreSelect}, company_logo_url`)
      .eq("role", "supplier")
      .order("smart_score", { ascending: false, nullsFirst: false })
      .order("business_name", { ascending: true })
    data = retry.data?.map((supplier) => ({
      ...(supplier as unknown as Record<string, unknown>),
    })) as typeof data
    error = retry.error

    if (error?.code === "42703") {
      const legacyRetry = await supabase
        .from("profiles")
        .select(coreSelect)
        .eq("role", "supplier")
        .order("smart_score", { ascending: false, nullsFirst: false })
        .order("business_name", { ascending: true })

      data = legacyRetry.data?.map((supplier) => ({
        ...(supplier as unknown as Record<string, unknown>),
        company_logo_url: null,
      })) as typeof data
      error = legacyRetry.error
    }
  }

  if (error) {
    console.error("Public supplier directory fetch failed:", error)
    throw new Error(error.message)
  }

  const rows = (data ?? []) as unknown as Array<Omit<PublicSupplierDirectoryRow, "director_verified"> & {
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
  const supplierIds = rows.map((supplier) => supplier.id)
  if (supplierIds.length === 0) return []

  const [canonicalScores, documentsResult, attestationsResult] = await Promise.all([
    getCanonicalSupplierSmartScoreBatch({
      supplierIds,
      client: supabase,
      profiles: rows,
    }),
    supabase
      .from("supplier_documents")
      .select("id,profile_id,document_type,file_url,uploaded_at,status,reviewed_at")
      .in("profile_id", supplierIds),
    supabase
      .from("verification_attestations")
      .select("id,profile_id,category,decision,reason,evidence_reference,reviewed_by,reviewed_at,expires_at")
      .in("profile_id", supplierIds),
  ])

  if (documentsResult.error) {
    console.error("Public supplier directory document fetch failed:", documentsResult.error)
    throw new Error(documentsResult.error.message)
  }

  const documentsBySupplier = ((documentsResult.data ?? []) as unknown as SupplierDocument[])
    .reduce<Record<string, SupplierDocument[]>>((grouped, document) => {
      grouped[document.profile_id] = [...(grouped[document.profile_id] ?? []), document]
      return grouped
    }, {})
  const attestationsBySupplier = groupAttestationsByProfile((attestationsResult.data ?? []) as VerificationAttestation[])

  return rows
    .map((supplier) => {
      const canonical = canonicalScores[supplier.id]

      return {
        id: supplier.id,
        business_name: supplier.business_name,
        province: supplier.province,
        provinces: supplier.provinces,
        industry: supplier.industry,
        verification_status: supplier.verification_status,
        bbbee_level: supplier.bbbee_level,
        cidb_grade: supplier.cidb_grade,
        smart_score: canonical?.result.score ?? supplier.smart_score,
        verification_state: deriveSupplierVerificationState(documentsBySupplier[supplier.id] ?? []),
        director_verified: deriveDirectorVerificationState(attestationsBySupplier[supplier.id]).approved,
        website: supplier.website,
        description: supplier.description,
        employee_count: supplier.employee_count,
        linkedin_url: supplier.linkedin_url,
        founded_year: supplier.founded_year,
        created_at: supplier.created_at,
        company_logo_url: supplier.company_logo_url,
      } satisfies PublicSupplierDirectoryRow
    })
    .filter((supplier) =>
      getSupplierDirectoryVerificationStatus(
        supplier.verification_state,
        supplier.director_verified,
      ) !== "in_review",
    )
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

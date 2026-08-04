import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"
import type { SupplierDocument } from "../src/lib/supplierDocuments"
import {
  compareLegacyAndDerivedVerification,
  deriveSupplierVerificationState,
} from "../src/lib/supplierVerification"

nextEnv.loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: profiles, error: profileError } = await admin
  .from("profiles")
  .select("id, business_name, email, csd_verified, bbbee_verified, tax_verified, bank_verified, banking_verified")
  .eq("role", "supplier")
  .order("business_name", { ascending: true, nullsFirst: false })

if (profileError) throw profileError

const supplierIds = (profiles ?? []).map((profile) => profile.id)
const { data: documents, error: documentError } = supplierIds.length > 0
  ? await admin
      .from("supplier_documents")
      .select("id, profile_id, document_type, file_url, storage_path, original_filename, content_type, file_size, uploaded_at, status, reviewed_at, reviewed_by, review_notes")
      .in("profile_id", supplierIds)
      .order("uploaded_at", { ascending: false })
  : { data: [], error: null }

if (documentError) throw documentError

const documentsBySupplier = ((documents ?? []) as SupplierDocument[]).reduce<Record<string, SupplierDocument[]>>(
  (grouped, document) => {
    grouped[document.profile_id] = [...(grouped[document.profile_id] ?? []), document]
    return grouped
  },
  {},
)

const report = (profiles ?? []).flatMap((profile) => {
  const derived = deriveSupplierVerificationState(documentsBySupplier[profile.id] ?? [])
  return compareLegacyAndDerivedVerification({ supplierId: profile.id, profile, derived }).map((mismatch) => ({
    supplierId: profile.id,
    businessName: profile.business_name,
    email: profile.email,
    category: mismatch.category,
    legacyVerified: mismatch.legacyVerified,
    derivedApproved: mismatch.derivedApproved,
    derivedStatus: mismatch.derivedStatus,
    documentId: mismatch.documentId,
  }))
})

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  supplierCount: profiles?.length ?? 0,
  mismatchCount: report.length,
  mismatches: report,
}, null, 2))

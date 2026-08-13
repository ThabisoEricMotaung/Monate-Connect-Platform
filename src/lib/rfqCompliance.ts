import type { SupabaseClient } from "@supabase/supabase-js"
import { generateComplianceChecklist, type ChecklistItem } from "@/lib/complianceChecklist"
import { supabase } from "@/lib/supabase"
import {
  effectiveSupplierDocumentStatus,
  latestSupplierDocuments,
  type SupplierDocument,
  type SupplierDocumentMap,
  type SupplierDocumentType,
} from "@/lib/supplierDocuments"

export type RFQ = {
  id: number
  title: string | null
  category: string | null
  industry: string | null
  province: string | null
  provinces?: string[] | null
  require_csd?: boolean
  require_tax_clearance?: boolean
  require_vat?: boolean
}

export type ComplianceRequirement = ChecklistItem & {
  documentType?: SupplierDocumentType
  isRFQRequired: boolean
}

export type SupplierComplianceFit = {
  totalRequired: number
  documentsMissing: string[]
  documentsExpired: string[]
  documentsVerified: string[]
  compliancePercentage: number
  isCompliantForRFQ: boolean
}

const DOCUMENT_TYPE_BY_CHECKLIST_ID: Partial<Record<string, SupplierDocumentType>> = {
  csd: "csd",
  cipc: "cipc",
  bbbee: "bbbee",
  capability: "company_profile",
  tax: "tax_clearance",
  banking: "bank_letter",
  vat: "vat",
  coida: "coid",
  uif: "uif",
  cidb: "cidb",
}

function isExplicitlyRequired(itemId: string, rfq: RFQ): boolean {
  if (itemId === "csd") return rfq.require_csd === true
  if (itemId === "tax") return rfq.require_tax_clearance === true
  if (itemId === "vat") return rfq.require_vat === true
  return false
}

export function getRFQComplianceRequirements(rfq: RFQ): ComplianceRequirement[] {
  const province = rfq.province ?? rfq.provinces?.find(Boolean) ?? null
  return generateComplianceChecklist({
    category: rfq.category,
    industry: rfq.industry,
    province,
  }).map((item) => ({
    ...item,
    documentType: DOCUMENT_TYPE_BY_CHECKLIST_ID[item.id],
    isRFQRequired: isExplicitlyRequired(item.id, rfq),
  }))
}

export function getDocumentStatusForRequirement(
  requirement: ComplianceRequirement,
  supplierDocuments: SupplierDocumentMap,
  now: Date = new Date(),
): "verified" | "missing" | "expired" {
  if (!requirement.documentType) return "missing"
  const document = supplierDocuments[requirement.documentType]
  if (!document) return "missing"

  const effectiveStatus = effectiveSupplierDocumentStatus(document, now)
  if (effectiveStatus === "expired") return "expired"
  return effectiveStatus === "approved" ? "verified" : "missing"
}

export async function calculateSupplierComplianceFit(
  supplierId: string,
  rfq: RFQ,
  client: SupabaseClient | null = supabase,
): Promise<SupplierComplianceFit> {
  if (!client) throw new Error("Supabase is not configured")

  const { data, error } = await client
    .from("supplier_documents")
    .select(
      "id, profile_id, document_type, file_url, storage_path, original_filename, content_type, file_size, uploaded_at, status, reviewed_at, reviewed_by, review_notes, expiry_date",
    )
    .eq("profile_id", supplierId)
    .order("uploaded_at", { ascending: false })

  if (error) throw new Error(`Unable to load supplier documents: ${error.message}`)

  const documents = latestSupplierDocuments((data ?? []) as SupplierDocument[])
  const required = getRFQComplianceRequirements(rfq).filter(
    (requirement) => requirement.status === "Required" || requirement.isRFQRequired,
  )
  const documentsMissing: string[] = []
  const documentsExpired: string[] = []
  const documentsVerified: string[] = []

  for (const requirement of required) {
    const status = getDocumentStatusForRequirement(requirement, documents)
    if (status === "verified") documentsVerified.push(requirement.label)
    else if (status === "expired") documentsExpired.push(requirement.label)
    else documentsMissing.push(requirement.label)
  }

  const totalRequired = required.length
  const compliancePercentage = totalRequired === 0
    ? 100
    : Math.round((documentsVerified.length / totalRequired) * 100)

  return {
    totalRequired,
    documentsMissing,
    documentsExpired,
    documentsVerified,
    compliancePercentage,
    isCompliantForRFQ:
      compliancePercentage === 100 && documentsMissing.length === 0 && documentsExpired.length === 0,
  }
}

export async function isSupplierCompliantForRFQ(
  supplierId: string,
  rfq: RFQ,
  client: SupabaseClient | null = supabase,
): Promise<boolean> {
  return (await calculateSupplierComplianceFit(supplierId, rfq, client)).isCompliantForRFQ
}

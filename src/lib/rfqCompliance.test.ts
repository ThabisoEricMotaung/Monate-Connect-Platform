import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  calculateSupplierComplianceFit,
  getDocumentStatusForRequirement,
  getRFQComplianceRequirements,
  isSupplierCompliantForRFQ,
  type RFQ,
} from "@/lib/rfqCompliance"
import type { SupplierDocument, SupplierDocumentType } from "@/lib/supplierDocuments"

const NOW = new Date("2026-08-14T12:00:00Z")
const baseRFQ: RFQ = {
  id: 1,
  title: "Office supplies",
  category: "Stationery",
  industry: "Retail",
  province: "Gauteng",
}

function document(type: SupplierDocumentType, overrides: Partial<SupplierDocument> = {}): SupplierDocument {
  return {
    id: `${type}-id`,
    profile_id: "supplier-1",
    document_type: type,
    file_url: `${type}.pdf`,
    storage_path: null,
    original_filename: null,
    content_type: "application/pdf",
    file_size: 100,
    uploaded_at: "2026-08-01T00:00:00Z",
    status: "verified",
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
    expiry_date: "2027-01-01",
    ...overrides,
  }
}

function clientWith(documents: SupplierDocument[]): SupabaseClient {
  const result = { data: documents, error: null }
  const query = {
    select: () => query,
    eq: () => query,
    order: async () => result,
  }
  return { from: () => query } as unknown as SupabaseClient
}

describe("RFQ compliance", () => {
  it("enriches generated requirements for category, province, and explicit RFQ flags", () => {
    const requirements = getRFQComplianceRequirements({
      ...baseRFQ,
      category: "Civil construction",
      industry: "Infrastructure",
      provinces: ["Western Cape"],
      province: null,
      require_vat: true,
    })

    expect(requirements.find((item) => item.id === "cidb")?.documentType).toBe("cidb")
    expect(requirements.find((item) => item.id === "vat")?.isRFQRequired).toBe(true)
    expect(requirements.some((item) => item.id === "prov-wc")).toBe(true)
  })

  it("distinguishes verified, expired, and unreviewed documents", () => {
    const requirement = getRFQComplianceRequirements(baseRFQ).find((item) => item.id === "csd")!
    expect(getDocumentStatusForRequirement(requirement, { csd: document("csd") }, NOW)).toBe("verified")
    expect(getDocumentStatusForRequirement(requirement, {
      csd: document("csd", { expiry_date: "2026-08-13" }),
    }, NOW)).toBe("expired")
    expect(getDocumentStatusForRequirement(requirement, {
      csd: document("csd", { status: "under_review" }),
    }, NOW)).toBe("missing")
    expect(getDocumentStatusForRequirement(requirement, {}, NOW)).toBe("missing")
  })

  it("returns 100 percent when every required document is verified", async () => {
    const documents = ["csd", "cipc", "bbbee", "tax_clearance", "bank_letter"].map((type) =>
      document(type as SupplierDocumentType),
    )
    const fit = await calculateSupplierComplianceFit("supplier-1", baseRFQ, clientWith(documents))

    expect(fit).toMatchObject({
      totalRequired: 5,
      documentsMissing: [],
      documentsExpired: [],
      compliancePercentage: 100,
      isCompliantForRFQ: true,
    })
    expect(fit.documentsVerified).toHaveLength(5)
  })

  it("reports missing and expired requirements in the percentage", async () => {
    const documents = [
      document("csd", { expiry_date: "2020-01-01" }),
      document("cipc"),
      document("bbbee"),
    ]
    const fit = await calculateSupplierComplianceFit("supplier-1", baseRFQ, clientWith(documents))

    expect(fit.totalRequired).toBe(5)
    expect(fit.compliancePercentage).toBe(40)
    expect(fit.documentsExpired).toContain("CSD Registration Report")
    expect(fit.documentsMissing).toEqual(expect.arrayContaining([
      "SARS Tax Clearance Certificate or Compliance Status PIN",
      "Proof of Banking Details (Original Bank Letter)",
    ]))
    expect(fit.isCompliantForRFQ).toBe(false)
    await expect(isSupplierCompliantForRFQ("supplier-1", baseRFQ, clientWith(documents))).resolves.toBe(false)
  })
})

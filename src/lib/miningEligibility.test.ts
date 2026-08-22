import { describe, expect, it } from "vitest"
import { evaluateMiningEligibility } from "@/lib/miningEligibility"
import type { MiningComplianceDocument, MiningSupplierProfile } from "@/types/mining"

const profile = {
  province: "Limpopo",
  black_ownership_pct: 60,
  bbee_level: 2,
} as MiningSupplierProfile

function document(document_type: MiningComplianceDocument["document_type"], document_label: string | null = null) {
  return { document_type, document_label, expiry_date: null } as MiningComplianceDocument
}

describe("evaluateMiningEligibility", () => {
  it("matches supported profile and verified-document rules", () => {
    const result = evaluateMiningEligibility({
      rules: {
        province: ["Limpopo"],
        min_black_ownership_pct: 51,
        min_bbee_level: 4,
        required_documents: ["COIDA"],
        min_cidb_grade: "6CE",
      },
      mineOperationId: null,
      profile,
      documents: [document("COIDA"), document("CIDB Grading", "CIDB contractor grading 7CE")],
      hostCommunityLinks: [],
    })

    expect(result.match_percentage).toBe(100)
    expect(result.qualification_status).toBe("qualified")
    expect(result.gaps).toEqual([])
  })

  it("reports hard gaps and does not pretend unsupported reference data exists", () => {
    const result = evaluateMiningEligibility({
      rules: { province: ["Gauteng"], min_mining_references: 2 },
      mineOperationId: null,
      profile,
      documents: [],
      hostCommunityLinks: [],
    })

    expect(result.match_percentage).toBe(0)
    expect(result.qualification_status).toBe("not_qualified")
    expect(result.gaps.map((gap) => gap.requirement)).toEqual(["province", "min_mining_references"])
  })
})

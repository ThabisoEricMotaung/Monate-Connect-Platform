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

  it("compares verified mining-reference counts to the rule threshold", () => {
    const result = evaluateMiningEligibility({
      rules: { province: ["Limpopo"], min_mining_references: 1 },
      mineOperationId: null,
      profile,
      documents: [],
      hostCommunityLinks: [],
      verifiedMiningReferenceCount: 1,
    })

    expect(result.match_percentage).toBe(100)
    expect(result.qualification_status).toBe("qualified")
    expect(result.gaps).toEqual([])
  })

  it("reports the verified reference count when it is below the threshold", () => {
    const result = evaluateMiningEligibility({
      rules: { min_mining_references: 2 },
      mineOperationId: null,
      profile,
      documents: [],
      hostCommunityLinks: [],
      verifiedMiningReferenceCount: 1,
    })

    expect(result.gaps[0]).toMatchObject({
      requirement: "min_mining_references",
      required: 2,
      actual: 1,
      severity: "hard",
    })
  })
})

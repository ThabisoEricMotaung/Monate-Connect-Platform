import { describe, expect, it } from "vitest"

import {
  mergeSupplierScoreInputs,
  projectSupplierSmartScoreWithApprovedDocuments,
  scoreCanonicalSupplierInput,
} from "./supplierScoreAssembly"

function supplierInput(bbbeeLevel = "Level 2") {
  return mergeSupplierScoreInputs({
    profile: {
      id: "supplier-1",
      role: "supplier",
      business_name: "Example Supplier",
      industry: "Professional Services",
      provinces: ["Gauteng"],
      phone: "+27821234567",
      description: "An established supplier profile.",
      bbbee_level: bbbeeLevel,
      updated_at: "2025-01-01T00:00:00.000Z",
    },
  })
}

describe("SmartScore onboarding projection", () => {
  it("does not award points for simulated CIPC approval", () => {
    const input = supplierInput()
    const current = scoreCanonicalSupplierInput(input)
    const projected = projectSupplierSmartScoreWithApprovedDocuments({
      input,
      approvedDocumentTypes: ["cipc"],
    })

    expect(projected.score).toBe(current.score)
  })

  it("uses the supplier's actual B-BBEE level", () => {
    const levelTwo = projectSupplierSmartScoreWithApprovedDocuments({
      input: supplierInput("Level 2"),
      approvedDocumentTypes: ["bbbee"],
    })
    const levelSix = projectSupplierSmartScoreWithApprovedDocuments({
      input: supplierInput("Level 6"),
      approvedDocumentTypes: ["bbbee"],
    })

    expect(levelTwo.score).toBe(40)
    expect(levelSix.score).toBe(30)
  })

  it("projects the canonical score with all five checklist documents approved", () => {
    const projected = projectSupplierSmartScoreWithApprovedDocuments({ input: supplierInput("Level 2") })

    expect(projected.score).toBe(85)
    expect(projected.breakdown?.find((item) => item.key === "company_profile")?.earnedPoints).toBe(0)
  })
})

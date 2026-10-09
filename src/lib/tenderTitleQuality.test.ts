import { describe, expect, it } from "vitest"
import { judgeTenderTitle } from "./tenderTitleQuality"

describe("judgeTenderTitle", () => {
  it("accepts a heading that describes the work", () => {
    expect(judgeTenderTitle("Supply and delivery of bituminous products", "83G/2026/27")).toBe("usable")
    expect(judgeTenderTitle("Routine road maintenance consulting services for the projects in the Northern Cape Province", null)).toBe("usable")
  })

  it("flags headings that do not", () => {
    expect(judgeTenderTitle(null, "NRA 1")).toBe("missing")
    expect(judgeTenderTitle("046S/2026/27", "046S/2026/27")).toBe("reference-only")
    expect(judgeTenderTitle("Tender Notice: Awarded To: BBBEE Points", null)).toBe("boilerplate")
    expect(judgeTenderTitle("Prospective suppliers are hereby requested to register on the National Treasury Central Supplier Database online", null)).toBe("boilerplate")
    expect(judgeTenderTitle("Redevelopment of Telkom Towers ComplexTender Volume", null)).toBe("document-labels")
    expect(judgeTenderTitle("Supply, support and maintenance of public key infrastructure, software, services, development and li...", null)).toBe("truncated")
    expect(judgeTenderTitle("Routine road maintenance - construction", null)).toBe("generic")
  })
})

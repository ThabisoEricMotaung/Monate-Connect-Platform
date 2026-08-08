import { describe, expect, it } from "vitest"
import {
  classifyTerminalNotice,
  normalizeOpportunityTitleCase,
  resolveExternalBuyerName,
  resolveExternalOpportunityTitle,
} from "@/lib/externalOpportunity"

describe("classifyTerminalNotice", () => {
  it.each([
    ["Regret Letter - transformer maintenance", "regret_letter"],
    ["LP00209ML Notification of award", "award_notice"],
    ["AWARDED CONTRACT FOR RIGGING SERVICES", "award_notice"],
    ["Cancellation of tender Kanna 21/2026", "tender_cancellation"],
  ])("classifies %s", (description, expected) => {
    expect(classifyTerminalNotice({ description })).toBe(expected)
  })

  it("detects terminal evidence in a decoded document URL", () => {
    expect(
      classifyTerminalNotice({
        reference: "E2852GXMPARNR",
        description: "Cleaning of a seepage dam at Arnot Power Station.",
        documents: [
          {
            url: "https://example.test/file?downloadedFileName=Regret%20Letter%20Template%20for%20Unsuccessful%20Suppliers.pdf",
          },
        ],
      }),
    ).toBe("regret_letter")
  })

  it("does not treat ordinary award or cancellation clauses as terminal", () => {
    expect(
      classifyTerminalNotice({
        description:
          "Services run from date of award. The municipality reserves the right to cancel the tender.",
      }),
    ).toBeNull()
  })
})

describe("resolveExternalOpportunityTitle", () => {
  it("uses descriptive text and preserves the reference separately", () => {
    expect(
      resolveExternalOpportunityTitle(
        "ERI2025TSS18RG",
        "The Maintenance of Transformers for Eskom Rotek Industries for four years.\n\nSourced from eTenders.gov.za",
      ),
    ).toBe("The Maintenance of Transformers for Eskom Rotek Industries for four years.")
  })

  it("falls back to the reference when no description exists", () => {
    expect(resolveExternalOpportunityTitle("RFQ 123", null)).toBe("RFQ 123")
  })

  it("keeps source-wrapped lines in the same descriptive title", () => {
    expect(
      resolveExternalOpportunityTitle(
        "15G/2026/27",
        "SUPPLY AND INSTALLATION OF SWITCHGEAR FOR NEW INTERNAL ARC RATED\nINSTALLATIONS",
      ),
    ).toBe("Supply and Installation of Switchgear for New Internal Arc Rated Installations")
  })

  it("caps unusually long source paragraphs", () => {
    const title = resolveExternalOpportunityTitle("RFQ 123", "word ".repeat(100))
    expect(title?.endsWith("…")).toBe(true)
    expect(title!.length).toBeLessThanOrEqual(181)
  })
})

describe("normalizeOpportunityTitleCase", () => {
  it("normalizes uppercase titles while preserving procurement acronyms", () => {
    expect(
      normalizeOpportunityTitleCase(
        "REQUEST FOR PROPOSAL [RFP] FOR ICT SERVICES AND BBBEE VERIFICATION",
      ),
    ).toBe("Request for Proposal [RFP] for ICT Services and BBBEE Verification")
  })

  it("preserves mixed-case brands and known technical names", () => {
    expect(
      normalizeOpportunityTitleCase("PROVISION OF CIVIL SERVICES TO PetroSA GTL REFINERY"),
    ).toBe("Provision of Civil Services to PetroSA GTL Refinery")
    expect(
      normalizeOpportunityTitleCase("MIGRATE QLIKVIEW REPORTS TO QLIK FOR ICT USERS"),
    ).toBe("Migrate QlikView Reports to QLIK for ICT Users")
  })

  it("keeps the procurement phrase as and when required naturally cased", () => {
    expect(
      normalizeOpportunityTitleCase(
        "SUPPLY OF COMPONENTS ON AN AS AND WHEN REQUIRED BASIS FOR 18 MONTHS",
      ),
    ).toBe("Supply of Components on an as and when required Basis for 18 Months")
  })

  it("leaves genuinely mixed-case titles untouched", () => {
    const title = "Supply and delivery of C-Band 5G LNB's to regional offices"
    expect(normalizeOpportunityTitleCase(title)).toBe(title)
  })
})

describe("resolveExternalBuyerName", () => {
  it("prefers the release buyer and falls back to the procuring entity", () => {
    expect(resolveExternalBuyerName(" ESKOM ", "Fallback")).toBe("ESKOM")
    expect(resolveExternalBuyerName(null, " National Treasury ")).toBe("National Treasury")
  })
})

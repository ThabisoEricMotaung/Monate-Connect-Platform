import { describe, expect, it } from "vitest"
import { buildOpportunityJsonLd } from "@/lib/opportunityStructuredData"

describe("buildOpportunityJsonLd", () => {
  it("builds GovernmentService data for an external opportunity with a source", () => {
    expect(
      buildOpportunityJsonLd(
        {
          id: 17,
          title: "Supply of safety equipment",
          description: "Supply and delivery of safety equipment.",
          external_reference: "  NT-2026-17  ",
          is_external_opportunity: true,
          source_name: "  National Treasury  ",
          buyer_org: "Department of Public Works",
          buyer_name: "Fallback buyer",
          provinces: ["Gauteng", "Limpopo"],
          published_date: "2026-08-01",
          closing_date: "2026-08-31",
          budget: "R500,000",
          estimated_value_min: 400000,
          estimated_value_max: 600000,
          bbbee_requirement: "Level 2",
        },
        "en",
      ),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "GovernmentService",
      name: "Supply of safety equipment",
      description: "Supply and delivery of safety equipment.",
      url: "https://www.aiformprocure.co.za/opportunities/17",
      identifier: "NT-2026-17",
      provider: { "@type": "Organization", name: "Department of Public Works" },
      areaServed: [
        { "@type": "AdministrativeArea", name: "Gauteng" },
        { "@type": "AdministrativeArea", name: "Limpopo" },
      ],
      datePosted: "2026-08-01",
      additionalProperty: [
        { name: "Closing Date", value: "2026-08-31" },
        { name: "Estimated Value", value: "R500,000" },
        { name: "B-BBEE Requirement", value: "Level 2" },
        { name: "Procurement Type", value: "National Treasury" },
      ],
    })
  })

  it("uses government fallbacks when an external source is missing", () => {
    const data = buildOpportunityJsonLd(
      {
        id: 18,
        is_external_opportunity: true,
        buyer_name: "Municipality",
        estimated_value_min: 100000,
        estimated_value_max: 250000,
      },
      "en",
    ) as Record<string, unknown>

    expect(data["@type"]).toBe("GovernmentService")
    expect(data.identifier).toBe("RFQ-18")
    expect(data.provider).toEqual({ "@type": "Organization", name: "Municipality" })
    expect(data.additionalProperty).toContainEqual({
      name: "Procurement Type",
      value: "Government tender",
    })
    expect(data.additionalProperty).toContainEqual({
      name: "Estimated Value",
      value: "100000–250000",
    })
  })

  it("builds Service data for an internal RFQ", () => {
    const data = buildOpportunityJsonLd(
      {
        id: 19,
        is_external_opportunity: null,
        buyer_org: "AiForm Buyer",
        provinces: ["Western Cape"],
      },
      "af",
    ) as Record<string, unknown>

    expect(data["@type"]).toBe("Service")
    expect(data.identifier).toBe("RFQ-19")
    expect(data.additionalProperty).toContainEqual({
      name: "Procurement Type",
      value: "Platform RFQ",
    })
  })

  it("handles missing optional fields without malformed values", () => {
    expect(buildOpportunityJsonLd({ id: 20 }, "en")).toMatchObject({
      name: undefined,
      description: undefined,
      provider: { "@type": "Organization", name: "Government Buyer" },
      areaServed: { "@type": "Country", name: "ZA" },
      datePosted: undefined,
      additionalProperty: [
        { name: "Closing Date", value: null },
        { name: "Estimated Value", value: null },
        { name: "B-BBEE Requirement", value: null },
        { name: "Procurement Type", value: "Platform RFQ" },
      ],
    })
  })
})

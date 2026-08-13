import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import OpportunityComplianceChecklist from "@/components/OpportunityComplianceChecklist"
import { getRFQComplianceRequirements, type RFQ, type SupplierComplianceFit } from "@/lib/rfqCompliance"

const rfq: RFQ = {
  id: 7,
  title: "Software services",
  category: "IT services",
  industry: "Technology",
  province: "Gauteng",
}

describe("OpportunityComplianceChecklist", () => {
  it("shows grouped requirements without supplier readiness to public visitors", () => {
    const html = renderToStaticMarkup(
      <OpportunityComplianceChecklist requirements={getRFQComplianceRequirements(rfq)} rfq={rfq} />,
    )

    expect(html).toContain("Identity &amp; Registration")
    expect(html).toContain("Financial &amp; Tax")
    expect(html).toContain("Required")
    expect(html).not.toContain("Your Compliance Readiness")
    expect(html).not.toContain("Verified")
  })

  it("shows readiness, missing/expired details, CTA, and supplier badges", () => {
    const requirements = getRFQComplianceRequirements(rfq)
    const fit: SupplierComplianceFit = {
      totalRequired: 2,
      documentsMissing: [requirements[0].label],
      documentsExpired: [requirements[1].label],
      documentsVerified: [requirements[2].label],
      compliancePercentage: 33,
      isCompliantForRFQ: false,
    }
    const html = renderToStaticMarkup(
      <OpportunityComplianceChecklist requirements={requirements} supplierComplianceFit={fit} rfq={rfq} />,
    )

    expect(html).toContain("Your Compliance Readiness")
    expect(html).toContain("33%")
    expect(html).toContain("Missing:")
    expect(html).toContain("Expired:")
    expect(html).toContain("Verified")
    expect(html).toContain("/dashboard/profile?tab=documents")
  })
})

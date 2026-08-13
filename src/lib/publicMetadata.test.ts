import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { generateMetadata as guideMetadata } from "@/app/guides/[slug]/page"

describe("public SEO metadata", () => {
  it("uses unique targeted titles for top-level public pages", () => {
    const titles = [
      "AiForm Procure | Verified Supplier Directory & Government Procurement Platform",
      "506 Live Tender Opportunities | Government & Private Procurement | South Africa",
      "Supplier Verification & Compliance Guides | CSD, B-BBEE, Tax, CIDB, COIDA",
      "About AiForm Procure | South Africa's Trusted Procurement Platform",
    ]

    expect(new Set(titles).size).toBe(titles.length)
    const sources = [
      "src/app/page.tsx",
      "src/app/opportunities/page.tsx",
      "src/app/guides/page.tsx",
      "src/app/trust/layout.tsx",
    ].map((path) => readFileSync(path, "utf8"))
    titles.forEach((title, index) => expect(sources[index]).toContain(title))
  })

  it.each([
    ["csd", "CSD Registration Guide"],
    ["bbbee", "B-BBEE Verification Guide"],
    ["tax-compliance-status", "SARS Tax Compliance Guide"],
    ["cidb-grading", "CIDB Grading Guide"],
    ["coida-uif", "COIDA & UIF Registration Guide"],
  ])("provides targeted metadata for the %s guide", async (slug, expectedTitle) => {
    const metadata = await guideMetadata({ params: Promise.resolve({ slug }) })
    expect(String(metadata.title)).toContain(expectedTitle)
    expect(metadata.description).toBeTruthy()
    expect(metadata.openGraph).toMatchObject({ title: expectedTitle })
    expect(metadata.alternates).toMatchObject({ canonical: `/guides/${slug}` })
  })
})

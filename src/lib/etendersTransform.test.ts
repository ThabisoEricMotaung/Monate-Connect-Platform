import { describe, expect, it } from "vitest"
import {
  ETENDERS_TITLE_MAX_LENGTH,
  extractAllDocuments,
  normalizeAmount,
  resolveETendersTitle,
  toRfqPayload,
  type OcdsRelease,
} from "@/lib/etendersTransform"

const NOW = new Date("2026-08-13T10:00:00Z")
const release = (overrides: Partial<OcdsRelease> = {}): OcdsRelease => ({
  ocid: "ocds-test-1",
  id: "release-1",
  date: "2026-08-12T08:00:00Z",
  buyer: { name: "National Department" },
  tender: {
    title: "RFQ-123",
    status: "active",
    description: "Supply services",
    province: "Gauteng",
    mainProcurementCategory: "services",
    value: { amount: 125000, currency: "ZAR" },
    tenderPeriod: { endDate: "2026-09-01T12:00:00Z" },
    documents: [
      { title: "Specification", url: "https://example.test/spec.pdf" },
      { title: "Pricing", url: "https://example.test/pricing.pdf" },
    ],
  },
  ...overrides,
})

describe("eTenders transformation", () => {
  it("normalizes disclosed amounts and returns null for invalid or undisclosed values", () => {
    expect(normalizeAmount({ amount: "R 1,234.50" })).toBe(1234.5)
    expect(normalizeAmount(0)).toBeNull()
    expect(normalizeAmount("Undisclosed")).toBeNull()
    expect(normalizeAmount(null)).toBeNull()
  })

  it("preserves every unique document URL", () => {
    const input = release()
    input.tender!.documents!.push({ title: "Duplicate", url: "https://example.test/spec.pdf" })
    expect(extractAllDocuments(input)).toEqual([
      { title: "Specification", url: "https://example.test/spec.pdf" },
      { title: "Pricing", url: "https://example.test/pricing.pdf" },
    ])
  })

  it("maps release date, normalized value, and all documents into the RFQ payload", () => {
    const payload = toRfqPayload(release(), NOW)
    expect(payload).toMatchObject({
      external_ocid: "ocds-test-1",
      published_date: "2026-08-12T08:00:00.000Z",
      estimated_value_min: 125000,
      estimated_value_max: 125000,
      budget: "125000",
      original_source_url: "https://example.test/spec.pdf",
    })
    expect(payload?.description).toContain("https://example.test/spec.pdf")
    expect(payload?.description).toContain("https://example.test/pricing.pdf")
  })

  it("titles the work, not the bid number repeated at the start of the description", () => {
    // Published as ocds-9t57fa-165422 (FOSPHB-RFP-21-26/27).
    const payload = toRfqPayload(release({ tender: {
      ...release().tender!,
      title: "FOSPHB-RFP-21-26/27",
      description: "FOSPHB-RFP-21-26/27 REQUEST FOR PROPOSAL [RFP] FOR  SUPPLY RENEWABLE ELECTRICITY THROUGH WHEELING OVER 10 YEARS OR 20 YEARS (2 OFFERS TO BE SUBMITTED) TO FOSKOR MINING DIVISION (PHALABORWA) IN THE TOWN OF PHALABORWA, LIMPOPO PROVINCE OF SOUTH AFRICA. THE CURRENT NOTIFIED MAXIMUM DEMAND (NMD) WITH ESKOM IS 75MVA.",
    } }), NOW)
    expect(payload?.external_reference).toBe("FOSPHB-RFP-21-26/27")
    expect(payload?.title).toBe(
      "Request for Proposal [RFP] for Supply Renewable Electricity Through Wheeling Over 10 Years or 20 Years (2 Offers to Be Submitted) to Foskor Mining Division (Phalaborwa) in the Town of Phalaborwa, Limpopo Province of South Africa",
    )
    expect(payload?.description).toContain("THE CURRENT NOTIFIED MAXIMUM DEMAND (NMD) WITH ESKOM IS 75MVA.")
  })

  it("keeps a long single-sentence description whole instead of cutting it at 180 characters", () => {
    // Published as ocds-9t57fa-165033; the old title stopped at "and Transfer…".
    const title = resolveETendersTitle({
      title: "TNPA/2026/05/0002/114448/RFP",
      description: "REQUEST FOR PROPOSAL (RFP) FOR THE APPOINTMENT OF A FACILITY OPERATOR TO DESIGN, FINANCE, CONSTRUCT, OPERATE, MAINTAIN, AND DECOMMISSION A FLOATING DRY DOCK FACILITY, AND TRANSFER ASSOCIATED FACILITY INFRASTRUCTURE, FOR A 25-YEAR CONCESSION AT THE PORT OF CAPE TOWN.",
    })
    expect(title).toBe(
      "Request for Proposal (RFP) for the Appointment of a Facility Operator to Design, Finance, Construct, Operate, Maintain, and Decommission a Floating Dry Dock Facility, and Transfer Associated Facility Infrastructure, for a 25-Year Concession at the Port of Cape Town",
    )
  })

  it("joins wrapped lines and keeps bracketed acronyms in ALL-CAPS descriptions", () => {
    expect(resolveETendersTitle({
      title: "046S/2026/27",
      description: "APPOINTMENT OF MAIN BANKER AND OTHER FINANCIAL SERVICES\r\nFOR THE CITY OF CAPE TOWN",
    })).toBe("Appointment of Main Banker and Other Financial Services for the City of Cape Town")
    expect(resolveETendersTitle({
      title: "49S/2026/27",
      description: "TERM TENDER FOR THE SUPPLY AND DELIVERY OF MAINTENANCE, REPAIR, UPGRADE AND REFURBISHMENT SERVICES FOR HIGH VOLTAGE AIR INSULATED SWITCHGEAR (AIS).",
    })).toBe(
      "Term Tender for the Supply and Delivery of Maintenance, Repair, Upgrade and Refurbishment Services for High Voltage Air Insulated Switchgear (AIS)",
    )
  })

  it("does not end the title at abbreviations, initials, or a short opening fragment", () => {
    expect(resolveETendersTitle({
      title: "B1",
      description: "Bid No. 4. Supply of uniforms to S.A. Police Service stations. Briefing on site.",
    })).toBe("Bid No. 4. Supply of uniforms to S.A. Police Service stations. Briefing on site")
    expect(resolveETendersTitle({
      title: "B2",
      description: "Supply and delivery of uniforms to Acme (Pty) Ltd. Head Office in Pretoria. Briefing is compulsory.",
    })).toBe("Supply and delivery of uniforms to Acme (Pty) Ltd. Head Office in Pretoria")
  })

  it("cuts only an over-long extracted work description, at a word boundary", () => {
    const description = `Supply ${"and deliver ".repeat(40)}goods`
    const title = resolveETendersTitle({ title: "RFQ-9", description })!
    expect(title.length).toBeLessThanOrEqual(ETENDERS_TITLE_MAX_LENGTH + 1)
    const kept = title.slice(0, -1)
    expect(title.endsWith("…")).toBe(true)
    expect(description.startsWith(kept)).toBe(true)
    expect(description.charAt(kept.length)).toBe(" ")
  })

  it("falls back to the reference only when no description is published", () => {
    expect(resolveETendersTitle({ title: "RFQ-123", description: "  " })).toBe("RFQ-123")
    expect(resolveETendersTitle({ title: "RFQ-124", items: [{ description: "Laptops" }] })).toBe("Laptops")
  })

  it("returns null for null tenders, missing OCIDs, invalid dates, and closed tenders", () => {
    expect(toRfqPayload({ ocid: "x", tender: null }, NOW)).toBeNull()
    expect(toRfqPayload(release({ ocid: null }), NOW)).toBeNull()
    expect(toRfqPayload(release({ tender: { ...release().tender!, status: "complete" } }), NOW)).toBeNull()
    expect(toRfqPayload(release({ tender: {
      ...release().tender!,
      tenderPeriod: { endDate: "2020-01-01" },
    } }), NOW)).toBeNull()
  })
})

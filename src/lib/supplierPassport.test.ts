import { describe, expect, it } from "vitest"
import {
  displayStatusFor,
  isPublicPassportCredentialStatus,
  passportEvidenceUrl,
  passportStatusBadgeColor,
} from "./supplierPassport"

const NOW = new Date("2026-08-08T00:00:00.000Z")

describe("supplier Passport credential statuses", () => {
  it("shows an active supplier claim as self-reported", () => {
    expect(displayStatusFor("Self-reported", "2027-01-01", NOW)).toBe("Self-reported")
  })

  it("derives expiry labels without claiming independent verification", () => {
    expect(displayStatusFor("Self-reported", "2026-08-20", NOW)).toBe("Expiring soon")
    expect(displayStatusFor("Self-reported", "2026-08-01", NOW)).toBe("Expired")
  })

  it("includes active self-reported credentials in the public Passport", () => {
    expect(isPublicPassportCredentialStatus("Self-reported")).toBe(true)
    expect(isPublicPassportCredentialStatus("Verified")).toBe(true)
    expect(isPublicPassportCredentialStatus("Expiring soon")).toBe(true)
    expect(isPublicPassportCredentialStatus("Expired")).toBe(false)
    expect(isPublicPassportCredentialStatus("Rejected")).toBe(false)
  })

  it("uses a neutral badge category for self-reported claims", () => {
    expect(passportStatusBadgeColor("Self-reported")).toBe("gray")
  })

  it("only exposes web URLs as public supporting evidence", () => {
    expect(passportEvidenceUrl("https://example.test/certificate.pdf")).toBe("https://example.test/certificate.pdf")
    expect(passportEvidenceUrl("javascript:alert(1)")).toBeNull()
    expect(passportEvidenceUrl("not a URL")).toBeNull()
  })
})

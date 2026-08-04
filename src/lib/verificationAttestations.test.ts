import { describe, expect, it } from "vitest"
import { deriveDirectorVerificationState, type VerificationAttestation } from "./verificationAttestations"

const attestation = (decision: VerificationAttestation["decision"], expiresAt: string | null): VerificationAttestation => ({
  id: "a1", profile_id: "p1", category: "director", decision, reason: null,
  evidence_reference: "registry-check", reviewed_by: "r1", reviewed_at: "2026-08-01T00:00:00.000Z", expires_at: expiresAt,
})

describe("director attestations", () => {
  it("uses an unexpired approval", () => {
    expect(deriveDirectorVerificationState([attestation("approved", "2026-10-01T00:00:00.000Z")], new Date("2026-08-04T00:00:00.000Z")).approved).toBe(true)
  })
  it("expires approval points", () => {
    expect(deriveDirectorVerificationState([attestation("approved", "2026-08-01T00:00:00.000Z")], new Date("2026-08-04T00:00:00.000Z")).approved).toBe(false)
  })
})

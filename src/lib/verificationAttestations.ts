export type VerificationAttestationDecision = "approved" | "rejected" | "revoked" | "expired"

export type VerificationAttestation = {
  id: string
  profile_id: string
  category: "director"
  decision: VerificationAttestationDecision
  reason: string | null
  evidence_reference: string | null
  reviewed_by: string
  reviewed_at: string
  expires_at: string | null
}

export type DirectorVerificationState = {
  approved: boolean
  status: VerificationAttestationDecision | "missing"
  attestation: VerificationAttestation | null
}

export function deriveDirectorVerificationState(
  attestations: VerificationAttestation[] | null | undefined,
  now = new Date(),
): DirectorVerificationState {
  const latest = [...(attestations ?? [])]
    .filter((attestation) => attestation.category === "director")
    .sort((a, b) => {
      const reviewedDifference = new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime()
      return reviewedDifference || b.id.localeCompare(a.id)
    })[0] ?? null

  if (!latest) return { approved: false, status: "missing", attestation: null }
  const expired = latest.decision === "approved" && latest.expires_at !== null && new Date(latest.expires_at) <= now
  return {
    approved: latest.decision === "approved" && !expired,
    status: expired ? "expired" : latest.decision,
    attestation: latest,
  }
}

export function groupAttestationsByProfile(
  attestations: VerificationAttestation[] | null | undefined,
): Record<string, VerificationAttestation[]> {
  return (attestations ?? []).reduce<Record<string, VerificationAttestation[]>>((grouped, attestation) => {
    grouped[attestation.profile_id] = [...(grouped[attestation.profile_id] ?? []), attestation]
    return grouped
  }, {})
}

export async function fetchVerificationAttestationsByProfileIds(profileIds: string[]) {
  if (!supabase || profileIds.length === 0) return { attestationsByProfile: {}, error: null }
  const { data, error } = await supabase
    .from("verification_attestations")
    .select("id, profile_id, category, decision, reason, evidence_reference, reviewed_by, reviewed_at, expires_at")
    .in("profile_id", profileIds)
    .order("reviewed_at", { ascending: false })
  const rows = (data ?? []) as VerificationAttestation[]
  return { attestationsByProfile: groupAttestationsByProfile(rows), error: error?.message ?? null }
}
import { supabase } from "./supabase"

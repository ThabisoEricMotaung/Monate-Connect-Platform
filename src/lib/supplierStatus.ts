export function isVerifiedStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toLowerCase().trim()
  return normalized.includes("verified") && !normalized.includes("unverified")
}

export function canonicalVerificationStatus(status: string | null | undefined): string | null {
  if (!status?.trim()) return null
  return isVerifiedStatus(status) ? "Verified" : status.trim()
}

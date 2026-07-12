import type { RFQForMatching, SupplierMatchResult } from "./supplierMatching"

type MatchPayload = {
  rfq: RFQForMatching
  results: SupplierMatchResult[]
  error?: string
}

export async function fetchRecommendedSuppliersForRFQ(
  rfqId: number,
): Promise<{ rfq: RFQForMatching; results: SupplierMatchResult[] }> {
  const response = await fetch(`/api/rfqs/${rfqId}/matches`)
  const payload = (await response.json().catch(() => null)) as MatchPayload | null

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to load supplier matches.")
  }

  if (!payload?.rfq || !Array.isArray(payload.results)) {
    throw new Error("Supplier match response was incomplete.")
  }

  return {
    rfq: payload.rfq,
    results: payload.results,
  }
}

import {
  resolveExternalBuyerName,
  resolveExternalOpportunityTitle,
} from "@/lib/externalOpportunity"

export type OcdsValue = { amount?: unknown; currency?: string | null }
export type OcdsDocument = {
  id?: string | null
  title?: string | null
  description?: string | null
  url?: string | null
  documentType?: string | null
}
export type OcdsBuyer = { id?: string | null; name?: string | null }
export type OcdsTender = {
  id?: string | null
  title?: string | null
  status?: string | null
  description?: string | null
  province?: string | null
  deliveryLocation?: string | null
  mainProcurementCategory?: string | null
  classification?: { description?: string | null } | null
  value?: OcdsValue | null
  tenderPeriod?: { startDate?: string | null; endDate?: string | null } | null
  items?: Array<{ description?: string | null; quantity?: number | null; unit?: string | null }> | null
  documents?: OcdsDocument[] | null
  procuringEntity?: OcdsBuyer | null
}
export type OcdsRelease = {
  ocid?: string | null
  id?: string | null
  date?: string | null
  tender?: OcdsTender | null
  buyer?: OcdsBuyer | null
}
export type OcdsReleasePackage = {
  releases?: OcdsRelease[] | null
  links?: { next?: string | null; prev?: string | null } | null
}

export type ExtractedDocument = { title: string | null; url: string }

export type RfqUpsertPayload = {
  external_ocid: string
  external_reference: string
  title: string
  description: string
  category: string
  industry: string
  province: string | null
  closing_date: string
  deadline: string
  published_date: string | null
  status: string
  is_external_opportunity: true
  is_public: boolean
  curation_status: "not_required" | "pending" | "approved" | "quarantined"
  curation_reason: string | null
  source_name: string
  original_source_url: string | null
  estimated_value_min: number | null
  estimated_value_max: number | null
  budget: string | null
  buyer_org: string | null
}

export function normalizeAmount(value: unknown): number | null {
  const raw = typeof value === "object" && value !== null && "amount" in value
    ? (value as { amount?: unknown }).amount
    : value
  if (raw === null || raw === undefined || raw === "") return null
  const normalized = typeof raw === "string" ? raw.replace(/[^\d.-]/g, "") : raw
  const amount = typeof normalized === "number" ? normalized : Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function extractAllDocuments(release: OcdsRelease | null | undefined): ExtractedDocument[] {
  const seen = new Set<string>()
  const documents: ExtractedDocument[] = []
  for (const document of release?.tender?.documents ?? []) {
    const url = document.url?.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    documents.push({ title: document.title?.trim() || document.description?.trim() || null, url })
  }
  return documents
}

function validDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function isOpenTender(tender: OcdsTender, now: Date): boolean {
  const status = tender.status?.trim().toLowerCase()
  if (status && !["active", "planning", "planned"].includes(status)) return false
  const closingDate = validDate(tender.tenderPeriod?.endDate)
  return Boolean(closingDate && new Date(closingDate).getTime() > now.getTime())
}

function buildDescription(tender: OcdsTender, documents: ExtractedDocument[]): string {
  const parts: string[] = []
  if (tender.description?.trim()) parts.push(tender.description.trim())
  const items = (tender.items ?? []).filter((item) => item.description?.trim())
  if (items.length) {
    parts.push("", "Items:")
    for (const item of items) {
      const quantity = item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null
      parts.push(`- ${item.description!.trim()}${quantity ? ` (${quantity})` : ""}`)
    }
  }
  if (documents.length) {
    parts.push("", "Tender documents:")
    for (const [index, document] of documents.entries()) {
      parts.push(`- ${document.title || `Document ${index + 1}`}: ${document.url}`)
    }
  }
  parts.push(
    "",
    "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process.",
  )
  return parts.join("\n")
}

export function toRfqPayload(
  release: OcdsRelease | null | undefined,
  now: Date = new Date(),
): RfqUpsertPayload | null {
  const tender = release?.tender
  const ocid = release?.ocid?.trim()
  const externalReference = tender?.title?.trim()
  const title = resolveExternalOpportunityTitle(externalReference, tender?.description)
  const closingDate = validDate(tender?.tenderPeriod?.endDate)
  if (!release || !tender || !ocid || !externalReference || !title || !closingDate || !isOpenTender(tender, now)) {
    return null
  }

  const category = tender.classification?.description?.trim()
    || tender.mainProcurementCategory?.trim()
    || "General"
  const amount = normalizeAmount(tender.value)
  const documents = extractAllDocuments(release)

  return {
    external_ocid: ocid,
    external_reference: externalReference,
    title,
    description: buildDescription(tender, documents),
    category,
    industry: category,
    province: tender.province?.trim() || tender.deliveryLocation?.trim() || null,
    closing_date: closingDate,
    deadline: closingDate,
    published_date: validDate(release.date),
    status: "draft",
    is_external_opportunity: true,
    is_public: false,
    curation_status: "pending",
    curation_reason: null,
    source_name: "eTenders.gov.za",
    original_source_url: documents[0]?.url ?? null,
    estimated_value_min: amount,
    estimated_value_max: amount,
    budget: amount === null ? null : String(amount),
    buyer_org: resolveExternalBuyerName(release.buyer?.name, tender.procuringEntity?.name),
  }
}

import { parseTenderDescription, summariseTenderScopeDetailed } from "@/lib/tenderDescription"
import { resolveTenderDisplayTitle } from "@/lib/tenderDisplayTitle"

/** The rfqs columns a public tender listing needs. */
export const TENDER_LISTING_COLUMNS =
  "id, title, buyer_org, buyer_name, buyer_normalized, external_reference, external_ocid, closing_date, published_date, created_at, is_public, source_name, estimated_budget, description, closing_soon, status, province, category"

export interface TenderListingRecord {
  id: number
  title: string
  buyer_org: string | null
  buyer_name: string | null
  buyer_normalized: string | null
  external_reference: string | null
  external_ocid: string | null
  closing_date: string | null
  published_date: string | null
  source_name: string | null
  estimated_budget: number | null
  description: string | null
  created_at: string
  status: string | null
  province: string | null
  category: string | null
}

/**
 * Sources whose collectors (src/lib/collectors) store the scraped tender
 * reference in external_ocid. (Ekurhuleni's listing heading, which its
 * collector uses, is the bid number shown on each detail page.) eTenders
 * stores an OCDS identifier there instead, so it is not listed.
 */
const OCID_IS_TENDER_REFERENCE_SOURCES = new Set([
  "SANRAL",
  "Eskom",
  "TCTA",
  "DBSA",
  "City of Cape Town",
  "City of Johannesburg",
  "Department of Health",
  "Ekurhuleni Metropolitan Municipality",
])

// OCDS release identifiers ("ocds-<prefix>-<id>") identify a feed record, not
// a tender; legacy eTenders rows stored one in external_reference. A URL used
// as a dedupe key is not a tender reference either.
const NOT_A_TENDER_REFERENCE = /^(?:ocds-[a-z0-9]+-|https?:\/\/)/i

export function firstNonBlank(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

export function resolveTenderReference(
  rfq: Pick<TenderListingRecord, "external_reference" | "external_ocid" | "source_name" | "title">,
): string | null {
  const ocidReference = rfq.source_name && OCID_IS_TENDER_REFERENCE_SOURCES.has(rfq.source_name) ? rfq.external_ocid : null
  // The legacy "eTenders" sync stored the tender reference code in title (see
  // supabase/migrations/20260808080313_opportunity_curation_state.sql).
  const legacyTitleReference = rfq.source_name === "eTenders" ? rfq.title : null
  const genuine = (value: string | null) => (value && !NOT_A_TENDER_REFERENCE.test(value.trim()) ? value : null)
  return firstNonBlank(genuine(rfq.external_reference), genuine(ocidReference), legacyTitleReference)
}

/**
 * Shapes a stored record for listings. `title` stays exactly as stored (the
 * official text); `display_title` and `description` are derived for reading:
 * the heading from tenderDisplayTitle.ts, and `description` as a short scope
 * summary without attachments, URLs or boilerplate (tenderDescription.ts).
 * The stored description is unchanged and shown in full on the detail page.
 * Reference and buyer stay null when the source did not provide them: the
 * internal row ID is never a reference, and the source publisher is never
 * assumed to be the issuing organisation.
 */
export function toTenderListing(rfq: TenderListingRecord) {
  const reference = resolveTenderReference(rfq)
  const { displayTitle, scope } = resolveTenderDisplayTitle({
    title: rfq.title,
    description: parseTenderDescription(rfq.description).body,
    reference,
    sourceName: rfq.source_name,
  })
  const summary = summariseTenderScopeDetailed(scope, { title: displayTitle, reference })
  return {
    id: rfq.id,
    reference_number: reference,
    title: rfq.title,
    display_title: displayTitle,
    description: summary.text,
    /** The summary is one contract of a multi-contract notice. */
    description_is_partial: summary.partOfMultipleContracts,
    /** Eligibility or submission requirements are on the detail page only. */
    has_further_requirements: summary.hasFurtherRequirements,
    buyer_normalized: firstNonBlank(rfq.buyer_org, rfq.buyer_name, rfq.buyer_normalized),
    closing_date: rfq.closing_date,
    created_at: rfq.created_at,
    source_count: 1,
    sources: rfq.source_name || "AiForm Platform",
    estimated_budget: rfq.estimated_budget,
    status: rfq.status,
    province: rfq.province,
    category: rfq.category,
  }
}

export type TenderListing = ReturnType<typeof toTenderListing>

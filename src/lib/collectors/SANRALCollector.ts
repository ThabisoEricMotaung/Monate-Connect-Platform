/**
 * SANRAL (South African National Roads Agency Limited) tender collector
 * Scrapes public tender listings from https://www.nra.co.za/sanral-tenders/list/open-tenders
 *
 * The listing's description column is a cut-off preview, not a title (see
 * sanralParser.ts), so each row's detail page is fetched for the official
 * title, the notice text and the award-results fields.
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { parseSanralDetail, parseSanralListing, type SanralListingRow } from "./sanralParser"

const ORIGIN = "https://www.nra.co.za"
const LISTING_URL = `${ORIGIN}/sanral-tenders/list/open-tenders`
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

const PROVINCE_MAP: Record<string, string> = {
  WC: "Western Cape",
  EC: "Eastern Cape",
  NC: "Northern Cape",
  FS: "Free State",
  KZN: "KwaZulu-Natal",
  GP: "Gauteng",
  LP: "Limpopo",
  MP: "Mpumalanga",
  NW: "North West",
  ZA: "South Africa",
}

function toCategory(projectType: string): string {
  if (projectType.includes("Construction")) return "Construction Projects"
  if (projectType.includes("Consulting")) return "Consulting Services"
  if (projectType.includes("Services")) return "Services"
  if (projectType.includes("Supply")) return "Supply & Delivery"
  return "Tender"
}

export class SANRALCollector extends TenderCollectorBase {
  constructor() {
    super("SANRAL", ORIGIN)
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await this.fetchSource(url, { headers: { "User-Agent": USER_AGENT } })
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
    return response.text()
  }

  async scrapeListings(): Promise<RawTender[]> {
    console.log(`[SANRAL] Starting from ${LISTING_URL}`)

    let html: string
    try {
      html = await this.fetchHtml(LISTING_URL)
    } catch (fetchError) {
      console.error(`[SANRAL] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
      throw fetchError
    }

    // Only the newest rows are rendered server-side; the page ignores ?page=N.
    const rows = parseSanralListing(html, ORIGIN)
    console.log(`[SANRAL] Found ${rows.length} listing rows`)

    const tenders: RawTender[] = []
    for (const row of rows) {
      try {
        const tender = await this.buildTender(row)
        if (tender) tenders.push(tender)
      } catch (rowError) {
        console.warn(`[SANRAL] Skipped ${row.reference}:`, rowError instanceof Error ? rowError.message : String(rowError))
      }
    }

    console.log(`[SANRAL] Extracted ${tenders.length} tenders`)
    return tenders
  }

  private async buildTender(row: SanralListingRow): Promise<RawTender | null> {
    const detail = parseSanralDetail(await this.fetchHtml(row.detailUrl), row.reference)

    // The award-results table is on every detail page; it only signals an
    // award when the "Awarded To" value is actually filled in. Such a tender
    // is held for curator review rather than listed as open or discarded.
    if (detail.hasAwardResult) {
      console.log(`[SANRAL] ${row.reference}: award result published (Awarded To: ${detail.awardFields["Awarded To"]}); held for review`)
    }

    // Store the official heading verbatim (listings derive a readable title
    // from it). With no heading, store the reference rather than the listing
    // preview, so listings say the title is unavailable instead of showing
    // boilerplate.
    const title = detail.officialTitle ?? row.reference

    return {
      reference_number: row.reference,
      title,
      description: detail.scope,
      closing_date: row.closingDate,
      published_date: detail.createdDate,
      source_url: row.detailUrl,
      buyer: "South African National Roads Agency Limited",
      category: toCategory(row.projectType),
      province: PROVINCE_MAP[row.province] ?? (row.province || "South Africa"),
      review_reason: detail.hasAwardResult ? "award_result_published" : null,
    }
  }
}

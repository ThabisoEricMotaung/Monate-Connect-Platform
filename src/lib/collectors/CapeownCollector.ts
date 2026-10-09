/**
 * City of Cape Town tender collector (TypeScript)
 * Uses fetch + regex for reliability in serverless.
 * Parsing lives in capeTownParser.ts.
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { dedupeCapeTownRows, parseCapeTownListing } from "./capeTownParser"

const ORIGIN = "https://web1.capetown.gov.za"
const LISTING_URL = `${ORIGIN}/web1/tenderportal/Tender`

export class CapeownCollector extends TenderCollectorBase {
  constructor() {
    super("City of Cape Town", ORIGIN)
  }

  async scrapeListings(): Promise<RawTender[]> {
    console.log(`[Cape Town] Starting from ${LISTING_URL}`)

    const response = await this.fetchSource(LISTING_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()

    if (!html) {
      console.warn(`[Cape Town] Empty response`)
      return []
    }

    const parsed = parseCapeTownListing(html, ORIGIN)
    const rows = dedupeCapeTownRows(parsed)
    console.log(`[Cape Town] Found ${parsed.length} rows, ${rows.length} unique tenders`)

    const tenders: RawTender[] = rows.map((row) => {
      if (row.titleTruncatedAtSource) {
        console.warn(`[Cape Town] ${row.reference}: only a cut-off description is available`)
      }
      return {
        reference_number: row.reference,
        // The listing's description is the official description of the work.
        title: row.title,
        // The public listing has no text beyond the description.
        description: null,
        closing_date: row.closingDate,
        // The listing's "Posted Date" is a last-updated time, not the first
        // publication date, so published_date is left unset.
        // Details pages require a login, so link to the public listing.
        source_url: LISTING_URL,
        buyer: "City of Cape Town Metropolitan Municipality",
        category: row.department || row.directorate || "Government Services",
        province: "Western Cape",
      }
    })

    console.log(`[Cape Town] Extracted ${tenders.length} tenders`)
    return tenders
  }
}

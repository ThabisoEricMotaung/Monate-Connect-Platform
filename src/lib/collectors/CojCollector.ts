/**
 * City of Johannesburg tender collector (TypeScript)
 * Uses fetch + regex for SharePoint portal parsing.
 * Parsing lives in cojParser.ts.
 *
 * The old URL (/work_/TendersQuotations/Pages/Tenders.aspx) is a 2016 archive
 * page with no tender table. Current tenders are on the "Current Bid
 * Proposals" page, which is renamed each year, so its link is read from the
 * Tenders hub page, falling back to the last known URL.
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { findCojCurrentBidsUrl, parseCojBidProposals } from "./cojParser"

const ORIGIN = "https://joburg.org.za"
const HUB_URL = `${ORIGIN}/work_/Pages/Work%20in%20Joburg/Tenders%20and%20Quotations/2022%20Tenders%20and%20Quotations/2022%20TENDERS/Tenders.aspx`
const FALLBACK_LISTING_URL = `${ORIGIN}/work_/Pages/2026-Tenders/2026-Bid-Proposals.aspx`

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-ZA,en;q=0.9",
}

export class CojCollector extends TenderCollectorBase {
  constructor() {
    super("City of Johannesburg", ORIGIN)
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await this.fetchSource(url, { headers: HEADERS })
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
    return response.text()
  }

  private async resolveListingUrl(): Promise<string> {
    try {
      const found = findCojCurrentBidsUrl(await this.fetchHtml(HUB_URL), ORIGIN)
      if (found) return found
      console.warn(`[CoJ] No "Current Bid Proposals" link on ${HUB_URL}; using ${FALLBACK_LISTING_URL}`)
    } catch (error) {
      console.warn(`[CoJ] Hub page failed (${error instanceof Error ? error.message : String(error)}); using ${FALLBACK_LISTING_URL}`)
    }
    return FALLBACK_LISTING_URL
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = await this.resolveListingUrl()
    console.log(`[CoJ] Starting from ${url}`)

    const html = await this.fetchHtml(url)
    if (!html) {
      console.warn(`[CoJ] Empty response`)
      return []
    }

    const { tenders, skipped } = parseCojBidProposals(html, ORIGIN)
    for (const row of skipped) {
      console.warn(`[CoJ] Skipped row "${row.row}": ${row.reason}`)
    }

    const result: RawTender[] = tenders.map((tender) => ({
      reference_number: tender.reference,
      title: tender.title,
      description: tender.description,
      // Date only on the listing: start of the closing day, SAST.
      closing_date: tender.closingDate,
      source_url: url,
      buyer: "City of Johannesburg",
      province: "Gauteng",
    }))

    console.log(`[CoJ] Extracted ${result.length} tenders`)
    return result
  }
}

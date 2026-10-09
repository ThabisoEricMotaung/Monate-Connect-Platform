/**
 * Development Bank of Southern Africa (DBSA) tender collector
 * Scrapes public RFP/RFR listings from https://www.dbsa.org/procurement
 * Parsing lives in ./dbsaParser (pure, tested against real page fixtures).
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { DBSA_LISTING_URL, parseDbsaListing } from "./dbsaParser"

function categorize(tenderType: string, title: string): string {
  const lower = title.toLowerCase()
  if (tenderType === "RFQ") return "Quotation"
  if (lower.includes("construction")) return "Construction"
  if (lower.includes("water")) return "Water & Sanitation"
  if (lower.includes("energy")) return "Energy"
  return "Professional Services"
}

export class DBSACollector extends TenderCollectorBase {
  constructor() {
    super("DBSA", "https://www.dbsa.org")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = DBSA_LISTING_URL
    console.log(`[DBSA] Starting from ${url}`)

    let html = ""
    try {
      const response = await this.fetchSource(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      html = await response.text()
    } catch (fetchError) {
      console.error(`[DBSA] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
      throw fetchError
    }

    if (!html) {
      console.warn(`[DBSA] Empty response`)
      return []
    }

    const rows = parseDbsaListing(html, this.baseUrl)
    console.log(`[DBSA] Parsed ${rows.length} tenders`)

    return rows.map((row) => ({
      reference_number: row.reference,
      title: row.title,
      // The listing carries only the title, document links and briefing
      // details; there is no scope text to use as a description.
      description: null,
      closing_date: row.closingDate,
      published_date: row.publishedDate,
      source_url: url,
      buyer: "Development Bank of Southern Africa",
      category: categorize(row.tenderType, row.title),
      // All DBSA tenders are from South Africa
      province: "South Africa",
    }))
  }
}

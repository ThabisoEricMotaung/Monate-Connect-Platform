/**
 * Department of Health tender collector (TypeScript)
 * Fetches https://www.health.gov.za/tenders/ and parses its TablePress tender
 * tables (NDoH Tenders and Pharmaceutical Tenders) with healthParser.
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { parseHealthTenders } from "./healthParser"

const LISTING_URL = "https://www.health.gov.za/tenders/"

export class HealthCollector extends TenderCollectorBase {
  constructor() {
    super("Department of Health", "https://www.health.gov.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    console.log(`[Health] Starting from ${LISTING_URL}`)

    try {
      const response = await this.fetchSource(LISTING_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-ZA,en;q=0.9",
        },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const html = await response.text()

      if (!html || html.length === 0) {
        console.warn(`[Health] Empty response`)
        return []
      }

      const rows = parseHealthTenders(html, LISTING_URL)
      const tenders: RawTender[] = []
      for (const row of rows) {
        // Without a closing date the base class would store the row as "active"
        // forever; on this page that only happens for archived rows with typos
        // ("08 Decenber 2023", "N/A"), so skip them.
        if (!row.closingDate) {
          console.warn(`[Health] ${row.reference}: skipped, unparseable closing date "${row.closingDateText}"`)
          continue
        }
        tenders.push({
          // The "Tender No" column is the genuine tender/RFQ number.
          reference_number: row.reference,
          title: row.title,
          // The rest of the description cell is briefing-session details and
          // document links, not additional scope.
          description: null,
          closing_date: row.closingDate,
          published_date: row.bulletinDate,
          source_url: row.documentUrl ?? LISTING_URL,
          buyer: "National Department of Health",
        })
      }

      console.log(`[Health] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[Health] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

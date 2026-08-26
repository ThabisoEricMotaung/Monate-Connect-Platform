/**
 * Ekurhuleni Metropolitan Municipality tender collector
 * Simple single-page scraper - good template for others
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class EkurhuleniCollector extends TenderCollectorBase {
  constructor() {
    super("Ekurhuleni Metropolitan Municipality", "https://www.ekurhuleni.gov.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/"
    console.log(`[Ekurhuleni] Fetching ${url}`)

    const tenders: RawTender[] = []

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()

      // Parse HTML using regex (simple approach)
      // Pattern: Reference number, title, closing date
      const tenderPattern = /(?:RFQ|TENDER|BID)[\s\-]*(\d+)[^]*?([\w\s]+?)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi

      let match
      while ((match = tenderPattern.exec(html)) !== null) {
        const referenceNumber = match[1]
        const title = match[2].trim().substring(0, 200)
        const dateStr = `${match[3]} ${match[4]} ${match[5]}`

        tenders.push({
          reference_number: referenceNumber,
          title,
          description: title,
          closing_date: this.parseDate(dateStr),
          source_url: url,
          buyer: "Ekurhuleni Metropolitan Municipality",
        })
      }

      console.log(`[Ekurhuleni] Found ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error("[Ekurhuleni] Scrape failed:", error)
      return []
    }
  }
}

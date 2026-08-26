/**
 * City of Cape Town tender collector (TypeScript)
 * Uses fetch + regex for reliability in serverless
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class CapeownCollector extends TenderCollectorBase {
  constructor() {
    super("City of Cape Town", "https://web1.capetown.gov.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://web1.capetown.gov.za/web1/tenderportal/Tender"
    console.log(`[Cape Town] Fetching ${url}`)

    const tenders: RawTender[] = []

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()

      // Parse table rows with tender data
      // Pattern: <tr><td>Reference</td><td>Title</td>...<td>ClosingDate</td></tr>
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch

      while ((rowMatch = rowPattern.exec(html)) !== null) {
        const rowHtml = rowMatch[1]
        const cells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []

        if (cells.length < 3) continue

        const extractCell = (index: number): string => {
          const cellMatch = cells[index]?.match(/<td[^>]*>([\s\S]*?)<\/td>/i)
          return cellMatch ? cellMatch[1].replace(/<[^>]*>/g, "").trim() : ""
        }

        const referenceNumber = extractCell(0) || "COT-Unknown"
        const title = extractCell(1) || ""
        const closingDate = extractCell(Math.max(0, cells.length - 3)) || ""

        if (!title) continue

        tenders.push({
          reference_number: referenceNumber,
          title: title.substring(0, 200),
          description: title,
          closing_date: this.parseDate(closingDate),
          source_url: url,
          buyer: "City of Cape Town Metropolitan Municipality",
        })
      }

      console.log(`[Cape Town] Found ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error("[Cape Town] Scrape failed:", error)
      return []
    }
  }
}

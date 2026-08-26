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
      console.log(`[Cape Town] Starting fetch...`)
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      console.log(`[Cape Town] Response status: ${response.status}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()
      console.log(`[Cape Town] HTML length: ${html.length}`)

      // Parse table rows: <tr class="gridDetails"><td>REF</td><td><pre...>DESC</pre></td>...<td>CLOSING</td>...
      const rowPattern = /<tr\s+class="gridDetails"[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch
      let rowCount = 0

      while ((rowMatch = rowPattern.exec(html)) !== null) {
        try {
          const rowHtml = rowMatch[1]

          // Extract all <td>...</td> blocks
          const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi
          const cells: string[] = []
          let cellMatch

          while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
            cells.push(cellMatch[1])
          }

          if (cells.length < 5) continue

          // Cell 0: Reference (plain text)
          const ref = cells[0]?.replace(/<[^>]*>/g, "").trim() || ""

          // Cell 1: Description (in <pre> tag)
          const descMatch = cells[1]?.match(/<pre[^>]*[^>]*>([^<]*)</i)
          const desc = descMatch ? descMatch[1]?.trim() || "" : cells[1]?.replace(/<[^>]*>/g, "").trim() || ""

          // Cell 4: Closing date (visible date column, ~5th column)
          const closingDateStr = cells[4]?.replace(/<[^>]*>/g, "").trim() || ""

          if (!ref || !desc) continue

          tenders.push({
            reference_number: ref,
            title: ref,
            description: desc.substring(0, 500),
            closing_date: this.parseDate(closingDateStr),
            source_url: url,
            buyer: "City of Cape Town Metropolitan Municipality",
          })

          rowCount++
        } catch (rowError) {
          console.debug(`[Cape Town] Error parsing row:`, rowError)
          continue
        }
      }

      console.log(`[Cape Town] Found ${tenders.length} tenders in ${rowCount} rows`)
      return tenders
    } catch (error) {
      console.error("[Cape Town] Scrape failed:", error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

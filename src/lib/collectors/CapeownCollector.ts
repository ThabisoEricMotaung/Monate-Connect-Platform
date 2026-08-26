/**
 * City of Cape Town tender collector (TypeScript)
 * Uses Playwright for JavaScript rendering
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { chromium } from "playwright"

export class CapeownCollector extends TenderCollectorBase {
  constructor() {
    super("City of Cape Town", "https://web1.capetown.gov.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://web1.capetown.gov.za/web1/tenderportal/Tender"
    console.log(`[Cape Town] Loading ${url}`)

    const tenders: RawTender[] = []
    const browser = await chromium.launch({ headless: true })

    try {
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
      await page.waitForTimeout(3000)

      // Extract all table rows
      const rows = await page.locator("table tr").all()
      console.log(`[Cape Town] Found ${rows.length} rows`)

      for (let i = 1; i < rows.length; i++) {
        try {
          const cells = await rows[i].locator("td").allTextContents()
          if (cells.length < 3) continue

          const referenceNumber = cells[0]?.trim() || `COT-${i}`
          const title = cells[1]?.trim() || ""
          const closingDateStr = cells[cells.length - 3]?.trim() // Closing date typically 3rd from end

          if (!title) continue

          tenders.push({
            reference_number: referenceNumber,
            title: title.substring(0, 200),
            description: title,
            closing_date: this.parseDate(closingDateStr),
            source_url: url,
            buyer: "City of Cape Town Metropolitan Municipality",
          })
        } catch (error) {
          console.debug(`[Cape Town] Error parsing row ${i}:`, error)
          continue
        }
      }

      console.log(`[Cape Town] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error("[Cape Town] Scrape failed:", error)
      return []
    } finally {
      await browser.close()
    }
  }
}

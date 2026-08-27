/**
 * Department of Health tender collector (TypeScript)
 * Fetches from https://www.health.gov.za/tenders/ and parses HTML table
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class HealthCollector extends TenderCollectorBase {
  constructor() {
    super("Department of Health", "https://www.health.gov.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://www.health.gov.za/tenders/"
    console.log(`[Health] Starting from ${url}`)

    const tenders: RawTender[] = []

    try {
      // Fetch page
      const response = await fetch(url, {
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
        return tenders
      }

      // Parse tender entries - they appear as structured text with NDOH/DOH prefix
      // Pattern: Reference (e.g., NDOH 35-2023-2024) followed by title, dates, and links
      const referenceRegex = /([A-Z]+\s+\d+[-\/]\d{4}[\/-]\d{4})/g
      const matches = html.matchAll(referenceRegex)

      for (const match of matches) {
        try {
          const reference = match[0].trim()
          const index = match.index!

          // Extract surrounding context (500 chars after reference)
          const context = html.substring(index, index + 1000)

          // Extract title: look for text between reference and opening date
          // Usually the title is on next line
          const titleMatch = context.match(/\]\s*([^[\]<>]*?)(?:\d{1,2}\s+\w+\s+\d{4}|Closing Date|Opening|Enquiries)/i)
          const title = titleMatch
            ? titleMatch[1]
                .replace(/<[^>]*>/g, "")
                .trim()
                .substring(0, 200)
            : reference

          // Extract dates: look for patterns like "19 January 2024" or "29 February 2024"
          const dateRegex = /(\d{1,2}\s+\w+\s+\d{4})/
          const dates = context.match(dateRegex)
          const closingDateStr = dates ? dates[1] : null

          if (!reference || !title) continue

          tenders.push({
            reference_number: reference,
            title: title,
            description: `Tender from National Department of Health. Reference: ${reference}`,
            closing_date: this.parseDate(closingDateStr),
            source_url: url,
            buyer: "National Department of Health",
          })
        } catch (rowError) {
          // Skip problematic entries
          continue
        }
      }

      console.log(`[Health] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[Health] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

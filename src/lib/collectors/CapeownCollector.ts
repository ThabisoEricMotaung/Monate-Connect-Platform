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
    console.log(`[Cape Town] Starting from ${url}`)

    const tenders: RawTender[] = []

    try {
      // Fetch
      let html = ""
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        html = await response.text()
      } catch (fetchError) {
        console.error(`[Cape Town] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
        throw fetchError
      }

      if (!html || html.length === 0) {
        console.warn(`[Cape Town] Empty response`)
        return tenders
      }

      // Find rows
      const rows = html.match(/<tr\s+class="gridDetails"[^>]*>[\s\S]*?<\/tr>/gi) || []
      console.log(`[Cape Town] Found ${rows.length} rows`)

      for (const row of rows) {
        try {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
          if (cells.length < 5) continue

          // Extract cell values
          const ref = cells[0]?.replace(/<[^>]*>/g, "").trim() || ""
          const desc = cells[1]?.replace(/<[^>]*>/g, "").trim() || ""
          const dateStr = cells[4]?.replace(/<[^>]*>/g, "").trim() || ""

          if (!ref || !desc) continue

          tenders.push({
            reference_number: ref,
            title: ref,
            description: desc.substring(0, 500),
            closing_date: this.parseDate(dateStr),
            source_url: url,
            buyer: "City of Cape Town Metropolitan Municipality",
          })
        } catch (rowError) {
          continue
        }
      }

      console.log(`[Cape Town] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[Cape Town] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

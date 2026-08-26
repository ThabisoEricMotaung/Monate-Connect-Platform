/**
 * City of Johannesburg tender collector (TypeScript)
 * Uses fetch + regex for SharePoint portal parsing
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class CojCollector extends TenderCollectorBase {
  constructor() {
    super("City of Johannesburg", "https://joburg.org.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://joburg.org.za/work_/TendersQuotations/Pages/Tenders.aspx"
    console.log(`[CoJ] Starting from ${url}`)

    const tenders: RawTender[] = []

    try {
      // Fetch page
      let html = ""
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-ZA,en;q=0.9",
          },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        html = await response.text()
      } catch (fetchError) {
        console.error(`[CoJ] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
        throw fetchError
      }

      if (!html || html.length === 0) {
        console.warn(`[CoJ] Empty response`)
        return tenders
      }

      // Find rows - look for SharePoint table structure
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      console.log(`[CoJ] Found ${rows.length} rows`)

      for (const row of rows) {
        try {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
          if (cells.length < 2) continue

          // Extract cell contents
          // Cell 0: Bid Proposals (reference number)
          const refMatch = cells[0]?.match(/COJ\/[A-Za-z0-9\/-]+/i)
          const reference = refMatch ? refMatch[0] : cells[0]?.replace(/<[^>]*>/g, "").trim() || ""

          // Cell 1: Description
          const desc = cells[1]?.replace(/<[^>]*>/g, "").trim() || ""

          // Cell 2: Closing Date (often in format "10 July 2026")
          const dateStr = cells[2]?.replace(/<[^>]*>/g, "").trim() || ""

          if (!reference || !desc) continue

          tenders.push({
            reference_number: reference,
            title: reference,
            description: desc.substring(0, 500),
            closing_date: this.parseDate(dateStr),
            source_url: url,
            buyer: "City of Johannesburg",
          })
        } catch (rowError) {
          // Skip problematic rows
          continue
        }
      }

      console.log(`[CoJ] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[CoJ] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

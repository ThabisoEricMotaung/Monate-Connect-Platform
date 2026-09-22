/**
 * Development Bank of Southern Africa (DBSA) tender collector
 * Scrapes public RFP/RFR listings from https://www.dbsa.org/procurement
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class DBSACollector extends TenderCollectorBase {
  constructor() {
    super("DBSA", "https://www.dbsa.org")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://www.dbsa.org/procurement"
    console.log(`[DBSA] Starting from ${url}`)

    const tenders: RawTender[] = []

    try {
      // Fetch the procurement page
      let html = ""
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        html = await response.text()
      } catch (fetchError) {
        console.error(`[DBSA] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
        throw fetchError
      }

      if (!html || html.length === 0) {
        console.warn(`[DBSA] Empty response`)
        return tenders
      }

      // Extract table rows (DBSA uses a simple HTML table structure)
      // Pattern: <tr> containing RFP/RFR number, title, dates, and links
      const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      console.log(`[DBSA] Found ${rows.length} rows`)

      for (const row of rows) {
        try {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
          if (cells.length < 3) continue

          // Extract cell contents (remove HTML tags)
          const cleanCell = (cellHtml: string): string => {
            return cellHtml.replace(/<[^>]*>/g, "").trim().replace(/\s+/g, " ")
          }

          const cell0 = cleanCell(cells[0] || "")
          const cell1 = cleanCell(cells[1] || "")
          const cell2 = cleanCell(cells[2] || "")

          // Parse RFP/RFR number and title from first cell
          // Format: "RFP XXX/2026: Title text with optional briefing info"
          const numberMatch = cell0.match(/^(RFP|RFR|RFI|RFQ)\s+([^:]+):\s*(.+?)(?:\s+Compulsory|$)/i)
          if (!numberMatch) continue

          const tenderType = numberMatch[1] // RFP, RFR, RFI, RFQ
          const referenceNumber = `${tenderType} ${numberMatch[2].trim()}`
          const titleWithBriefing = numberMatch[3].trim()

          // Extract title (before "Compulsory Briefing" if present)
          const title = titleWithBriefing.split(/Compulsory|Optional|Briefing/i)[0].trim()

          if (!title) continue

          // Parse dates
          // cell1 = "Date Published" (e.g., "18 September 2026")
          // cell2 = "Closing Date and Time" (e.g., "14 October 2026 @ 23H55")
          const publishedDate = this.parseDate(cell1)
          const closingDateStr = cell2.split("@")[0].trim() // Remove time
          const closingDate = this.parseDate(closingDateStr)

          // Extract category from tender type or title patterns
          let category = "Professional Services" // Default
          if (tenderType === "RFQ") category = "Quotation"
          else if (title.toLowerCase().includes("construction")) category = "Construction"
          else if (title.toLowerCase().includes("water")) category = "Water & Sanitation"
          else if (title.toLowerCase().includes("energy")) category = "Energy"

          // All DBSA tenders are from South Africa
          const province = "South Africa"

          tenders.push({
            reference_number: referenceNumber,
            title: title.substring(0, 200),
            description: `${tenderType} - ${title}`,
            closing_date: closingDate,
            published_date: publishedDate,
            source_url: url,
            buyer: "Development Bank of Southern Africa",
            category,
            province,
          })
        } catch (rowError) {
          continue
        }
      }

      console.log(`[DBSA] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[DBSA] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

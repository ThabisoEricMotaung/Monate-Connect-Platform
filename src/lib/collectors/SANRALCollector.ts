/**
 * SANRAL (South African National Roads Agency Limited) tender collector
 * Scrapes public tender listings from https://www.nra.co.za/sanral-tenders/list/open-tenders
 * Note: Requires JavaScript rendering (React SPA)
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class SANRALCollector extends TenderCollectorBase {
  constructor() {
    super("SANRAL", "https://www.nra.co.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://www.nra.co.za/sanral-tenders/list/open-tenders"
    console.log(`[SANRAL] Starting from ${url}`)

    const tenders: RawTender[] = []

    try {
      // Fetch the tenders listing page
      let html = ""
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        html = await response.text()
      } catch (fetchError) {
        console.error(`[SANRAL] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
        throw fetchError
      }

      if (!html || html.length === 0) {
        console.warn(`[SANRAL] Empty response`)
        return tenders
      }

      // Extract table rows from the main tenders table
      // SANRAL uses an HTML table with multiple columns for tender information
      const tableMatch = html.match(/<table[^>]*class="[^"]*tenders[^"]*"[^>]*>[\s\S]*?<\/table>/i)
      if (!tableMatch) {
        // Try alternative: generic table in main content area
        const altTableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i)
        if (!altTableMatch) {
          console.warn(`[SANRAL] No tender table found`)
          return tenders
        }
      }

      const tableHtml = tableMatch ? tableMatch[0] : html
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      console.log(`[SANRAL] Found ${rows.length} rows`)

      // Skip header row (first row)
      for (let i = 1; i < rows.length; i++) {
        try {
          const tender = this.parseTenderRow(rows[i], url)
          if (tender) tenders.push(tender)
        } catch (e) {
          continue
        }
      }

      console.log(`[SANRAL] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[SANRAL] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Parse a tender table row
   * Columns: Reference #, Project Type, Province, Description, Contact, Closing Date
   */
  private parseTenderRow(rowHtml: string, baseUrl: string): RawTender | null {
    const cells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
    if (cells.length < 5) return null

    // Helper to extract clean text from cell
    const cleanCell = (cellHtml: string): string => {
      return cellHtml
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim()
        .replace(/\s+/g, " ")
    }

    // Column 0: Tender Reference Number (e.g., "NRA2026/0752" or "R.352-020-2025/1F")
    const referenceNumber = cleanCell(cells[0] || "")
    if (!referenceNumber) return null

    // Column 1: Project Type (Construction Projects, Consulting Services, etc.)
    const projectType = cleanCell(cells[1] || "")
    let category = "Tender"
    if (projectType.includes("Construction")) category = "Construction Projects"
    else if (projectType.includes("Consulting")) category = "Consulting Services"
    else if (projectType.includes("Services")) category = "Services"
    else if (projectType.includes("Supply")) category = "Supply & Delivery"

    // Column 2: Province
    let province = cleanCell(cells[2] || "South Africa")
    // Normalize province names
    const provinceMap: { [key: string]: string } = {
      "WC": "Western Cape",
      "EC": "Eastern Cape",
      "NC": "Northern Cape",
      "FS": "Free State",
      "KZN": "KwaZulu-Natal",
      "GP": "Gauteng",
      "LP": "Limpopo",
      "MP": "Mpumalanga",
      "NW": "North West",
      "ZA": "South Africa",
    }
    if (provinceMap[province]) province = provinceMap[province]

    // Column 3: Description (Project description)
    const description = cleanCell(cells[3] || "")
    if (!description) return null

    // Create title from reference + description combo
    const title = `${referenceNumber} - ${description}`.substring(0, 200)

    // Column 4: Contact Email (queries@sanral.co.za typically)
    // Column 5: Closing Date (format: YYYY/MM/DD HH:MM in SAST)
    let closingDate = null
    if (cells.length > 5) {
      const dateStr = cleanCell(cells[5] || "")
      // Parse date format: YYYY/MM/DD HH:MM
      closingDate = this.parseDate(dateStr)
    }

    // SANRAL closing time is standardized to 12:00 noon SAST
    // If time not parsed, use 12:00
    if (closingDate) {
      closingDate.setHours(12, 0, 0, 0)
    }

    // Published date: assume today if not available
    const publishedDate = new Date()

    // Build source URL linking to tender detail
    const sourceUrl = `${baseUrl}/sanral-tenders/list/open-tenders?ref=${encodeURIComponent(referenceNumber)}`

    return {
      reference_number: referenceNumber,
      title,
      description: `${referenceNumber} - ${description}`,
      closing_date: closingDate,
      published_date: publishedDate,
      source_url: sourceUrl,
      buyer: "South African National Roads Agency Limited",
      category,
      province,
    }
  }
}

/**
 * Trans-Caledon Tunnel Authority (TCTA) tender collector
 * Scrapes public tender listings from https://www.tcta.co.za/tenders/
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class TCTACollector extends TenderCollectorBase {
  constructor() {
    super("TCTA", "https://www.tcta.co.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://www.tcta.co.za/tenders/"
    console.log(`[TCTA] Starting from ${url}`)

    const tenders: RawTender[] = []

    try {
      // Fetch the tenders page
      let html = ""
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        html = await response.text()
      } catch (fetchError) {
        console.error(`[TCTA] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
        throw fetchError
      }

      if (!html || html.length === 0) {
        console.warn(`[TCTA] Empty response`)
        return tenders
      }

      // TCTA uses semantic HTML with <region> containers for each tender
      // Each region contains heading, description, closing date, and document links
      const regions = html.match(/<region[^>]*>[\s\S]*?<\/region>/gi) || []
      console.log(`[TCTA] Found ${regions.length} tender regions`)

      for (const region of regions) {
        try {
          // Extract heading (tender title and reference)
          const headingMatch = region.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i)
          if (!headingMatch) continue

          const headingText = headingMatch[1].replace(/<[^>]*>/g, "").trim()

          // Parse: "025/2026/HR&OD/WELLNESS/RFB - Tender Title Description"
          // Pattern: reference - title
          const parts = headingText.split(" - ")
          if (parts.length < 2) continue

          const referenceNumber = parts[0].trim()
          const title = parts.slice(1).join(" - ").trim()

          if (!title) continue

          // Extract closing date from text content
          // Look for "Closing Date:" or similar pattern
          const datePattern = /closing\s+(?:date|on)[:?\s]+(\d{1,2}\s+\w+\s+\d{4})\s+at\s+(\d{1,2}:\d{2})/i
          const dateMatch = region.match(datePattern)
          let closingDate = null
          if (dateMatch) {
            closingDate = this.parseDate(`${dateMatch[1]} ${dateMatch[2]}`)
          }

          // Extract category from reference number
          // Format: ###/YEAR/DEPARTMENT/CATEGORY/TYPE
          const categoryMatch = referenceNumber.match(/\/([^/]+)\/([^/]+)$/)
          let category = "Procurement"
          if (categoryMatch) {
            const dept = categoryMatch[1]
            const type = categoryMatch[2]

            if (type === "RFB") category = "Request for Bid"
            else if (type === "RFQ") category = "Request for Quote"
            else if (type === "RFI") category = "Request for Information"
            else if (type === "RFP") category = "Request for Proposal"

            if (dept.includes("HR")) category = "Human Resources"
            else if (dept.includes("EWSS")) category = "Water Supply"
            else if (dept.includes("CSO")) category = "Communications"
            else if (dept.includes("IA")) category = "Internal Audit"
          }

          // TCTA is a national water utility authority
          // Operates in multiple provinces but headquartered in Gauteng
          const province = "Gauteng" // Default to HQ location

          // Try to extract published date from page (usually shown)
          // For now, use current date as published (not always available)
          const publishedDate = new Date()

          tenders.push({
            reference_number: referenceNumber,
            title: title.substring(0, 200),
            description: `${referenceNumber} - ${title}`,
            closing_date: closingDate,
            published_date: publishedDate,
            source_url: url,
            buyer: "Trans-Caledon Tunnel Authority",
            category,
            province,
          })
        } catch (regionError) {
          continue
        }
      }

      console.log(`[TCTA] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[TCTA] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

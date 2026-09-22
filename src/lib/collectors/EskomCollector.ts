/**
 * Eskom Holdings SOC Ltd tender collector
 * Scrapes public tender listings from https://tenderbulletin.eskom.co.za/
 * Note: Requires JavaScript rendering (React/Vue SPA)
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class EskomCollector extends TenderCollectorBase {
  constructor() {
    super("Eskom", "https://tenderbulletin.eskom.co.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const baseUrl = "https://tenderbulletin.eskom.co.za"
    console.log(`[Eskom] Starting from ${baseUrl}`)

    const tenders: RawTender[] = []

    try {
      // Fetch the main page with pagination support
      // Eskom uses query params: ?pageNumber=1&pageSize=25
      // Max ~340 tenders across 68 pages

      let pageNumber = 1
      const pageSize = 25 // Max per page
      const maxPages = 14 // ~340 tenders / 25 per page

      while (pageNumber <= maxPages) {
        try {
          const pageUrl = `${baseUrl}/?pageNumber=${pageNumber}&pageSize=${pageSize}`
          console.log(`[Eskom] Fetching page ${pageNumber}...`)

          const response = await fetch(pageUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          })

          if (!response.ok) {
            console.warn(`[Eskom] Page ${pageNumber} failed with status ${response.status}`)
            break
          }

          const html = await response.text()

          if (!html || html.length === 0) {
            console.warn(`[Eskom] Empty response for page ${pageNumber}`)
            break
          }

          // Extract tender articles from page
          // Eskom uses <article> elements for each tender
          const articles = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || []
          console.log(`[Eskom] Found ${articles.length} tenders on page ${pageNumber}`)

          if (articles.length === 0) break // No more tenders

          for (const article of articles) {
            try {
              const tender = this.parseTenderArticle(article, baseUrl)
              if (tender) tenders.push(tender)
            } catch (e) {
              continue
            }
          }

          pageNumber++
        } catch (pageError) {
          console.error(`[Eskom] Page ${pageNumber} error:`, pageError instanceof Error ? pageError.message : String(pageError))
          break
        }
      }

      console.log(`[Eskom] Extracted ${tenders.length} total tenders from ${pageNumber - 1} pages`)
      return tenders
    } catch (error) {
      console.error(`[Eskom] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Parse an individual tender <article> element
   */
  private parseTenderArticle(articleHtml: string, baseUrl: string): RawTender | null {
    // Extract reference number (e.g., "ERI/2022/BMS/08")
    const refMatch = articleHtml.match(/(?:Reference|Ref\.)?\s*:?\s*([A-Z0-9/]+)\s*[-–]/i)
    const referenceNumber = refMatch ? refMatch[1].trim() : null
    if (!referenceNumber) return null

    // Extract title
    const titleMatch = articleHtml.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : null
    if (!title) return null

    // Extract division/department
    let category = "Power Generation"
    const deptMatch = articleHtml.match(/(?:Division|Department)\s*:\s*([A-Z\s&]+)/i)
    if (deptMatch) {
      const dept = deptMatch[1].trim()
      if (dept.includes("DISTRIBUTION")) category = "Distribution"
      else if (dept.includes("GENERATION")) category = "Generation"
      else if (dept.includes("TRANSMISSION")) category = "Transmission"
      else if (dept.includes("ENTERPRISES")) category = "Enterprises"
    }

    // Extract dates (format: YYYY-MMM-DD HH:MM:SS)
    const dateRegex = /(\d{4})-([A-Za-z]+)-(\d{2})\s+(\d{2}):(\d{2})/g
    const dates = [...articleHtml.matchAll(dateRegex)]

    let publishedDate = null
    let closingDate = null

    if (dates.length >= 2) {
      // First date usually published, second is closing
      publishedDate = this.parseDate(dates[0][0])
      closingDate = this.parseDate(dates[1][0])
    } else if (dates.length === 1) {
      closingDate = this.parseDate(dates[0][0])
    }

    // Extract location (facility details)
    const locationMatch = articleHtml.match(/(?:Location|Office)\s*:\s*([^\n<]+)/i)
    let province = "South Africa"

    if (locationMatch) {
      const location = locationMatch[1].trim()
      // Map facility locations to provinces
      if (location.includes("Durban") || location.includes("KwaZulu")) province = "KwaZulu-Natal"
      else if (location.includes("Cape") || location.includes("Western")) province = "Western Cape"
      else if (location.includes("Gauteng") || location.includes("Johannesburg")) province = "Gauteng"
      else if (location.includes("Limpopo")) province = "Limpopo"
      else if (location.includes("Mpumalanga")) province = "Mpumalanga"
    }

    // Extract tender status (Active, Cancelled, etc.)
    const statusMatch = articleHtml.match(/(?:Status)\s*:\s*([A-Za-z\s]+?)(?:<|$)/i)
    const status = statusMatch ? statusMatch[1].trim() : "active"

    // Only include active tenders
    if (status.toLowerCase().includes("cancel")) return null

    // Extract tender ID if available (for download API: /webapi/api/Files/DownloadAll?TENDER_ID={id})
    const tenderIdMatch = articleHtml.match(/tender[_-]?id["\']?\s*[:=]\s*["\']?(\d+)/i)
    const tenderId = tenderIdMatch ? tenderIdMatch[1] : null

    return {
      reference_number: referenceNumber,
      title: title.substring(0, 200),
      description: `${referenceNumber} - ${title}${tenderId ? ` (ID: ${tenderId})` : ""}`,
      closing_date: closingDate,
      published_date: publishedDate,
      source_url: `${baseUrl}?tenderid=${tenderId || referenceNumber}`,
      buyer: "Eskom Holdings SOC Ltd",
      category,
      province,
    }
  }
}

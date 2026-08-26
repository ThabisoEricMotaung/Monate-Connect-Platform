/**
 * Ekurhuleni Metropolitan Municipality tender collector
 * Simple single-page scraper - good template for others
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class EkurhuleniCollector extends TenderCollectorBase {
  constructor() {
    super("Ekurhuleni Metropolitan Municipality", "https://www.ekurhuleni.gov.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/"
    console.log(`[Ekurhuleni] Fetching ${url}`)

    const tenders: RawTender[] = []

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()

      // Parse tender cards from Elementor posts widget
      // Look for: <h3><a href="...">Reference</a></h3> and <span class="elementor-post-date">DATE</span>
      const cardPattern = /<h3[^>]*>\s*<a[^>]*>\s*([\w\s\-\/]+?)\s*<\/a>\s*<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<span[^>]*elementor-post-date[^>]*>\s*([\d\/]+)\s*<\/span>/gi

      let match
      while ((match = cardPattern.exec(html)) !== null) {
        const referenceNumber = match[1].trim()
        const description = match[2].replace(/<[^>]*>/g, "").trim().substring(0, 200)
        const dateStr = match[3].trim()

        if (!referenceNumber || !description) continue

        tenders.push({
          reference_number: referenceNumber,
          title: referenceNumber,
          description,
          closing_date: this.parseDate(dateStr),
          source_url: url,
          buyer: "Ekurhuleni Metropolitan Municipality",
        })
      }

      console.log(`[Ekurhuleni] Found ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error("[Ekurhuleni] Scrape failed:", error)
      return []
    }
  }
}

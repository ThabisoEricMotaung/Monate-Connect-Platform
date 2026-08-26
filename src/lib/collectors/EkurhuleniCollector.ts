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
    console.log(`[Ekurhuleni] Starting collection from ${url}`)

    const tenders: RawTender[] = []

    try {
      // Fetch with error handling
      let html = ""
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        html = await response.text()
      } catch (fetchError) {
        console.error(`[Ekurhuleni] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
        throw fetchError
      }

      if (!html || html.length === 0) {
        console.warn(`[Ekurhuleni] Empty response`)
        return tenders
      }

      // Simple pattern: find all <article> with elementor-post, extract data inside
      const articles = html.match(/<article[^>]*elementor-post[^>]*>[\s\S]*?<\/article>/gi) || []
      console.log(`[Ekurhuleni] Found ${articles.length} articles`)

      for (const article of articles) {
        try {
          // Extract title from <a> tag inside <h3>
          const titleMatch = article.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i)
          if (!titleMatch) continue
          const reference = titleMatch[1].trim()

          // Extract description from <p> tag
          const descMatch = article.match(/<p[^>]*>([^<]+)<\/p>/i)
          const description = descMatch ? descMatch[1].trim() : reference

          // Extract date
          const dateMatch = article.match(/elementor-post-date[^>]*>\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
          const dateStr = dateMatch ? dateMatch[1] : ""

          if (!reference) continue

          tenders.push({
            reference_number: reference,
            title: reference,
            description: description.substring(0, 500),
            closing_date: this.parseDate(dateStr),
            source_url: url,
            buyer: "Ekurhuleni Metropolitan Municipality",
          })
        } catch (itemError) {
          // Skip problematic articles
          continue
        }
      }

      console.log(`[Ekurhuleni] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[Ekurhuleni] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

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
      console.log(`[Ekurhuleni] Starting fetch...`)
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      console.log(`[Ekurhuleni] Response status: ${response.status}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()
      console.log(`[Ekurhuleni] HTML length: ${html.length}`)

      // Parse Elementor posts: <article class="elementor-post">...<h3>...<a>REF</a></h3>...<p>DESC</p>...<span class="elementor-post-date">DATE</span>
      const articlePattern = /<article[^>]*class="[^"]*elementor-post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
      let articleMatch

      while ((articleMatch = articlePattern.exec(html)) !== null) {
        try {
          const article = articleMatch[1]

          // Extract reference from <h3 class="elementor-post__title"><a>REF</a></h3>
          const titleMatch = article.match(/<h3[^>]*elementor-post__title[^>]*>\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/i)
          const reference = titleMatch ? titleMatch[1].trim() : null

          // Extract description from <p> in elementor-post__excerpt
          const excerptMatch = article.match(/<div[^>]*elementor-post__excerpt[^>]*>([\s\S]*?)<\/div>/i)
          let description = ""
          if (excerptMatch) {
            const pMatch = excerptMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i)
            if (pMatch) {
              description = pMatch[1].replace(/<[^>]*>/g, "").trim()
            }
          }

          // Extract date from <span class="elementor-post-date">DATE</span>
          const dateMatch = article.match(/<span[^>]*elementor-post-date[^>]*>\s*([^\s<][^<]*?)\s*<\/span>/i)
          const dateStr = dateMatch ? dateMatch[1].trim() : ""

          if (!reference || !description) continue

          tenders.push({
            reference_number: reference,
            title: reference,
            description: description.substring(0, 500),
            closing_date: this.parseDate(dateStr),
            source_url: url,
            buyer: "Ekurhuleni Metropolitan Municipality",
          })
        } catch (articleError) {
          console.debug(`[Ekurhuleni] Error parsing article:`, articleError)
          continue
        }
      }

      console.log(`[Ekurhuleni] Found ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error("[Ekurhuleni] Scrape failed:", error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

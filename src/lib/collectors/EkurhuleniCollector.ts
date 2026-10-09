/**
 * Ekurhuleni Metropolitan Municipality tender collector
 * Reads the open-tenders grid for bid numbers and detail links, then each
 * detail page for the official description and closing date (see
 * ekurhuleniParser for the page structure).
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { parseEkurhuleniDetail, parseEkurhuleniListing } from "./ekurhuleniParser"

const LISTING_URL = "https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export class EkurhuleniCollector extends TenderCollectorBase {
  constructor() {
    super("Ekurhuleni Metropolitan Municipality", "https://www.ekurhuleni.gov.za")
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await this.fetchSource(url, { headers: { "User-Agent": USER_AGENT } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.text()
  }

  async scrapeListings(): Promise<RawTender[]> {
    console.log(`[Ekurhuleni] Starting collection from ${LISTING_URL}`)

    const tenders: RawTender[] = []

    try {
      let html = ""
      try {
        html = await this.fetchHtml(LISTING_URL)
      } catch (fetchError) {
        console.error(`[Ekurhuleni] Fetch error:`, fetchError instanceof Error ? fetchError.message : String(fetchError))
        throw fetchError
      }

      if (!html || html.length === 0) {
        console.warn(`[Ekurhuleni] Empty response`)
        return tenders
      }

      const items = parseEkurhuleniListing(html, LISTING_URL)
      console.log(`[Ekurhuleni] Found ${items.length} listing items`)

      for (const item of items) {
        // The title and closing date exist only on the detail page; without it
        // the record would have no title but its bid number, so skip it.
        let detail
        try {
          detail = parseEkurhuleniDetail(await this.fetchHtml(item.detailUrl))
        } catch (detailError) {
          console.warn(
            `[Ekurhuleni] ${item.bidNumber}: detail fetch failed:`,
            detailError instanceof Error ? detailError.message : String(detailError),
          )
          continue
        }

        if (!detail.description) {
          console.warn(`[Ekurhuleni] ${item.bidNumber}: no Description on ${item.detailUrl}`)
          continue
        }
        // Without a closing date the base class would store the record as
        // "active" with no deadline, which listings never show.
        if (!detail.closingDate) {
          console.warn(`[Ekurhuleni] ${item.bidNumber}: skipped, unparseable closing date "${detail.closingDateText ?? ""}"`)
          continue
        }

        tenders.push({
          // The grid heading is the genuine bid number (identical to the detail
          // page's "Bid Number"); it is also the key earlier runs stored.
          reference_number: item.bidNumber,
          title: detail.description,
          description: null,
          closing_date: detail.closingDate,
          published_date: detail.publishedDate ?? item.postedDate,
          source_url: item.detailUrl,
          buyer: "Ekurhuleni Metropolitan Municipality",
        })
      }

      console.log(`[Ekurhuleni] Extracted ${tenders.length} tenders`)
      return tenders
    } catch (error) {
      console.error(`[Ekurhuleni] Failed:`, error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

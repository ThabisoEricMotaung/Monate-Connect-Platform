/**
 * Trans-Caledon Tunnel Authority (TCTA) tender collector
 * Scrapes public tender listings from https://www.tcta.co.za/tenders/
 * See tctaParser.ts for the page structure.
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { parseTctaTenders, tctaCategory } from "./tctaParser"

export class TCTACollector extends TenderCollectorBase {
  constructor() {
    super("TCTA", "https://www.tcta.co.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const url = "https://www.tcta.co.za/tenders/"
    console.log(`[TCTA] Starting from ${url}`)

    const response = await this.fetchSource(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    if (!response.ok) throw new Error(`TCTA tenders page returned HTTP ${response.status}`)

    const tenders = parseTctaTenders(await response.text(), url)
    console.log(`[TCTA] Extracted ${tenders.length} tenders`)

    return tenders.map((tender) => ({
      reference_number: tender.reference,
      title: tender.title,
      description: tender.description,
      closing_date: tender.closingDate,
      // The page shows no publication date; leave it unset rather than
      // recording the scrape time as the publication date.
      published_date: null,
      source_url: tender.sourceUrl,
      buyer: "Trans-Caledon Tunnel Authority",
      category: tctaCategory(tender.reference),
      // TCTA is headquartered in Gauteng; the page gives no project location.
      province: "Gauteng",
    }))
  }
}

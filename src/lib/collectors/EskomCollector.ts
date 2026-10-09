/**
 * Eskom Holdings SOC Ltd tender collector
 * Source: https://tenderbulletin.eskom.co.za/
 *
 * The bulletin is a client-rendered SPA (the HTML is an empty shell), so the
 * collector reads the public JSON endpoint the SPA itself calls. See
 * eskomParser.ts for the record format and title rules.
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { ESKOM_ORIGIN, ESKOM_TENDERS_API, parseEskomTenders, type EskomTender } from "./eskomParser"

const DIVISION_CATEGORIES: [string, string][] = [
  ["DISTRIBUTION", "Distribution"],
  ["GENERATION", "Generation"],
  ["TRANSMISSION", "Transmission"],
  ["ENTERPRISES", "Enterprises"],
]

function categoryFor(division: string | null): string | null {
  if (!division) return null
  const upper = division.toUpperCase()
  return DIVISION_CATEGORIES.find(([key]) => upper.includes(key))?.[1] ?? division
}

export class EskomCollector extends TenderCollectorBase {
  constructor() {
    super("Eskom", ESKOM_ORIGIN)
  }

  async scrapeListings(): Promise<RawTender[]> {
    console.log(`[Eskom] Fetching ${ESKOM_TENDERS_API}`)

    const response = await this.fetchSource(ESKOM_TENDERS_API, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    })
    if (!response.ok) throw new Error(`Eskom tender API returned HTTP ${response.status}`)

    const parsed = parseEskomTenders(await response.json(), ESKOM_ORIGIN)

    // The feed has no field marking notices about earlier tenders
    // (cancellations, regret letters, awards, bidders lists, validity
    // extensions); classifyEskomNotice recognises them from their wording only.
    // Wording alone is not proof, so those items are held for curator review
    // as non-public drafts rather than discarded or published.
    const possibleNotices = parsed.filter((tender) => tender.noticeType).length
    console.log(`[Eskom] Parsed ${parsed.length} records, ${possibleNotices} held for review as possible notices`)

    return parsed.map((tender) => this.toRawTender(tender))
  }

  private toRawTender(tender: EskomTender): RawTender {
    return {
      reference_number: tender.reference,
      title: tender.title,
      description: tender.description,
      closing_date: tender.closingDate,
      published_date: tender.publishedDate,
      source_url: tender.detailUrl,
      buyer: "Eskom Holdings SOC Ltd",
      category: categoryFor(tender.division),
      province: tender.province,
      review_reason: tender.noticeType ? `possible_${tender.noticeType.replace(/-/g, "_")}_notice` : null,
    }
  }
}

import { describe, expect, it } from "vitest"
import { parseEkurhuleniDetail, parseEkurhuleniListing } from "./ekurhuleniParser"

const PAGE = "https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/"

// Trimmed from the open-tenders grid (2026-10-08).
const LISTING = `
<div class="elementor-posts-container">
<article class="elementor-post elementor-grid-item post-38834 post type-post status-publish format-standard hentry category-tenders" role="listitem"><div class="elementor-post__card"><div class="elementor-post__text"><h3 class="elementor-post__title"> <a href="https://www.ekurhuleni.gov.za/business/tenders/ps-f-02-2027/" > PS-F 02-2027 </a></h3><div class="elementor-post__excerpt"><p>Bid Number: PS-F 02-2027 Description: The appointment of a Lead Bond Arranger, Debt Sponsor, Settlement, Calculating &amp; Paying Agent for the Coe Domestic Medium-Term Note</p></div></div><div class="elementor-post__meta-data"> <span class="elementor-post-date"> 01/10/2026 </span></div></div></article>
<article class="elementor-post elementor-grid-item post-38800 post type-post status-publish format-standard hentry category-tenders" role="listitem"><div class="elementor-post__card"><div class="elementor-post__text"><h3 class="elementor-post__title"> <a href="https://www.ekurhuleni.gov.za/business/tenders/a-cs-10-2026/" > A-CS 10-2026 </a></h3><div class="elementor-post__excerpt"><p>Bid Number: A-CS 10-2026 Description: The appointment of a panel of mechanical service providers for the maintenance, services and repairs of small plant equipment, and</p></div></div><div class="elementor-post__meta-data"> <span class="elementor-post-date"> 15/09/2026 </span></div></div></article>
</div>`

// Trimmed from https://www.ekurhuleni.gov.za/business/tenders/ps-f-02-2027/ (2026-10-08).
const DETAIL_PS_F = `
<article id="post-38834" class="post-layout"><div class="blog-header"><h1 class="single-post-title"> PS-F 02-2027</h1><div class="entry-post-meta"> <span class="publish-date"> <time class="entry-date" datetime="2026-10-01T09:54:18+02:00">01/10/2026</time> </span></div></div><div class="single-entry-summary"><figure class="wp-block-table is-style-stripes"><table><tbody><tr><th class="has-text-align-left" data-align="left" scope="row">Bid Number:</th><td>PS-F 02-2027</td></tr><tr><th class="has-text-align-left" data-align="left" scope="row">Description:</th><td>The appointment of a Lead Bond Arranger, Debt Sponsor, Settlement, Calculating &amp; Paying Agent for the Coe Domestic Medium-Term Note (DMTN) Programme for the period with effect from 01 July 2027 until 30 June 2030</td></tr><tr><th class="has-text-align-left" data-align="left" scope="row">Bid closing date:</th><td>05 NOVEMBER 2026 at 10:00am</td></tr><tr><th class="has-text-align-left" data-align="left" scope="row">Information session:</th><td>Will be held at 11:00 am on 14 OCTOBER 2026. Prospective bidders are requested to meet on the said date and time at: EKURHULENI FINANCE HEAD OFFICE, FINANCIAL REPORTING, 4TH FLOOR, BOARDROOM, EAST WING, CORNER VICTORIA AND F H ODENDAAL STREETS, GERMISTON</td></tr><tr><th class="has-text-align-left" data-align="left" scope="row">Telephone number:</th><td>N/A&nbsp;</td></tr><tr><th class="has-text-align-left" data-align="left" scope="row"><p>Non-refundable Document fee:</p></th><td><p>Free to download below</p></td></tr></tbody></table></figure><div class="wp-block-file"><a href="https://www.ekurhuleni.gov.za/wp-content/uploads/2026/10/x.pdf">FINAL BID DOCUMENT</a></div></div></article>`

// Trimmed from https://www.ekurhuleni.gov.za/business/tenders/a-cs-10-2026/ (2026-10-08).
const DETAIL_A_CS = `
<time class="entry-date" datetime="2026-09-15T13:02:52+02:00">15/09/2026</time><div class="single-entry-summary"><figure class="wp-block-table is-style-stripes"><table><tbody><tr><th class="has-text-align-left" data-align="left" scope="row">Bid Number:</th><td>A-CS 10-2026</td></tr><tr><th class="has-text-align-left" data-align="left" scope="row">Description:</th><td>The appointment of a panel of mechanical service providers for the maintenance, services and repairs of small plant equipment, and the supply and delivery of spare parts, on an as and when required basis from date of award until 30 June 2029.</td></tr><tr><th class="has-text-align-left" data-align="left" scope="row">Bid closing date:</th><td>15 October 2026 at 10:00</td></tr></tbody></table></figure></div>`

describe("parseEkurhuleniListing", () => {
  const items = parseEkurhuleniListing(LISTING, PAGE)

  it("reads the bid number and detail URL from the heading link", () => {
    expect(items.map((item) => [item.bidNumber, item.detailUrl])).toEqual([
      ["PS-F 02-2027", "https://www.ekurhuleni.gov.za/business/tenders/ps-f-02-2027/"],
      ["A-CS 10-2026", "https://www.ekurhuleni.gov.za/business/tenders/a-cs-10-2026/"],
    ])
  })

  it("reads the post date day-first (01/10/2026 is 1 October, not 10 January)", () => {
    expect(items[0].postedDate?.toISOString()).toBe("2026-09-30T22:00:00.000Z")
    expect(items[1].postedDate?.toISOString()).toBe("2026-09-14T22:00:00.000Z")
  })
})

describe("parseEkurhuleniDetail", () => {
  it("takes the full Description as the title text and the Bid Number as reference", () => {
    const detail = parseEkurhuleniDetail(DETAIL_PS_F)
    expect(detail.bidNumber).toBe("PS-F 02-2027")
    expect(detail.description).toBe(
      "The appointment of a Lead Bond Arranger, Debt Sponsor, Settlement, Calculating & Paying Agent for the Coe Domestic Medium-Term Note (DMTN) Programme for the period with effect from 01 July 2027 until 30 June 2030",
    )
    expect(detail.fields["Non-refundable Document fee"]).toBe("Free to download below")
    expect(detail.fields["Telephone number"]).toBe("N/A")
  })

  it("parses the bid closing date as South African time, not the information session date", () => {
    const detail = parseEkurhuleniDetail(DETAIL_PS_F)
    expect(detail.closingDateText).toBe("05 NOVEMBER 2026 at 10:00am")
    expect(detail.closingDate?.toISOString()).toBe("2026-11-05T08:00:00.000Z")
    expect(detail.informationSession).toMatch(/^Will be held at 11:00 am on 14 OCTOBER 2026\./)
    expect(detail.publishedDate?.toISOString()).toBe("2026-10-01T07:54:18.000Z")
  })

  it("handles a 24-hour closing time without am/pm", () => {
    const detail = parseEkurhuleniDetail(DETAIL_A_CS)
    expect(detail.description).toBe(
      "The appointment of a panel of mechanical service providers for the maintenance, services and repairs of small plant equipment, and the supply and delivery of spare parts, on an as and when required basis from date of award until 30 June 2029.",
    )
    expect(detail.closingDate?.toISOString()).toBe("2026-10-15T08:00:00.000Z")
  })

  it("returns nulls when the detail table is missing", () => {
    const detail = parseEkurhuleniDetail("<html><body>Not found</body></html>")
    expect(detail.description).toBeNull()
    expect(detail.closingDate).toBeNull()
    expect(detail.bidNumber).toBeNull()
  })
})

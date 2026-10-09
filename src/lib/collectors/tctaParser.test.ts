import { describe, expect, it } from "vitest"
import { parseTctaClosingDate, parseTctaReference, parseTctaTenders, tctaCategory } from "./tctaParser"

const PAGE_URL = "https://www.tcta.co.za/tenders/"

// Trimmed from https://www.tcta.co.za/tenders/ (2026-10-08): markup and text verbatim,
// lazy-load image attributes and empty placeholder lines removed.
const PAGE = `
<h1 class="fusion-title-heading title-heading-left">Tenders</h1></div><div class="fusion-text fusion-text-2"><div class="active-tenders row">
           <div id="7888" class="column-12 first">
				<div class="vacancy-info-container">
					<h5 class="vac_title uppercase m-0">APPOINTMENT A SERVICE PROVIDER TO PROVIDE A PROFESSIONAL ENVIRONMENTAL CONTROL OFFICER FOR THE BERG RIVER VOËLVLEI AUGMENTATION SCHEME (BRVAS) FOR THE CONTRACT DURATION OF 63 MONTHS</h5>
					<h6 class="vac_title uppercase m-0">Tender N<sup>o</sup> 038/2026/PMID/ECO/RFB</h6>
					<p class="text-dark vac_desc"> The RFB can be downloaded from <a href="https://www.etenders.gov.za/">https://www.etenders.gov.za/#</a> by selecting Trans-Caledon Tunnel Authority as the organ of state</p>
				</div>
               <div class="card-footer">
					<div class="files">
							<div class="column-item mt-2"><span><img decoding="async" class="lazyload pr-1 first" width="40" alt="calendar" ></span><span class="vac_city">4 November 2026 at 14:00:00 </span></div>
							<div class="column-item"><a class="btn btn-download" href="/wp-content/uploads/2026/10/RFB-012-2024-PMID-SERVICES-RFB-ECO-BRVAS-RFB_NM-Comments-Editted.pdf">Brief Document</a></div>
							<div class="column-item"><a class="btn btn-download" href="/wp-content/uploads/2026/10/BRVAS-Clean-Price-Schedule-I_BBNM.xlsx">Cost Sheet</a></div>
					</div>
			</div>
				 <hr/>
       </div>
           <div id="7866" class="column-12 first">
				<div class="vacancy-info-container">
					<h5 class="vac_title uppercase m-0">THE APPOINTMENT OF A SERVICE PROVIDER TO REVIEW, UPDATE, AND DEVELOP 8 TECHNICAL COMPETENCY DICTIONARIES WITH PROFICIENCY TABLES ALIGNED TO TCTA’S COMPETENCY MODEL, AND FRAMEWORK FOR A PERIOD OF FIFTEEN (15) MONTHS</h5>
					<h6 class="vac_title uppercase m-0">Tender N<sup>o</sup> 056/2026/HROD/DICTIONARIES/RFB</h6>
					<p class="text-dark vac_desc"> The RFQ can be downloaded from <a href="https://www.etenders.gov.za/">https://www.etenders.gov.za/#</a> by selecting Trans-Caledon Tunnel Authority as the organ of state</p>
				</div>
               <div class="card-footer">
					<div class="files">
							<div class="column-item mt-2"><span><img decoding="async" class="lazyload pr-1 first" width="40" alt="calendar" ></span><span class="vac_city">29 October 2026 at 11:00:00 </span></div>
							<div class="column-item"><a class="btn btn-download" href="/wp-content/uploads/2026/09/RFB-Competency-dictionaries-29092026-final.pdf">Brief Document</a></div>
					</div>
			</div>
				 <hr/>
       </div>
           <div id="7848" class="column-12 first">
				<div class="vacancy-info-container">
					<h5 class="vac_title uppercase m-0">APPOINTMENT OF A SERVICE PROVIDER TO SOURCE SPACE, DESIGN, BUILD AND SET UP EXHIBITION STANDS FOR TCTA AT THE AWSISA AFRICA &amp; GLOBAL SOUTH WATER &amp; SANITATION DIALOGUE.</h5>
					<h6 class="vac_title uppercase m-0">Tender N<sup>o</sup> RFQ NO: 082/2026/CSO/STAND/RFQ APPOINTMENT</h6>
					<p class="text-dark vac_desc"></p>
				</div>
               <div class="card-footer">
					<div class="files">
							<div class="column-item mt-2"><span><img decoding="async" class="lazyload pr-1 first" width="40" alt="calendar" ></span><span class="vac_city">17 September 2026 at 11:00:00 </span></div>
							<div class="column-item"><a class="btn btn-download" href="/wp-content/uploads/2026/09/082-2026-CSO-STAND-RFQ.pdf">Brief Document</a></div>
					</div>
			</div>
				 <hr/>
       </div>
           <div id="7783" class="column-12 first">
				<div class="vacancy-info-container">
					<h5 class="vac_title uppercase m-0">APPOINTMENT OF A PROFESSIONAL SERVICE PROVIDER TO PROVIDE SNAKE AWARENESS, SNAKE IDENTIFICATION, AND SNAKE HANDLING TRAINING FOR EMPLOYEES ACROSS VARIOUS TCTA SITES INCLUDING THE PROVISION OF TRAINING MATERIAL, CERTIFICATES OF COMPETENCE/ATTENDANCE, AND ADVISORY SUPPORT ON SNAKE-RELATED OCCUPATIONAL HAZARDS FOR A PERIOD OF TWENTY-FOUR (24) MONTHS</h5>
					<h6 class="vac_title uppercase m-0">Tender N<sup>o</sup> RFQ: 031/2026/EWSS/TRAINING/RFQ</h6>
					<p class="text-dark vac_desc"></p>
				</div>
               <div class="card-footer">
					<div class="files">
							<div class="column-item mt-2"><span><img decoding="async" class="lazyload pr-1 first" width="40" alt="calendar" ></span><span class="vac_city">24 July 2026 at 11:00:00 </span></div>
							<div class="column-item"><a class="btn btn-download" href="/wp-content/uploads/2026/07/RFQ-FOR-SNAKE-TRAINING-SERVICES-29062026.pdf">Brief Document</a></div>
					</div>
			</div>
				 <hr/>
       </div>
                </div>
</div><footer><a class="btn btn-download" href="/footer.pdf">Not a tender</a></footer>`

describe("parseTctaTenders", () => {
  const tenders = parseTctaTenders(PAGE, PAGE_URL)

  it("finds every tender card", () => {
    expect(tenders.map((tender) => tender.cardId)).toEqual(["7888", "7866", "7848", "7783"])
  })

  it("takes the title from the card's h5 and the reference from its h6", () => {
    expect(tenders[0]).toMatchObject({
      reference: "038/2026/PMID/ECO/RFB",
      title: "APPOINTMENT A SERVICE PROVIDER TO PROVIDE A PROFESSIONAL ENVIRONMENTAL CONTROL OFFICER FOR THE BERG RIVER VOËLVLEI AUGMENTATION SCHEME (BRVAS) FOR THE CONTRACT DURATION OF 63 MONTHS",
      sourceUrl: "https://www.tcta.co.za/tenders/#7888",
    })
    expect(tenders[1].title).toContain("ALIGNED TO TCTA’S COMPETENCY MODEL")
    expect(tenders[2].title).toBe(
      "APPOINTMENT OF A SERVICE PROVIDER TO SOURCE SPACE, DESIGN, BUILD AND SET UP EXHIBITION STANDS FOR TCTA AT THE AWSISA AFRICA & GLOBAL SOUTH WATER & SANITATION DIALOGUE."
    )
  })

  it("keeps long titles whole", () => {
    expect(tenders[3].title.length).toBeGreaterThan(300)
    expect(tenders[3].title.startsWith("APPOINTMENT OF A PROFESSIONAL SERVICE PROVIDER TO PROVIDE SNAKE AWARENESS")).toBe(true)
    expect(tenders[3].title.endsWith("FOR A PERIOD OF TWENTY-FOUR (24) MONTHS")).toBe(true)
  })

  it("strips labels and stray words around the tender number", () => {
    expect(tenders.map((tender) => tender.reference)).toEqual([
      "038/2026/PMID/ECO/RFB",
      "056/2026/HROD/DICTIONARIES/RFB",
      "082/2026/CSO/STAND/RFQ",
      "031/2026/EWSS/TRAINING/RFQ",
    ])
  })

  it("treats the eTenders download notice as no description", () => {
    expect(tenders.map((tender) => tender.description)).toEqual([null, null, null, null])
  })

  it("keeps a description that is not the download notice", () => {
    const page = PAGE.replace('<p class="text-dark vac_desc"></p>', '<p class="text-dark vac_desc">Compulsory briefing at Centurion.</p>')
    expect(parseTctaTenders(page, PAGE_URL)[2].description).toBe("Compulsory briefing at Centurion.")
  })

  it("reads the closing time as South African time", () => {
    expect(tenders[0].closingDate?.toISOString()).toBe("2026-11-04T12:00:00.000Z")
    expect(tenders[3].closingDate?.toISOString()).toBe("2026-07-24T09:00:00.000Z")
  })

  it("lists the card's documents, not links outside the cards", () => {
    expect(tenders[0].documents).toEqual([
      { label: "Brief Document", url: "https://www.tcta.co.za/wp-content/uploads/2026/10/RFB-012-2024-PMID-SERVICES-RFB-ECO-BRVAS-RFB_NM-Comments-Editted.pdf" },
      { label: "Cost Sheet", url: "https://www.tcta.co.za/wp-content/uploads/2026/10/BRVAS-Clean-Price-Schedule-I_BBNM.xlsx" },
    ])
    expect(tenders[3].documents).toHaveLength(1)
  })

  it("returns nothing for a page without tender cards", () => {
    expect(parseTctaTenders("<html><body><region><h2>x - y</h2></region></body></html>", PAGE_URL)).toEqual([])
  })
})

describe("parseTctaReference", () => {
  it("handles the label variants seen on the page", () => {
    expect(parseTctaReference("Tender No RFB NO: 024/2026/EWSS/SAGE300/RFB")).toBe("024/2026/EWSS/SAGE300/RFB")
    expect(parseTctaReference("Tender No RFI NO: 1001/2026/EWSS/TARIFF/RFI")).toBe("1001/2026/EWSS/TARIFF/RFI")
    expect(parseTctaReference("Tender No 101/2026/HR&OD/WELLNESS/RFQ")).toBe("101/2026/HR&OD/WELLNESS/RFQ")
    expect(parseTctaReference("Tender No 041/2026/EWSS/CLOUD-BASE/RFB")).toBe("041/2026/EWSS/CLOUD-BASE/RFB")
  })

  it("falls back to the unlabelled text and returns null when empty", () => {
    expect(parseTctaReference("Tender No RFQ NO: TCTA-X1")).toBe("TCTA-X1")
    expect(parseTctaReference("Tender No ")).toBeNull()
  })
})

describe("parseTctaClosingDate", () => {
  it("parses dates with and without a time", () => {
    expect(parseTctaClosingDate("19 October 2026 at 10:00:00 ")?.toISOString()).toBe("2026-10-19T08:00:00.000Z")
    expect(parseTctaClosingDate("19 October 2026")?.toISOString()).toBe("2026-10-19T21:59:59.999Z")
    expect(parseTctaClosingDate("TBC")).toBeNull()
  })
})

describe("tctaCategory", () => {
  it("uses the department segment, then the procurement type", () => {
    expect(tctaCategory("025/2026/HR&OD/WELLNESS/RFB")).toBe("Human Resources")
    expect(tctaCategory("100/2026/IA/ETHICS/RFQ")).toBe("Internal Audit")
    expect(tctaCategory("038/2026/PMID/ECO/RFB")).toBe("Request for Bid")
    expect(tctaCategory("RFQ")).toBe("Procurement")
  })
})

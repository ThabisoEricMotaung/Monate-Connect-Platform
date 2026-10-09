import { describe, expect, it } from "vitest"
import { findCojCurrentBidsUrl, parseCojBidProposals, parseCojDate } from "./cojParser"

const ORIGIN = "https://joburg.org.za"
const ZW = "​"

// Trimmed from https://joburg.org.za/work_/Pages/2026-Tenders/2026-Bid-Proposals.aspx (2026-10-08).
// Style attributes removed; zero-width spaces kept where the page has them.
const LISTING = `<table class="ms-rteTable-5"><tbody>
<tr class="ms-rteTableHeaderRow-5"><th>${ZW}${ZW}Bid Proposals<br></th><th>${ZW}Description${ZW}<br></th><th>${ZW}Closing Date</th></tr>
<tr class="ms-rteTableOddRow-5"><td class="ms-rteTableEvenCol-5"><a href="/work_/Documents/2026-Tenders/COJ-JTC02-26-27-TENDER-DOCUMENT.pdf">${ZW}COJ/JTC02/26-27${ZW}</a><br><br><br><a href="/work_/Documents/2026-Tenders/PROOF-OF-ADVERT-COJ-JTC-01-26-27_COJ-JTC-02-26-27.pdf">Proof of Advert</a><br></td><td class="ms-rteTableOddCol-5">${ZW}REQUEST FOR PROPOSALS FOR THE APPOINTMENT OF A SUITABLE AND QUALIFIED SERVICE PROVIDER FOR PROVISION OF TOUR OPERATING SERVICES&#160; FOR THE TRAVEL TRADE PARTNERS, MEDIA, BUYERS, AND TOURISM STAKEHOLDERS’ FAMILIARISATION TRIPS FOR A PERIOD OF THIRTY (30) MONTHS ON AN AS AND WHEN REQUIRED BASIS.<br></td><td class="ms-rteTableEvenCol-5">${ZW}13 October&#160;2026<br></td></tr>
<tr class="ms-rteTableOddRow-5"><td class="ms-rteTableEvenCol-5"><a href="/work_/Documents/2026-Tenders/COJ-EISD001-25-26-Extension-Notice.pdf">${ZW}COJ-EISD001/25-26</a><br><br></td><td class="ms-rteTableOddCol-5">${ZW}REQUEST FOR QUALIFICATION FOR THE DEVELOPMENT OF AN ALTERNATIVE WASTE&#160;TREATMENT FACILITY THROUGH A PUBLIC-PRIVATE PARTNERSHIP FOR THE CITY OF JOHANNESBURG.<div><br></div><div>THE CITY OF JOHANNESBURG METROPOLITAN MUNICIPALITY WISHES TO INFORM ${ZW}ALL INTERESTED PARTIES THAT THE ABOVE-MENTIONED${ZW} BID HAS BEEN EXTENDED.</div></td><td class="ms-rteTableEvenCol-5">07 AUGUST 2026<div>TO 28 AUGUST 2026<br></div><br></td></tr>
<tr class="ms-rteTableOddRow-5"><td class="ms-rteTableEvenCol-5"><a href="/work_/Documents/2026-Tenders/01-Compulsory-RFQ-Briefing-Session-28-May-SCM.pdf">${ZW}COJ/EISD001/25-26${ZW}</a><br><br><a href="/work_/Documents/2026-Tenders/Extension.pdf">Extension${ZW}</a>&#160;<br></td><td class="ms-rteTableOddCol-5">${ZW}${ZW}Request for qualification for the development of an alternative waste treatment facility through a public-private partnership for the city of Johannesburg.<br><br></td><td class="ms-rteTableEvenCol-5">${ZW}${ZW}24 July 2026<br></td></tr>
<tr class="ms-rteTableEvenRow-5"><td class="ms-rteTableEvenCol-5">${ZW}<a href="/work_/Documents/2026-Tenders/COJ-GCSS02-25-26-TenderDocument.pdf">COJ/GCSS0${ZW}2/25-26${ZW}</a><br></td><td class="ms-rteTableOddCol-5">${ZW}APPOINTMENT OF A PANEL OF SERVICE PROVIDERS TO PROVIDE ADVERTISING SERVICES, RESPONSE HANDLING, HEAD-HUNTING AND COMPETENCY ASSESSMENTS FOR SENIOR MANAGERS WITHIN THE CITY OF JOHANNESBURG FOR A PERIOD OF THREE (3) YEARS&#160;<br><br></td><td class="ms-rteTableEvenCol-5">${ZW}07 July&#160;2026<br></td></tr>
<tr class="ms-rteTableOddRow-5"><td class="ms-rteTableEvenCol-5"><a href="/work_/Documents/2026-Tenders/COJ-TRP003-25-26-EXTENSION.pdf"><strong>${ZW}COJ-TRP003-25-26 Extension</strong></a><br><br><br><a href="/work_/Documents/2026-Tenders/Reavaya1B%28b%29-TOR-Final-19-March-2026-Signed-25-March-2026.pdf">COJ/TRP003/25-26${ZW}</a><br>${ZW}<a href="/work_/Documents/2026-Tenders/CoJ-TRP003-25-26%20PROOF%20OF%20ADVERT.pdf">Proof of Advert${ZW}</a>&#160;<br></td><td class="ms-rteTableOddCol-5"><strong>${ZW}${ZW}Please be advised that the bid submission closing date has been extended from 24 April 2026 to 08 May 2026</strong><br><br><br>Request for Proposal for the Appointment for the Supply and Delivery of Quality Road-Based Public Transport Services for the City of Johannesburg for the duration of 7 years, Rea Vaya phase 1B (b)${ZW}<br></td><td class="ms-rteTableEvenCol-5">${ZW}<strong>08 May 2026</strong><br><br><br>24 Apr${ZW}il 2026<br></td></tr>
<tr class="ms-rteTableEvenRow-5"><td class="ms-rteTableEvenCol-5"><div><a href="/work_/Documents/2026-Tenders/COJ-GSPCR001-25-26_TENDER-DOCUMENT.pdf">COJ/GSPCR001/25-26</a></div><div><br></div><div><br></div><div><a href="/work_/Documents/2026-Tenders/COJ-DEVP001-25-26_TENDER-DOCUMENT.pdf">COJ/DEVP001/25-26${ZW}</a><br><br><br></div><br><a href="/work_/Documents/2026-Tenders/GSPCR001_DEVP001_PROOF-OF-ADVERT.pdf">${ZW}Proof-of-advert COJ/GSPCR001/25-26<div><span>${ZW}</span>Proof-of-advert COJ/DEVP001/25-26${ZW}<br></div></a></td><td class="ms-rteTableOddCol-5">${ZW}Appointment of a Service Provider to Conduct the Customer Satisfaction Survey in the Financial Year 2025/26 (Contract Period six (6) months)<br><br><div><br></div><div>Provision of colour digital Orthophotos, LiDAR, DEM, Contours, Oblique Imagery and Satellite Imagery for the City of Johannesburg for a <span>period of three (3) years</span><span>${ZW}</span></div></td><td class="ms-rteTableEvenCol-5">${ZW}16 February 2026<br><br><br><br>02 M${ZW}arch 2026${ZW}<br></td></tr>
<tr class="ms-rteTableOddRow-5"><td class="ms-rteTableEvenCol-5"><a href="/work_/Documents/2026-Tenders/JTC00010-for-Domestic-Tour-Operator.pdf">${ZW}JTC 00010/2025-26</a><br><br></td><td class="ms-rteTableOddCol-5">${ZW}REQUEST FOR PROPOSALS FROM SUITABLY QUALIFIED, LOCAL TOUR OPERATOR OR TRAVEL MANAGEMENT COMPANY TO CONCEPTUALISE AND IMPLEMENT DOMESTIC SEASONAL AND EXPERIENTIAL DEALS<br></td><td class="ms-rteTableEvenCol-5">${ZW}25 February 2026${ZW}<br></td></tr>
</tbody></table>`

describe("parseCojBidProposals", () => {
  const { tenders, skipped } = parseCojBidProposals(LISTING, ORIGIN)
  const byRef = Object.fromEntries(tenders.map((t) => [t.reference, t]))

  it("extracts one tender per reference, using the description as the title", () => {
    expect(skipped).toEqual([])
    expect(tenders.map((t) => t.reference)).toEqual([
      "COJ/JTC02/26-27",
      "COJ/EISD001/25-26",
      "COJ/GCSS02/25-26",
      "COJ/TRP003/25-26",
      "COJ/GSPCR001/25-26",
      "COJ/DEVP001/25-26",
      "JTC 00010/2025-26",
    ])
    expect(byRef["COJ/JTC02/26-27"]).toEqual({
      reference: "COJ/JTC02/26-27",
      title:
        "REQUEST FOR PROPOSALS FOR THE APPOINTMENT OF A SUITABLE AND QUALIFIED SERVICE PROVIDER FOR PROVISION OF TOUR OPERATING SERVICES FOR THE TRAVEL TRADE PARTNERS, MEDIA, BUYERS, AND TOURISM STAKEHOLDERS’ FAMILIARISATION TRIPS FOR A PERIOD OF THIRTY (30) MONTHS ON AN AS AND WHEN REQUIRED BASIS.",
      description: null,
      closingDate: new Date("2026-10-13T23:59:59.999+02:00"),
      documentUrl: "https://joburg.org.za/work_/Documents/2026-Tenders/COJ-JTC02-26-27-TENDER-DOCUMENT.pdf",
    })
  })

  it("removes zero-width spaces inside references", () => {
    expect(byRef["COJ/GCSS02/25-26"].closingDate).toEqual(new Date("2026-07-07T23:59:59.999+02:00"))
  })

  it("keeps the newest row for a repeated reference, with its extended closing date", () => {
    const eisd = byRef["COJ/EISD001/25-26"]
    expect(eisd.title).toBe(
      "REQUEST FOR QUALIFICATION FOR THE DEVELOPMENT OF AN ALTERNATIVE WASTE TREATMENT FACILITY THROUGH A PUBLIC-PRIVATE PARTNERSHIP FOR THE CITY OF JOHANNESBURG."
    )
    expect(eisd.description).toBe(
      "THE CITY OF JOHANNESBURG METROPOLITAN MUNICIPALITY WISHES TO INFORM ALL INTERESTED PARTIES THAT THE ABOVE-MENTIONED BID HAS BEEN EXTENDED."
    )
    expect(eisd.closingDate).toEqual(new Date("2026-08-28T23:59:59.999+02:00"))
  })

  it("does not use an extension notice as the title", () => {
    const trp = byRef["COJ/TRP003/25-26"]
    expect(trp.title).toBe(
      "Request for Proposal for the Appointment for the Supply and Delivery of Quality Road-Based Public Transport Services for the City of Johannesburg for the duration of 7 years, Rea Vaya phase 1B (b)"
    )
    expect(trp.description).toBe("Please be advised that the bid submission closing date has been extended from 24 April 2026 to 08 May 2026")
    expect(trp.closingDate).toEqual(new Date("2026-05-08T23:59:59.999+02:00"))
    expect(trp.documentUrl).toBe(
      "https://joburg.org.za/work_/Documents/2026-Tenders/Reavaya1B%28b%29-TOR-Final-19-March-2026-Signed-25-March-2026.pdf"
    )
  })

  it("splits a row holding two tenders by paragraph order", () => {
    expect(byRef["COJ/GSPCR001/25-26"]).toMatchObject({
      title: "Appointment of a Service Provider to Conduct the Customer Satisfaction Survey in the Financial Year 2025/26 (Contract Period six (6) months)",
      closingDate: new Date("2026-02-16T23:59:59.999+02:00"),
    })
    expect(byRef["COJ/DEVP001/25-26"]).toMatchObject({
      title: "Provision of colour digital Orthophotos, LiDAR, DEM, Contours, Oblique Imagery and Satellite Imagery for the City of Johannesburg for a period of three (3) years",
      closingDate: new Date("2026-03-02T23:59:59.999+02:00"),
    })
  })

  it("skips a multi-tender row it cannot pair up", () => {
    const html = `<table><tr><td><a href="/a.pdf">COJ/AAA01/26-27</a><a href="/b.pdf">COJ/BBB02/26-27</a></td><td>One description only</td><td>01 October 2026<br>02 October 2026</td></tr></table>`
    const result = parseCojBidProposals(html, ORIGIN)
    expect(result.tenders).toEqual([])
    expect(result.skipped[0].reason).toMatch(/2 references but 1 descriptions/)
  })
})

describe("parseCojDate", () => {
  it.each([
    ["13 October 2026", "2026-10-13T21:59:59.999Z"],
    ["07 AUGUST 2026", "2026-08-07T21:59:59.999Z"],
    [`24 Apr${ZW}il 2026`, "2026-04-24T21:59:59.999Z"],
    ["2 Sept 2026", "2026-09-02T21:59:59.999Z"],
  ])("%s -> %s", (input, expected) => {
    expect(parseCojDate(input)?.toISOString()).toBe(expected)
  })

  it("rejects impossible or unknown dates", () => {
    expect(parseCojDate("31 June 2026")).toBeNull()
    expect(parseCojDate("13 Octember 2026")).toBeNull()
    expect(parseCojDate("TBC")).toBeNull()
  })
})

describe("findCojCurrentBidsUrl", () => {
  it("finds the link on the Tenders hub page", () => {
    // Trimmed from .../2022 TENDERS/Tenders.aspx (2026-10-08).
    const hub = `<td><a href="/work_/Pages/Work%20in%20Joburg/Tenders%20and%20Quotations/2022%20Tenders%20and%20Quotations/2022%20TENDERS/BID%20OPENING%20REGISTERS/June/Previous.aspx"><img src="/x.png" alt="" />Bid Opening Registers${ZW}</a></td>
<td>${ZW}<a href="/work_/Pages/2026-Tenders/2026-Bid-Proposals.aspx"><img src="/x.png" alt="" />Current Bid Proposals${ZW}</a></td>`
    expect(findCojCurrentBidsUrl(hub, ORIGIN)).toBe("https://joburg.org.za/work_/Pages/2026-Tenders/2026-Bid-Proposals.aspx")
    expect(findCojCurrentBidsUrl("<p>nothing</p>", ORIGIN)).toBeNull()
  })
})

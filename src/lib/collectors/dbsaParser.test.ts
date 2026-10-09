import { describe, expect, it } from "vitest"
import { parseDbsaDate, parseDbsaListing } from "./dbsaParser"

// Trimmed from https://www.dbsa.org/procurement (2026-10-08).
const LISTING = `
<table class="table" cellpadding="1" cellspacing="1"><thead><tr><th scope="col">OPEN RFP's and RFR's</th><th scope="col">Date Published</th><th scope="col">Closing Date and Time</th></tr></thead><tbody><tr><td><strong>RFI 003/2026: </strong>Request for Information – Redevelopment, Rehabilitation and Long-term Operation of Telkom Towers Complex<br><a href="/sites/default/files/media/documents/2026-10/RFI003.2026_Telkom%20Towers%20complexSS%20Technologies%20Database.pdf">Tender Volume</a></td><td>2 October 2026</td><td>03 November 2026 @ 23H55</td></tr><tr><td><strong>RFP 186/2026:</strong> Appointment of a Service Provider for the Provision of Accounting and Tax Advisory Opinions for a period of three (3) years to the DBSA<br><a href="/sites/default/files/media/documents/2026-10/RFP%20186-2026%20_Accounting%20and%20Tax%20Advisory%20Opinions.pdf">Tender Volume</a>, <a href="/sites/default/files/media/documents/2026-10/RFP186-2026_Annexure%20A1_Accounting%20and%20Tax%20Opinion.pdf">Annexure A1 (Pricing Schedule)</a>, &nbsp;<a href="/sites/default/files/media/documents/2026-10/RFP%20186_Annexure%201_Accounting%20and%20Tax%20opinion.pdf">Annexure 1</a><br><strong>Compulsory Tender Briefing:</strong> 14 October 2026 @ 10H00 via Microsoft Teams</td><td>2 October 2026</td><td>23 Ocober 2026 @ 23H55</td></tr><tr><td><strong>RFP 181/2026:</strong> Appointment of a Service Provider to Develop Phase 2 of the DBSA DLAB Programme Social Return on Investment Framework and Assess the Social Return of DLAB Sites<br><a href="/sites/default/files/media/documents/2026-09/RFP181.2026%20PHASE%202%20OF%20THE%20DBSA%20DLAB%20PROGRAMME.pdf">Tender Volume</a>, <a href="/sites/default/files/media/documents/2026-09/RFP181.2026%20ANNEXURE%20%20A%20%20PHASE%202.pdf">Annexure A</a>, <a href="https://www.dbsa.org/sites/default/files/media/documents/2026-10/RFP181.2026%20Addendum%2001.pdf">Addendum 01</a>, <a href="https://www.dbsa.org/sites/default/files/media/documents/2026-10/RFP181.2026%20Addendum%2002.pdf">Addendum 02</a><br><strong>Compulsory Tender Briefing: </strong>02 October 2026 @ 13H00 via Microsoft Teams</td><td>28 September 2026</td><td><strong>22 October 2026 @ 23H55</strong></td></tr><tr><td><strong>RFP 176/2026:</strong> Appointment of a Professional Service Provider to Provide Business Intelligence &amp; Data Analytics Tool for a Period of Two (2) Years<br><a href="/sites/default/files/media/documents/2026-09/RFP176.2026-Business%20Intelligence_Data%20Analytics%20Tool.pdf">Tender Volume</a>, <a href="/sites/default/files/media/documents/2026-09/RFP176.2026-Annexure%20A1-Pricing%20Schedule.pdf">Annexure A1</a>, <a href="/sites/default/files/media/documents/2026-10/RFP0176.2026%20Addendum%2001.docx.pdf">Addendum 01</a><br><strong>Compulsory Tender Briefing:</strong> 02 October 2026 @<strong> 10H30</strong> via Microsoft Teams</td><td>23 September 2026</td><td>16 October 2026 @ 23H55</td></tr><tr><td><strong>RFP 092/2026: </strong>Appointment of Contractor for the Design, Supply, Installation, Commissioning and Initial Operation and Maintenance of Water Efficient Sanitation Systems in Informal Settlements in the City of Cape Town<br><a href="https://www.dbsa.org/sites/default/files/media/documents/2026-09/RFP092.2026%20Tender%20Volumes%20upd.zip">Tender Volumes</a>, <a href="/sites/default/files/media/documents/2026-09/RFP092_2026_Activity_Schedule%20and%20Price%20List_Rev4%20FINAL%20080926.zip">Activity Schedule</a>, <a href="/sites/default/files/media/documents/2026-09/RFP092.2026_Annexure_E_Baseline%20Impl%20and%20Access%20Schedule%20Final%2002.pdf">Annexure E </a>(Upd), <a href="/sites/default/files/media/documents/2026-10/RFP092.2026%20Tender%20Notice%20-%20Non%20Compulsory%20Site%20Visit.pdf">Non-Compulsory Briefing Session</a><br><strong>Compulsory Tender Briefing:</strong> 29 September 2026 @ 10H00 via Microsoft Teams&nbsp;<br><strong>Onsite</strong> <strong>Non-Compulsory Tender Briefing: </strong>6 October 2026 @ 11:30 at Phala Crescent, Khayelitsha, Cape Town</td><td>17 September 2026</td><td>30 October 2026 @ 23H55</td></tr><tr><td><strong>RFP 149/2026: </strong>Provision of Professional Services as a Transaction Advisor to Undertake a Bankable Feasibility Study, Cost-Benefit Analysis, Financial Modelling, Project Preparation, and to Develop Procurement Documents for Performance-Based Contract (PBC) Projects for Non-Revenue Water (Nrw) Reduction in Thembelihle Local Municipality and Kai Garib Local Municipality&nbsp;<br><a href="/sites/default/files/media/documents/2026-09/RFP149_2026%20TA%20for%20TLMKGLM%20NRW%20BFS%20CBA%20and%20FM%20updated%20document.pdf">Tender Volume</a> <strong>(Upd)</strong>, <a href="/sites/default/files/media/documents/2026-09/RFP149.2026-Annexure%201%28A%29%20NRW%20Pilot%20Project%20Areas%20of%20Thembelihle%20LM%20v4%2026Feb2026.pdf">Annexure 1(A</a>), <a href="/sites/default/files/media/documents/2026-09/RFP149.2026-Addendum%20No%201.pdf">Addendum 01</a>, <a href="/sites/default/files/media/documents/2026-10/RFP149-2026-Q-A%20TLM-KGLM-02Oct2026%20v1.1%20%28Addendum%20No%2002%29.pdf">Addendum 02 Questions &amp; Answers</a><br><strong>Compulsory Briefing Session: </strong>11 September 2026 @ 10H00 via Microsoft Teams</td><td>28 August 2026</td><td>16 October 2026 @ 23H55</td></tr><tr><td><strong>RFP 149/2026: </strong>Provision of Professional Services as a Transaction Advisor to Undertake a Bankable Feasibility Study, Cost-Benefit Analysis, Financial Modelling, Project Preparation, and to Develop Procurement Documents for Performance-Based Contract (PBC) Projects for Non-Revenue Water (Nrw) Reduction in Thembelihle Local Municipality and Kai Garib Local Municipality&nbsp;<br><a href="/sites/default/files/media/documents/2026-09/RFP149_2026%20TA%20for%20TLMKGLM%20NRW%20BFS%20CBA%20and%20FM%20updated%20document.pdf">Tender Volume</a> (Upd), <a href="/sites/default/files/media/documents/2026-09/RFP149.2026-Addendum%20No%201.pdf">Addendum 01</a><br><strong>Compulsory Briefing Session: </strong>11 September 2026 @ 10H00 via Microsoft Teams</td><td>28 August 2026</td><td>16 October 2026 @ 23H55</td></tr><tr><td><strong>RFR 001/2026:</strong> Establishment of a Panel of Non-Revenue Water (NRW) Performance-Based Contract (PBC) Contractors for a Period of Five Years<br><a href="/sites/default/files/media/documents/2026-09/RFR001.2026%20Updated%20NRW%20PBC%20Contractor%20Panel%20Tender%20Document.pdf">Tender Volume</a> <strong>(Upd. 17 September)</strong>, <a href="/sites/default/files/media/documents/2026-08/RFR001-2026%20WPO%20NRW%20PBC%20Briefing%20Session%20v1.0.pdf">Briefing Session</a><br><strong>Compulsory Briefing Session:</strong> 14 August 2026 @ 10H00 via Microsoft Teams</td><td>28 July 2026</td><td><strong>23 October 2026 at 23H55</strong></td></tr></tbody></table><p>The DBSA does not have any procurement service provider whose total procurement spend is equal or greater than 10% of the Bank’s total procurement spend.</p>`

const rows = parseDbsaListing(LISTING)
const byRef = (ref: string) => {
  const row = rows.find((r) => r.reference === ref)
  if (!row) throw new Error(`missing ${ref}`)
  return row
}

describe("parseDbsaListing", () => {
  it("skips the header row and de-duplicates repeated references, keeping the first", () => {
    expect(rows.map((r) => r.reference)).toEqual([
      "RFI 003/2026",
      "RFP 186/2026",
      "RFP 181/2026",
      "RFP 176/2026",
      "RFP 092/2026",
      "RFP 149/2026",
      "RFR 001/2026",
    ])
    expect(byRef("RFP 149/2026").documents.map((d) => d.label)).toContain("Addendum 02 Questions & Answers")
  })

  it("separates the title from the document link labels", () => {
    expect(byRef("RFI 003/2026").title).toBe(
      "Request for Information – Redevelopment, Rehabilitation and Long-term Operation of Telkom Towers Complex",
    )
    expect(byRef("RFP 181/2026").title).toBe(
      "Appointment of a Service Provider to Develop Phase 2 of the DBSA DLAB Programme Social Return on Investment Framework and Assess the Social Return of DLAB Sites",
    )
    expect(byRef("RFP 181/2026").documents).toEqual([
      { label: "Tender Volume", url: "https://www.dbsa.org/sites/default/files/media/documents/2026-09/RFP181.2026%20PHASE%202%20OF%20THE%20DBSA%20DLAB%20PROGRAMME.pdf" },
      { label: "Annexure A", url: "https://www.dbsa.org/sites/default/files/media/documents/2026-09/RFP181.2026%20ANNEXURE%20%20A%20%20PHASE%202.pdf" },
      { label: "Addendum 01", url: "https://www.dbsa.org/sites/default/files/media/documents/2026-10/RFP181.2026%20Addendum%2001.pdf" },
      { label: "Addendum 02", url: "https://www.dbsa.org/sites/default/files/media/documents/2026-10/RFP181.2026%20Addendum%2002.pdf" },
    ])
  })

  it("keeps words like 'Compulsory' and acronyms in titles and decodes entities", () => {
    expect(byRef("RFP 092/2026").title).toBe(
      "Appointment of Contractor for the Design, Supply, Installation, Commissioning and Initial Operation and Maintenance of Water Efficient Sanitation Systems in Informal Settlements in the City of Cape Town",
    )
    expect(byRef("RFP 176/2026").title).toBe(
      "Appointment of a Professional Service Provider to Provide Business Intelligence & Data Analytics Tool for a Period of Two (2) Years",
    )
    expect(byRef("RFR 001/2026").title).toBe(
      "Establishment of a Panel of Non-Revenue Water (NRW) Performance-Based Contract (PBC) Contractors for a Period of Five Years",
    )
  })

  it("does not truncate long titles and trims trailing &nbsp;", () => {
    const title = byRef("RFP 149/2026").title
    expect(title.length).toBeGreaterThan(300)
    expect(title.endsWith("Kai Garib Local Municipality")).toBe(true)
  })

  it("collects briefing lines separately", () => {
    expect(byRef("RFP 181/2026").briefing).toBe("Compulsory Tender Briefing: 02 October 2026 @ 13H00 via Microsoft Teams")
    expect(byRef("RFP 092/2026").briefing).toBe(
      "Compulsory Tender Briefing: 29 September 2026 @ 10H00 via Microsoft Teams; Onsite Non-Compulsory Tender Briefing: 6 October 2026 @ 11:30 at Phala Crescent, Khayelitsha, Cape Town",
    )
    expect(byRef("RFI 003/2026").briefing).toBeNull()
  })

  it("parses dates as South African time", () => {
    const rfp181 = byRef("RFP 181/2026")
    expect(rfp181.closingDate?.toISOString()).toBe("2026-10-22T21:55:00.000Z")
    expect(rfp181.publishedDate?.toISOString()).toBe("2026-09-27T22:00:00.000Z")
    expect(byRef("RFI 003/2026").closingDate?.toISOString()).toBe("2026-11-03T21:55:00.000Z")
    // "23 Ocober 2026" (typo on the page) and "23 October 2026 at 23H55".
    expect(byRef("RFP 186/2026").closingDate?.toISOString()).toBe("2026-10-23T21:55:00.000Z")
    expect(byRef("RFR 001/2026").closingDate?.toISOString()).toBe("2026-10-23T21:55:00.000Z")
  })
})

describe("parseDbsaDate", () => {
  it("rejects unparseable or impossible dates", () => {
    expect(parseDbsaDate("TBC")).toBeNull()
    expect(parseDbsaDate("31 September 2026")).toBeNull()
    expect(parseDbsaDate("12 Jum 2026")).toBeNull()
  })
})

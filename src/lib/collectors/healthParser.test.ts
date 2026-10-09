import { describe, expect, it } from "vitest"
import { parseHealthTenders } from "./healthParser"

const PAGE = "https://www.health.gov.za/tenders/"

// Trimmed from https://www.health.gov.za/tenders/ (2026-10-08): NDoH Tenders tab.
const NDOH_TAB = `
<p><a href="/wp-content/uploads/2023/01/PUP-Application-Forms.pdf">Invitation to interested Service Providers to be contracted as external pick-up points for the CCMDD programme: Contract NDOH 07/2022-2023</a></p><p>
<table id="tablepress-61" class="tablepress tablepress-id-61">
<thead>
<tr class="row-1">
	<th class="column-1">Tender No</th><th class="column-2">Description</th><th class="column-3">Bulletin Date</th><th class="column-4">Closing Date</th><th class="column-5">Comments</th>
</tr>
</thead>
<tbody class="row-striping row-hover">
<tr class="row-2">
	<td class="column-1">DOH 319-2026/2027</td><td class="column-2"><a href="https://www.health.gov.za/wp-content/uploads/2026/10/RFQ-DOCUMENT-DOH-319-2026-2027.pdf" target="_blank" rel="noopener noreferrer">Request for Quotations for Terms of Reference for the Assessment of the Performance of the Council for Medical Schemes for the Imposition of Levies</a><br />
<br />
No Briefing Session</td><td class="column-3">7 October 2026</td><td class="column-4">16 October 2026 @ 11:00AM</td><td class="column-5"><strong>Enquiries:</strong><br />
purchasing@health.gov.za</td>
</tr>
<tr class="row-5">
	<td class="column-1">NDOH 24-2026/2027</td><td class="column-2"><a href="https://www.health.gov.za/wp-content/uploads/2026/09/NDOH-24-2026-2027-Bid-document.pdf" target="_blank" rel="noopener">Supply and delivery of DDT Wettable powder for a period of five (5 years)</a><br />
<br />
</td><td class="column-3">16 August 2026</td><td class="column-4">09 October 2026 </td><td class="column-5"><strong>Enquiries:</strong><br />
Email: tenders@health.gov.za<br />
<br />
</td>
</tr>
<tr class="row-6">
	<td class="column-1">NDOH 08-2026/2027</td><td class="column-2"><a href="https://www.health.gov.za/wp-content/uploads/2026/09/NDoH-08-2026_2027_Security-Services.pdf" target="_blank" rel="noopener">Appointment of a Service Provider to render Physical Security Services to the National Department of Health offices (Dr AB Xuma) and The Medical Bureau for Occupational Diseases and the Compensation Commissioner for Occupational Diseases (MBOD/CCOD) for a period of Thirty-six Months (3 years)</a><br />
<br />
</td><td class="column-3">7 September 2026</td><td class="column-4">28 September 2026 @ 11h00</td><td class="column-5"><strong>Enquiries:</strong><br />
Email: tenders@health.gov.za</td>
</tr>
<tr class="row-11">
	<td class="column-1">NDOH 17-2026/2027</td><td class="column-2"><a href="https://www.health.gov.za/wp-content/uploads/2026/08/NDOH-17-ADVERT.pdf" target="_blank">Appointment of a Service Provider to Facilitate the Improvement and Maintenance of the Current Status of the Ideal Health Facility Realisation and Maintenance Programme in Clinics, Community Health Centres and District Hospital for a Period of Three (03) Years.</a><br />
<br />
Compulsory Briefing Session:<br />
Date: 09 September 2026<br />
Time: 11:00AM<br />
Venue: Department of Health, Dr AB Xuma building, 1112 Voortrekker Road, Thaba Tshwane, Pretoria.</td><td class="column-3">25 August 2026</td><td class="column-4">22 September 2026 @ 11:00AM</td><td class="column-5">x</td>
</tr>
<tr class="row-9">
	<td class="column-1">DOH 333-2026/2027</td><td class="column-2"><a href="https://www.health.gov.za/wp-content/uploads/2026/08/DoH-333-2026-27-Advert.pdf" target="_blank">Appointment of a Forensic Handwriting Expert/Document Examiner to provide an expert opinion on disputed signatures</a></td><td class="column-3">27 August 2026</td><td class="column-4">2 September 2026 @ 11:00am</td><td class="column-5">x</td>
</tr>
<tr class="row-27">
	<td class="column-1">DoH 88-2026/2027</td><td class="column-2"><a href="/wp-content/uploads/2026/05/DOH88.pdf" target="_blank" rel="noopener">Request for quotation for Vegetation Clearing, Weed Eradication and Site Cleaning at Ethandakukhanya CHC.</a><br />
<br />
There will be NO briefing session</td><td class="column-3">8 May 2026</td><td class="column-4">13 May 2026 at 12h00pm</td><td class="column-5">x</td>
</tr>
<tr class="row-29">
	<td class="column-1">NDoH 04-2025/2026</td><td class="column-2"><a href="/wp-content/uploads/2026/02/NDoH04-2025-2026.pdf" target="_blank" rel="noopener">Appointment of Public Health NGO Service Providers to<br />
Implement the Electronic Medical Record (EMR) Digital Solution in eight (8)<br />
Provinces for the National Department of Health and within a period of 18<br />
months</a><br />
<br />
Compulsory Briefing session<br />
<ol><br />
  <li><a href="/wp-content/uploads/2026/02/NDoH04.2025.2026-Pricing-schedule.pdf" target="_blank" rel="noopener">Pricing Schedule</a></li></a></li><br />
</a></li></ol></td><td class="column-3">13 February 2026</td><td class="column-4">09 March 2026 at 11:00am </td><td class="column-5">x</td>
</tr>
</tbody>
</table>`

// Trimmed from the same page: Pharmaceutical Tenders tab, and a contracts tab
// whose headers differ (must be ignored).
const PHARMA_TAB = `
<table id="tablepress-41" class="tablepress tablepress-id-41">
<thead>
<tr class="row-1">
	<th class="column-1">Tender No</th><th class="column-2">Description</th><th class="column-3">Bulletin Date</th><th class="column-4">Closing Date</th><th class="column-5">Comments</th>
</tr>
</thead>
<tbody class="row-striping row-hover">
<tr class="row-2">
	<td class="column-1">HP10-2028BIO</td><td class="column-2">Supply and Delivery of Small Biological Preparations to the Department of Health for the period 1 January 2028 to 31 December 2030<br />
<br />
Non-Compulsory Virtual Briefing Session:<br />
Date: 18 September 2026<br />
Time: 10:00<br /> <br />
<a href="https://teams.microsoft.com/meet/x" rel="noopener" target="_blank"><br />
Link: Non-compulsory briefing session: HP010-2028BIO &#8211; 18 September 2026</a><br />
<br />
<ol style="line-height: 10px"><br />
	<li><a href="https://www.health.gov.za/wp-content/uploads/2026/09/1.-HP10-2028BIO__Invitation-to-bid_-notice_for-NDOH-website_4-Sep-2026.pdf" target="_blank">Notice: Invitation to bid</a></li><br />
</ol></td><td class="column-3">4 September 2026</td><td class="column-4">2 November 2026 @ 11:00 am</td><td class="column-5"><strong>Enquiries:</strong></td>
</tr>
<tr class="row-16">
	<td class="column-1">HP08-2026SSP<br />
</td><td class="column-2">Supply and Delivery of Semi-Solid Dosage Forms and Powders to the Department of Health for the period 01 September 2026 to 31 August 2029<br />
<br />
<ol style="line-height: 10px"><br />
	<li><a href="/wp-content/uploads/2025/09/1.-HP08-2026SSP__Invitation-to-bid.pdf" target="_blank" rel="noopener">Notice: Invitation to bid</a></li><br />
</ol></td><td class="column-3">26 September 2025</td><td class="column-4">24 November 2025 @ 11:00 am<br />
<br />
</td><td class="column-5">x</td>
</tr>
</tbody>
</table>
<table id="tablepress-45" class="tablepress tablepress-id-45">
<thead>
<tr class="row-1">
	<th class="column-1">Contract No</th><th class="column-2">Contract Description</th><th class="column-3">Contract Starting Date</th><th class="column-4">Contract Circular</th><th class="column-5">Index</th><th class="column-6">Addendums</th>
</tr>
</thead>
<tbody>
<tr class="row-2">
	<td class="column-1">HP13-2025ARV</td><td class="column-2">Anti-Retroviral Medicines</td><td class="column-3">1 July 2025</td><td class="column-4">x</td><td class="column-5">x</td><td class="column-6">x</td>
</tr>
</tbody>
</table>`

describe("parseHealthTenders", () => {
  const rows = parseHealthTenders(NDOH_TAB + PHARMA_TAB, PAGE)
  const byRef = Object.fromEntries(rows.map((row) => [row.reference, row]))

  it("reads only the tender tables, ignoring stray paragraphs and contract tables", () => {
    expect(rows.map((row) => row.reference)).toEqual([
      "DOH 319-2026/2027",
      "NDOH 24-2026/2027",
      "NDOH 08-2026/2027",
      "NDOH 17-2026/2027",
      "DOH 333-2026/2027",
      "DoH 88-2026/2027",
      "NDoH 04-2025/2026",
      "HP10-2028BIO",
      "HP08-2026SSP",
    ])
    expect(byRef["NDOH 07/2022-2023"]).toBeUndefined()
  })

  it("takes the linked description as the title, without briefing details", () => {
    expect(byRef["DOH 319-2026/2027"].title).toBe(
      "Request for Quotations for Terms of Reference for the Assessment of the Performance of the Council for Medical Schemes for the Imposition of Levies",
    )
    expect(byRef["NDOH 17-2026/2027"].title).toBe(
      "Appointment of a Service Provider to Facilitate the Improvement and Maintenance of the Current Status of the Ideal Health Facility Realisation and Maintenance Programme in Clinics, Community Health Centres and District Hospital for a Period of Three (03) Years.",
    )
    expect(byRef["DOH 319-2026/2027"].documentUrl).toBe(
      "https://www.health.gov.za/wp-content/uploads/2026/10/RFQ-DOCUMENT-DOH-319-2026-2027.pdf",
    )
  })

  it("keeps long titles whole and joins titles wrapped with <br>", () => {
    expect(byRef["NDOH 08-2026/2027"].title).toBe(
      "Appointment of a Service Provider to render Physical Security Services to the National Department of Health offices (Dr AB Xuma) and The Medical Bureau for Occupational Diseases and the Compensation Commissioner for Occupational Diseases (MBOD/CCOD) for a period of Thirty-six Months (3 years)",
    )
    expect(byRef["NDoH 04-2025/2026"].title).toBe(
      "Appointment of Public Health NGO Service Providers to Implement the Electronic Medical Record (EMR) Digital Solution in eight (8) Provinces for the National Department of Health and within a period of 18 months",
    )
    expect(byRef["NDoH 04-2025/2026"].documentUrl).toBe("https://www.health.gov.za/wp-content/uploads/2026/02/NDoH04-2025-2026.pdf")
  })

  it("takes the plain-text description on the pharmaceutical tab", () => {
    expect(byRef["HP10-2028BIO"].title).toBe(
      "Supply and Delivery of Small Biological Preparations to the Department of Health for the period 1 January 2028 to 31 December 2030",
    )
    expect(byRef["HP10-2028BIO"].documentUrl).toBeNull()
    expect(byRef["HP08-2026SSP"].title).toBe(
      "Supply and Delivery of Semi-Solid Dosage Forms and Powders to the Department of Health for the period 01 September 2026 to 31 August 2029",
    )
  })

  it("parses the Closing Date column (not the briefing date) as South African time", () => {
    expect(byRef["DOH 319-2026/2027"].closingDate?.toISOString()).toBe("2026-10-16T09:00:00.000Z")
    expect(byRef["NDOH 08-2026/2027"].closingDate?.toISOString()).toBe("2026-09-28T09:00:00.000Z")
    expect(byRef["NDOH 17-2026/2027"].closingDate?.toISOString()).toBe("2026-09-22T09:00:00.000Z")
    expect(byRef["DoH 88-2026/2027"].closingDate?.toISOString()).toBe("2026-05-13T10:00:00.000Z")
    expect(byRef["HP10-2028BIO"].closingDate?.toISOString()).toBe("2026-11-02T09:00:00.000Z")
    expect(byRef["HP08-2026SSP"].closingDate?.toISOString()).toBe("2025-11-24T09:00:00.000Z")
  })

  it("keeps a date-only closing date open through its last day (date-only deadline)", () => {
    expect(byRef["NDOH 24-2026/2027"].closingDate?.toISOString()).toBe("2026-10-09T21:59:59.999Z")
  })

  it("reads the bulletin date as the publication date (00:00 SAST)", () => {
    expect(byRef["DOH 319-2026/2027"].bulletinDate?.toISOString()).toBe("2026-10-06T22:00:00.000Z")
  })
})

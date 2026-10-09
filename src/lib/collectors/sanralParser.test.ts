import { describe, expect, it } from "vitest"
import { parseSanralClosingDate, parseSanralDetail, parseSanralListing } from "./sanralParser"

// Trimmed from https://www.nra.co.za/sanral-tenders/list/open-tenders (2026-10-08).
const LISTING = `
<table><tr><th>Ref</th></tr>
<tr> <td> <a href="/sanral-tenders/detail/contract-sanral-n-002-210-2023-1env">CONTRACT SANRAL N.002-210-2023/1ENV</a> </td>
 <td>Open Projects</td> <td>KwaZulu-Natal</td>
 <td> Tender Notice:&amp;nbsp; &amp;nbsp; Awarded To:&amp;nbsp; &amp;nbsp; BBBEE Points:&amp;nbsp; &amp;nbsp; Approv...</td>
 <td>harrismiht@ilifa.biz...</td> <td>2026/11/06 11:00</td> </tr>
<tr> <td> <a href="/sanral-tenders/detail/x-009-001-2026-1-x-005-136-2026-1-x-009-002-2026-1">X.009-001-2026/1, X.005-136-2026/1 &amp; X.009-002-2026/1</a> </td>
 <td>Consulting Services</td> <td>Northern Cape</td> <td> Tender Notice:...</td> <td>x</td> <td>2026/10/30 12:00</td> </tr>
</table>`

// Trimmed from the detail page for CONTRACT SANRAL N.002-210-2023/1ENV.
const EMPTY_AWARD_TEMPLATE = `
<div class="sanral-site-container"><div class="mdc-layout-grid sanral-content-container">
<h2>CONTRACT SANRAL N.002-210-2023/1ENV</h2> <p>2026/11/06 11:00</p>
<table><tr><th class="x">Create Date</th> <td class="x">October 06, 2026</td></tr></table>
<div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-8">
<h3>FOR ENVIRONMENTAL SUBSERVICES ON FOR THE IMPROVEMENT OF NATIONAL ROUTE N2 SECTION 21X FROM BROOKS NEK (KM0.0) TO STAFFORDS POST (KM44.3) &ndash; ADDITIONAL CLIMBING LANES CONTRACT SANRAL N.002-210-2023/1ENV</h3>
<p><table><tbody>
<tr> <td width="200px"><strong>Tender Notice:</strong>&nbsp;</td> <td>&nbsp;</td> </tr>
<tr> <td width="200px"><strong>Awarded To:</strong>&nbsp;</td> <td>&nbsp;</td> </tr>
<tr> <td width="200px"><strong>BBBEE Points:</strong>&nbsp;</td> <td>&nbsp;</td> </tr>
</tbody></table>
<p>T 1.1</p>
<h4>Attached Files</h4>
<h6><span>Tender No:</span><span>CONTRACT SANRAL N.002-210-2023/1ENV</span></h6>
</div></div></div>`

// Trimmed from the detail page for SANRAL N.002-300-2020/1 (notice inside the "Tender Notice" cell).
const NOTICE_IN_CELL = `
<div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-8">
<h3>THE CONSTRUCTION OF PAVEMENT AND SETTLEMENT REPAIRS OF NATIONAL ROUTE 2, SECTION 30 FROM BUSHVELD RETREAT FARM (Km 44.00) TO HLUHLUWE INTERCHANGE (Km 55.00) SANRAL N.002-300-2020/1</h3>
<p><table><tbody>
<tr> <td width="200px"><strong>Tender Notice:</strong>&nbsp;</td> <td>
<p><strong>T1.1</strong>&nbsp;&nbsp; <strong>TENDER NOTICE AND INVITATION TO TENDER</strong></p>
<p><strong>The South African National Roads Agency SOC Limited (SANRAL) invites tenders for </strong><strong>THE CONSTRUCTION OF PAVEMENT AND SETTLEMENT REPAIRS OF NATIONAL ROUTE 2</strong></p>
<p>This project is in the province of <strong>KwaZulu Natal</strong> and in the uMkhanyakude District Municipality. The approximate duration is 12 months.</p>
<p>Only tenderers who are a CIDB contractor grading of 9CE may submit tender offers.</p>
<p><strong>TENDER DOCUMENTS</strong></p>
<p>Tender documents are available from 25 September 2026.</p>
${"<p>Further notice text that makes this cell long.</p>".repeat(30)}
</td> </tr>
<tr> <td width="200px"><strong>Awarded To:</strong>&nbsp;</td> <td>&nbsp;</td> </tr>
</tbody></table>
<h4>Attached Files</h4>
</div>`

// Trimmed from the detail page for R.031-023-2026/1F, X.009-001-2026/1F & X.009-002-2026/1F (contract table).
const CONTRACT_TABLE = `
<div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-8">
<h3>The South African National Roads Agency SOC Limited (SANRAL) invites tenders for the provision of Routine Road Maintenance Consulting Services for the projects in the Northern Cape Province&nbsp; R.031-023-2026/1F, X.009-001-2026/1F &amp; X.009-002-2026/1F</h3>
<table><tbody><tr> <td width="200px"><strong>Awarded To:</strong>&nbsp;</td> <td>&nbsp;</td> </tr></tbody></table>
<p>T1.1 TENDER NOTICE AND INVITATION TO TENDER /SBD1</p>
<p>The South African National Roads Agency SOC Limited (SANRAL) invites tenders for the provision of Routine Road Maintenance Consulting Services for the projects in the Northern Cape Province described in the table below:</p>
<table><tbody>
<tr><td><p><strong>Contract Number</strong></p></td><td><p><strong>Project Description</strong></p></td><td><p><strong>District and Local Municipality</strong></p></td></tr>
<tr><td><p>R.031-023-2026/1F</p></td><td><p>Consulting Engineering Services for the Routine Road Maintenance of National Route R31 Section 2 to 3 from Askam (km 0.00) to Santoy (km 95.20)</p></td><td><p>Z F Mgcawu District Municipality</p><p>Dawid Kruiper Local Municipality</p></td></tr>
</tbody></table>
<p>The approximate programme is for design to be completed by November 2026.</p>
<p>TENDER DOCUMENTS</p>
<h4>Attached Files</h4>
</div>`

describe("parseSanralListing", () => {
  it("reads reference, detail link, project type, province and SAST closing time", () => {
    const rows = parseSanralListing(LISTING, "https://www.nra.co.za")
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      reference: "CONTRACT SANRAL N.002-210-2023/1ENV",
      detailUrl: "https://www.nra.co.za/sanral-tenders/detail/contract-sanral-n-002-210-2023-1env",
      projectType: "Open Projects",
      province: "KwaZulu-Natal",
    })
    expect(rows[0].closingDate?.toISOString()).toBe("2026-11-06T09:00:00.000Z")
    expect(rows[1].reference).toBe("X.009-001-2026/1, X.005-136-2026/1 & X.009-002-2026/1")
  })
})

describe("parseSanralClosingDate", () => {
  it("treats listing times as South African time", () => {
    expect(parseSanralClosingDate("2026/10/30 12:00")?.toISOString()).toBe("2026-10-30T10:00:00.000Z")
    expect(parseSanralClosingDate("not a date")).toBeNull()
  })
})

describe("parseSanralDetail", () => {
  it("takes the title from the heading and treats an empty award table as no award", () => {
    const detail = parseSanralDetail(EMPTY_AWARD_TEMPLATE, "CONTRACT SANRAL N.002-210-2023/1ENV")
    expect(detail.title).toBe(
      "FOR ENVIRONMENTAL SUBSERVICES ON FOR THE IMPROVEMENT OF NATIONAL ROUTE N2 SECTION 21X FROM BROOKS NEK (KM0.0) TO STAFFORDS POST (KM44.3) – ADDITIONAL CLIMBING LANES",
    )
    expect(detail.officialTitle?.endsWith("CONTRACT SANRAL N.002-210-2023/1ENV")).toBe(true)
    expect(detail.awardFields["Awarded To"]).toBe("")
    expect(detail.hasAwardResult).toBe(false)
    expect(detail.scope).toBeNull()
    expect(detail.tenderNumber).toBe("CONTRACT SANRAL N.002-210-2023/1ENV")
    expect(detail.closingDate?.toISOString()).toBe("2026-11-06T09:00:00.000Z")
    expect(detail.createdDate?.toISOString()).toBe("2026-10-05T22:00:00.000Z")
  })

  it("flags an award only when Awarded To is filled in", () => {
    const awarded = EMPTY_AWARD_TEMPLATE.replace(
      "<strong>Awarded To:</strong>&nbsp;</td> <td>&nbsp;</td>",
      "<strong>Awarded To:</strong>&nbsp;</td> <td>Example Engineering (Pty) Ltd</td>",
    )
    const detail = parseSanralDetail(awarded, "CONTRACT SANRAL N.002-210-2023/1ENV")
    expect(detail.hasAwardResult).toBe(true)
    expect(detail.awardFields["Awarded To"]).toBe("Example Engineering (Pty) Ltd")
  })

  it("extracts the notice scope when the notice sits inside the Tender Notice cell", () => {
    const detail = parseSanralDetail(NOTICE_IN_CELL, "SANRAL N.002-300-2020/1")
    expect(detail.title).toBe(
      "THE CONSTRUCTION OF PAVEMENT AND SETTLEMENT REPAIRS OF NATIONAL ROUTE 2, SECTION 30 FROM BUSHVELD RETREAT FARM (Km 44.00) TO HLUHLUWE INTERCHANGE (Km 55.00)",
    )
    expect(detail.scope).toBe(
      "This project is in the province of KwaZulu Natal and in the uMkhanyakude District Municipality. The approximate duration is 12 months.\nOnly tenderers who are a CIDB contractor grading of 9CE may submit tender offers.",
    )
  })

  it("keeps each contract row of a multi-contract notice on one line", () => {
    const detail = parseSanralDetail(CONTRACT_TABLE, "R.031-023-2026/1F, X.009-001-2026/1F & X.009-002-2026/1F")
    expect(detail.title).toBe(
      "The South African National Roads Agency SOC Limited (SANRAL) invites tenders for the provision of Routine Road Maintenance Consulting Services for the projects in the Northern Cape Province",
    )
    expect(detail.scope?.split("\n")).toEqual([
      "R.031-023-2026/1F — Consulting Engineering Services for the Routine Road Maintenance of National Route R31 Section 2 to 3 from Askam (km 0.00) to Santoy (km 95.20) — Z F Mgcawu District Municipality Dawid Kruiper Local Municipality",
      "The approximate programme is for design to be completed by November 2026.",
    ])
  })
})

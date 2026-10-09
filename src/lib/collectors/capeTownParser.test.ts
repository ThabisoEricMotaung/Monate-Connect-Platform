import { describe, expect, it } from "vitest"
import { dedupeCapeTownRows, parseCapeTownDateTime, parseCapeTownListing } from "./capeTownParser"

const ORIGIN = "https://web1.capetown.gov.za"

// Builds a row in the shape of https://web1.capetown.gov.za/web1/tenderportal/Tender (2026-10-08);
// the strings passed in are copied from that page.
function row(ref: string, pre: string, directorate: string, department: string, closing: string, posted: string, id: number): string {
  return `<tr class="gridDetails">
  <td style="width: 70px;"> ${ref} </td>
  <td> ${pre} </td>
  <td> ${directorate} </td> <td> ${department} </td>
  <td style="width: 70px;"> ${closing.slice(0, 10)} </td> <td style="width: 70px;"> ${closing} </td>
  <td style="width: 70px;"> ${posted.slice(0, 10)} </td> <td style="width: 70px;"> ${posted} </td>
  <td> <a class="linkDetails" href="/web1/tenderportal/Tender/Details/${id}" title="Details"> </a> </td>
  <td> <a class="addnotice" href="/web1/tenderportal/Tender/AddNotice/${id}" title="Add Notice"> </a> </td>
  <td> <a class="deleteRFQ" href="/web1/tenderportal/Tender/Delete/${id}" onclick="return confirm(&#39;Are you sure you want to delete this Tender?&#39;)" title="Delete Tender"> </a> </td>
</tr>`
}

const LISTING = `<table id="rfqsTable"><thead><tr><th>Tender Number</th><th>Description</th></tr></thead><tbody>
${row("65S/2026/27", `<pre class="descriptionColumn gridDetails lineBreaks" title="Term tender for the provision of lawn mowing services for the city of cape town">Term tender for the provision of lawn mowing services for the city of cape town</pre>`, "COMMUNITY SERVICES AND HEALTH", "Recreation and Parks", "2026-10-22 10:00 AM", "2026-09-18 11:21 AM", 329384)}
${row("77S/2026/27", `<pre class="descriptionColumn gridDetails lineBreaks" title="Supply, installation, maintenance and integration of security alarm systems, equipment and ancillaries.">Supply, installation, maintenance and integration of security alarm systems, equipment and ancillari...</pre>`, "CORPORATE SERVICES", "Facilities Management", "2026-10-21 10:00 AM", "2026-09-18 11:48 AM", 329400)}
${row("74S/2026/27", `<pre class="descriptionColumn gridDetails lineBreaks" title="Tender description: term tender for the supply and delivery of maintenance,  repair, upgrade and refurbishment services for high voltage gas insulated  switchgear (gis)">Tender description: term tender for the supply and delivery of maintenance,  repair, upgrade and re...</pre>`, "ENERGY", "Electricity Generation and Distribution", "2026-11-17 10:00 AM", "2026-09-18 11:45 AM", 329398)}
${row("71S/2026/27", `<pre class="descriptionColumn gridDetails lineBreaks" title="Repair and maintenance of the city of cape town’s railway sidings for (six areas namely) athlone refuse transfer station, atlantis industrial, epping 1 and 2, n’dabeni, sacks circle and vissershok landfill site.">Repair and maintenance of the city of cape town’s railway sidings for (six areas namely) athlone ref...</pre>`, "URBAN MOBILITY", "Roads Infrastructure Management", "2026-10-28 10:00 AM", "2026-09-18 11:31 AM", 329390)}
${row("63S/2026/27", `<pre class="descriptionColumn gridDetails lineBreaks" title="Term tender for the collection, loading, transport and disposal of animal carcasses and associated equipment">Term tender for the collection, loading, transport and disposal of animal carcasses and associated e...</pre>`, "URBAN WASTE MANAGEMENT", "Waste Services", "2026-10-12 10:00 AM", "2026-10-02 09:20 AM", 329779)}
${row("63S/2026/27", `<pre class="descriptionColumn gridDetails lineBreaks" title="Term tender for the collection, loading, transport and disposal of animal carcasses and associated equipment">Term tender for the collection, loading, transport and disposal of animal carcasses and associated e...</pre>`, "URBAN WASTE MANAGEMENT", "Waste Services", "2026-10-12 10:00 AM", "2026-09-23 14:35 PM", 329541)}
</tbody></table>`

describe("parseCapeTownListing", () => {
  const rows = parseCapeTownListing(LISTING, ORIGIN)

  it("uses the description, not the tender number, as the title", () => {
    expect(rows[0]).toMatchObject({
      reference: "65S/2026/27",
      title: "Term tender for the provision of lawn mowing services for the city of cape town",
      titleTruncatedAtSource: false,
      directorate: "COMMUNITY SERVICES AND HEALTH",
      department: "Recreation and Parks",
      detailUrl: "https://web1.capetown.gov.za/web1/tenderportal/Tender/Details/329384",
    })
  })

  it("takes the full description from the title attribute when the visible text is cut off", () => {
    expect(rows[1].title).toBe("Supply, installation, maintenance and integration of security alarm systems, equipment and ancillaries.")
    expect(rows[3].title).toBe(
      "Repair and maintenance of the city of cape town’s railway sidings for (six areas namely) athlone refuse transfer station, atlantis industrial, epping 1 and 2, n’dabeni, sacks circle and vissershok landfill site."
    )
    expect(rows[3].title.length).toBeGreaterThan(200)
  })

  it("drops a leading 'Tender description:' label and collapses whitespace", () => {
    expect(rows[2].title).toBe(
      "Term tender for the supply and delivery of maintenance, repair, upgrade and refurbishment services for high voltage gas insulated switchgear (gis)"
    )
  })

  it("reads closing and posted times as South African time", () => {
    expect(rows[0].closingDate?.toISOString()).toBe("2026-10-22T08:00:00.000Z")
    expect(rows[0].postedDate?.toISOString()).toBe("2026-09-18T09:21:00.000Z")
    // 24-hour clock with a PM designator.
    expect(rows[5].postedDate?.toISOString()).toBe("2026-09-23T12:35:00.000Z")
  })

  it("falls back to the visible text and flags it when there is no title attribute", () => {
    const html = row("1X/2026/27", `<pre class="descriptionColumn">Supply of things and ancillari...</pre>`, "D", "E", "2026-10-22 10:00 AM", "2026-09-18 11:21 AM", 1)
    expect(parseCapeTownListing(html, ORIGIN)[0]).toMatchObject({ title: "Supply of things and ancillari...", titleTruncatedAtSource: true })
  })
})

describe("dedupeCapeTownRows", () => {
  it("keeps one row per reference, the most recently posted", () => {
    const rows = dedupeCapeTownRows(parseCapeTownListing(LISTING, ORIGIN))
    expect(rows.map((r) => r.reference)).toEqual(["65S/2026/27", "77S/2026/27", "74S/2026/27", "71S/2026/27", "63S/2026/27"])
    const carcasses = rows[4]
    expect(carcasses.postedDate?.toISOString()).toBe("2026-10-02T07:20:00.000Z")
    expect(carcasses.closingDate?.toISOString()).toBe("2026-10-12T08:00:00.000Z")
    expect(carcasses.detailUrl).toBe("https://web1.capetown.gov.za/web1/tenderportal/Tender/Details/329779")
  })
})

describe("parseCapeTownDateTime", () => {
  it.each([
    ["2026-10-22 10:00 AM", "2026-10-22T08:00:00.000Z"],
    ["2026-09-28 13:04 PM", "2026-09-28T11:04:00.000Z"],
    ["2026-09-28 12:30 PM", "2026-09-28T10:30:00.000Z"],
    ["2026-09-28 01:30 PM", "2026-09-28T11:30:00.000Z"],
    ["2026-10-22", "2026-10-21T22:00:00.000Z"],
  ])("%s -> %s", (input, expected) => {
    expect(parseCapeTownDateTime(input)?.toISOString()).toBe(expected)
  })

  it("rejects unparseable values", () => {
    expect(parseCapeTownDateTime("")).toBeNull()
    expect(parseCapeTownDateTime("22/10/2026")).toBeNull()
    expect(parseCapeTownDateTime("2026-10-22 25:00 AM")).toBeNull()
  })
})

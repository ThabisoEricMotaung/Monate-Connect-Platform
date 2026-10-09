import { describe, expect, it } from "vitest"
import { parseTenderDescription, summariseTenderScope, summariseTenderScopeDetailed } from "./tenderDescription"

const SOURCING =
  "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process."

// Stored form of live record 1139 (line breaks collapsed by an earlier run).
const SCOPE_PLUS_ATTACHMENT =
  "FOSPHB-RFP-21-26/27 REQUEST FOR PROPOSAL [RFP] FOR SUPPLY RENEWABLE ELECTRICITY TO FOSKOR MINING DIVISION (PHALABORWA), LIMPOPO PROVINCE OF SOUTH AFRICA. THE CURRENT NOTIFIED MAXIMUM DEMAND (NMD) WITH ESKOM IS 75MVA. Tender documents: - FOSPHB-RFP-21-26-27 (13Aug26).zip: https://www.etenders.gov.za/home/Download?blobName=28c8021d.zip&downloadedFileName=FOSPHB-RFP-21-26-27%20%2813Aug26%29.zip " +
  SOURCING

// Current eTenders sync format (line breaks kept), with two documents and no scope beyond the title.
const ATTACHMENTS_ONLY = [
  "Supply and delivery of bituminous products",
  "",
  "Tender documents:",
  "- Tender Document.pdf: https://www.etenders.gov.za/home/Download?blobName=a.pdf&downloadedFileName=Tender%20Document.pdf",
  "- Pricing Schedule.xlsx: https://www.etenders.gov.za/home/Download?blobName=b.xlsx&downloadedFileName=Pricing%20Schedule.xlsx",
  "",
  SOURCING,
].join("\n")

// A repaired SANRAL scope: location and duration, then administrative rules.
const SANRAL_SCOPE = [
  "This project is in the province of KwaZulu Natal and in the uMkhanyakude District Municipality. The approximate duration is 12 months including 3 months for the Mobilisation Period.",
  "Only tenderers who are a CIDB contractor grading of 9CE as stated on the Tender Data may submit tender offers.",
  "Only tenderers who are registered on the National Treasury Central Supplier Database at the tender closing date, are eligible to tender.",
].join("\n")

describe("parseTenderDescription", () => {
  it("separates scope, attachments (as named links) and the sourcing note, losing nothing", () => {
    const parsed = parseTenderDescription(SCOPE_PLUS_ATTACHMENT)
    expect(parsed.body).toBe(
      "FOSPHB-RFP-21-26/27 REQUEST FOR PROPOSAL [RFP] FOR SUPPLY RENEWABLE ELECTRICITY TO FOSKOR MINING DIVISION (PHALABORWA), LIMPOPO PROVINCE OF SOUTH AFRICA. THE CURRENT NOTIFIED MAXIMUM DEMAND (NMD) WITH ESKOM IS 75MVA.",
    )
    expect(parsed.attachments).toEqual([
      {
        name: "FOSPHB-RFP-21-26-27 (13Aug26)",
        url: "https://www.etenders.gov.za/home/Download?blobName=28c8021d.zip&downloadedFileName=FOSPHB-RFP-21-26-27%20%2813Aug26%29.zip",
        fileType: "ZIP",
      },
    ])
    expect(parsed.notes).toEqual([SOURCING])
  })

  it("reads a multi-line attachment list and names each document", () => {
    const parsed = parseTenderDescription(ATTACHMENTS_ONLY)
    expect(parsed.body).toBe("Supply and delivery of bituminous products")
    expect(parsed.attachments.map((a) => [a.name, a.fileType])).toEqual([
      ["Tender Document", "PDF"],
      ["Pricing Schedule", "XLSX"],
    ])
  })

  it("turns a bare URL into a link named from the URL", () => {
    const parsed = parseTenderDescription("Scope of works for the depot. See https://example.gov.za/files/Bid%20Pack%2012.pdf for details.")
    expect(parsed.body).toBe("Scope of works for the depot. See for details.")
    expect(parsed.attachments).toEqual([{ name: "Bid Pack 12", url: "https://example.gov.za/files/Bid%20Pack%2012.pdf", fileType: "PDF" }])
  })

  it("handles a missing description", () => {
    expect(parseTenderDescription(null)).toEqual({ body: "", attachments: [], notes: [] })
  })
})

describe("summariseTenderScope", () => {
  it("keeps the factual scope and drops the attachment list and sourcing note", () => {
    // 1139 / 1318: once the heading and attachment are removed, only a background fact remains.
    expect(
      summariseTenderScopeDetailed(SCOPE_PLUS_ATTACHMENT, {
        title: "Request for proposal [RFP] for supply renewable electricity to Foskor Mining Division (Phalaborwa), Limpopo Province of South Africa.",
        reference: "FOSPHB-RFP-21-26/27",
      }),
    ).toEqual({ text: null, partOfMultipleContracts: false, hasFurtherRequirements: false })
  })

  it("prefers sentences about the work over background facts", () => {
    expect(
      summariseTenderScope(
        "The municipality has a population of 120 000 residents. Supply and installation of 40 streetlights along Main Road in Ward 12. The works are expected to take 6 months.",
        { title: "Streetlights" },
      ),
    ).toBe("Supply and installation of 40 streetlights along Main Road in Ward 12. The works are expected to take 6 months.")
  })

  it("returns nothing when only attachments and a repeat of the title remain", () => {
    expect(summariseTenderScope(ATTACHMENTS_ONLY, { title: "Supply and delivery of bituminous products" })).toBeNull()
  })

  it("returns nothing for a duplicate of the title, whatever its case or reference prefix", () => {
    expect(
      summariseTenderScope("CONSTRUCTION OF THE RIETVLEI SEWAGE PUMP STATION\n\n" + SOURCING, {
        title: "Construction of the Rietvlei sewage pump station",
      }),
    ).toBeNull()
    expect(summariseTenderScope("RFQ 12/2026 - Cleaning services", { title: "Cleaning services", reference: "RFQ 12/2026" })).toBeNull()
  })

  it("returns nothing for a missing description", () => {
    expect(summariseTenderScope(null, { title: "Anything" })).toBeNull()
    expect(summariseTenderScope("   ", { title: "Anything" })).toBeNull()
  })

  it("takes at most two scope sentences and flags the requirements left for the detail page", () => {
    expect(summariseTenderScopeDetailed(SANRAL_SCOPE, { title: "The construction of pavement repairs" })).toEqual({
      text: "This project is in the province of KwaZulu Natal and in the uMkhanyakude District Municipality. The approximate duration is 12 months including 3 months for the Mobilisation Period.",
      partOfMultipleContracts: false,
      hasFurtherRequirements: true,
    })
  })

  it("does not show requirements alone when no scope sentence exists", () => {
    expect(
      summariseTenderScopeDetailed(
        "Tender documents are available from 25 September 2026 for free download.\nOnly tenderers who are a CIDB contractor grading of 9CE may submit tender offers.",
        { title: "Pavement repairs" },
      ),
    ).toEqual({ text: null, partOfMultipleContracts: false, hasFurtherRequirements: true })
  })

  it("skips label-only lines and strips field labels", () => {
    expect(
      summariseTenderScope("CONTRACT NUMBER X.003-087-2025/1\nPROJECT DESCRIPTION FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N9 SECTION 5\nDISTRICT MUNICIPALITY: SARAH BAARTMAN", {
        title: "Routine road maintenance - construction on N9",
      }),
    ).toBe("FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N9 SECTION 5 DISTRICT MUNICIPALITY: SARAH BAARTMAN")
    expect(
      summariseTenderScope("CONTRACT NUMBER X.003-087-2025/1 PROJECT DESCRIPTION FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N9 DISTRICT MUNICIPALITY: SARAH BAARTMAN PROJECT DURATION: 48 MONTHS", {
        title: "Routine road maintenance - construction on N9",
      }),
    ).toBe("FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N9 DISTRICT MUNICIPALITY: SARAH BAARTMAN PROJECT DURATION: 48 MONTHS")
  })

  it("shows one contract row of a multi-contract table, marked as one of several", () => {
    expect(
      summariseTenderScopeDetailed(
        "X.002-199-2023/1 — ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE R521 FROM POLOKWANE TO MOLEMOLE — Capricorn District Municipality — 60 Months\nX.002-209-2024/1 — ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE R71 — Polokwane — 36 Months",
        { title: "Routine road maintenance construction services for the projects in the Limpopo" },
      ),
    ).toEqual({
      text: "ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE R521 FROM POLOKWANE TO MOLEMOLE — Capricorn District Municipality — 60 Months",
      partOfMultipleContracts: true,
      hasFurtherRequirements: false,
    })
  })

  it("labels a contract given with inline field labels as one of several (5138 layout)", () => {
    expect(
      summariseTenderScopeDetailed(
        "CONTRACT NUMBER X.003-087-2025/1 PROJECT DESCRIPTION FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N9 SECTION 5 PROJECT DURATION: 48 MONTHS\nCONTRACT NUMBER X.003-088-2025/1 PROJECT DESCRIPTION FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE R61 SECTION 2",
        { title: "Routine road maintenance - construction on N9 and R61" },
      ),
    ).toEqual({
      text: "FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N9 SECTION 5 PROJECT DURATION: 48 MONTHS",
      partOfMultipleContracts: true,
      hasFurtherRequirements: false,
    })
  })

  it("treats a handover-meeting notice as administrative, not scope", () => {
    expect(
      summariseTenderScopeDetailed("The commencement date of the supervision phase will be communicated at the Handover meeting.", { title: "Consulting services" }),
    ).toEqual({ text: null, partOfMultipleContracts: false, hasFurtherRequirements: true })
  })

  it("does not mark a single-contract row as one of several", () => {
    expect(
      summariseTenderScopeDetailed("X.002-199-2023/1 — ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE R521 — Capricorn District Municipality — 60 Months", {
        title: "Routine road maintenance",
      }).partOfMultipleContracts,
    ).toBe(false)
  })

  it("keeps only the first contract row when rows run together on one line", () => {
    expect(
      summariseTenderScope(
        "X.004-105-2024/1 — For the Routine Road Maintenance of National Route N1 Sections 13 and 14 in the Xhariep District, Free State — Xhariep District — 36 Months N.001-167-2025/1 — For the Routine Road Maintenance of National Route N1 and N5",
        { title: "Routine road maintenance construction services" },
      ),
    ).toBe("For the Routine Road Maintenance of National Route N1 Sections 13 and 14 in the Xhariep District, Free State — Xhariep District — 36 Months")
    expect(
      summariseTenderScope("CONTRACT SANRAL X.005-138-2026/1 — FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N8 SECTION 6 — ZF Mgcawu District Municipality", {
        title: "Routine road maintenance construction services",
      }),
    ).toBe("FOR THE ROUTINE ROAD MAINTENANCE OF NATIONAL ROUTE N8 SECTION 6 — ZF Mgcawu District Municipality")
  })

  it("keeps a material eligibility requirement after a single scope sentence, joint-venture conditions included", () => {
    expect(
      summariseTenderScopeDetailed(
        "Joint Ventures (JV) will be allowed on condition that one JV partner is a Targeted Enterprise.\nThe approximate programme is for design to be completed by November 2026 followed by supervision of up to 60 months.\nOnly tenderers who are a CIDB contractor grading of 9CE may submit tender offers.",
        { title: "Consulting engineering services" },
      ),
    ).toEqual({
      text: "The approximate programme is for design to be completed by November 2026 followed by supervision of up to 60 months. Joint Ventures (JV) will be allowed on condition that one JV partner is a Targeted Enterprise.",
      partOfMultipleContracts: false,
      // The CIDB grading is stated on the detail page.
      hasFurtherRequirements: true,
    })
  })

  it("treats a sentence that repeats the heading with different punctuation as a duplicate", () => {
    expect(
      summariseTenderScope("CONSULTING ENGINEERING SERVICES FOR THE ROUTINE AD-HOC MAINTENANCE OF R334 SECTION 3.", {
        title: "Consulting engineering services for the routine adhoc maintenance of R334 section 3",
      }),
    ).toBeNull()
  })

  it("drops a CSD registration invitation as administrative text (1174)", () => {
    expect(
      summariseTenderScope(
        "Prospective suppliers are hereby requested to register on the National Treasury Central Supplier Database online Tender documents: - Database Registration Invitation Advertisement REVISED.docx: https://www.etenders.gov.za/home/Download?blobName=x.docx " + SOURCING,
        { title: "Prospective suppliers are hereby requested to register on the National Treasury Central Supplier Database online" },
      ),
    ).toBeNull()
  })
})

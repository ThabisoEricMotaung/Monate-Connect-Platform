import { describe, expect, it } from "vitest"
import { resolveTenderDisplayTitle, stripLeadingReference, stripTrailingReference } from "./tenderDisplayTitle"

describe("stripLeadingReference / stripTrailingReference", () => {
  it("removes only an exact reference match", () => {
    expect(stripLeadingReference("NRA 2026/0021 (B) - Resurfacing of N3", "NRA 2026/0021 (B)")).toBe("Resurfacing of N3")
    expect(stripLeadingReference("NRA 2026/0022 - Resurfacing of N3", "NRA 2026/0021")).toBe("NRA 2026/0022 - Resurfacing of N3")
    expect(stripLeadingReference("Fosphb-RFP-21-26/27 Request for Proposal", "FOSPHB-RFP-21-26/27")).toBe("Request for Proposal")
    expect(stripTrailingReference("Pavement repairs SANRAL N.002-300-2020/1", "SANRAL N.002-300-2020/1")).toBe("Pavement repairs")
    expect(stripTrailingReference("Free State Province NRA 2026/0758 (B) NRA 2026/0758 (B)", "NRA 2026/0758 (B)")).toBe("Free State Province")
  })

  it("does not strip a reference that is only a prefix of a longer token", () => {
    expect(stripLeadingReference("RFI 003/2026x scope", "RFI 003/2026")).toBe("RFI 003/2026x scope")
  })
})

describe("resolveTenderDisplayTitle", () => {
  it("hides SANRAL listing previews stored as titles and descriptions", () => {
    const preview = "CONTRACT SANRAL N.002-210-2023/1ENV - Tender Notice: Awarded To: BBBEE Points: Full Points Awarded: Approv..."
    expect(
      resolveTenderDisplayTitle({
        title: preview,
        description: preview,
        reference: "CONTRACT SANRAL N.002-210-2023/1ENV",
        sourceName: "SANRAL",
      }),
    ).toEqual({ displayTitle: null, scope: null })
  })

  it("turns an all-caps SANRAL heading into sentence case, keeping codes and place names", () => {
    const { displayTitle } = resolveTenderDisplayTitle({
      // Stored verbatim, including the trailing reference and SANRAL's "ON FOR".
      title: "FOR ENVIRONMENTAL SUBSERVICES ON FOR THE IMPROVEMENT OF NATIONAL ROUTE N2 SECTION 21X FROM BROOKS NEK (KM0.0) TO STAFFORDS POST (KM44.3) – ADDITIONAL CLIMBING LANES CONTRACT SANRAL N.002-210-2023/1ENV",
      description: null,
      reference: "CONTRACT SANRAL N.002-210-2023/1ENV",
      sourceName: "SANRAL",
    })
    expect(displayTitle).toBe(
      "Environmental subservices for the improvement of national route N2 section 21X from Brooks Nek (KM0.0) to Staffords Post (KM44.3) – additional climbing lanes",
    )
  })

  it("keeps generic words that are part of a name", () => {
    const { displayTitle } = resolveTenderDisplayTitle({
      title: "FOR THE CONSTRUCTION OF PAVEMENT REPAIRS FROM BUSHVELD RETREAT FARM (Km 44.00) TO HLUHLUWE INTERCHANGE NEAR DOHNE AGRICULTURAL DEVELOPMENT INSTITUTE",
      description: null,
      reference: null,
      sourceName: "SANRAL",
    })
    expect(displayTitle).toBe(
      "The construction of pavement repairs from Bushveld Retreat Farm (km 44.00) to Hluhluwe Interchange near Dohne Agricultural Development Institute",
    )
  })

  it("removes SANRAL's invitation lead-in but keeps the work and location", () => {
    const { displayTitle } = resolveTenderDisplayTitle({
      title: "The South African National Roads Agency SOC Limited (SANRAL) invites tenders for the provision of Routine Road Maintenance Consulting Services for the projects in the Northern Cape Province R.031-023-2026/1F",
      description: null,
      reference: "R.031-023-2026/1F",
      sourceName: "SANRAL",
    })
    expect(displayTitle).toBe("Routine road maintenance consulting services for the projects in the Northern Cape Province")
  })

  it("adds the routes named in the stored scope to a generic or unfinished heading", () => {
    const scope = "X.003-097-2026/1 — FOR THE ROUTINE ROAD MAINTENANCE OF N2 SECTION 10 KM 73.40 TO SECTION 11 AND R75 SECTION 1 KM 0.00\nX.003-099-2026/1 — NATIONAL ROUTE R63 SECTION 8 KM 20.2 AND R75 SECTION 4"
    expect(
      resolveTenderDisplayTitle({ title: "ROUTINE ROAD MAINTENANCE - CONSTRUCTION X.003-097-2026/1", description: scope, reference: "X.003-097-2026/1", sourceName: "SANRAL" }).displayTitle,
    ).toBe("Routine road maintenance - construction on N2, R75 and R63")
    expect(
      resolveTenderDisplayTitle({ title: "Consulting Engineering Services for the Routine Road Maintenance of National Route", description: scope, reference: null, sourceName: "SANRAL" }).displayTitle,
    ).toBe("Consulting engineering services for the routine road maintenance of national route N2, R75 and R63")
  })

  it("leaves a specific heading, or one without route evidence, unchanged", () => {
    expect(
      resolveTenderDisplayTitle({ title: "Resurfacing of national route N12 section 17 from Potchefstroom", description: "R61 SECTION 2", reference: null, sourceName: "SANRAL" }).displayTitle,
    ).toBe("Resurfacing of national route N12 section 17 from Potchefstroom")
    expect(
      resolveTenderDisplayTitle({ title: "Routine road maintenance - construction", description: "Maintenance in the district", reference: null, sourceName: "SANRAL" }).displayTitle,
    ).toBe("Routine road maintenance - construction")
  })

  it("keeps acronyms, parenthesised acronyms and part labels", () => {
    expect(
      resolveTenderDisplayTitle({
        title: "TERM TENDER FOR HIGH VOLTAGE AIR INSULATED SWITCHGEAR (AIS) FOR ICT AND HVAC SITES - WORK PACKAGE A",
        description: null,
        reference: null,
        sourceName: "eTenders",
      }).displayTitle,
    ).toBe("Term tender for High Voltage Air Insulated Switchgear (AIS) for ICT and HVAC sites - Work Package A")
  })

  it("recovers the full DBSA title from the stored description, without document labels", () => {
    expect(
      resolveTenderDisplayTitle({
        title: "Appointment of a Service Provider to Develop Phase 2 of the DBSA DLAB Programme Social Return on Investment Framework and Assess the Social Return of DLAB SitesTender Volume, Annexure A, Addendum 01,",
        description: "RFP - Appointment of a Service Provider to Develop Phase 2 of the DBSA DLAB Programme Social Return on Investment Framework and Assess the Social Return of DLAB SitesTender Volume, Annexure A, Addendum 01, Addendum 02",
        reference: "RFP 181/2026",
        sourceName: "DBSA",
      }),
    ).toEqual({
      displayTitle: "Appointment of a service provider to develop phase 2 of the DBSA DLAB programme social return on investment framework and assess the social return of DLAB sites",
      scope: null,
    })
  })

  it("completes a title cut with an ellipsis from the stored description's first sentence", () => {
    expect(
      resolveTenderDisplayTitle({
        title: "Fosphb-RFP-21-26/27 Request for Proposal [RFP] for Supply Renewable Electricity to Foskor Mining Division…",
        description: "FOSPHB-RFP-21-26/27 REQUEST FOR PROPOSAL [RFP] FOR SUPPLY RENEWABLE ELECTRICITY TO FOSKOR MINING DIVISION (PHALABORWA), LIMPOPO PROVINCE. THE CURRENT SUPPLY ENDS IN 2027.",
        reference: "FOSPHB-RFP-21-26/27",
        sourceName: "eTenders.gov.za",
      }),
    ).toEqual({
      displayTitle: "Request for proposal [RFP] for supply renewable electricity to Foskor Mining Division (Phalaborwa), Limpopo Province.",
      scope: "THE CURRENT SUPPLY ENDS IN 2027.",
    })
  })

  it("does not apply SANRAL lead-in rules to other sources", () => {
    const { displayTitle } = resolveTenderDisplayTitle({
      title: "For the provision of cleaning services",
      description: null,
      reference: null,
      sourceName: "City of Cape Town",
    })
    expect(displayTitle).toBe("For the provision of cleaning services")
  })

  it("uses the published description when the title is only the reference", () => {
    expect(
      resolveTenderDisplayTitle({
        title: "89Q/2027/28",
        description: "Term tender for erection of prefabricated units and associated civils works: city wide",
        reference: "89Q/2027/28",
        sourceName: "City of Cape Town",
      }),
    ).toEqual({
      displayTitle: "Term tender for erection of prefabricated units and associated civils works: city wide",
      scope: null,
    })
  })

  it("keeps later description paragraphs as scope", () => {
    expect(
      resolveTenderDisplayTitle({
        title: "046S/2026/27",
        description: "APPOINTMENT OF MAIN BANKER AND OTHER FINANCIAL SERVICES\nFOR THE CITY OF CAPE TOWN\n\nContract period of five years.",
        reference: "046S/2026/27",
        sourceName: "eTenders",
      }),
    ).toEqual({
      displayTitle: "Appointment of main banker and other financial services for the City of Cape Town",
      scope: "Contract period of five years.",
    })
  })

  it("leaves a title alone when no reference is known, rather than guessing it is one", () => {
    expect(
      resolveTenderDisplayTitle({ title: "046S/2026/27", description: "Scope text", reference: null, sourceName: "eTenders" }),
    ).toEqual({ displayTitle: "046S/2026/27", scope: "Scope text" })
  })

  it("returns null rather than inventing a title when nothing descriptive is stored", () => {
    expect(
      resolveTenderDisplayTitle({ title: "RFQ 12/2026", description: null, reference: "RFQ 12/2026", sourceName: "DBSA" }),
    ).toEqual({ displayTitle: null, scope: null })
  })
})

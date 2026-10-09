import { describe, expect, it } from "vitest"
import {
  classifyEskomNotice,
  parseEskomDateTime,
  parseEskomTender,
  parseEskomTenders,
  stripEskomReference,
  type EskomApiTender,
} from "./eskomParser"

// Records trimmed from https://tenderbulletin.eskom.co.za/webapi/api/Lookup/GetTender?TENDER_ID=
// (2026-10-08). Only the fields the parser reads are kept; text is verbatim.
const PLAIN: EskomApiTender = {
  TENDER_ID: 73478,
  REFERENCE: "ERI/2022/BMS/08",
  HEADER_DESC: "The Provision of cleaning services for the Ash and\nCoal plant at Medupi and Kusile power station for\nEskom Rotek Industries, for a period of 48 months on\nan as and when required basis",
  SCOPE_DETAILS: "The Provision of cleaning services for the Ash and\nCoal plant at Medupi and Kusile power station for\nEskom Rotek Industries, for a period of 48 months on\nan as and when required basis",
  DESCRIPTION: "ESKOM ENTERPRISES",
  CLOSING_DATE: "2027-02-22T13:33:00",
  PUBLISHEDDATE: "2023-05-22T13:35:12.307",
  Province: "National",
  PUBLISH: "Y",
}

const REFERENCE_PREFIX: EskomApiTender = {
  TENDER_ID: 96273,
  REFERENCE: "E3507GXNOU",
  HEADER_DESC: "E3507GXNOU The supply and delivery of whole or part of the scope for various Mechanical\nConsumables and Components at Koeberg Operating Unit for a period of 1 year",
  SCOPE_DETAILS: "E3507GXNOU The Supply and delivery of whole or part of the scope of various Mechanical\nConsumables and Components at Koeberg Operating Unit for a period of 1 year",
  DESCRIPTION: "GENERATION",
  CLOSING_DATE: "2026-10-13T10:00:00",
  PUBLISHEDDATE: "2026-09-14T17:37:23.533",
  Province: "Western Cape",
  PUBLISH: "Y",
}

const REFERENCE_SUFFIX: EskomApiTender = {
  TENDER_ID: 96505,
  REFERENCE: "E2371GXNOUR",
  HEADER_DESC: "SUPPLY AND DELIVERY OF AIR- CONDITIONING UNITS AND ELECTRICAL APPLIANCES\nFOR NUCLEAR OPERATING UNIT (NOU) ON AN “AS AND WHEN” REQUIRED BASIS FOR A\nPERIOD OF FIVE (5) YEARS.- E2371GXNOUR",
  SCOPE_DETAILS: "SUPPLY AND DELIVERY OF AIR- CONDITIONING UNITS AND ELECTRICAL APPLIANCES\nFOR NUCLEAR OPERATING UNIT (NOU) ON AN “AS AND WHEN” REQUIRED BASIS FOR A\nPERIOD OF FIVE (5) YEARS. E2371GXNOUR",
  DESCRIPTION: "GENERATION",
  CLOSING_DATE: "2026-10-27T10:00:00",
  Province: "Western Cape",
}

const ITEM_LIST_HEADER: EskomApiTender = {
  TENDER_ID: 96251,
  REFERENCE: "E3513GXNOU",
  HEADER_DESC: "VARIOUS METAL ITEMS\n\nFITTING:CAP FEMALE;1 IN;EN 10242\nFITTING:T-PIECE MALE;1/2 IN;EN10242\nFITTING:CAP FEMALE;1/2 IN;EN 10242",
  SCOPE_DETAILS: "The supply and delivery of whole or part of the scope for various Miscellaneous (Metals) consumables & components at Koeberg Operating Unit for a period of 12 months",
  DESCRIPTION: "GENERATION",
  CLOSING_DATE: "2026-10-14T10:00:00",
  Province: "National",
}

const CUT_OFF_HEADER: EskomApiTender = {
  TENDER_ID: 95919,
  REFERENCE: "E3342GCDLET",
  HEADER_DESC: "PROVISION OF PLANT INSTRUMENTATION DESIGN AND COMMISSIONING SERVICES INCLUDING ASSOCIATED ELECTRICAL AND CIVIL DESIGNS AND COMMISSIONING SERVISES FOR ALL SIX (06) UNITS AT LETHABO POWER",
  SCOPE_DETAILS: "PROVISION OF PLANT INSTRUMENTATION DESIGN AND COMMISSIONING SERVICES INCLUDING ASSOCIATED ELECTRICAL AND CIVIL DESIGNS AND COMMISSIONING SERVISES FOR ALL SIX (06) UNITS AT LETHABO POWER\nSTATION.",
  DESCRIPTION: "GENERATION",
  CLOSING_DATE: "2026-10-12T10:00:00",
}

const SEPARATE_SCOPE: EskomApiTender = {
  TENDER_ID: 95533,
  REFERENCE: "E3157GXMPGRO",
  HEADER_DESC: "Cooling Tower 1 Refurbishment at Grootvlei Power station.",
  SCOPE_DETAILS: "Grootvlei Power Station is situated close to the town of Balfour in Mpumalanga province. The Power Station consists of six units",
  DESCRIPTION: "GENERATION",
  CLOSING_DATE: "2026-10-16T10:00:00",
  Province: "Mpumalanga",
}

const CANCELLATION: EskomApiTender = {
  TENDER_ID: 90394,
  REFERENCE: "MWP2524DXcancellatio",
  HEADER_DESC: "Cancellation TEAP PROCESS FOR THE SUPPLY AND DELIVERY OF BULK METERED\nPOINTS LOAD CONTROLLER FOR ALL DISTRIBUTION CLUSTERS FOR A\nPERIOD OF 3 YEARS ON AN “AS AND WHEN” REQUIRED BASIS.",
  SCOPE_DETAILS: "Cancellation TEAP PROCESS FOR THE SUPPLY AND DELIVERY OF BULK METERED\nPOINTS LOAD CONTROLLER FOR ALL DISTRIBUTION CLUSTERS FOR A\nPERIOD OF 3 YEARS ON AN “AS AND WHEN” REQUIRED BASIS.",
  DESCRIPTION: "DISTRIBUTION",
  CLOSING_DATE: "2027-10-25T10:00:00",
}

describe("parseEskomTender", () => {
  it("uses HEADER_DESC as the title, joining wrapped lines", () => {
    const tender = parseEskomTender(PLAIN)
    expect(tender).toMatchObject({
      tenderId: 73478,
      reference: "ERI/2022/BMS/08",
      title: "The Provision of cleaning services for the Ash and Coal plant at Medupi and Kusile power station for Eskom Rotek Industries, for a period of 48 months on an as and when required basis",
      description: null,
      division: "ESKOM ENTERPRISES",
      province: null,
      detailUrl: "https://tenderbulletin.eskom.co.za/tender/73478",
      noticeType: null,
    })
  })

  it("reads offset-less API times as South African time", () => {
    const tender = parseEskomTender(PLAIN)
    expect(tender?.closingDate?.toISOString()).toBe("2027-02-22T11:33:00.000Z")
    expect(tender?.publishedDate?.toISOString()).toBe("2023-05-22T11:35:12.307Z")
  })

  it("removes a leading reference and drops a scope that only repeats the title", () => {
    const tender = parseEskomTender(REFERENCE_PREFIX)
    expect(tender?.title).toBe("The supply and delivery of whole or part of the scope for various Mechanical Consumables and Components at Koeberg Operating Unit for a period of 1 year")
    expect(tender?.description).toBeNull()
    expect(tender?.province).toBe("Western Cape")
  })

  it("removes a trailing reference", () => {
    expect(parseEskomTender(REFERENCE_SUFFIX)?.title).toBe(
      "SUPPLY AND DELIVERY OF AIR- CONDITIONING UNITS AND ELECTRICAL APPLIANCES FOR NUCLEAR OPERATING UNIT (NOU) ON AN “AS AND WHEN” REQUIRED BASIS FOR A PERIOD OF FIVE (5) YEARS."
    )
  })

  it("takes the title from SCOPE_DETAILS when HEADER_DESC is an item list, keeping the list as description", () => {
    const tender = parseEskomTender(ITEM_LIST_HEADER)
    expect(tender?.title).toBe(
      "The supply and delivery of whole or part of the scope for various Miscellaneous (Metals) consumables & components at Koeberg Operating Unit for a period of 12 months"
    )
    expect(tender?.description).toBe(
      "VARIOUS METAL ITEMS\n\nFITTING:CAP FEMALE;1 IN;EN 10242 FITTING:T-PIECE MALE;1/2 IN;EN10242 FITTING:CAP FEMALE;1/2 IN;EN 10242"
    )
  })

  it("completes a cut-off HEADER_DESC from SCOPE_DETAILS", () => {
    const tender = parseEskomTender(CUT_OFF_HEADER)
    expect(tender?.title).toBe(
      "PROVISION OF PLANT INSTRUMENTATION DESIGN AND COMMISSIONING SERVICES INCLUDING ASSOCIATED ELECTRICAL AND CIVIL DESIGNS AND COMMISSIONING SERVISES FOR ALL SIX (06) UNITS AT LETHABO POWER STATION."
    )
    expect(tender?.description).toBeNull()
  })

  it("keeps a SCOPE_DETAILS that adds information as the description", () => {
    const tender = parseEskomTender(SEPARATE_SCOPE)
    expect(tender?.title).toBe("Cooling Tower 1 Refurbishment at Grootvlei Power station.")
    expect(tender?.description).toBe(SEPARATE_SCOPE.SCOPE_DETAILS)
  })

  it("returns null without an id, a reference or any text", () => {
    expect(parseEskomTender({ ...PLAIN, TENDER_ID: null })).toBeNull()
    expect(parseEskomTender({ ...PLAIN, REFERENCE: " " })).toBeNull()
    expect(parseEskomTender({ ...PLAIN, HEADER_DESC: "", SCOPE_DETAILS: null })).toBeNull()
  })
})

describe("classifyEskomNotice", () => {
  it("flags post-tender notices from the text", () => {
    expect(parseEskomTender(CANCELLATION)?.noticeType).toBe("cancellation")
    expect(classifyEskomNotice("WCPK1118LHRegret", "Regret Letter - Fire Detection Upgrade at Vanderkloof Power Station")).toBe("regret")
    expect(classifyEskomNotice("E3465GXMPDUVp", "Publication of Bidders Names: The Provision of Civil Construction Services at Duvha Power Station for a period of 60 months.")).toBe("bidders-list")
    expect(classifyEskomNotice("E1026GXMPMAT2", "Notification to Award for Refurbishment of Condensate Polishing Regeneration Plant vessels")).toBe("award")
    expect(classifyEskomNotice("MWP2652DXVALIDITY", "tender Validity\nTHE SUPPLY OF PROGRAMMABLE THREE PHASE ENERGY METERS")).toBe("validity-extension")
  })

  it("flags notices marked only in the reference", () => {
    expect(classifyEskomNotice("AwardE2227GXPOUR", "Diesel Sampling and Gauging for Acacia, Ankerlig, Gourikwa and Port Rex Power Stations for a period of five (5) years...")).toBe("award")
    expect(classifyEskomNotice("E1859GXMPTUTpublish", "SUPPLY AND DELIVERY OF LED LIGHT FIXTURES AT TUTUKA\nPOWER STATION – ONCE OFF-Publish")).toBe("bidders-list")
  })

  it("does not flag a tender that merely mentions awards", () => {
    expect(
      classifyEskomNotice(
        "E3570CXMWP",
        "Procurement of independent proactive assurance services for Private Sector Participation processes relating to the Richards Bay Gas-to-Power Project and Eskom Green’s renewable energy pipeline, including assurance over RFQ/RFP documentation, evaluation processes, governance submissions, negotiation processes, award recommendations and compliance with applicable procurement governance requirements."
      )
    ).toBeNull()
    expect(classifyEskomNotice(PLAIN.REFERENCE!, PLAIN.HEADER_DESC!, PLAIN.SCOPE_DETAILS!)).toBeNull()
  })
})

describe("stripEskomReference", () => {
  it("removes a labelled reference whose record reference is a suffixed variant", () => {
    expect(stripEskomReference("Tender No. E1252GXPOU: Refurbishment of V94.2 SGT5-2000E Version 6 gas turbines", "E1252GXPOU2")).toBe(
      "Refurbishment of V94.2 SGT5-2000E Version 6 gas turbines"
    )
  })

  it("leaves text that does not start or end with the reference", () => {
    expect(stripEskomReference("Supply of E3507GXNOU spares", "E3507GXNOU")).toBe("Supply of E3507GXNOU spares")
  })
})

describe("parseEskomDateTime", () => {
  it("parses whole and fractional seconds as SAST", () => {
    expect(parseEskomDateTime("2026-10-13T14:00:00")?.toISOString()).toBe("2026-10-13T12:00:00.000Z")
    expect(parseEskomDateTime("2026-09-14T17:37:23.533")?.toISOString()).toBe("2026-09-14T15:37:23.533Z")
  })

  it("rejects other formats", () => {
    expect(parseEskomDateTime("2026-Oct-13 14:00:00")).toBeNull()
    expect(parseEskomDateTime(null)).toBeNull()
  })
})

describe("parseEskomTenders", () => {
  it("parses the array and skips unpublished or unusable records", () => {
    const parsed = parseEskomTenders([PLAIN, CANCELLATION, { ...PLAIN, TENDER_ID: 1, PUBLISH: "N" }, null, { TENDER_ID: 2 }])
    expect(parsed.map((tender) => tender.tenderId)).toEqual([73478, 90394])
  })

  it("rejects a non-array response", () => {
    expect(() => parseEskomTenders({ message: "error" })).toThrow()
  })
})

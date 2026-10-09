import { describe, expect, it } from "vitest"
import { buildLiveSnapshot, classifyRegions, isLiveRow, type SnapshotRow } from "./liveOpportunitySnapshot"

const NOW = new Date("2026-10-09T10:00:00.000Z")
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()

let nextId = 1
function row(overrides: Partial<SnapshotRow> = {}): SnapshotRow {
  return {
    id: nextId++,
    province: "Gauteng",
    provinces: null,
    closing_date: at(20 * DAY),
    created_at: at(-10 * DAY),
    status: "open",
    is_public: true,
    curation_status: "not_required",
    ...overrides,
  }
}

const province = (snapshot: ReturnType<typeof buildLiveSnapshot>, name: string) => snapshot.provinces.find((p) => p.name === name)!

describe("isLiveRow (mirrors applyLivePublicOpportunityFilters)", () => {
  it.each([
    ["an open public listing closing later", {}, true],
    ["status active", { status: "active" }, true],
    ["curation pending (visibility governed by is_public)", { curation_status: "pending" }, true],
    ["expired one millisecond ago", { closing_date: at(-1) }, false],
    ["closing exactly now", { closing_date: at(0) }, false],
    ["no closing date", { closing_date: null }, false],
    ["unparseable closing date", { closing_date: "soon" }, false],
    ["quarantined", { curation_status: "quarantined" }, false],
    ["missing curation status (SQL <> excludes NULL)", { curation_status: null }, false],
    ["not public", { is_public: false }, false],
    ["public flag missing", { is_public: null }, false],
    ["awarded", { status: "awarded" }, false],
    ["closed", { status: "closed" }, false],
    ["status in another case (SQL IN is case-sensitive)", { status: "Open" }, false],
  ] as const)("%s → %s", (_label, overrides, expected) => {
    expect(isLiveRow(row(overrides as Partial<SnapshotRow>), NOW)).toBe(expected)
  })
})

describe("classifyRegions", () => {
  it.each([
    ["Western Cape", ["Western Cape"], false],
    ["  kwazulu natal ", ["KwaZulu-Natal"], false],
    ["KZN", ["KwaZulu-Natal"], false],
    ["Gauteng Province", ["Gauteng"], false],
    ["Gauteng, North West", ["Gauteng", "North West"], false],
    ["Limpopo and Mpumalanga", ["Limpopo", "Mpumalanga"], false],
    ["South Africa", [], true],
    ["National", [], true],
  ] as const)("%s", (value, provinces, national) => {
    expect(classifyRegions({ province: value, provinces: null })).toMatchObject({ provinces, national, unrecognised: [] })
  })

  it("merges the provinces array with the province field without double counting", () => {
    expect(classifyRegions({ province: "Gauteng", provinces: ["Gauteng", "Free State"] }).provinces).toEqual(["Free State", "Gauteng"])
  })

  it("keeps unknown values out of every province (they count as not specified)", () => {
    expect(classifyRegions({ province: "Multiple", provinces: [] })).toEqual({ provinces: [], national: false, unrecognised: ["Multiple"] })
    expect(classifyRegions({ province: "", provinces: null })).toEqual({ provinces: [], national: false, unrecognised: [] })
    expect(classifyRegions({ province: null, provinces: null })).toEqual({ provinces: [], national: false, unrecognised: [] })
  })
})

describe("buildLiveSnapshot", () => {
  it("counts only live listings: expired, quarantined, private and awarded rows are excluded", () => {
    const snapshot = buildLiveSnapshot(
      [
        row(),
        row({ closing_date: at(-1 * HOUR) }),
        row({ closing_date: at(-40 * DAY), status: "open" }),
        row({ curation_status: "quarantined" }),
        row({ is_public: false }),
        row({ status: "awarded" }),
      ],
      NOW,
    )
    expect(snapshot.live).toBe(1)
    expect(province(snapshot, "Gauteng").live).toBe(1)
    expect(snapshot.regionalTotal).toBe(1)
  })

  it("never assigns a province to a listing without one", () => {
    const snapshot = buildLiveSnapshot([row({ province: null }), row({ province: "" }), row({ province: "Multiple" })], NOW)
    expect(snapshot.live).toBe(3)
    expect(snapshot.notSpecified.live).toBe(3)
    expect(snapshot.provinces.every((p) => p.live === 0)).toBe(true)
    expect(snapshot.national.live).toBe(0)
    expect(snapshot.unrecognisedProvinceValues).toEqual(["Multiple"])
  })

  it("keeps National separate from Province not specified", () => {
    const snapshot = buildLiveSnapshot([row({ province: "South Africa" }), row({ province: null })], NOW)
    expect(snapshot.national.live).toBe(1)
    expect(snapshot.notSpecified.live).toBe(1)
  })

  it("counts a multi-province listing in each province, and explains the excess", () => {
    const snapshot = buildLiveSnapshot(
      [
        row({ province: "Gauteng, North West" }),
        row({ province: null, provinces: ["Limpopo", "Mpumalanga", "Limpopo"] }),
        row({ province: "Western Cape" }),
      ],
      NOW,
    )
    expect(snapshot.live).toBe(3)
    expect(province(snapshot, "Gauteng").live).toBe(1)
    expect(province(snapshot, "North West").live).toBe(1)
    expect(province(snapshot, "Limpopo").live).toBe(1)
    expect(province(snapshot, "Mpumalanga").live).toBe(1)
    expect(snapshot.multiRegionListings).toBe(2)
    expect(snapshot.regionalTotal).toBe(5)
  })

  it("reconciles: regional total = unique live + extra memberships, and every listing lands somewhere", () => {
    const rows = [
      row({ province: "Gauteng" }),
      row({ province: "Gauteng, Free State" }),
      row({ province: "South Africa" }),
      row({ province: "Gauteng", provinces: ["National"] }),
      row({ province: null }),
      row({ province: "KZN", closing_date: at(-DAY) }),
    ]
    const snapshot = buildLiveSnapshot(rows, NOW)
    const extraMemberships = rows
      .filter((r) => isLiveRow(r, NOW))
      .map((r) => {
        const regions = classifyRegions(r)
        return Math.max(regions.provinces.length + (regions.national ? 1 : 0), 1) - 1
      })
      .reduce((sum, extra) => sum + extra, 0)
    const provinceSum = snapshot.provinces.reduce((sum, p) => sum + p.live, 0)
    expect(snapshot.live).toBe(5)
    expect(provinceSum + snapshot.national.live + snapshot.notSpecified.live).toBe(snapshot.regionalTotal)
    expect(snapshot.regionalTotal).toBe(snapshot.live + extraMemberships)
    expect(snapshot.multiRegionListings).toBe(2)
  })

  it("uses a rolling seven days for closing soon and created_at for new in 48 hours", () => {
    const snapshot = buildLiveSnapshot(
      [
        row({ closing_date: at(7 * DAY), created_at: at(-48 * HOUR) }),
        row({ closing_date: at(7 * DAY + 1), created_at: at(-48 * HOUR - 1) }),
        row({ closing_date: at(HOUR), created_at: null }),
      ],
      NOW,
    )
    expect(snapshot.closingSoon).toBe(2)
    expect(snapshot.newIn48Hours).toBe(1)
    expect(province(snapshot, "Gauteng")).toMatchObject({ live: 3, closingSoon: 2, newIn48Hours: 1 })
  })

  it("keeps external tenders and platform RFQs distinct in the live total", () => {
    const snapshot = buildLiveSnapshot(
      [
        row({ is_external_opportunity: true }),
        row({ is_external_opportunity: true }),
        row({ is_external_opportunity: false }),
        row({ is_external_opportunity: null }),
        row({ is_external_opportunity: true, closing_date: at(-DAY) }),
      ],
      NOW,
    )
    expect(snapshot.live).toBe(4)
    expect(snapshot.liveBySource).toEqual({ externalTenders: 2, platformRfqs: 2 })
  })

  it("counts a row repeated across pages once", () => {
    const repeated = row()
    expect(buildLiveSnapshot([repeated, repeated], NOW).live).toBe(1)
  })

  it("records the instant every figure was taken", () => {
    expect(buildLiveSnapshot([], NOW).asOf).toBe(NOW.toISOString())
  })
})

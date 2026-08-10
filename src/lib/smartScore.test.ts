import { describe, expect, it } from "vitest"
import { formatSmartScoreBand, getSmartScoreBand } from "./smartScore"

describe("public SmartScore bands", () => {
  it.each([
    [0, "Emerging Supplier / High Risk", 0, 39],
    [39, "Emerging Supplier / High Risk", 0, 39],
    [40, "Developing Supplier", 40, 59],
    [59, "Developing Supplier", 40, 59],
    [60, "Reliable Supplier", 60, 74],
    [74, "Reliable Supplier", 60, 74],
    [75, "Trusted Supplier", 75, 84],
    [84, "Trusted Supplier", 75, 84],
    [85, "Elite Supplier", 85, 100],
    [100, "Elite Supplier", 85, 100],
  ])("maps %i to its canonical band", (score, label, min, max) => {
    expect(getSmartScoreBand(score)).toMatchObject({ label, min, max })
  })

  it("formats the public label and range without exposing the exact score", () => {
    expect(formatSmartScoreBand(81)).toBe("Trusted Supplier (75-84)")
  })
})

import { describe, expect, it } from "vitest"
import { planStatusReconciliation, type StatusRow } from "./tenderStatusReconciliation"

const now = new Date("2026-10-08T10:00:00Z")
const row = (id: number, status: string | null, closing: string | null, closing_soon: boolean | null = false): StatusRow => ({
  id,
  status,
  closing_date: closing,
  closing_soon,
})

describe("planStatusReconciliation", () => {
  it("expires open listings past their deadline", () => {
    const plan = planStatusReconciliation(
      [row(1, "active", "2026-10-08T09:59:00Z"), row(2, "open", "2026-09-01T10:00:00Z"), row(3, "Active", "2026-10-07T00:00:00Z")],
      now,
    )
    expect(plan.expire).toEqual([1, 2, 3])
  })

  it("keeps a date-only deadline open through its South African day", () => {
    // 2026-10-08 23:59:59.999 SAST
    const plan = planStatusReconciliation([row(1, "active", "2026-10-08T21:59:59.999Z")], now)
    expect(plan.expire).toEqual([])
    expect(plan.markClosingSoon).toEqual([1])
  })

  it("maintains closing_soon for open listings only when it changes", () => {
    const plan = planStatusReconciliation(
      [
        row(1, "active", "2026-10-12T10:00:00Z", false),
        row(2, "active", "2026-10-12T10:00:00Z", true),
        row(3, "active", "2026-11-30T10:00:00Z", true),
        row(4, "active", "2026-11-30T10:00:00Z", false),
      ],
      now,
    )
    expect(plan).toEqual({ expire: [], markClosingSoon: [1], clearClosingSoon: [3] })
  })

  it("never touches drafts, closed rows, workflow statuses or rows without a closing date", () => {
    const plan = planStatusReconciliation(
      [
        row(1, "draft", "2026-09-01T10:00:00Z"),
        row(2, "closed", "2026-12-01T10:00:00Z", true),
        row(3, "awarded", "2026-09-01T10:00:00Z"),
        row(4, "active", null),
        row(5, null, "2026-09-01T10:00:00Z"),
      ],
      now,
    )
    expect(plan).toEqual({ expire: [], markClosingSoon: [], clearClosingSoon: [] })
  })
})

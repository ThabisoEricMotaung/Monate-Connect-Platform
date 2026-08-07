import { describe, expect, it } from "vitest"
import { documentExpiryBadge } from "./expiryBadge"

const daysFromToday = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

describe("documentExpiryBadge (admin verification queue)", () => {
  it("shows no badge for a document with no expiry_date set", () => {
    expect(documentExpiryBadge(null)).toBe(null)
  })
  it("shows no badge for a document valid well beyond the 30-day window", () => {
    expect(documentExpiryBadge(daysFromToday(90))).toBe(null)
  })
  it("shows an Expiring soon badge within 30 days of expiry_date", () => {
    const badge = documentExpiryBadge(daysFromToday(10))
    expect(badge?.label).toBe("Expiring soon")
    expect(badge?.className).toContain("warning")
  })
  it("shows an Expired badge once expiry_date has passed", () => {
    const badge = documentExpiryBadge(daysFromToday(-1))
    expect(badge?.label).toBe("Expired")
    expect(badge?.className).toContain("rose")
  })
})

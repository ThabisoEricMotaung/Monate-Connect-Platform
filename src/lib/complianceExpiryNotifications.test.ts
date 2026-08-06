import { describe, expect, it } from "vitest"
import { matchingExpiryWindow } from "./complianceExpiryNotifications"

const NOW = new Date("2026-08-06T12:00:00Z")
const daysFromNow = (days: number) => {
  const date = new Date(NOW)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

describe("matchingExpiryWindow", () => {
  it("matches exactly 30, 14, and 1 days out", () => {
    expect(matchingExpiryWindow(daysFromNow(30), NOW)).toBe(30)
    expect(matchingExpiryWindow(daysFromNow(14), NOW)).toBe(14)
    expect(matchingExpiryWindow(daysFromNow(1), NOW)).toBe(1)
  })
  it("does not match days outside the three windows", () => {
    expect(matchingExpiryWindow(daysFromNow(29), NOW)).toBe(null)
    expect(matchingExpiryWindow(daysFromNow(15), NOW)).toBe(null)
    expect(matchingExpiryWindow(daysFromNow(0), NOW)).toBe(null)
    expect(matchingExpiryWindow(daysFromNow(2), NOW)).toBe(null)
    expect(matchingExpiryWindow(daysFromNow(-1), NOW)).toBe(null)
    expect(matchingExpiryWindow(daysFromNow(90), NOW)).toBe(null)
  })
  it("returns null for missing or unparseable dates", () => {
    expect(matchingExpiryWindow(null, NOW)).toBe(null)
    expect(matchingExpiryWindow(undefined, NOW)).toBe(null)
    expect(matchingExpiryWindow("not-a-date", NOW)).toBe(null)
  })
})

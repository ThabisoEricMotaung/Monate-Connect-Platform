import { describe, expect, it } from "vitest"
import { ACTIVE_LOCALES, DEFAULT_LOCALE, localeFormatTag, normalizeLocale } from "./config"
import { NAMESPACE_REVIEWS, PUBLIC_DISCOVERY_NAMESPACES } from "./review-metadata"
import { englishMessages, getMessagesForLocale, mergeWithEnglish } from "./messages"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key))
}

describe("i18n Phase 1 coverage", () => {
  it("activates all eleven official South African language locales", () => {
    expect(ACTIVE_LOCALES).toEqual(["en", "af", "nr", "xh", "zu", "nso", "st", "tn", "ss", "ve", "ts"])
  })

  it.each(ACTIVE_LOCALES)("keeps %s message keys in parity with English", (locale) => {
    expect(leafKeys(getMessagesForLocale(locale)).sort()).toEqual(leafKeys(englishMessages).sort())
  })

  it("falls back to English for unsupported or missing locale values", () => {
    expect(normalizeLocale("xh")).toBe("xh")
    expect(normalizeLocale("de")).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE)
  })

  it.each(ACTIVE_LOCALES)("uses a South African formatting tag for %s", (locale) => {
    expect(localeFormatTag(locale)).toMatch(/-ZA$/)
  })

  it("records provenance for every public-discovery locale and namespace", () => {
    expect(NAMESPACE_REVIEWS).toHaveLength(ACTIVE_LOCALES.length * PUBLIC_DISCOVERY_NAMESPACES.length)
    expect(NAMESPACE_REVIEWS.filter((record) => record.locale !== "en").every((record) => record.status === "machine_translated")).toBe(true)
  })

  it("fills a missing localized key from the canonical English messages", () => {
    const messages = mergeWithEnglish({ legacy: { home: "Ekhaya" } })
    expect(messages.legacy.home).toBe("Ekhaya")
    expect(messages.legacy.dashboard).toBe(englishMessages.legacy.dashboard)
  })
})

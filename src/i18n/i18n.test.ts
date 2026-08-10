import { describe, expect, it } from "vitest"
import { ACTIVE_LOCALES, DEFAULT_LOCALE, normalizeLocale } from "./config"
import { englishMessages, getMessagesForLocale, mergeWithEnglish } from "./messages"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key))
}

describe("i18n Phase 1 coverage", () => {
  it("activates only the honestly supported EN/ZU/AF locales", () => {
    expect(ACTIVE_LOCALES).toEqual(["en", "zu", "af"])
  })

  it.each(ACTIVE_LOCALES)("keeps %s message keys in parity with English", (locale) => {
    expect(leafKeys(getMessagesForLocale(locale)).sort()).toEqual(leafKeys(englishMessages).sort())
  })

  it("falls back to English for unsupported or missing locale values", () => {
    expect(normalizeLocale("xh")).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE)
  })

  it("fills a missing localized key from the canonical English messages", () => {
    const messages = mergeWithEnglish({ legacy: { home: "Ekhaya" } })
    expect(messages.legacy.home).toBe("Ekhaya")
    expect(messages.legacy.dashboard).toBe(englishMessages.legacy.dashboard)
  })
})

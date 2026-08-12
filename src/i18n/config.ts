import enMessages from "./messages/en.json"

export const ACTIVE_LOCALES = ["en", "af", "nr", "xh", "zu", "nso", "st", "tn", "ss", "ve", "ts"] as const
export type AppLocale = (typeof ACTIVE_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = "en"
export const LOCALE_COOKIE_NAME = "aiform-locale"

export const ALL_SOUTH_AFRICAN_LANGUAGE_TARGETS = [
  { code: "en", name: "English" },
  { code: "af", name: "Afrikaans" },
  { code: "nr", name: "isiNdebele" },
  { code: "xh", name: "isiXhosa" },
  { code: "zu", name: "isiZulu" },
  { code: "nso", name: "Sepedi" },
  { code: "st", name: "Sesotho" },
  { code: "tn", name: "Setswana" },
  { code: "ss", name: "siSwati" },
  { code: "ve", name: "Tshivenda" },
  { code: "ts", name: "X\u0069tsonga" },
] as const

export const ACTIVE_LANGUAGE_OPTIONS: ReadonlyArray<{ code: AppLocale; name: string }> =
  ALL_SOUTH_AFRICAN_LANGUAGE_TARGETS

export const LOCALE_FORMAT_TAGS: Record<AppLocale, string> = {
  en: "en-ZA", af: "af-ZA", nr: "nr-ZA", xh: "xh-ZA", zu: "zu-ZA", nso: "nso-ZA",
  st: "st-ZA", tn: "tn-ZA", ss: "ss-ZA", ve: "ve-ZA", ts: "ts-ZA",
}

export function localeFormatTag(locale: AppLocale): string {
  return LOCALE_FORMAT_TAGS[locale]
}

export type LegacyTranslationKey = keyof typeof enMessages.legacy

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && ACTIVE_LOCALES.includes(value as AppLocale)
}

export function normalizeLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE
}

import enMessages from "./messages/en.json"

export const ACTIVE_LOCALES = ["en", "zu", "af"] as const
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

export const ACTIVE_LANGUAGE_OPTIONS: ReadonlyArray<{ code: AppLocale; name: string }> = [
  { code: "en", name: "English" },
  { code: "zu", name: "isiZulu" },
  { code: "af", name: "Afrikaans" },
]

export type LegacyTranslationKey = keyof typeof enMessages.legacy

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && ACTIVE_LOCALES.includes(value as AppLocale)
}

export function normalizeLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE
}

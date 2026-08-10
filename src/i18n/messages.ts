import af from "./messages/af.json"
import en from "./messages/en.json"
import zu from "./messages/zu.json"
import type { AppLocale } from "./config"

export type AppMessages = typeof en
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const messagesByLocale: Record<AppLocale, DeepPartial<AppMessages>> = { en, zu, af }

export function mergeWithEnglish(messages: DeepPartial<AppMessages>): AppMessages {
  return {
    ...en,
    ...messages,
    legacy: { ...en.legacy, ...messages.legacy },
    localeSwitcher: { ...en.localeSwitcher, ...messages.localeSwitcher },
  }
}

export function getMessagesForLocale(locale: AppLocale): AppMessages {
  return mergeWithEnglish(messagesByLocale[locale])
}

export const englishMessages = en

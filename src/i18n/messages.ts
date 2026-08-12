import af from "./messages/af.json"
import en from "./messages/en.json"
import nr from "./messages/nr.json"
import nso from "./messages/nso.json"
import ss from "./messages/ss.json"
import st from "./messages/st.json"
import tn from "./messages/tn.json"
import ts from "./messages/ts.json"
import ve from "./messages/ve.json"
import xh from "./messages/xh.json"
import zu from "./messages/zu.json"
import type { AppLocale } from "./config"

export type AppMessages = typeof en
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const messagesByLocale: Record<AppLocale, DeepPartial<AppMessages>> = {
  en, af, nr, xh, zu, nso, st, tn, ss, ve, ts,
}

export function mergeWithEnglish(messages: DeepPartial<AppMessages>): AppMessages {
  return {
    ...en,
    ...messages,
    legacy: { ...en.legacy, ...messages.legacy },
    localeSwitcher: { ...en.localeSwitcher, ...messages.localeSwitcher },
    publicChrome: { ...en.publicChrome, ...messages.publicChrome },
    home: { ...en.home, ...messages.home },
    opportunities: { ...en.opportunities, ...messages.opportunities },
    opportunityDetail: { ...en.opportunityDetail, ...messages.opportunityDetail },
  }
}

export function getMessagesForLocale(locale: AppLocale): AppMessages {
  return mergeWithEnglish(messagesByLocale[locale])
}

export const englishMessages = en

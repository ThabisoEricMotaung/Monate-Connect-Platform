import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, normalizeLocale } from "./config"
import { getMessagesForLocale } from "./messages"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE)
  const messages = getMessagesForLocale(locale)

  return {
    locale,
    messages,
    timeZone: "Africa/Johannesburg",
  }
})

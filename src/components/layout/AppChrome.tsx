"use client"

import { usePathname } from "next/navigation"
import Navbar from "@/components/layout/Navbar"
import UnifiedSupportCenter from "@/components/UnifiedSupportCenter"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { useLocale, useTranslations } from "next-intl"

const chromeFreeRoutes = new Set(["/billing/return", "/billing/cancel"])
const englishAuthoritativePrefixes = ["/privacy", "/terms", "/cookies", "/cookie-policy", "/data-protection", "/guides", "/trust"]

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const t = useTranslations("publicChrome")
  const pathname = usePathname() || ""
  const hideChrome = chromeFreeRoutes.has(pathname)

  return (
    <>
      {!hideChrome ? <Navbar /> : null}
      {!hideChrome ? <LanguageSwitcher /> : null}
      {!hideChrome && locale !== "en" && englishAuthoritativePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ? (
        <div role="note" className="border-b border-[#d7c9b2] bg-[#fff8e7] px-4 py-2 text-center text-xs font-semibold text-[#6f531f]">
          {t("englishAuthoritative")}
        </div>
      ) : null}
      {children}
      {!hideChrome ? <UnifiedSupportCenter /> : null}
    </>
  )
}

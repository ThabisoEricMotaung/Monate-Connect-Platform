"use client"

import { usePathname } from "next/navigation"
import Navbar from "@/components/layout/Navbar"
import UnifiedSupportCenter from "@/components/UnifiedSupportCenter"
import LanguageSwitcher from "@/components/LanguageSwitcher"

const chromeFreeRoutes = new Set(["/billing/return", "/billing/cancel"])

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const hideChrome = chromeFreeRoutes.has(pathname)

  return (
    <>
      {!hideChrome ? <Navbar /> : null}
      {children}
      {!hideChrome ? <LanguageSwitcher /> : null}
      {!hideChrome ? <UnifiedSupportCenter /> : null}
    </>
  )
}

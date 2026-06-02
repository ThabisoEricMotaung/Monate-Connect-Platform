"use client"

import Link from "next/link"
import AppearanceCore from "@/components/theme/AppearanceCore"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { useI18n } from "@/lib/i18n"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function Navbar() {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname() || ""

  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  const handleLogout = async () => {
    if (!supabase) {
      alert("Supabase environment variables are not configured.")
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error(error)
      alert("Logout failed. Please try again.")
      return
    }
    router.push("/auth/login")
  }

  return (
    <header className="masthead sticky top-0 z-50">
      <div className="masthead__dateline">
        <span>Vol. I &middot; No. 1 &middot; Enterprise Edition</span>
        <span>Procurement &amp; Supplier Intelligence Portal</span>
        <span suppressHydrationWarning>
          {typeof window !== "undefined"
            ? new Date().toLocaleDateString("en-ZA", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : ""}
        </span>
      </div>

      <div className="masthead__brand">
        <Link href="/" className="masthead__wordmark">
          Monate Vendor Network
        </Link>
      </div>

      <nav className="masthead__nav" aria-label="Main navigation">
        <div className="masthead__nav-inner">
          <div className="masthead__nav-links">
            <Link
              href="/"
              className={`masthead__nav-link${isActive("/") && !pathname.startsWith("/dashboard") ? " masthead__nav-link--active" : ""}`}
            >
              {t("home")}
            </Link>
            <Link
              href="/dashboard"
              className={`masthead__nav-link${isActive("/dashboard") ? " masthead__nav-link--active" : ""}`}
            >
              {t("dashboard")}
            </Link>
            <Link
              href="/dashboard/rfqs"
              className={`masthead__nav-link${isActive("/dashboard/rfqs") ? " masthead__nav-link--active" : ""}`}
            >
              {t("rfqs")}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="masthead__nav-link"
            >
              {t("logout")}
            </button>
          </div>

          <div className="masthead__nav-actions">
            <LanguageSwitcher />
            <Link href="/auth/login" className="masthead__btn-primary">
              {t("supplierLogin")}
            </Link>
            <Link href="/auth/signup" className="masthead__btn-secondary">
              {t("registerSupplier")}
            </Link>
          </div>
        </div>
      </nav>

      <AppearanceCore />
    </header>
  )
}

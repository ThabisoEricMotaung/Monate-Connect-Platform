"use client"

import Link from "next/link"
import { useI18n } from "@/lib/i18n"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const publicHeaderRoutes = new Set([
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/verify-email",
  "/auth/callback",
  "/opportunities",
  "/suppliers",
  "/trust",
  "/pricing",
  "/demo-pack",
  "/demo-walkthrough",
  "/contact",
  "/help",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/data-protection",
])

export default function Navbar() {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname() || ""

  if (publicHeaderRoutes.has(pathname) || pathname.startsWith("/dashboard")) {
    return null
  }

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
    router.push("/?signedout=1")
  }

  return (
    <header className="masthead sticky top-0 z-50">
      <div className="masthead__brand">
        <Link href="/" className="flex cursor-pointer items-center justify-center gap-3 transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <span className="logo-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-lg font-extrabold text-button shadow-md">
            M
          </span>
          <span className="text-base font-semibold text-heading">
            AiForm Procure
          </span>
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
        </div>
      </nav>
    </header>
  )
}

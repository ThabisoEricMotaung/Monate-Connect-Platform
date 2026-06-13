"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { roleHomeHref } from "@/lib/navigation"
import { supabase } from "@/lib/supabase"

const links = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Trust Centre", href: "/trust" },
  { label: "Pricing", href: "/pricing" },
]

function isActiveLink(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function PublicHeader() {
  const pathname = usePathname() || "/"
  const [dashboardHref, setDashboardHref] = useState<string | null>(null)
  const [signedOutNotice, setSignedOutNotice] = useState(false)
  const homeHref = dashboardHref ?? "/"

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        if (!cancelled) setDashboardHref(null)
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()

      if (!cancelled) setDashboardHref(roleHomeHref((data as { role?: string | null } | null)?.role))
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    setSignedOutNotice(pathname === "/" && params.get("signedout") === "1")
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    setDashboardHref(null)
    window.location.assign("/?signedout=1")
  }

  return (
    <header className="border-b border-panel bg-card text-primary shadow-panel">
      {signedOutNotice && (
        <div className="border-b border-panel bg-panel px-6 py-2 text-center text-xs font-semibold text-secondary">
          You&apos;ve been signed out.
        </div>
      )}
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href={homeHref}
            aria-label={dashboardHref ? "Go to your dashboard" : "Go to homepage"}
            className="group cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.24em] text-accent transition group-hover:text-accent-strong">
              Procurement Suite
            </p>
            <p className="mt-1 font-display text-3xl font-bold leading-none text-heading transition group-hover:text-accent md:text-4xl">
              AiForm Procure
            </p>
          </Link>

          <nav className="flex flex-wrap gap-2" aria-label="Public navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  isActiveLink(pathname, link.href)
                    ? "border-accent bg-accent text-button"
                    : "border-panel bg-panel text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap gap-2">
            {dashboardHref ? (
              <>
                <Link href={dashboardHref} className="masthead__btn-primary">
                  Go to dashboard
                </Link>
                <button type="button" onClick={handleLogout} className="masthead__btn-secondary">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="masthead__btn-secondary">
                  Log in
                </Link>
                <Link href="/auth/signup" className="masthead__btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

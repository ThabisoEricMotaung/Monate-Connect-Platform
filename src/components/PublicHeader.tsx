"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
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

function roleHome(role?: string | null): string {
  const normalizedRole = role?.trim().toLowerCase()
  if (normalizedRole === "admin") return "/dashboard/admin"
  if (normalizedRole === "buyer") return "/dashboard/buyer"
  return "/dashboard"
}

export default function PublicHeader() {
  const pathname = usePathname() || "/"
  const [dashboardHref, setDashboardHref] = useState<string | null>(null)

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

      if (!cancelled) setDashboardHref(roleHome((data as { role?: string | null } | null)?.role))
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setDashboardHref(null)
    window.location.assign("/auth/login?signedout=1")
  }

  return (
    <header className="border-b border-panel bg-card text-primary shadow-panel">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="group">
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.24em] text-accent">
              Procurement Edition
            </p>
            <p className="mt-1 font-serif text-3xl font-bold leading-none text-heading md:text-4xl">
              Monate Connect
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
                    : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent"
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

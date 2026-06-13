"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import AccountMenu from "@/components/AccountMenu"
import NotificationBell from "@/components/NotificationBell"
import { useRequireRole } from "@/hooks/useRequireRole"
import { supabase } from "@/lib/supabase"

type BuyerProfile = {
  id: string
  business_name: string | null
  email: string | null
  full_name?: string | null
  preferred_name?: string | null
  role: string | null
}

type NavItem = {
  name: string
  href: string
  icon: string
  badge?: number
}

type NavGroup = {
  label?: string
  items: NavItem[]
  divider?: boolean
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard/buyer") return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item.href)
  return (
    <Link
      href={item.href}
      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-accent bg-surface text-primary shadow-sm"
          : "border-transparent text-secondary hover:bg-surface hover:text-primary"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-panel bg-panel text-[0.72rem] text-accent">
          {item.icon}
        </span>
        <span className="truncate">{item.name}</span>
      </span>
      {item.badge != null && item.badge > 0 && (
        <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full border border-sky-500/25 bg-sky-500/10 px-1.5 py-0.5 text-[0.62rem] font-bold text-sky-200">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  )
}

const BASE_NAVIGATION: NavGroup[] = [
  {
    items: [{ name: "Home dashboard", href: "/dashboard/buyer", icon: "H" }],
  },
  {
    label: "Procurement",
    items: [
      { name: "Create RFQ", href: "/dashboard/buyer/rfqs/new", icon: "+" },
      { name: "My RFQs", href: "/dashboard/buyer/rfqs", icon: "R" },
      { name: "Quotes received", href: "/dashboard/buyer/quotes", icon: "Q" },
      { name: "Purchase orders", href: "/dashboard/buyer/purchase-orders", icon: "P" },
      { name: "Contracts", href: "/dashboard/buyer/contracts", icon: "C" },
      { name: "Invoices", href: "/dashboard/buyer/invoices", icon: "I" },
    ],
  },
  {
    label: "Suppliers",
    divider: true,
    items: [{ name: "Supplier directory", href: "/suppliers", icon: "S" }],
  },
]

export default function BuyerDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname() || ""
  const { loading } = useRequireRole(["buyer", "admin"])
  const [profile, setProfile] = useState<BuyerProfile | null>(null)
  const [activeRfqs, setActiveRfqs] = useState(0)
  const [unreviewedQuotes, setUnreviewedQuotes] = useState(0)

  useEffect(() => {
    if (loading || !supabase) return
    let cancelled = false

    async function load() {
      if (!supabase) return
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const [profileResult, rfqResult, quoteResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, business_name, email, full_name, preferred_name, role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("rfqs").select("id, status"),
        supabase.from("quotes").select("id, status"),
      ])

      if (cancelled) return

      setProfile((profileResult.data as BuyerProfile | null) ?? null)

      const rfqs = (rfqResult.data ?? []) as { status: string | null }[]
      setActiveRfqs(
        rfqs.filter((r) =>
          ["open", "evaluation"].includes(String(r.status ?? "").toLowerCase()),
        ).length,
      )

      const quotes = (quoteResult.data ?? []) as { status: string | null }[]
      setUnreviewedQuotes(
        quotes.filter((q) =>
          ["", "pending", "under review"].includes(
            String(q.status ?? "").toLowerCase(),
          ),
        ).length,
      )
    }

    load()
    return () => {
      cancelled = true
    }
  }, [loading])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page text-primary">
        <div className="rounded-md border border-panel bg-card p-6 text-sm text-secondary shadow-panel">
          Loading your workspace&hellip;
        </div>
      </main>
    )
  }

  const navWithBadges: NavGroup[] = BASE_NAVIGATION.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.href === "/dashboard/buyer/rfqs") return { ...item, badge: activeRfqs }
      if (item.href === "/dashboard/buyer/quotes") return { ...item, badge: unreviewedQuotes }
      return item
    }),
  }))

  return (
    <main className="flex min-h-screen bg-page text-primary">
      <aside className="dashboard-sidebar print:hidden flex w-full max-w-[200px] shrink-0 flex-col border-r border-panel bg-panel p-4">
        <Link
          href="/dashboard/buyer/rfqs/new"
          className="mb-5 inline-flex w-full justify-center rounded-md border border-accent bg-accent px-4 py-3 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
        >
          New RFQ
        </Link>

        <nav className="space-y-5 flex-1">
          {navWithBadges.map((group) => (
            <div
              key={group.label ?? "main"}
              className={group.divider ? "border-t border-panel pt-5" : ""}
            >
              {group.label && (
                <p className="mb-2 px-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-secondary">
                  {group.label}
                </p>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex-1 min-w-0 overflow-x-hidden p-6 md:p-8">
        <div className="dashboard-chrome print:hidden mb-6 flex items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
          <Link
            href="/dashboard/buyer"
            className="flex min-w-0 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="logo-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-button text-lg font-extrabold shadow-md">
              M
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                Buyer workspace
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-heading">
                AiForm Procure
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <AccountMenu profile={profile} />
          </div>
        </div>

        {children}
      </section>
    </main>
  )
}

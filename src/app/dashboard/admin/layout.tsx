"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useMemo, useState } from "react"
import AccountMenu from "@/components/AccountMenu"
import BrandMark from "@/components/BrandMark"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import NotificationBell from "@/components/NotificationBell"
import { getCurrentProfile } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type BuyerProfile = {
  id: string
  business_name: string | null
  email: string | null
  full_name?: string | null
  preferred_name?: string | null
  role: string | null
}

type BadgeTone = "info" | "danger"

type NavItem = {
  name: string
  href: string
  icon: string
  badge?: number
  badgeTone?: BadgeTone
}

type NavGroup = {
  label?: string
  items: NavItem[]
  divider?: boolean
}

type ShellMetrics = {
  activeRfqs: number
  unreviewedQuotes: number
  shortlistedSuppliers: number
  unreadMessages: number
}

const emptyMetrics: ShellMetrics = {
  activeRfqs: 0,
  unreviewedQuotes: 0,
  shortlistedSuppliers: 0,
  unreadMessages: 0,
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard/admin" && pathname.startsWith(href))
}

function badgeClass(tone: BadgeTone): string {
  return tone === "danger"
    ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
    : "border-sky-500/25 bg-sky-500/10 text-sky-200"
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
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</span>
      </span>
      {item.badge != null && item.badge > 0 && (
        <span
          className={`inline-flex min-w-6 shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[0.62rem] font-bold ${badgeClass(
            item.badgeTone ?? "info",
          )}`}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  )
}

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname() || ""
  const [profile, setProfile] = useState<BuyerProfile | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [metrics, setMetrics] = useState<ShellMetrics>(emptyMetrics)

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      const currentProfile = await getCurrentProfile()

      const normalizedRole = currentProfile?.role?.trim().toLowerCase()
      if (normalizedRole !== "admin") {
        router.replace(normalizedRole === "buyer" ? "/dashboard/buyer" : "/dashboard")
        return
      }

      if (!supabase) {
        if (!cancelled) {
          setAuthorized(true)
          setCheckingAccess(false)
        }
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, business_name, email, full_name, preferred_name, role")
        .eq("id", currentProfile?.id)
        .maybeSingle()

      if (!cancelled) {
        setProfile((data as BuyerProfile | null) ?? {
          id: currentProfile?.id ?? "",
          business_name: null,
          email: null,
          role: currentProfile?.role ?? null,
        })
        setAuthorized(true)
        setCheckingAccess(false)
      }
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    let cancelled = false

    async function loadMetrics() {
      if (!supabase || !authorized || !profile?.id) return

      const [rfqResult, quoteResult, savedResult, messageResult] = await Promise.all([
        supabase.from("rfqs").select("id, status"),
        supabase.from("quotes").select("id, status"),
        supabase.from("saved_suppliers").select("id").eq("user_id", profile.id),
        supabase.from("messages").select("id, is_read").eq("receiver_id", profile.id),
      ])

      if (cancelled) return

      const rfqs = (rfqResult.data ?? []) as { status: string | null }[]
      const quotes = (quoteResult.data ?? []) as { status: string | null }[]
      const messages = (messageResult.data ?? []) as { is_read: boolean | null }[]

      setMetrics({
        activeRfqs: rfqs.filter((rfq) =>
          ["open", "evaluation"].includes(String(rfq.status ?? "").toLowerCase()),
        ).length,
        unreviewedQuotes: quotes.filter((quote) =>
          ["", "pending", "under review"].includes(String(quote.status ?? "").toLowerCase()),
        ).length,
        shortlistedSuppliers: savedResult.data?.length ?? 0,
        unreadMessages: messages.filter((message) => !message.is_read).length,
      })
    }

    loadMetrics()

    return () => {
      cancelled = true
    }
  }, [authorized, profile?.id])

  const navigation = useMemo<NavGroup[]>(
    () => [
      {
        items: [
          {
            name: "Home dashboard",
            href: "/dashboard/admin",
            icon: "H",
          },
        ],
      },
      ...(profile?.role === "admin"
        ? [
            {
              label: "ADMIN",
              divider: true,
              items: [
                {
                  name: "Verifications",
                  href: "/dashboard/admin/verifications",
                  icon: "V",
                },
              ],
            },
          ]
        : []),
      {
        label: "Procurement",
        items: [
          {
            name: "RFQs",
            href: "/dashboard/admin/rfqs",
            icon: "R",
            badge: metrics.activeRfqs,
            badgeTone: "info",
          },
          {
            name: "Quotes received",
            href: "/dashboard/admin/quotes",
            icon: "Q",
            badge: metrics.unreviewedQuotes,
            badgeTone: "danger",
          },
          {
            name: "Purchase orders",
            href: "/dashboard/admin/purchase-orders",
            icon: "P",
          },
        ],
      },
      {
        label: "Suppliers",
        divider: true,
        items: [
          {
            name: "Supplier directory",
            href: "/suppliers",
            icon: "S",
          },
        ],
      },
      {
        label: "Reports",
        divider: true,
        items: [
          {
            name: "Spend analysis",
            href: "/dashboard/admin/reports/spend",
            icon: "A",
          },
          {
            name: "Compliance report",
            href: "/dashboard/admin/reports/compliance",
            icon: "K",
          },
          {
            name: "BBBEE scorecard",
            href: "/dashboard/admin/reports/bbbee",
            icon: "B",
          },
        ],
      },
    ],
    [metrics, profile?.role],
  )

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page text-primary">
        <div className="rounded-md border border-panel bg-card p-6 text-sm text-secondary shadow-panel">
          Checking procurement workspace access...
        </div>
      </main>
    )
  }

  if (!authorized) return null

  return (
    <main className="flex min-h-screen bg-page text-primary">
      <aside className="dashboard-sidebar print:hidden flex w-56 min-w-[14rem] shrink-0 flex-col border-r border-panel bg-panel p-4">
        <Link
          href="/dashboard/admin/rfqs/new"
          className="mb-5 inline-flex w-full justify-center rounded-md border border-accent bg-accent px-4 py-3 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
        >
          New RFQ
        </Link>

        <nav className="space-y-5">
          {navigation.map((group) => (
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

        <div className="mt-auto border-t border-panel pt-5">
          <div className="space-y-1.5">
            <NavLink
              item={{
                name: "Settings",
                href: "/dashboard/admin/settings",
                icon: "G",
              }}
              pathname={pathname}
            />
          </div>
        </div>
      </aside>

      <section className="flex-1 min-w-0 overflow-x-hidden p-6 md:p-8">
        <div className="dashboard-chrome print:hidden mb-6 flex items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
          <Link
            href="/dashboard/admin"
            className="flex min-w-0 cursor-pointer items-center gap-3 rounded-sm transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <BrandMark className="h-11 w-11" imageClassName="h-7 w-auto" />
            <span className="sr-only">AiForm Procure home</span>
            <div className="min-w-0">
              <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                Procurement workspace
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

        <div className="print:hidden mb-6">
          <Breadcrumbs role="admin" />
        </div>

        {children}
      </section>
    </main>
  )
}

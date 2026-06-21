"use client"

import {
  IconAward,
  IconBuildingStore,
  IconChartAreaLine,
  IconChartBar,
  IconChartPie,
  IconClipboardCheck,
  IconFileText,
  IconHome,
  IconHelpCircle,
  IconMap2,
  IconMenu2,
  IconMessageCircle,
  IconSettings,
  IconShieldCheck,
  IconShoppingCart,
  IconStars,
  IconTargetArrow,
  IconX,
  type TablerIcon,
} from "@tabler/icons-react"
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
  icon: TablerIcon
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
    ? "border-rose-500/20 bg-rose-50 text-rose-700"
    : "border-sky-500/20 bg-sky-50 text-sky-700"
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}) {
  const active = isActivePath(pathname, item.href)
  const IconComponent = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-[#f0f7f3] text-[#1a3a2a]"
          : "bg-white text-[#555555] hover:bg-[#f8f8f6] hover:text-[#1a3a2a]"
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <IconComponent
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 ${active ? "text-[#1a3a2a]" : "text-[#c8a060]"}`}
          stroke={1.8}
        />
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-tight">{item.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {item.badge != null && item.badge > 0 && (
          <span
            className={`inline-flex min-w-7 items-center justify-center rounded-full border px-2 py-0.5 text-[0.62rem] font-bold tabular-nums ${badgeClass(
              item.badgeTone ?? "info",
            )}`}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
        {active && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#c8a060]" />}
      </span>
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function closeSidebar() {
    setSidebarOpen(false)
  }

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
        .select("id, business_name, email, full_name, preferred_name, role, avatar_url")
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
            icon: IconHome,
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
                  icon: IconShieldCheck,
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
            icon: IconFileText,
            badge: metrics.activeRfqs,
            badgeTone: "info",
          },
          {
            name: "Quotes received",
            href: "/dashboard/admin/quotes",
            icon: IconMessageCircle,
            badge: metrics.unreviewedQuotes,
            badgeTone: "danger",
          },
          {
            name: "Purchase orders",
            href: "/dashboard/admin/purchase-orders",
            icon: IconShoppingCart,
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
            icon: IconBuildingStore,
          },
        ],
      },
      {
        label: "Reports",
        divider: true,
        items: [
          {
            name: "Spend analysis",
            href: "/dashboard/spend-analysis",
            icon: IconChartBar,
          },
          {
            name: "Compliance report",
            href: "/dashboard/compliance-report",
            icon: IconClipboardCheck,
          },
          {
            name: "BBBEE scorecard",
            href: "/dashboard/bbbee-scorecard",
            icon: IconAward,
          },
        ],
      },
      {
        label: "Intelligence",
        divider: true,
        items: [
          { name: "Executive Dashboard", href: "/dashboard/intelligence/executive", icon: IconChartPie },
          { name: "Opportunity Matching", href: "/dashboard/intelligence/matches", icon: IconTargetArrow },
          { name: "Supplier Intelligence", href: "/dashboard/intelligence/suppliers", icon: IconStars },
          { name: "Supplier Performance", href: "/dashboard/intelligence/supplier-performance", icon: IconChartAreaLine },
          { name: "Procurement Analytics", href: "/dashboard/intelligence/procurement", icon: IconChartBar },
          { name: "Regional Insights", href: "/dashboard/intelligence/regions", icon: IconMap2 },
        ],
      },
    ],
    [metrics, profile?.role],
  )

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f8f6] text-[#1a3a2a]">
        <div className="rounded-md border border-[#ebebeb] bg-white p-6 text-sm text-[#555555] shadow-sm">
          Checking procurement workspace access...
        </div>
      </main>
    )
  }

  if (!authorized) return null

  return (
    <main className="flex min-h-screen bg-[#f8f8f6] text-[#1a3a2a]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeSidebar}
          aria-label="Close navigation backdrop"
        />
      )}

      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(20rem,100vw)] -translate-x-full flex-col overflow-y-auto border-r-[0.5px] border-[#ebebeb] bg-white p-4 transition-transform duration-200 print:hidden md:sticky md:top-0 md:h-screen md:w-56 md:min-w-[14rem] md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : ""
        }`}
      >
        <button
          type="button"
          onClick={closeSidebar}
          className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#555555] transition hover:text-[#1a3a2a] md:hidden"
          aria-label="Close navigation menu"
        >
          <IconX aria-hidden="true" className="h-5 w-5" stroke={1.8} />
        </button>

        <Link
          href="/dashboard/admin/rfqs/new"
          onClick={closeSidebar}
          className="mb-5 inline-flex w-full justify-center rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#244f39]"
        >
          New RFQ
        </Link>

        <nav className="space-y-5">
          {navigation.map((group) => (
            <div
              key={group.label ?? "main"}
              className={group.divider ? "border-t border-[#ebebeb] pt-5" : ""}
            >
              {group.label && (
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa]">
                  {group.label}
                </p>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavigate={closeSidebar} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-[#ebebeb] pt-5">
          <div className="space-y-1.5">
            <NavLink
              item={{
                name: "Help",
                href: "/dashboard/help",
                icon: IconHelpCircle,
              }}
              pathname={pathname}
              onNavigate={closeSidebar}
            />
            <NavLink
              item={{
                name: "Settings",
                href: "/dashboard/admin/settings",
                icon: IconSettings,
              }}
              pathname={pathname}
              onNavigate={closeSidebar}
            />
          </div>
        </div>
      </aside>

      <section className="w-full min-w-0 flex-1 overflow-x-hidden px-4 py-5 pb-24 md:p-8 md:pb-24">
        <div className="dashboard-chrome print:hidden -mx-4 -mt-5 mb-6 flex items-center justify-between gap-4 border-b-[0.5px] border-[#ebebeb] bg-white px-5 py-4 md:-mx-8 md:-mt-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#555555] transition hover:text-[#1a3a2a] md:hidden"
            aria-label="Open navigation menu"
          >
            <IconMenu2 aria-hidden="true" className="h-5 w-5" stroke={1.8} />
          </button>
          <Link
            href="/dashboard/admin"
            className="flex min-w-0 cursor-pointer items-center gap-3 rounded-sm transition hover:text-[#1a3a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8a060]"
          >
            <BrandMark className="h-11 w-11" imageClassName="h-7 w-auto" />
            <span className="sr-only">AiForm Procure home</span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa]">
                Procurement workspace
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#1a3a2a]">
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

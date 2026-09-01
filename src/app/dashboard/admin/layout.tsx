"use client"

import {
  IconHelpCircle,
  IconMenu2,
  IconSettings,
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
import PromptPills from "@/components/admin/PromptPills"
import { usePageTracking } from "@/hooks/useSessionTracking"
import { getCurrentProfile } from "@/lib/auth"
import { getAdminNavGroups } from "@/lib/dashboardNavigation"
import { getInboxUnreadCounts, subscribeToInboxActivity } from "@/lib/inboxCounts"
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
  iconColorClass?: string
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

// Supabase/PostgREST caps unpaginated responses (1000 rows by default on
// this project). rfqs now routinely exceeds that once the eTenders sync
// has run a few times, so a plain .select() would silently undercount
// these sidebar badges. This pages through with .range() until a page
// comes back short.
const PAGE_SIZE = 1000

async function readAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)

    if (error) {
      console.warn(error.message)
      break
    }

    const rows = (data ?? []) as T[]
    allRows.push(...rows)

    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
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
      className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ease-out ${
        active
          ? "border border-[#c8a060]/30 bg-gradient-to-r from-[#f5f9f7] to-[#eef4f2] text-[#1a3a2a] shadow-sm"
          : "border border-transparent bg-white text-[#555555] hover:border-[#e0e0db] hover:bg-[#fafaf8] hover:text-[#1a3a2a] hover:shadow-sm"
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <IconComponent
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 transition-all duration-200 ${
            active
              ? "text-[#1a3a2a]"
              : `${item.iconColorClass ?? "text-[#c8a060]"} group-hover:text-[#1a3a2a] group-hover:scale-110`
          }`}
          stroke={1.8}
        />
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-tight transition-colors duration-200">{item.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {item.badge != null && item.badge > 0 && (
          <span
            className={`inline-flex min-w-7 items-center justify-center rounded-full border px-2 py-0.5 text-[0.62rem] font-bold tabular-nums transition-all duration-200 ${badgeClass(
              item.badgeTone ?? "info",
            )}`}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
        {active && (
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[#c8a060] shadow-md transition-all duration-300 animate-pulse"
          />
        )}
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
  usePageTracking()
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
    if (!supabase || !authorized || !profile?.id) return
    let cancelled = false

    async function loadMetrics() {
      if (!supabase || !authorized || !profile?.id) return
      const client = supabase

      const [rfqs, quotes, savedResult, inboxCounts] = await Promise.all([
        readAllRows<{ status: string | null }>((from, to) =>
          client.from("rfqs").select("id, status").eq("is_demo", false).range(from, to),
        ),
        readAllRows<{ status: string | null }>((from, to) =>
          client.from("quotes").select("id, status").eq("is_demo", false).range(from, to),
        ),
        client.from("saved_suppliers").select("id").eq("user_id", profile.id),
        getInboxUnreadCounts(),
      ])

      if (cancelled) return
      setMetrics({
        activeRfqs: rfqs.filter((rfq) =>
          ["open", "evaluation"].includes(String(rfq.status ?? "").toLowerCase()),
        ).length,
        unreviewedQuotes: quotes.filter((quote) =>
          ["", "pending", "under review"].includes(String(quote.status ?? "").toLowerCase()),
        ).length,
        shortlistedSuppliers: savedResult.data?.length ?? 0,
        unreadMessages: inboxCounts.unreadMessages,
      })
    }

    async function refreshUnreadMessages() {
      const inboxCounts = await getInboxUnreadCounts()
      if (!cancelled) {
        setMetrics((current) => ({ ...current, unreadMessages: inboxCounts.unreadMessages }))
      }
    }

    loadMetrics()
    const intervalId = window.setInterval(refreshUnreadMessages, 30_000)
    const unsubscribe = subscribeToInboxActivity(refreshUnreadMessages)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      unsubscribe()
    }
  }, [authorized, profile?.id])

  // Structure (labels/items/hrefs/icons) comes from the single shared source
  // in src/lib/dashboardNavigation.ts, also used by the mirror of this sidebar
  // shown on shared routes like /dashboard/messages. Only badge *counts* are
  // added here, since those depend on this layout's own live queries.
  const navigation = useMemo<NavGroup[]>(() => {
    const baseGroups = getAdminNavGroups(profile?.role === "admin")

    return baseGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.href === "/dashboard/admin/rfqs") {
          return { ...item, badge: metrics.activeRfqs, badgeTone: "info" as const }
        }
        if (item.href === "/dashboard/admin/quotes") {
          return { ...item, badge: metrics.unreviewedQuotes, badgeTone: "danger" as const }
        }
        if (item.href === "/dashboard/messages") {
          return { ...item, badge: metrics.unreadMessages, badgeTone: "danger" as const }
        }
        return item
      }),
    }))
  }, [metrics, profile?.role])

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
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(20rem,100vw)] -translate-x-full flex-col overflow-y-auto border-r border-[#e8e8e6] bg-gradient-to-b from-white via-[#fafaf8] to-white p-4 shadow-sm transition-all duration-300 ease-out print:hidden md:sticky md:top-0 md:h-screen md:w-56 md:min-w-[14rem] md:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-lg" : ""
        }`}
      >
        <div className="mb-5 flex items-center justify-between md:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#999]">Navigation</p>
          <button
            type="button"
            onClick={closeSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e0e0db] bg-white text-[#555555] transition hover:bg-[#f5f5f3] hover:text-[#1a3a2a]"
            aria-label="Close navigation menu"
          >
            <IconX aria-hidden="true" className="h-4 w-4" stroke={2} />
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <Link
            href="/dashboard/admin/rfqs/new"
            onClick={closeSidebar}
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#1a3a2a]/30 bg-gradient-to-br from-[#1a3a2a] to-[#244f39] px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-300 ease-out hover:shadow-lg hover:from-[#244f39] hover:to-[#2d5f47] hover:-translate-y-1 active:scale-95"
          >
            <span className="text-base leading-none transition-all duration-300 group-hover:scale-125">+</span>
            <span className="transition-all duration-300">Create RFQ</span>
          </Link>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999]">
            Quick action
          </p>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto">
          {navigation.map((group, groupIndex) => (
            <div
              key={group.label ?? `group-${groupIndex}`}
              className={group.divider ? "border-t border-[#e0e0db] pt-4 mt-3" : ""}
            >
              {group.label && (
                <div className="mb-3 flex items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-[#d4af6a]/40 to-transparent"></div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#aaa] whitespace-nowrap">
                    {group.label}
                  </p>
                  <div className="h-px flex-1 bg-gradient-to-l from-[#d4af6a]/40 to-transparent"></div>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} onNavigate={closeSidebar} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4 border-t border-[#e0e0db] pt-4">
          <div className="space-y-1">
            <NavLink
              item={{
                name: "RFQ Action Assistant",
                href: "/dashboard/help",
                icon: IconHelpCircle,
                iconColorClass: "text-[#666]",
              }}
              pathname={pathname}
              onNavigate={closeSidebar}
            />
            <NavLink
              item={{
                name: "Workspace settings",
                href: "/dashboard/admin/settings",
                icon: IconSettings,
                iconColorClass: "text-[#666]",
              }}
              pathname={pathname}
              onNavigate={closeSidebar}
            />
          </div>

          {/* Workspace status badge */}
          <div className="rounded-lg border border-[#e0e0db] bg-white/60 backdrop-blur-sm px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#999] mb-2">
              Workspace
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-xs font-semibold text-[#1a3a2a]">Connected</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="w-full min-w-0 flex-1 overflow-x-hidden px-4 py-5 pb-24 md:p-8 md:pb-24">
        <div className="dashboard-chrome print:hidden -mx-4 -mt-5 mb-6 flex flex-col gap-4 border-b border-[#e8e8e6] bg-gradient-to-r from-white to-[#f9f8f7] px-5 py-5 shadow-sm transition-all duration-300 ease-out md:-mx-8 md:-mt-8 md:gap-6 md:px-8 md:py-6">
          {/* Top row: Menu toggle + Brand + Notifications + Account */}
          <div className="flex items-center justify-between gap-4">
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
              className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8a060]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[#d4af6a]/20 bg-gradient-to-br from-[#f5f1eb] to-[#eae6e0]">
                <BrandMark className="h-12 w-12" imageClassName="h-6 w-auto" />
              </div>
              <span className="sr-only">AiForm Procure home</span>
              <div className="min-w-0 hidden sm:block">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999]">
                  Procurement workspace
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-[#1a3a2a]">
                  AiForm Procure
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 md:gap-3">
              <NotificationBell />
              <AccountMenu profile={profile} />
            </div>
          </div>

          {/* Profile status row (shown on md and up) */}
          <div className="hidden items-center justify-between gap-4 rounded-md border border-[#e0e0db] bg-white/70 px-4 py-3 md:flex">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a3a2a]/10 text-xs font-bold text-[#1a3a2a]">
                {profile?.business_name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1a3a2a]">
                  {profile?.business_name || profile?.email || "Workspace"}
                </p>
                <p className="truncate text-xs text-[#999]">
                  {profile?.email || "Admin workspace"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 pl-4">
              <div className="flex items-center gap-2 rounded-full bg-[#1a3a2a]/5 px-3 py-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
                <span className="text-xs font-semibold text-[#1a3a2a]">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="print:hidden mb-6">
          <Breadcrumbs role="admin" />
        </div>

        <div className="print:hidden mb-8">
          <PromptPills />
        </div>

        {children}
      </section>
    </main>
  )
}

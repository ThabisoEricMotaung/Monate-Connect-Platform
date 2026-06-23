"use client"

import {
  IconAward,
  IconBuildingStore,
  IconChartBar,
  IconClipboardCheck,
  IconFileText,
  IconHome,
  IconHelpCircle,
  IconMenu2,
  IconMessageCircle,
  IconSettings,
  IconShoppingCart,
  IconX,
  type TablerIcon,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useState } from "react"
import AccountMenu from "@/components/AccountMenu"
import BrandMark from "@/components/BrandMark"
import NotificationBell from "@/components/NotificationBell"
import ProcurementWire from "@/components/ProcurementWire"

type NavItem = { name: string; href: string; icon: TablerIcon }
type NavGroup = { label?: string; items: NavItem[]; divider?: boolean }

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard/admin" && pathname.startsWith(href))
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
        active ? "bg-[#f0f7f3] text-[#1a3a2a]" : "bg-white text-[#555555] hover:bg-[#f8f8f6] hover:text-[#1a3a2a]"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? "text-[#1a3a2a]" : "text-[#c8a060]"}`} stroke={1.8} />
      <span className="flex-1 leading-tight">{item.name}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-[#c8a060]" />}
    </Link>
  )
}

const NAV: NavGroup[] = [
  { items: [{ name: "Home dashboard", href: "/dashboard/admin", icon: IconHome }] },
  {
    label: "Procurement", items: [
      { name: "RFQs", href: "/dashboard/admin/rfqs", icon: IconFileText },
      { name: "Quotes received", href: "/dashboard/admin/quotes", icon: IconMessageCircle },
      { name: "Purchase orders", href: "/dashboard/admin/purchase-orders", icon: IconShoppingCart },
    ]
  },
  { label: "Suppliers", divider: true, items: [{ name: "Supplier directory", href: "/suppliers", icon: IconBuildingStore }] },
  {
    label: "Reports", divider: true, items: [
      { name: "Spend analysis", href: "/dashboard/spend-analysis", icon: IconChartBar },
      { name: "Compliance report", href: "/dashboard/compliance-report", icon: IconClipboardCheck },
      { name: "BBBEE scorecard", href: "/dashboard/bbbee-scorecard", icon: IconAward },
    ]
  },
  {
    label: "Intelligence", divider: true, items: [
      { name: "Executive Dashboard", href: "/dashboard/intelligence/executive", icon: IconChartBar },
      { name: "Opportunity Matching", href: "/dashboard/intelligence/matches", icon: IconChartBar },
      { name: "Supplier Intelligence", href: "/dashboard/intelligence/suppliers", icon: IconBuildingStore },
      { name: "Supplier Performance", href: "/dashboard/intelligence/supplier-performance", icon: IconAward },
      { name: "Procurement Analytics", href: "/dashboard/intelligence/procurement", icon: IconClipboardCheck },
      { name: "Regional Insights", href: "/dashboard/intelligence/regions", icon: IconChartBar },
    ]
  },
]

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ""
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <main className="flex min-h-screen bg-[#f8f8f6] text-[#1a3a2a]">
      {sidebarOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
      )}
      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(20rem,100vw)] -translate-x-full flex-col overflow-y-auto border-r-[0.5px] border-[#ebebeb] bg-white p-4 transition-transform duration-200 print:hidden md:sticky md:top-0 md:h-screen md:w-56 md:min-w-[14rem] md:translate-x-0 ${sidebarOpen ? "translate-x-0" : ""}`}>
        <button type="button" onClick={() => setSidebarOpen(false)} className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#555555] md:hidden" aria-label="Close menu">
          <IconX className="h-5 w-5" stroke={1.8} />
        </button>
        <Link href="/dashboard/admin/rfqs/new" onClick={() => setSidebarOpen(false)} className="mb-5 inline-flex w-full justify-center rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#244f39]">
          New RFQ
        </Link>
        <nav className="flex-1 space-y-5">
          {NAV.map((group) => (
            <div key={group.label ?? "main"} className={group.divider ? "border-t border-[#ebebeb] pt-5" : ""}>
              {group.label && <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa]">{group.label}</p>}
              <div className="space-y-1.5">
                {group.items.map((item) => <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setSidebarOpen(false)} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-[#ebebeb] pt-5 space-y-1.5">
          <NavLink item={{ name: "Help", href: "/dashboard/help", icon: IconHelpCircle }} pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
          <NavLink item={{ name: "Settings", href: "/dashboard/admin/settings", icon: IconSettings }} pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
        </div>
      </aside>
      <section className="w-full min-w-0 flex-1 overflow-x-hidden px-4 py-5 pb-24 md:p-8 md:pb-24">
        <div className="dashboard-chrome print:hidden -mx-4 -mt-5 mb-6 flex items-center justify-between gap-4 border-b-[0.5px] border-[#ebebeb] bg-white px-5 py-4 md:-mx-8 md:-mt-8">
          <button type="button" onClick={() => setSidebarOpen(true)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#555555] md:hidden" aria-label="Open menu">
            <IconMenu2 className="h-5 w-5" stroke={1.8} />
          </button>
          <Link href="/dashboard/admin" className="flex min-w-0 items-center gap-3">
            <BrandMark className="h-11 w-11" imageClassName="h-7 w-auto" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa]">Procurement workspace</p>
              <p className="mt-1 truncate text-sm font-semibold text-[#1a3a2a]">AiForm Procure</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <AccountMenu profile={null} />
          </div>
        </div>
        {children}
      </section>
      <ProcurementWire scope="dashboard" />
    </main>
  )
}

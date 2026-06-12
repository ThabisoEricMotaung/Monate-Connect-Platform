"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import AccountMenu, { type AccountMenuProfile } from "@/components/AccountMenu"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import { useI18n, type TranslationKey } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"

type SupplierNavigationName =
  | TranslationKey
  | "Banking details"
  | "Business profile"
  | "Contracts"
  | "Invoices"
  | "Messages"
  | "Payments"
  | "Settings"
  | "Verification"

const navigation: {
  name: SupplierNavigationName
  href: string
  section: "Top" | "Work" | "Profile" | "Discover" | "Pinned"
}[] = [
  {
    name: "dashboard",
    href: "/dashboard",
    section: "Top",
  },
  {
    name: "rfqs",
    href: "/dashboard/rfqs",
    section: "Work",
  },
  {
    name: "quotes",
    href: "/dashboard/quotes",
    section: "Work",
  },
  {
    name: "purchaseOrders",
    href: "/dashboard/purchase-orders",
    section: "Work",
  },
  {
    name: "Contracts",
    href: "/dashboard/contracts",
    section: "Work",
  },
  {
    name: "Invoices",
    href: "/dashboard/invoices",
    section: "Work",
  },
  {
    name: "Payments",
    href: "/dashboard/payments",
    section: "Work",
  },
  {
    name: "Business profile",
    href: "/dashboard/profile",
    section: "Profile",
  },
  {
    name: "Verification",
    href: "/dashboard/profile?tab=verification",
    section: "Profile",
  },
  {
    name: "Banking details",
    href: "/dashboard/profile?tab=banking",
    section: "Profile",
  },
  {
    name: "supplierDirectory",
    href: "/dashboard/suppliers",
    section: "Discover",
  },
  {
    name: "savedRFQs",
    href: "/dashboard/saved-rfqs",
    section: "Discover",
  },
  {
    name: "Messages",
    href: "/dashboard/messages",
    section: "Pinned",
  },
  {
    name: "Settings",
    href: "/dashboard/profile",
    section: "Pinned",
  },
]

const supplierNavigationSections: { title: "Top" | "Work" | "Profile" | "Discover" | "Pinned"; label: string | null }[] = [
  { title: "Top", label: null },
  { title: "Work", label: "Work" },
  { title: "Profile", label: "Profile" },
  { title: "Discover", label: "Discover" },
  { title: "Pinned", label: null },
]

function supplierNavigationLabel(name: SupplierNavigationName, t: (key: TranslationKey) => string) {
  if (
    name === "dashboard" ||
    name === "rfqs" ||
    name === "quotes" ||
    name === "purchaseOrders" ||
    name === "supplierDirectory" ||
    name === "savedRFQs"
  ) {
    return t(name)
  }

  return name
}

const intelligenceNavigation: { name: string; href: string }[] = [
  { name: "Executive Dashboard", href: "/dashboard/intelligence/executive" },
  { name: "Opportunity Matching", href: "/dashboard/intelligence/matches" },
  { name: "Supplier Intelligence", href: "/dashboard/intelligence/suppliers" },
  { name: "Supplier Performance", href: "/dashboard/intelligence/supplier-performance" },
  { name: "Procurement Analytics", href: "/dashboard/intelligence/procurement" },
  { name: "Regional Insights", href: "/dashboard/intelligence/regions" },
]

const adminNavigation: { name: TranslationKey | "Executive Command Centre" | "Board Pack" | "System Health" | "Production Readiness" | "Demo Mode" | "Demo Story Pack" | "Pilot Requests" | "Pilot Feedback" | "Audit Trail" | "Automation Rules" | "Reports" | "Settings" | "WhatsApp Network" | "Contract Renewals" | "Supplier Reviews" | "Compliance Risk" | "Buyer Onboarding" | "RFQ Templates" | "Banking Review" | "Supplier Risk" | "Decision Board" | "Workflow Rules" | "Overrides" | "Approval Matrix" | "Delegation Authority"; href: string }[] = [
  {
    name: "Executive Command Centre",
    href: "/dashboard/executive",
  },
  {
    name: "createRFQ",
    href: "/dashboard/admin/rfqs/new",
  },
  {
    name: "RFQ Templates",
    href: "/dashboard/admin/rfq-templates",
  },
  {
    name: "Audit Trail",
    href: "/dashboard/admin/audit",
  },
  {
    name: "Automation Rules",
    href: "/dashboard/admin/automation",
  },
  {
    name: "Reports",
    href: "/dashboard/admin/reports",
  },
  // Governance suite hidden until migrations run.
  {
    name: "System Health",
    href: "/dashboard/admin/system-health",
  },
  {
    name: "Production Readiness",
    href: "/dashboard/admin/production-readiness",
  },
  {
    name: "Demo Mode",
    href: "/dashboard/admin/demo-mode",
  },
  {
    name: "Demo Story Pack",
    href: "/dashboard/admin/demo-story",
  },
  {
    name: "Pilot Requests",
    href: "/dashboard/admin/pilot-requests",
  },
  {
    name: "Pilot Feedback",
    href: "/dashboard/admin/feedback",
  },
  {
    name: "Settings",
    href: "/dashboard/admin/settings",
  },
  {
    name: "WhatsApp Network",
    href: "/dashboard/admin/whatsapp",
  },
  {
    name: "quoteReview",
    href: "/dashboard/admin/quotes",
  },
  {
    name: "verificationReview",
    href: "/dashboard/admin/verifications",
  },
  {
    name: "analytics",
    href: "/dashboard/analytics",
  },
  {
    name: "purchaseOrders",
    href: "/dashboard/admin/purchase-orders",
  },
  {
    name: "Contract Renewals",
    href: "/dashboard/admin/contract-renewals",
  },
  {
    name: "Supplier Reviews",
    href: "/dashboard/admin/supplier-reviews",
  },
  {
    name: "Compliance Risk",
    href: "/dashboard/admin/compliance-risk",
  },
  {
    name: "activityLog",
    href: "/dashboard/admin/activity",
  },
  {
    name: "savedSuppliers",
    href: "/dashboard/admin/saved-suppliers",
  },
  {
    name: "Buyer Onboarding",
    href: "/dashboard/admin/onboarding",
  },
  {
    name: "Banking Review",
    href: "/dashboard/admin/banking",
  },
  {
    name: "Supplier Risk",
    href: "/dashboard/admin/supplier-risk",
  },
]

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname() || ""
  const [role, setRole] = useState<string | null>(null)
  const [profile, setProfile] = useState<AccountMenuProfile | null>(null)
  const [roleChecked, setRoleChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const canViewAdminNavigation = role?.trim().toLowerCase() === "admin"
  
  function closeSidebar() {
    setSidebarOpen(false)
  }

  function openAccessibility() {
    window.dispatchEvent(new Event("monate:open-accessibility"))
  }

  useEffect(() => {
    async function loadRole() {
      const currentProfile = await getCurrentProfile()

      if (supabase && currentProfile?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("business_name, email, full_name, preferred_name, role")
          .eq("id", currentProfile.id)
          .maybeSingle()

        setProfile((data as AccountMenuProfile | null) ?? null)
        setRole((data as { role?: string | null } | null)?.role ?? currentProfile.role ?? "supplier")
      } else {
        setRole(currentProfile?.role ?? "supplier")
      }

      setRoleChecked(true)
    }

    loadRole()
  }, [])

  useEffect(() => {
    if (!roleChecked) return

    const isAdminRoute = pathname.startsWith("/dashboard/admin")
    const canAccessAdmin = hasAdminOrBuyerAccess(role ? { id: "", role } : null)

    const normalizedRole = role?.trim().toLowerCase()
    if (pathname === "/dashboard" && normalizedRole === "admin") {
      router.replace("/dashboard/admin")
      return
    }

    if (pathname === "/dashboard" && normalizedRole === "buyer") {
      router.replace("/dashboard/buyer")
      return
    }

    if (isAdminRoute && !canAccessAdmin) {
      router.replace("/dashboard")
    }
  }, [pathname, role, roleChecked, router])

  if (pathname.startsWith("/dashboard/admin")) {
    return <>{children}</>
  }

  if (pathname.startsWith("/dashboard/buyer")) {
    return <>{children}</>
  }

  return (
    <main className="flex min-h-screen flex-col bg-page text-primary md:flex-row">
      
      {/* Mobile header bar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex md:hidden h-16 items-center justify-between gap-4 border-b border-panel bg-panel px-4 py-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md border border-panel bg-surface p-2 text-secondary transition hover:text-primary"
          aria-label="Toggle navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="logo-mark flex h-10 w-10 items-center justify-center rounded-md bg-accent text-button font-extrabold text-lg shadow-md">
            <span className="sr-only">Monate</span>
            M
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Workspace</p>
            <h2 className="text-sm font-semibold text-primary leading-none">Monate</h2>
          </div>
        </Link>
        <AccountMenu profile={profile} />
      </header>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - mobile overlay or desktop persistent */}
      <aside className="dashboard-sidebar fixed top-0 left-0 bottom-0 z-40 w-[280px] transform transition-transform duration-200 md:static md:transform-none md:translate-x-0 flex flex-col overflow-y-auto border-r border-panel bg-panel p-5 print:hidden md:w-full md:max-w-[280px]" style={{
        transform: sidebarOpen ? 'translateX(0)' : (typeof window !== 'undefined' && window.innerWidth < 768) ? 'translateX(-100%)' : 'translateX(0)',
        pointerEvents: sidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 768 ? 'auto' : 'none'
      }}>
        {/* Mobile-only close button */}
        <button
          type="button"
          onClick={closeSidebar}
          className="md:hidden mb-4 rounded-md border border-panel bg-surface p-2 text-secondary transition hover:text-primary w-fit"
          aria-label="Close navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-4 rounded-2xl border border-panel bg-surface p-4 text-sm">
          <Link
            href="/"
            onClick={closeSidebar}
            className="text-accent transition hover:text-accent-strong"
          >
            Back to Portal
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3 border-b border-panel pb-5">
          <Link href="/dashboard" onClick={closeSidebar} className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <div className="logo-mark flex h-14 w-14 items-center justify-center rounded-md bg-accent text-button font-extrabold text-xl shadow-md">
              <span className="sr-only">Monate</span>
              M
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-secondary">
                Supplier Workspace
              </p>
              <h2 className="text-xl font-semibold text-primary">
                Monate Connect
              </h2>
            </div>
          </Link>
        </div>

        <nav className="space-y-6 flex-1">
          {supplierNavigationSections.map((section) => {
            const items = navigation.filter((item) => item.section === section.title)

            return (
              <div key={section.title}>
                {section.label && (
                  <p className="mb-3 text-xs uppercase tracking-[0.24em] text-secondary">
                    {section.label}
                  </p>
                )}
                <div className="space-y-2">
                  {items.map((item) => {
                    const itemPath = item.href.split("?")[0]
                    const active =
                      pathname === itemPath ||
                      (itemPath !== "/dashboard" && pathname.startsWith(itemPath))

                    return (
                      <Link
                        key={`${section.title}-${item.href}-${item.name}`}
                        href={item.href}
                        onClick={closeSidebar}
                        className={`block rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                          active
                            ? "border-accent bg-surface text-primary shadow-sm"
                            : "border-transparent text-secondary hover:bg-surface hover:text-primary"
                        }`}
                      >
                        {supplierNavigationLabel(item.name, t)}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {canViewAdminNavigation && (
          <div className="mt-8 border-t border-panel pt-5">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-secondary">
              Intelligence
            </p>
            <nav className="space-y-2">
              {intelligenceNavigation.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`block rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                      active
                        ? "border-accent bg-surface text-primary shadow-sm"
                        : "border-transparent text-secondary hover:bg-surface hover:text-primary"
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}

        {canViewAdminNavigation && (
          <div className="mt-8 border-t border-panel pt-5">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-secondary">
              Admin
            </p>

            <nav className="space-y-2">
              {adminNavigation.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`block rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                      active
                        ? "border-accent bg-surface text-primary shadow-sm"
                        : "border-transparent text-secondary hover:bg-surface hover:text-primary"
                    }`}
                  >
                    {item.name === "Executive Command Centre" || item.name === "Board Pack" || item.name === "System Health" || item.name === "Production Readiness" || item.name === "Demo Mode" || item.name === "Demo Story Pack" || item.name === "Pilot Requests" || item.name === "Pilot Feedback" || item.name === "Audit Trail" || item.name === "Automation Rules" || item.name === "Reports" || item.name === "Settings" || item.name === "WhatsApp Network" || item.name === "Contract Renewals" || item.name === "Supplier Reviews" || item.name === "Compliance Risk" || item.name === "Buyer Onboarding" || item.name === "RFQ Templates" || item.name === "Banking Review" || item.name === "Supplier Risk" || item.name === "Decision Board" || item.name === "Workflow Rules" || item.name === "Overrides" || item.name === "Approval Matrix" || item.name === "Delegation Authority" ? item.name : t(item.name)}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </aside>

      {/* Main content area - padding-bottom accounts for fixed news ticker */}
      <section className="flex-1 min-w-0 overflow-x-hidden mt-16 md:mt-0 p-4 md:p-6 lg:p-8" style={{ paddingBottom: 'var(--news-ticker-height)' }}>
        <div className="print:hidden mb-4 flex items-center justify-between gap-4">
          <Breadcrumbs />
          <div className="hidden md:block">
            <AccountMenu profile={profile} />
          </div>
        </div>
        {children}
        <footer className="mt-10 flex flex-col gap-3 border-t border-panel pt-5 text-xs font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Monate Connect &middot; Procurement Edition</p>
          <button
            type="button"
            onClick={openAccessibility}
            className="w-fit underline-offset-4 transition hover:text-accent hover:underline"
          >
            Accessibility
          </button>
        </footer>
      </section>

    </main>
  )
}


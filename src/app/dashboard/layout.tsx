"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import NotificationBell from "@/components/NotificationBell"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import { useI18n, type TranslationKey } from "@/lib/i18n"

const navigation: {
  name:
    | TranslationKey
    | "Assistant"
    | "Calendar"
    | "Messages"
    | "Contracts"
    | "Invoices"
    | "Payments"
    | "Onboarding"
    | "Banking Details"
  href: string
}[] = [
  {
    name: "dashboard",
    href: "/dashboard",
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
  },
  {
    name: "Messages",
    href: "/dashboard/messages",
  },
  {
    name: "rfqs",
    href: "/dashboard/rfqs",
  },
  {
    name: "quotes",
    href: "/dashboard/quotes",
  },
  {
    name: "purchaseOrders",
    href: "/dashboard/purchase-orders",
  },
  {
    name: "Contracts",
    href: "/dashboard/contracts",
  },
  {
    name: "Invoices",
    href: "/dashboard/invoices",
  },
  {
    name: "Payments",
    href: "/dashboard/payments",
  },
  {
    name: "supplierDirectory",
    href: "/dashboard/suppliers",
  },
  {
    name: "supplierProfile",
    href: "/dashboard/profile",
  },
  {
    name: "Banking Details",
    href: "/dashboard/banking",
  },
  {
    name: "Onboarding",
    href: "/dashboard/onboarding",
  },
  {
    name: "verification",
    href: "/dashboard/verification",
  },
  {
    name: "savedRFQs",
    href: "/dashboard/saved-rfqs",
  },
  {
    name: "Assistant",
    href: "/dashboard/assistant",
  },
]

const intelligenceNavigation: { name: string; href: string }[] = [
  { name: "Executive Dashboard", href: "/dashboard/intelligence/executive" },
  { name: "Supplier Intelligence", href: "/dashboard/intelligence/suppliers" },
  { name: "Supplier Performance", href: "/dashboard/intelligence/supplier-performance" },
  { name: "Procurement Analytics", href: "/dashboard/intelligence/procurement" },
  { name: "Regional Insights", href: "/dashboard/intelligence/regions" },
]

const adminNavigation: { name: TranslationKey | "Executive Command Centre" | "Board Pack" | "System Health" | "Production Readiness" | "Demo Mode" | "Demo Story Pack" | "Pilot Requests" | "Audit Trail" | "Automation Rules" | "Reports" | "Settings" | "WhatsApp Network" | "Contract Renewals" | "Supplier Reviews" | "Compliance Risk" | "Buyer Onboarding" | "RFQ Templates" | "Banking Review" | "Supplier Risk" | "Decision Board" | "Workflow Rules" | "Overrides" | "Approval Matrix" | "Delegation Authority"; href: string }[] = [
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
  {
    name: "Board Pack",
    href: "/dashboard/admin/board-pack",
  },
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
    href: "/dashboard/admin/verification",
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
  {
    name: "Decision Board",
    href: "/dashboard/admin/decision-board",
  },
  {
    name: "Workflow Rules",
    href: "/dashboard/admin/workflow-rules",
  },
  {
    name: "Overrides",
    href: "/dashboard/admin/overrides",
  },
  {
    name: "Approval Matrix",
    href: "/dashboard/admin/approval-matrix",
  },
  {
    name: "Delegation Authority",
    href: "/dashboard/admin/delegation-authority",
  },
]

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { t } = useI18n()
  const pathname = usePathname() || ""
  const [role, setRole] = useState<string | null>(null)
  const canViewAdminNavigation = hasAdminOrBuyerAccess(
    role ? { id: "", role } : null
  )

  useEffect(() => {
    async function loadRole() {
      const profile = await getCurrentProfile()

      setRole(profile?.role ?? "supplier")
    }

    loadRole()
  }, [])

  return (
    <main className="flex min-h-screen bg-page text-primary">

      <aside className="dashboard-sidebar print:hidden w-full max-w-[280px] border-r border-panel bg-panel p-5">

        <div className="mb-4 rounded-2xl border border-panel bg-surface p-4 text-sm">
          <Link
            href="/"
            className="text-accent transition hover:text-accent-strong"
          >
            Back to Portal
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3 border-b border-panel pb-5">
          <Link href="/" className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <div className="logo-mark flex h-14 w-14 items-center justify-center rounded-md bg-accent text-button font-extrabold text-xl shadow-md">
              <span className="sr-only">Monate</span>
              M
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-secondary">
                Supplier Workspace
              </p>
              <h2 className="text-xl font-semibold text-primary">
                Monate Vendor Network
              </h2>
            </div>
          </Link>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-accent bg-surface text-primary shadow-sm"
                    : "border-transparent text-secondary hover:bg-surface hover:text-primary"
                }`}
              >
                {item.name === "Assistant" ||
                item.name === "Calendar" ||
                item.name === "Messages" ||
                item.name === "Contracts" ||
                item.name === "Invoices" ||
                item.name === "Payments" ||
                item.name === "Onboarding" ||
                item.name === "Banking Details"
                  ? item.name
                  : t(item.name)}
              </Link>
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
                    className={`block rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                      active
                        ? "border-accent bg-surface text-primary shadow-sm"
                        : "border-transparent text-secondary hover:bg-surface hover:text-primary"
                    }`}
                  >
                    {item.name === "Executive Command Centre" || item.name === "Board Pack" || item.name === "System Health" || item.name === "Production Readiness" || item.name === "Demo Mode" || item.name === "Demo Story Pack" || item.name === "Pilot Requests" || item.name === "Audit Trail" || item.name === "Automation Rules" || item.name === "Reports" || item.name === "Settings" || item.name === "WhatsApp Network" || item.name === "Contract Renewals" || item.name === "Supplier Reviews" || item.name === "Compliance Risk" || item.name === "Buyer Onboarding" || item.name === "RFQ Templates" || item.name === "Banking Review" || item.name === "Supplier Risk" || item.name === "Decision Board" || item.name === "Workflow Rules" || item.name === "Overrides" || item.name === "Approval Matrix" || item.name === "Delegation Authority" ? item.name : t(item.name)}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </aside>

      <section className="flex-1 min-w-0 overflow-x-hidden p-6 md:p-8">
        <div className="dashboard-chrome print:hidden mb-6 flex items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
              Live Procurement
            </p>
            <p className="mt-1 text-sm font-semibold text-heading">
              Notification Center
            </p>
          </div>
          <NotificationBell />
        </div>
        <div className="print:hidden"><Breadcrumbs /></div>
        {children}
      </section>

    </main>
  )
}

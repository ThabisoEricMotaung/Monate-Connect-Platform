"use client"

import Link from "next/link"
import {
  IconHome,
  IconFileText,
  IconMessage,
  IconShoppingCart,
  IconChartBar,
  IconContract,
  IconReceipt,
  IconCreditCard,
  IconBuilding,
  IconShieldCheck,
  IconBuildingBank,
  IconSearch,
  IconBookmark,
  IconMessageCircle,
  IconHelpCircle,
  IconMenu2,
  IconSettings,
  IconX,
} from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import AccountMenu, { type AccountMenuProfile } from "@/components/AccountMenu"
import BrandMark from "@/components/BrandMark"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import NotificationBell from "@/components/NotificationBell"
import PhoneVerificationBanner from "@/components/PhoneVerificationBanner"
import ProcurementWire from "@/components/ProcurementWire"
import { hasAdminOrBuyerAccess } from "@/lib/auth"
import { useI18n, type TranslationKey } from "@/lib/i18n"
import { roleHomeHref } from "@/lib/navigation"
import { supabase } from "@/lib/supabase"

type SupplierNavigationName =
  | TranslationKey
  | "Banking details"
  | "Business profile"
  | "Contracts"
  | "Invoices"
  | "Help"
  | "Messages"
  | "Payments"
  | "Settings"
  | "Spend Analysis"
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
    name: "Spend Analysis",
    href: "/dashboard/spend-analysis",
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
    name: "Help",
    href: "/dashboard/help",
    section: "Pinned",
  },
  {
    name: "Settings",
    href: "/dashboard/profile",
    section: "Pinned",
  },
]

const navigationIcons: Record<string, ReactNode> = {
  "/dashboard": <IconHome size={16} />,
  "/dashboard/rfqs": <IconFileText size={16} />,
  "/dashboard/quotes": <IconMessage size={16} />,
  "/dashboard/purchase-orders": <IconShoppingCart size={16} />,
  "/dashboard/spend-analysis": <IconChartBar size={16} />,
  "/dashboard/contracts": <IconContract size={16} />,
  "/dashboard/invoices": <IconReceipt size={16} />,
  "/dashboard/payments": <IconCreditCard size={16} />,
  "/dashboard/profile": <IconBuilding size={16} />,
  "/dashboard/profile?tab=verification": <IconShieldCheck size={16} />,
  "/dashboard/profile?tab=banking": <IconBuildingBank size={16} />,
  "/dashboard/suppliers": <IconSearch size={16} />,
  "/dashboard/saved-rfqs": <IconBookmark size={16} />,
  "/dashboard/messages": <IconMessageCircle size={16} />,
  "/dashboard/help": <IconHelpCircle size={16} />,
  Settings: <IconSettings size={16} />,
}
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

const adminNavigation: { name: TranslationKey | "Executive Command Centre" | "Board Pack" | "System Health" | "Production Readiness" | "Demo Mode" | "Demo Story Pack" | "Pilot Requests" | "Pilot Feedback" | "Audit Trail" | "Automation Rules" | "Spend Analysis" | "Compliance Report" | "BBBEE Scorecard" | "Reports" | "Settings" | "WhatsApp Network" | "Contract Renewals" | "Supplier Reviews" | "Compliance Risk" | "Buyer Onboarding" | "RFQ Templates" | "Banking Review" | "Supplier Risk" | "Decision Board" | "Workflow Rules" | "Overrides" | "Approval Matrix" | "Delegation Authority"; href: string }[] = [
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
    name: "Spend Analysis",
    href: "/dashboard/spend-analysis",
  },
  {
    name: "Compliance Report",
    href: "/dashboard/compliance-report",
  },
  {
    name: "BBBEE Scorecard",
    href: "/dashboard/bbbee-scorecard",
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
  const [phoneGraceExpiresAt, setPhoneGraceExpiresAt] = useState<string | null>(null)
  const canViewAdminNavigation = role?.trim().toLowerCase() === "admin"
  const homeHref = roleHomeHref(role)
  
  function closeSidebar() {
    setSidebarOpen(false)
  }

  function openAccessibility() {
    window.dispatchEvent(new Event("monate:open-accessibility"))
  }

  useEffect(() => {
    async function loadRole() {
      let canRenderDashboard = false

      try {
        if (!supabase) {
          router.replace("/auth/login")
          return
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          router.replace("/auth/login")
          return
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, business_name, email, full_name, preferred_name, role, avatar_url, created_at, phone_verified_at")
          .eq("id", session.user.id)
          .maybeSingle()

        if (error) {
          console.error("Dashboard profile guard failed:", error)
          router.replace("/auth/login")
          return
        }

        if (!data) {
          router.replace("/register?source=oauth")
          return
        }

        const provider = session.user.app_metadata?.provider
        const isUnverifiedEmailSignup =
          provider === "email" && !session.user.email_confirmed_at

        if (isUnverifiedEmailSignup) {
          const emailParam = session.user.email
            ? `?email=${encodeURIComponent(session.user.email)}`
            : ""
          router.replace(`/auth/verify-email${emailParam}`)
          return
        }

        const providersList = (session.user.app_metadata?.providers as string[]) || []
        const isOAuthUser =
          provider === "google" ||
          provider === "azure" ||
          providersList.includes("google") ||
          providersList.includes("azure")
        const phoneVerifiedAt = (data as { phone_verified_at?: string | null }).phone_verified_at
        const createdAt = (data as { created_at?: string | null }).created_at
        const normalizedRole = (data as { role?: string | null } | null)?.role?.trim().toLowerCase()
        const isAdminUser = normalizedRole === "admin"
        const searchParams = new URLSearchParams(window.location.search)
        const phoneSkipped =
          searchParams.get("phone_skipped") === "true" ||
          (typeof window !== "undefined" && sessionStorage.getItem("phone_skipped") === "true")

        if (isAdminUser) {
          setPhoneGraceExpiresAt(null)
        } else if (!isOAuthUser && !phoneVerifiedAt) {
          const profileCreatedAt = createdAt ? new Date(createdAt) : new Date()
          const graceExpiresAt = new Date(profileCreatedAt.getTime() + 24 * 60 * 60 * 1000)

          if (Date.now() >= graceExpiresAt.getTime() && !phoneSkipped) {
            router.replace("/auth/verify-phone")
            return
          }

          setPhoneGraceExpiresAt(graceExpiresAt.toISOString())
        } else {
          if (phoneVerifiedAt) {
            sessionStorage.removeItem("phone_skipped")
          }
          setPhoneGraceExpiresAt(null)
        }

        setProfile((data as AccountMenuProfile | null) ?? null)
        setRole((data as { role?: string | null } | null)?.role ?? "supplier")
        canRenderDashboard = true
      } catch (error) {
        console.error("Dashboard role load failed:", error)
        router.replace("/auth/login")
      } finally {
        if (canRenderDashboard) setRoleChecked(true)
      }
    }

    loadRole()
  }, [router])

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

  if (!roleChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page text-primary">
        <div className="rounded-md border border-panel bg-card p-6 text-sm font-semibold text-secondary shadow-panel">
          Checking workspace access...
        </div>
      </main>
    )
  }

  if (pathname.startsWith("/dashboard/admin")) {
    return (
      <>
        {phoneGraceExpiresAt && <PhoneVerificationBanner graceExpiresAt={phoneGraceExpiresAt} />}
        {children}
        <ProcurementWire scope="dashboard" />
      </>
    )
  }

  if (pathname.startsWith("/dashboard/buyer")) {
    return (
      <>
        {phoneGraceExpiresAt && <PhoneVerificationBanner graceExpiresAt={phoneGraceExpiresAt} />}
        {children}
        <ProcurementWire scope="dashboard" />
      </>
    )
  }

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
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(20rem,100vw)] -translate-x-full flex-col overflow-y-auto border-r-[0.5px] border-[#ebebeb] bg-white p-4 transition-transform duration-200 print:hidden md:sticky md:top-0 md:h-screen md:w-56 md:min-w-[14rem] md:translate-x-0 ${sidebarOpen ? "translate-x-0" : ""}`}
      >
        <button
          type="button"
          onClick={closeSidebar}
          className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#555555] transition hover:text-[#1a3a2a] md:hidden"
          aria-label="Close navigation menu"
        >
          <IconX aria-hidden="true" className="h-5 w-5" stroke={1.8} />
        </button>

        <Link href={homeHref} onClick={closeSidebar} className="mb-5 flex items-center gap-3">
          <BrandMark className="h-11 w-11" imageClassName="h-7 w-auto" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#555555]">
              Procurement Workspace
            </p>
            <h2 className="text-sm font-semibold text-[#1a3a2a] leading-none">
              AiForm Procure
            </h2>
          </div>
        </Link>

        <nav className="flex-1 space-y-5">
          {supplierNavigationSections.map((section) => {
            const items = navigation.filter((item) => item.section === section.title)

            return (
              <div key={section.title}>
                {section.label && (
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#aaaaaa]">
                    {section.label}
                  </p>
                )}
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const itemPath = item.href.split("?")[0]
                    const active =
                      pathname === itemPath ||
                      (itemPath !== "/dashboard" && pathname.startsWith(itemPath))
                    const itemIcon = navigationIcons[item.name] ?? navigationIcons[item.href]
                    const itemLabel = item.href === "/dashboard" ? "Home dashboard" : supplierNavigationLabel(item.name, t)

                    return (
                      <Link
                        key={`${section.title}-${item.href}-${item.name}`}
                        href={item.href}
                        onClick={closeSidebar}
                        className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "border-[#1a3a2a]/20 bg-[#f0f7f3] text-[#1a3a2a]"
                            : "border-transparent text-[#555555] hover:bg-[#f8f8f6] hover:text-[#1a3a2a]"
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                          {itemIcon && (
                            <span className={`shrink-0 ${active ? "text-[#1a3a2a]" : "text-[#aaaaaa]"}`}>
                              {itemIcon}
                            </span>
                          )}
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {itemLabel}
                          </span>
                        </span>
                        {active && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8a060]" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {canViewAdminNavigation && (
            <div className="border-t border-[#ebebeb] pt-5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#aaaaaa]">
                Intelligence
              </p>
              <nav className="space-y-1.5">
                {intelligenceNavigation.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeSidebar}
                      className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-[#1a3a2a]/20 bg-[#f0f7f3] text-[#1a3a2a]"
                          : "border-transparent text-[#555555] hover:bg-[#f8f8f6] hover:text-[#1a3a2a]"
                      }`}
                    >
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</span>
                      {active && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8a060]" />}
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}

          {canViewAdminNavigation && (
            <div className="border-t border-[#ebebeb] pt-5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#aaaaaa]">
                Admin
              </p>

              <nav className="space-y-1.5">
                {adminNavigation.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href)
                  const itemLabel =
                    item.name === "Executive Command Centre" || item.name === "Board Pack" || item.name === "System Health" || item.name === "Production Readiness" || item.name === "Demo Mode" || item.name === "Demo Story Pack" || item.name === "Pilot Requests" || item.name === "Pilot Feedback" || item.name === "Audit Trail" || item.name === "Automation Rules" || item.name === "Spend Analysis" || item.name === "Compliance Report" || item.name === "BBBEE Scorecard" || item.name === "Reports" || item.name === "Settings" || item.name === "WhatsApp Network" || item.name === "Contract Renewals" || item.name === "Supplier Reviews" || item.name === "Compliance Risk" || item.name === "Buyer Onboarding" || item.name === "RFQ Templates" || item.name === "Banking Review" || item.name === "Supplier Risk" || item.name === "Decision Board" || item.name === "Workflow Rules" || item.name === "Overrides" || item.name === "Approval Matrix" || item.name === "Delegation Authority"
                      ? item.name
                      : t(item.name)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeSidebar}
                      className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-[#1a3a2a]/20 bg-[#f0f7f3] text-[#1a3a2a]"
                          : "border-transparent text-[#555555] hover:bg-[#f8f8f6] hover:text-[#1a3a2a]"
                      }`}
                    >
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{itemLabel}</span>
                      {active && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8a060]" />}
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}
        </nav>
      </aside>

      <section className="w-full min-w-0 flex-1 overflow-x-hidden px-4 py-5 pb-24 md:p-8 md:pb-24">
        <header className="dashboard-chrome print:hidden -mx-4 -mt-5 mb-6 flex items-center justify-between gap-4 border-b-[0.5px] border-[#ebebeb] bg-white px-5 py-4 md:-mx-8 md:-mt-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#ebebeb] bg-white text-[#555555] transition hover:text-[#1a3a2a] md:hidden"
            aria-label="Open navigation menu"
          >
            <IconMenu2 aria-hidden="true" className="h-5 w-5" stroke={1.8} />
          </button>
          <Link
            href={homeHref}
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
        </header>

        <div className="print:hidden mb-6">
          <Breadcrumbs role={role} />
        </div>

        {phoneGraceExpiresAt && <PhoneVerificationBanner graceExpiresAt={phoneGraceExpiresAt} />}
        {children}
        <footer className="mt-10 flex flex-col gap-3 border-t border-[#ebebeb] pt-5 text-xs font-semibold text-[#555555] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 AiForm Procure &middot; Procurement Suite</p>
          <button
            type="button"
            onClick={openAccessibility}
            className="w-fit underline-offset-4 transition hover:text-[#1a3a2a] hover:underline"
          >
            Accessibility
          </button>
        </footer>
      </section>

      <ProcurementWire scope="dashboard" />
    </main>
  )
}


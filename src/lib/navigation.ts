export function roleHomeHref(role?: string | null): string {
  const normalizedRole = role?.trim().toLowerCase()

  if (normalizedRole === "admin") return "/dashboard/admin"
  if (normalizedRole === "buyer") return "/dashboard/buyer"

  return "/dashboard"
}

export type DashboardRole = "admin" | "buyer" | "supplier"

export type BreadcrumbItem = {
  href: string
  label: string
}

const segmentLabels: Record<string, string> = {
  activity: "Activity",
  admin: "Admin",
  analytics: "Analytics",
  banking: "Banking",
  buyer: "Buyer",
  calendar: "Calendar",
  contracts: "Contracts",
  invoices: "Invoices",
  matching: "Matching",
  messages: "Inbox",
  new: "New",
  onboarding: "Onboarding",
  payments: "Payments",
  profile: "Business profile",
  "purchase-orders": "Purchase orders",
  questions: "Questions",
  quotes: "Quotes",
  reports: "Reports",
  rfqs: "RFQs",
  "saved-rfqs": "Saved RFQs",
  suppliers: "Suppliers",
  verification: "Verification",
  verifications: "Verifications",
}

const sectionIndexPaths: Record<string, string> = {
  activity: "/dashboard/admin/activity",
  analytics: "/dashboard/analytics",
  banking: "/dashboard/admin/banking",
  calendar: "/dashboard/calendar",
  contracts: "/dashboard/contracts",
  invoices: "/dashboard/invoices",
  matching: "/dashboard/admin/rfqs",
  messages: "/dashboard/messages",
  onboarding: "/dashboard/onboarding",
  payments: "/dashboard/payments",
  profile: "/dashboard/profile",
  "purchase-orders": "/dashboard/purchase-orders",
  questions: "/dashboard/admin/rfqs",
  quotes: "/dashboard/quotes",
  reports: "/dashboard/admin/reports",
  rfqs: "/dashboard/rfqs",
  "saved-rfqs": "/dashboard/saved-rfqs",
  suppliers: "/dashboard/suppliers",
  verification: "/dashboard/profile?tab=verification",
  verifications: "/dashboard/admin/verifications",
}

const roleSectionIndexPaths: Record<DashboardRole, Record<string, string>> = {
  admin: {
    analytics: "/dashboard/analytics",
    contracts: "/dashboard/admin/contract-renewals",
    invoices: "/dashboard/admin/purchase-orders",
    onboarding: "/dashboard/admin/onboarding",
    "purchase-orders": "/dashboard/admin/purchase-orders",
    quotes: "/dashboard/admin/quotes",
    rfqs: "/dashboard/admin/rfqs",
    suppliers: "/suppliers",
  },
  buyer: {
    contracts: "/dashboard/buyer/contracts",
    invoices: "/dashboard/buyer/invoices",
    "purchase-orders": "/dashboard/buyer/purchase-orders",
    quotes: "/dashboard/buyer/quotes",
    rfqs: "/dashboard/buyer/rfqs",
    suppliers: "/suppliers",
  },
  supplier: {
    contracts: "/dashboard/contracts",
    invoices: "/dashboard/invoices",
    "purchase-orders": "/dashboard/purchase-orders",
    quotes: "/dashboard/quotes",
    rfqs: "/dashboard/rfqs",
    suppliers: "/dashboard/suppliers",
  },
}

function titleCaseSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function dashboardRoleFromPath(pathname: string, explicitRole?: string | null): DashboardRole {
  const normalizedRole = explicitRole?.trim().toLowerCase()

  if (normalizedRole === "admin" || pathname.startsWith("/dashboard/admin")) return "admin"
  if (normalizedRole === "buyer" || pathname.startsWith("/dashboard/buyer")) return "buyer"

  return "supplier"
}

export function dashboardHomeHrefForPath(pathname: string, role?: string | null): string {
  return roleHomeHref(dashboardRoleFromPath(pathname, role))
}

export function dashboardBreadcrumbs(pathname: string, role?: string | null): BreadcrumbItem[] {
  const dashboardRole = dashboardRoleFromPath(pathname, role)
  const homeHref = roleHomeHref(dashboardRole)
  const rawSegments = pathname.split("/").filter(Boolean)
  const dashboardIndex = rawSegments.indexOf("dashboard")
  const scopedSegments = rawSegments.slice(dashboardIndex + 1)
  const visibleSegments = scopedSegments.filter((segment, index) => {
    if (index === 0 && (segment === "admin" || segment === "buyer")) return false
    return true
  })

  const items: BreadcrumbItem[] = [{ href: homeHref, label: "Procurement" }]
  let currentPath = "/dashboard"

  if (dashboardRole === "admin") currentPath = "/dashboard/admin"
  if (dashboardRole === "buyer") currentPath = "/dashboard/buyer"

  for (const segment of visibleSegments) {
    if (segment === "admin" || segment === "buyer") continue

    currentPath = currentPath.endsWith(segment) ? currentPath : `${currentPath}/${segment}`

    if (items.length === 1 && currentPath === homeHref) continue

    const label = segment === "new"
      ? "New"
      : segmentLabels[segment] ?? (segment.match(/^[0-9a-f-]{8,}$/i) ? "Detail" : titleCaseSegment(segment))

    const href = roleSectionIndexPaths[dashboardRole][segment] ?? sectionIndexPaths[segment] ?? currentPath
    items.push({ href, label })
  }

  return items
}

export function dashboardParentHref(pathname: string, role?: string | null): BreadcrumbItem | null {
  const items = dashboardBreadcrumbs(pathname, role)

  if (items.length <= 1) return null

  return items[items.length - 2]
}

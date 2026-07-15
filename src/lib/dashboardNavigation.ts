import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconAward,
  IconBookmark,
  IconBooks,
  IconBrandWhatsapp,
  IconBriefcase,
  IconBuildingBank,
  IconBuildingStore,
  IconChartAreaLine,
  IconChartBar,
  IconChartPie,
  IconClipboardCheck,
  IconClipboardList,
  IconFileCertificate,
  IconFileSearch,
  IconFileText,
  IconHelpCircle,
  IconHistory,
  IconHome,
  IconMap2,
  IconMessage2,
  IconMessageCircle,
  IconPlayerPlay,
  IconPlus,
  IconReceipt,
  IconReportAnalytics,
  IconRobot,
  IconRocket,
  IconShieldCheck,
  IconShoppingCart,
  IconStars,
  IconTargetArrow,
  IconTemplate,
  IconUserPlus,
  type TablerIcon,
} from "@tabler/icons-react"

// Single source of truth for the ADMIN and BUYER sidebar structures.
//
// Both roles are rendered in two different places: their own real layout
// (src/app/dashboard/admin/layout.tsx, src/app/dashboard/buyer/layout.tsx)
// AND a "mirror" shown on shared routes that live outside those prefixes
// (src/app/dashboard/layout.tsx, for things like /dashboard/messages,
// /dashboard/suggestions, /dashboard/help). Those used to be hand-copied,
// independently-maintained arrays that silently drifted apart every time
// one got edited without the other - that's what caused the sidebar to
// visibly change shape depending on which route you clicked. Everyone
// building sidebar UI should import from here instead of redefining items.
//
// This only describes structure (labels/items/hrefs/icons) - live badge
// counts (unread messages, open RFQs, etc.) are fetched independently by
// each consumer and merged in afterward, since each layout has its own
// data-loading cadence.

export type DashboardNavItem = {
  name: string
  href: string
  icon: TablerIcon
  iconColorClass?: string
}

export type DashboardNavGroup = {
  label?: string
  divider?: boolean
  items: DashboardNavItem[]
}

export function getAdminNavGroups(isFullAdmin: boolean): DashboardNavGroup[] {
  return [
    {
      items: [{ name: "Home dashboard", href: "/dashboard/admin", icon: IconHome }],
    },
    ...(isFullAdmin
      ? [
          {
            label: "ADMIN",
            divider: true,
            items: [
              { name: "Verifications", href: "/dashboard/admin/verifications", icon: IconShieldCheck },
              {
                name: "Suggestions",
                href: "/dashboard/admin/suggestions",
                icon: IconMessageCircle,
                iconColorClass: "text-violet-600",
              },
              { name: "Session monitor", href: "/dashboard/admin/session", icon: IconActivityHeartbeat },
            ],
          },
        ]
      : []),
    {
      label: "Procurement",
      items: [
        { name: "RFQs", href: "/dashboard/admin/rfqs", icon: IconFileText },
        {
          name: "Quotes received",
          href: "/dashboard/admin/quotes",
          icon: IconMessageCircle,
          iconColorClass: "text-sky-600",
        },
        { name: "Inbox", href: "/dashboard/messages", icon: IconMessageCircle },
        { name: "Purchase orders", href: "/dashboard/admin/purchase-orders", icon: IconShoppingCart },
      ],
    },
    {
      label: "Suppliers",
      divider: true,
      items: [{ name: "Supplier directory", href: "/suppliers", icon: IconBuildingStore }],
    },
    {
      label: "Reports",
      divider: true,
      items: [
        { name: "Spend analysis", href: "/dashboard/spend-analysis", icon: IconChartBar },
        { name: "Compliance report", href: "/dashboard/compliance-report", icon: IconClipboardCheck },
        { name: "BBBEE scorecard", href: "/dashboard/bbbee-scorecard", icon: IconAward },
      ],
    },
    {
      label: "Executive",
      divider: true,
      items: [
        { name: "Executive Command Centre", href: "/dashboard/executive", icon: IconBriefcase },
        { name: "Reports", href: "/dashboard/admin/reports", icon: IconReportAnalytics },
        { name: "Analytics", href: "/dashboard/analytics", icon: IconChartBar },
      ],
    },
    {
      label: "Supplier operations",
      divider: true,
      items: [
        { name: "Contract Renewals", href: "/dashboard/admin/contract-renewals", icon: IconFileCertificate },
        { name: "Supplier Reviews", href: "/dashboard/admin/supplier-reviews", icon: IconStars },
        { name: "Compliance Risk", href: "/dashboard/admin/compliance-risk", icon: IconAlertTriangle },
        { name: "Supplier Risk", href: "/dashboard/admin/supplier-risk", icon: IconAlertTriangle },
        { name: "Saved Suppliers", href: "/dashboard/admin/saved-suppliers", icon: IconBookmark },
        { name: "Buyer Onboarding", href: "/dashboard/admin/onboarding", icon: IconUserPlus },
        { name: "Banking Review", href: "/dashboard/admin/banking", icon: IconBuildingBank },
      ],
    },
    {
      label: "Tools & governance",
      divider: true,
      items: [
        { name: "RFQ Templates", href: "/dashboard/admin/rfq-templates", icon: IconTemplate },
        { name: "Audit Trail", href: "/dashboard/admin/audit", icon: IconFileSearch },
        { name: "Activity Log", href: "/dashboard/admin/activity", icon: IconHistory },
        { name: "Automation Rules", href: "/dashboard/admin/automation", icon: IconRobot },
        { name: "WhatsApp Network", href: "/dashboard/admin/whatsapp", icon: IconBrandWhatsapp },
        { name: "System Health", href: "/dashboard/admin/system-health", icon: IconActivityHeartbeat },
        { name: "Production Readiness", href: "/dashboard/admin/production-readiness", icon: IconRocket },
      ],
    },
    {
      label: "Pilot & demo",
      divider: true,
      items: [
        { name: "Demo Mode", href: "/dashboard/admin/demo-mode", icon: IconPlayerPlay },
        { name: "Demo Story Pack", href: "/dashboard/admin/demo-story", icon: IconBooks },
        { name: "Pilot Requests", href: "/dashboard/admin/pilot-requests", icon: IconClipboardList },
        { name: "Pilot Feedback", href: "/dashboard/admin/feedback", icon: IconMessage2 },
      ],
    },
    {
      label: "Intelligence",
      divider: true,
      items: [
        { name: "Executive Dashboard", href: "/dashboard/intelligence/executive", icon: IconChartPie },
        { name: "Opportunity Matching", href: "/dashboard/intelligence/matches", icon: IconTargetArrow },
        { name: "Supplier Intelligence", href: "/dashboard/intelligence/suppliers", icon: IconStars },
        {
          name: "Supplier Performance",
          href: "/dashboard/intelligence/supplier-performance",
          icon: IconChartAreaLine,
        },
        { name: "Procurement Analytics", href: "/dashboard/intelligence/procurement", icon: IconChartBar },
        { name: "Regional Insights", href: "/dashboard/intelligence/regions", icon: IconMap2 },
      ],
    },
  ]
}

export function getBuyerNavGroups(): DashboardNavGroup[] {
  return [
    {
      items: [{ name: "Home dashboard", href: "/dashboard/buyer", icon: IconHome }],
    },
    {
      label: "Procurement",
      items: [
        { name: "Create RFQ", href: "/dashboard/buyer/rfqs/new", icon: IconPlus },
        { name: "RFQs", href: "/dashboard/buyer/rfqs", icon: IconFileText },
        {
          name: "Quotes received",
          href: "/dashboard/buyer/quotes",
          icon: IconMessageCircle,
          iconColorClass: "text-sky-600",
        },
        { name: "Inbox", href: "/dashboard/messages", icon: IconMessageCircle },
        { name: "Purchase orders", href: "/dashboard/buyer/purchase-orders", icon: IconShoppingCart },
        { name: "Spend Analysis", href: "/dashboard/spend-analysis", icon: IconChartBar },
        { name: "Contracts", href: "/dashboard/buyer/contracts", icon: IconFileCertificate },
        { name: "Invoices", href: "/dashboard/buyer/invoices", icon: IconReceipt },
      ],
    },
    {
      label: "Suppliers",
      divider: true,
      items: [{ name: "Supplier directory", href: "/suppliers", icon: IconBuildingStore }],
    },
    {
      label: "Support",
      divider: true,
      items: [
        {
          name: "Have Your Say",
          href: "/dashboard/suggestions",
          icon: IconMessageCircle,
          iconColorClass: "text-violet-600",
        },
        { name: "Help", href: "/dashboard/help", icon: IconHelpCircle },
      ],
    },
  ]
}

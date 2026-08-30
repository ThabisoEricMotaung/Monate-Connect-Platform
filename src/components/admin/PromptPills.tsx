"use client"

import Link from "next/link"
import {
  IconFileText,
  IconCheck,
  IconUsers,
  IconPlus,
  type TablerIcon,
} from "@tabler/icons-react"
import { usePathname } from "next/navigation"

type PromptPill = {
  label: string
  href: string
  icon: TablerIcon
  description?: string
  highlight?: boolean
}

const PROMPT_PILLS: PromptPill[] = [
  {
    label: "Create RFQ",
    href: "/dashboard/admin/rfqs/new",
    icon: IconPlus,
    description: "Start a new procurement",
    highlight: true,
  },
  {
    label: "View RFQs",
    href: "/dashboard/admin/rfqs",
    icon: IconFileText,
    description: "Browse all opportunities",
  },
  {
    label: "Review Quotes",
    href: "/dashboard/admin/quotes",
    icon: IconCheckCircle,
    description: "Process supplier responses",
  },
  {
    label: "Manage Suppliers",
    href: "/dashboard/admin/settings",
    icon: IconUsers,
    description: "Supplier management",
  },
]

function isActivePill(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href)
}

export default function PromptPills() {
  const pathname = usePathname() || ""

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {PROMPT_PILLS.map((pill) => {
        const Icon = pill.icon
        const active = isActivePill(pathname, pill.href)

        return (
          <Link
            key={pill.href}
            href={pill.href}
            className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out ${
              active
                ? "border border-[#c8a060]/50 bg-gradient-to-r from-[#faf9f7] to-[#f5f3f0] text-[#1a3a2a] shadow-sm"
                : pill.highlight
                  ? "border border-[#1a3a2a]/30 bg-gradient-to-r from-[#1a3a2a] to-[#244f39] text-white hover:shadow-md hover:from-[#244f39] hover:to-[#2d5f47] hover:scale-105 active:scale-95"
                  : "border border-[#e0e0db] bg-white text-[#555555] hover:border-[#c8a060]/50 hover:bg-[#f9f8f7] hover:text-[#1a3a2a] hover:shadow-sm hover:scale-105 active:scale-95"
            }`}
            title={pill.description}
          >
            <Icon
              aria-hidden="true"
              className={`h-4 w-4 transition-all duration-200 ${
                active
                  ? "text-[#1a3a2a]"
                  : pill.highlight
                    ? "text-white"
                    : "text-[#c8a060] group-hover:text-[#1a3a2a] group-hover:scale-110"
              }`}
              stroke={2}
            />
            <span className="transition-all duration-200">{pill.label}</span>
            {active && (
              <span
                aria-hidden="true"
                className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-[#c8a060] animate-pulse"
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}

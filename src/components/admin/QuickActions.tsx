"use client"

import Link from "next/link"
import {
  IconFileText,
  IconCheck,
  IconUsers,
  IconArrowRight,
  IconTrendingUp,
  type TablerIcon,
} from "@tabler/icons-react"

type MetricCard = {
  label: string
  value: number | string
  icon: TablerIcon
  href: string
  trend?: {
    value: number
    direction: "up" | "down"
  }
  color: "emerald" | "sky" | "amber" | "violet"
}

type ActionCard = {
  label: string
  description: string
  href: string
  icon: TablerIcon
  accent: string
}

interface QuickActionsProps {
  activeRfqs: number
  unreviewedQuotes: number
  shortlistedSuppliers: number
}

const colorStyles = {
  emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-700",
  sky: "from-sky-500/10 to-sky-500/5 border-sky-500/20 text-sky-700",
  amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-700",
  violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-700",
}

const iconColors = {
  emerald: "text-emerald-600",
  sky: "text-sky-600",
  amber: "text-amber-600",
  violet: "text-violet-600",
}

export default function QuickActions({
  activeRfqs,
  unreviewedQuotes,
  shortlistedSuppliers,
}: QuickActionsProps) {
  const metrics: MetricCard[] = [
    {
      label: "Active RFQs",
      value: activeRfqs,
      icon: IconFileText,
      href: "/dashboard/admin/rfqs",
      trend: { value: 12, direction: "up" },
      color: "sky",
    },
    {
      label: "Pending Quotes",
      value: unreviewedQuotes,
      icon: IconCheckCircle,
      href: "/dashboard/admin/quotes",
      trend: { value: 8, direction: "up" },
      color: "amber",
    },
    {
      label: "Shortlisted",
      value: shortlistedSuppliers,
      icon: IconUsers,
      href: "/dashboard/suppliers",
      color: "emerald",
    },
  ]

  const actions: ActionCard[] = [
    {
      label: "Issue PO",
      description: "Create a purchase order",
      href: "/dashboard/admin/purchase-orders",
      icon: IconCheckCircle,
      accent: "from-violet-600 to-violet-700",
    },
    {
      label: "View Analytics",
      description: "Procurement insights",
      href: "/dashboard/intelligence/procurement",
      icon: IconTrendingUp,
      accent: "from-emerald-600 to-emerald-700",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon
          const colorClass = colorStyles[metric.color]
          const iconColor = iconColors[metric.color]

          return (
            <Link
              key={metric.href}
              href={metric.href}
              className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br p-5 transition-all duration-300 ease-out hover:shadow-lg hover:border-opacity-100 hover:-translate-y-1 ${colorClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-secondary">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-heading">
                    {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
                  </p>
                  {metric.trend && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <IconTrendingUp
                        aria-hidden="true"
                        className={`h-4 w-4 ${
                          metric.trend.direction === "up"
                            ? "rotate-0 text-emerald-600"
                            : "rotate-180 text-rose-600"
                        }`}
                        stroke={2}
                      />
                      <span className="text-xs font-semibold text-secondary">
                        {metric.trend.direction === "up" ? "+" : "-"}
                        {metric.trend.value} this month
                      </span>
                    </div>
                  )}
                </div>

                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/40 transition-all duration-300 group-hover:scale-125 group-hover:bg-white/60 ${iconColor}`}>
                  <Icon aria-hidden="true" className="h-6 w-6 transition-all duration-300" stroke={2} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group relative overflow-hidden rounded-lg border border-[#e0e0db] bg-white p-5 transition-all duration-300 ease-out hover:border-[#c8a060]/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5 bg-gradient-to-br from-[#c8a060] to-transparent" />

              <div className="relative flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{action.label}</p>
                  <p className="mt-1 text-sm text-secondary">{action.description}</p>
                </div>

                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${action.accent} text-white transition-all duration-300 group-hover:scale-125`}>
                  <Icon aria-hidden="true" className="h-5 w-5 transition-all duration-300" stroke={2} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-accent transition-all duration-300 group-hover:gap-3">
                <span>Access</span>
                <IconArrowRight className="h-3.5 w-3.5 transition-all duration-300 group-hover:translate-x-1" stroke={2} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

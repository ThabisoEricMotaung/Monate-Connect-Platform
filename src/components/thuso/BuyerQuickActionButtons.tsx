"use client"

import React from "react"
import { IconFileCheck, IconFileText, IconSend, IconSearch } from "@tabler/icons-react"

interface BuyerQuickActionButtonsProps {
  rfqId?: number
}

interface BuyerQuickAction {
  id: string
  label: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  action: () => void
  variant: "primary" | "secondary"
}

export default function BuyerQuickActionButtons({ rfqId }: BuyerQuickActionButtonsProps) {
  const actions: BuyerQuickAction[] = [
    {
      id: "check-scores",
      label: "Check Scores",
      description: "View SmartScores",
      icon: IconFileCheck,
      action: () => console.log("Check scores clicked"),
      variant: "secondary",
    },
    {
      id: "review-docs",
      label: "Review Docs",
      description: "See compliance",
      icon: IconFileText,
      action: () => console.log("Review docs clicked"),
      variant: "secondary",
    },
    {
      id: "find-suppliers",
      label: "Find Suppliers",
      description: "Search alternatives",
      icon: IconSearch,
      action: () => console.log("Find suppliers clicked"),
      variant: "secondary",
    },
    {
      id: "route-approval",
      label: "Route to Finance",
      description: "Send for approval",
      icon: IconSend,
      action: () => console.log("Route clicked"),
      variant: "primary",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon
        const isPrimary = action.variant === "primary"

        return (
          <button
            key={action.id}
            onClick={action.action}
            className={`group relative overflow-hidden rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ease-out ${
              isPrimary
                ? "border border-[#1a3a2a]/30 bg-gradient-to-br from-[#1a3a2a] to-[#244f39] text-white hover:shadow-md hover:from-[#244f39] hover:to-[#2d5f47] hover:scale-105 active:scale-95"
                : "border border-[#e0e0db] bg-white text-[#1a3a2a] hover:border-[#c8a060]/50 hover:bg-[#f9f8f7] hover:shadow-sm hover:scale-105 active:scale-95"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Icon
                className={`h-4 w-4 transition-all duration-200 ${
                  isPrimary ? "text-white" : "text-[#c8a060] group-hover:text-[#1a3a2a]"
                }`}
                stroke={2}
              />
              <div className="text-left">
                <p className="leading-tight">{action.label}</p>
                <p className="text-[10px] leading-tight opacity-75">{action.description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

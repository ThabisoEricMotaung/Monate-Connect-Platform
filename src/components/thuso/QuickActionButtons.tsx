"use client"

import type { ComponentType } from "react"
import { IconFileCheck, IconListCheck, IconSend, IconUpload } from "@tabler/icons-react"

interface QuickActionButtonsProps { rfqId?: number }
interface QuickAction {
  id: string
  label: string
  icon: ComponentType<{ className?: string; stroke?: string | number }>
  action: () => void
  variant: "primary" | "secondary"
}

export default function QuickActionButtons({ rfqId }: QuickActionButtonsProps) {
  const actions: QuickAction[] = [
    { id: "upload", label: "Upload docs", icon: IconUpload, action: () => console.log("Upload clicked", rfqId), variant: "secondary" },
    { id: "check-score", label: "Check score", icon: IconFileCheck, action: () => console.log("Check score clicked"), variant: "secondary" },
    { id: "requirements", label: "View requirements", icon: IconListCheck, action: () => console.log("Requirements clicked"), variant: "secondary" },
    { id: "submit", label: "Submit response", icon: IconSend, action: () => console.log("Submit clicked"), variant: "primary" },
  ]

  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-3" aria-label="RFQ quick actions">
      {actions.map((action) => {
        const Icon = action.icon
        const isPrimary = action.variant === "primary"
        return (
          <button key={action.id} type="button" onClick={action.action} className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2 ${isPrimary ? "border border-[#1E3A2B] bg-[#1E3A2B] text-white hover:bg-[#294D39]" : "border border-[#D8D2C5] bg-white text-[#1E3A2B] hover:border-[#1E3A2B]/40 hover:bg-[#F4F0E7]"}`}>
            <Icon className={`h-4 w-4 ${isPrimary ? "text-white" : "text-[#A67832]"}`} stroke={2} />
            <span>{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}

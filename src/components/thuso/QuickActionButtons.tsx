"use client"

import { IconUpload, IconFileCheck, IconListCheck, IconSend } from "@tabler/icons-react"

interface QuickActionButtonsProps {
  rfqId?: number
}

interface QuickAction {
  id: string
  label: string
  description: string
  icon: any
  action: () => void
  variant: "primary" | "secondary"
}

export default function QuickActionButtons({ rfqId }: QuickActionButtonsProps) {
  const actions: QuickAction[] = [
    {
      id: "upload",
      label: "Upload Docs",
      description: "Add BEE cert, tax docs",
      icon: IconUpload,
      action: () => console.log("Upload clicked"),
      variant: "secondary",
    },
    {
      id: "check-score",
      label: "Check Score",
      description: "View SmartScore",
      icon: IconFileCheck,
      action: () => console.log("Check score clicked"),
      variant: "secondary",
    },
    {
      id: "requirements",
      label: "View Requirements",
      description: "See RFQ details",
      icon: IconListCheck,
      action: () => console.log("Requirements clicked"),
      variant: "secondary",
    },
    {
      id: "submit",
      label: "Submit Response",
      description: "Finalize & send",
      icon: IconSend,
      action: () => console.log("Submit clicked"),
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

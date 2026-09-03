"use client"

import { useState, type ComponentType } from "react"
import { createPortal } from "react-dom"
import { IconCheck, IconFileCheck, IconListCheck, IconSend, IconUpload } from "@tabler/icons-react"

export interface QuickAction {
  id: string
  label: string
  tooltip: string
  icon: ComponentType<{ className?: string; stroke?: string | number }>
  variant: "primary" | "secondary"
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "upload", label: "Upload docs", tooltip: "Add compliance documents, proposals, or supporting files", icon: IconUpload, variant: "secondary" },
  { id: "requirements", label: "View requirements", tooltip: "Review the RFQ scope, budget, and compliance checklist", icon: IconListCheck, variant: "secondary" },
  { id: "check-score", label: "Check score", tooltip: "See your SmartScore and identify gaps", icon: IconFileCheck, variant: "secondary" },
  { id: "submit", label: "Submit response", tooltip: "Submit your complete response to the buyer", icon: IconSend, variant: "primary" },
]

interface QuickActionButtonsProps {
  rfqId?: number
  completedIds: Set<string>
  onActionClick: (id: string) => void
}

interface TooltipPosition { id: string; top: number; left: number }

export default function QuickActionButtons({ rfqId, completedIds, onActionClick }: QuickActionButtonsProps) {
  const [tooltip, setTooltip] = useState<TooltipPosition | null>(null)

  const showTooltip = (id: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect()
    setTooltip({ id, top: rect.top, left: rect.left + rect.width / 2 })
  }
  const hideTooltip = (id: string) => {
    setTooltip((current) => (current?.id === id ? null : current))
  }

  const activeTooltip = tooltip ? QUICK_ACTIONS.find((action) => action.id === tooltip.id) : null

  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-3" aria-label="RFQ quick actions">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon
        const isPrimary = action.variant === "primary"
        const isDone = completedIds.has(action.id)
        return (
          <button
            key={action.id}
            type="button"
            onMouseEnter={(event) => showTooltip(action.id, event.currentTarget)}
            onMouseLeave={() => hideTooltip(action.id)}
            onFocus={(event) => showTooltip(action.id, event.currentTarget)}
            onBlur={() => hideTooltip(action.id)}
            onClick={() => {
              console.log(`${action.label} clicked`, rfqId)
              onActionClick(action.id)
            }}
            aria-describedby={`${action.id}-desc`}
            className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2 ${isPrimary ? "border border-[#1E3A2B] bg-[#1E3A2B] text-white hover:bg-[#294D39]" : "border border-[#D8D2C5] bg-white text-[#1E3A2B] hover:border-[#1E3A2B]/40 hover:bg-[#F4F0E7]"}`}
          >
            {isDone ? (
              <IconCheck className="h-4 w-4 text-emerald-500" stroke={2.5} />
            ) : (
              <Icon className={`h-4 w-4 ${isPrimary ? "text-white" : "text-[#A67832]"}`} stroke={2} />
            )}
            <span>{action.label}</span>
            <span id={`${action.id}-desc`} className="sr-only">{action.tooltip}</span>
          </button>
        )
      })}

      {activeTooltip && tooltip && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-hidden="true"
              style={{ top: tooltip.top - 8, left: tooltip.left }}
              className="pointer-events-none fixed z-[80] w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-[#1E3A2B] px-3 py-2 text-xs font-medium text-white shadow-lg"
            >
              {activeTooltip.tooltip}
              <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-[#1E3A2B]" />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

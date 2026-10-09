"use client"

import type { ReactNode } from "react"
import { IconMessageChatbot } from "@tabler/icons-react"
import type { ThusoContextRef } from "@/lib/thuso/session"
import { useThuso } from "./ThusoProvider"

/**
 * Opens the one shared Thuso panel, optionally pointed at a record. Use this
 * wherever a page wants an "Ask Thuso" entry point; never mount another chat.
 * Omit `context` to keep the conversation's current context; pass null to
 * switch to general help.
 */
export default function AskThusoButton({
  context,
  children = "Ask Thuso",
  className = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1E3A2B] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#294D39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A2B]",
  icon = true,
}: {
  context?: ThusoContextRef | null
  children?: ReactNode
  className?: string
  icon?: boolean
}) {
  const { openThuso } = useThuso()
  return (
    <button type="button" aria-haspopup="dialog" onClick={() => openThuso(context === undefined ? undefined : { context })} className={className}>
      {icon ? <IconMessageChatbot className="h-5 w-5 shrink-0" stroke={1.8} aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

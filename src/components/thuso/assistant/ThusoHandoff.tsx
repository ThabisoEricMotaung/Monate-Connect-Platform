"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import type { ThusoContextRef } from "@/lib/thuso/session"
import AskThusoButton from "./AskThusoButton"
import { useThuso } from "./ThusoProvider"

/**
 * Stands in for the retired embedded workspaces: opens the shared panel on
 * the requested record once, and explains where Thuso lives now. Links to the
 * old routes keep working until they are removed.
 */
export default function ThusoHandoff({
  context,
  ready = true,
  backHref,
  backLabel,
}: {
  context: ThusoContextRef | null
  ready?: boolean
  backHref?: string
  backLabel?: string
}) {
  const { openThuso } = useThuso()
  const opened = useRef(false)

  useEffect(() => {
    if (!ready || opened.current) return
    opened.current = true
    openThuso({ context })
  }, [ready, context, openThuso])

  return (
    <section className="rounded-2xl border border-[#DDD8CC] bg-white p-6 sm:p-8" aria-labelledby="thuso-handoff-title">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A67832]">Thuso assistant</p>
      <h2 id="thuso-handoff-title" className="mt-2 text-xl font-bold text-[#1E3A2B]">
        {context ? `Thuso is ready to discuss ${context.label}` : "Thuso opens beside any page"}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53665C]">
        Thuso now works in one panel that follows you around AiForm Procure, so your conversation carries on as you move between pages.
        It can explain and guide; uploads and submissions stay on their own pages.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AskThusoButton context={context}>{context ? "Open Thuso on this RFQ" : "Open Thuso"}</AskThusoButton>
        {backHref && backLabel ? (
          <Link href={backHref} className="text-sm font-semibold text-[#1E3A2B] underline-offset-4 hover:underline">
            {backLabel}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

"use client"

import { IconCheck, IconClock, IconFileText } from "@tabler/icons-react"

interface SupplierSidebarProps {
  rfqId?: number
  onNavigate?: () => void
}

export default function SupplierSidebar({ rfqId, onNavigate }: SupplierSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-5 flex items-center gap-3 border-b border-[#DDD8CC] pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2B] text-white"><IconFileText className="h-5 w-5" stroke={1.8} /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7B756B]">Workspace</p>
          <h2 className="text-base font-bold text-[#1E3A2B]">Active RFQs</h2>
        </div>
      </div>

      <nav aria-label="Active RFQs" className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        <button type="button" onClick={onNavigate} className="w-full cursor-pointer rounded-xl border border-[#1E3A2B]/20 bg-[#EAF0EB] p-3 text-left transition-colors duration-200 hover:border-[#1E3A2B]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-sm font-bold text-[#1E3A2B]">Bidvest #{rfqId || 451}</span>
            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-[#1E3A2B]">85%</span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#5F6F64]"><IconClock className="h-3.5 w-3.5" aria-hidden="true" /> Response in progress</p>
        </button>

        <button type="button" onClick={onNavigate} className="w-full cursor-pointer rounded-xl border border-transparent p-3 text-left transition-colors duration-200 hover:border-[#DDD8CC] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2">
          <div className="flex min-w-0 items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-[#33463A]">Eskom #428</span><span className="shrink-0 text-xs font-semibold text-[#7B756B]">30%</span></div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[#7B756B]"><IconClock className="h-3.5 w-3.5" aria-hidden="true" /> Not started</p>
        </button>

        <button type="button" onClick={onNavigate} className="w-full cursor-pointer rounded-xl border border-transparent p-3 text-left transition-colors duration-200 hover:border-[#DDD8CC] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2">
          <div className="flex min-w-0 items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-[#33463A]">CoJ #401</span><IconCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-label="Complete" /></div>
          <p className="mt-2 text-xs text-[#7B756B]">Submitted</p>
        </button>
      </nav>
    </div>
  )
}

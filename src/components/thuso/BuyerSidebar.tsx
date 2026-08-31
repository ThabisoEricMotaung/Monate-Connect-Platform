"use client"

import Link from "next/link"
import { IconFileText, IconHistory, IconBookmark, IconHelpCircle, IconSettings, IconPhone } from "@tabler/icons-react"

interface BuyerSidebarProps {
  rfqId?: number
  onNavigate?: () => void
}

export default function BuyerSidebar({ rfqId, onNavigate }: BuyerSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="mb-6 text-sm font-bold text-[#1a3a2a]">
        AiForm Procure
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-6">
        {/* Recent Chats */}
        <div>
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">
            Recent Chats
          </p>
          <div className="space-y-1">
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-[#1a3a2a] hover:bg-[#f5f5f3] transition">
              RFQ #451 Supplier Review
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition">
              RFQ #428 Approvals
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition">
              Scoring Discussion
            </button>
          </div>
        </div>

        {/* Active RFQs - Awaiting Action */}
        <div>
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">
            Awaiting Action
          </p>
          <div className="space-y-1">
            <button className="w-full text-left rounded-lg border border-rose-500/30 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span>Bidvest #451</span>
                <span className="text-xs bg-rose-200 px-2 py-1 rounded">2 Pending</span>
              </div>
              <p className="text-[10px] text-rose-600 mt-1">Awaiting approval</p>
            </button>
            <button className="w-full text-left rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span>Eskom #428</span>
                <span className="text-xs bg-amber-200 px-2 py-1 rounded">Review</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">Under evaluation</p>
            </button>
          </div>
        </div>

        {/* Completed RFQs */}
        <div>
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">
            Completed
          </p>
          <div className="space-y-1">
            <button className="w-full text-left rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span>CoJ #401</span>
                <span className="text-xs">✓</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">Awarded to Supplier X</p>
            </button>
          </div>
        </div>

        {/* Saved Templates */}
        <div>
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">
            Saved Templates
          </p>
          <div className="space-y-1">
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm text-[#555555] hover:bg-[#f5f5f3] transition">
              Standard rejection email
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm text-[#555555] hover:bg-[#f5f5f3] transition">
              Approval message
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm text-[#555555] hover:bg-[#f5f5f3] transition">
              Supplier followup
            </button>
          </div>
        </div>
      </nav>

      {/* Footer Navigation */}
      <div className="border-t border-[#e0e0db] pt-4 space-y-1">
        <Link
          href="/dashboard/help"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition"
        >
          <IconHelpCircle className="h-4 w-4 text-[#c8a060]" stroke={2} />
          Quick Help
        </Link>
        <Link
          href="/dashboard/admin/settings"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition"
        >
          <IconSettings className="h-4 w-4 text-[#c8a060]" stroke={2} />
          Settings
        </Link>
        <Link
          href="/dashboard/help?contact=true"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition"
        >
          <IconPhone className="h-4 w-4 text-[#c8a060]" stroke={2} />
          Support
        </Link>
      </div>
    </div>
  )
}

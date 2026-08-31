"use client"

import Link from "next/link"
import { IconFileText, IconHistory, IconBookmark, IconHelpCircle, IconSettings, IconPhone } from "@tabler/icons-react"

interface SupplierSidebarProps {
  rfqId?: number
  onNavigate?: () => void
}

export default function SupplierSidebar({ rfqId, onNavigate }: SupplierSidebarProps) {
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
              RFQ #451 Response
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition">
              RFQ #449 Compliance
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition">
              General Questions
            </button>
          </div>
        </div>

        {/* Active RFQs */}
        <div>
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">
            Active RFQs
          </p>
          <div className="space-y-1">
            <button className="w-full text-left rounded-lg border border-[#c8a060]/30 bg-gradient-to-r from-[#f5f9f7] to-[#eef4f2] px-3 py-2.5 text-sm font-semibold text-[#1a3a2a] transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span>Bidvest #451</span>
                <span className="text-xs text-[#999]">85%</span>
              </div>
              <p className="text-[10px] text-[#999] mt-1">Response in progress</p>
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition">
              <div className="flex items-center justify-between">
                <span>Eskom #428</span>
                <span className="text-xs text-[#999]">30%</span>
              </div>
              <p className="text-[10px] text-[#999] mt-1">Not started</p>
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-semibold text-[#555555] hover:bg-[#f5f5f3] transition">
              <div className="flex items-center justify-between">
                <span>CoJ #401</span>
                <span className="text-xs text-emerald-600">✓</span>
              </div>
              <p className="text-[10px] text-[#999] mt-1">Submitted</p>
            </button>
          </div>
        </div>

        {/* Saved Answers */}
        <div>
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#999]">
            Saved Answers
          </p>
          <div className="space-y-1">
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm text-[#555555] hover:bg-[#f5f5f3] transition">
              How to upload docs
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm text-[#555555] hover:bg-[#f5f5f3] transition">
              SmartScore explanation
            </button>
            <button className="w-full text-left rounded-lg px-3 py-2 text-sm text-[#555555] hover:bg-[#f5f5f3] transition">
              BEE cert requirements
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
          href="/dashboard/profile"
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

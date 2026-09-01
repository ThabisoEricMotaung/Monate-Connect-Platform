"use client"

import { useState } from "react"
import { IconMenu2, IconX } from "@tabler/icons-react"
import SupplierSidebar from "./SupplierSidebar"
import QuickActionButtons from "./QuickActionButtons"
import ChatInterface from "./ChatInterface"
import type { Message } from "./ChatInterface"
import InputBar from "./InputBar"

interface ThsuoWorkspaceProps {
  rfqId?: number
  userId?: string
}

export default function ThsuoWorkspace({ rfqId }: ThsuoWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to your RFQ response workspace. I can help you review requirements, prepare documents, and complete your response.",
    },
  ])

  const handleSendMessage = (message: string) => {
    setMessages((previous) => [...previous, { role: "user", content: message }])

    setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "I'm here to help you respond to this RFQ. What would you like to do next?" },
      ])
    }, 500)
  }

  return (
    <section className="relative mx-auto min-h-[680px] w-full max-w-[1200px] overflow-hidden rounded-2xl border border-[#DDD8CC] bg-[#F4F0E7] shadow-sm lg:h-[calc(100vh-8rem)] lg:min-h-[720px]">
      <button
        type="button"
        onClick={() => setSidebarOpen((open) => !open)}
        className="absolute left-4 top-4 z-50 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[#D8D2C5] bg-white text-[#1E3A2B] shadow-sm transition-colors duration-200 hover:bg-[#F4F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2 lg:hidden"
        aria-label="Toggle Active RFQs"
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <IconX className="h-5 w-5" stroke={1.8} /> : <IconMenu2 className="h-5 w-5" stroke={1.8} />}
      </button>

      {sidebarOpen ? (
        <button type="button" aria-label="Close Active RFQs" className="absolute inset-0 z-30 cursor-pointer bg-[#10261B]/35 lg:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <div className="grid min-h-[680px] grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <aside
          className={`absolute inset-y-0 left-0 z-40 w-[min(82vw,300px)] border-r border-[#DDD8CC] bg-[#FBF9F4] p-5 transition-transform duration-200 lg:relative lg:z-auto lg:w-auto lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <SupplierSidebar rfqId={rfqId} onNavigate={() => setSidebarOpen(false)} />
        </aside>

        <div className="flex min-w-0 flex-col overflow-hidden bg-white">
          <header className="border-b border-[#E6E0D5] bg-white px-4 py-4 pl-16 sm:px-6 sm:pl-16 lg:px-8">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7B756B]">Thuso workspace</p>
                <h1 className="mt-1 truncate text-xl font-bold text-[#1E3A2B] sm:text-2xl">RFQ Response Workspace</h1>
                {rfqId ? <p className="mt-1 text-sm text-[#6F6A61]">Working on RFQ #{rfqId}</p> : null}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D8D2C5] bg-[#F4F0E7] text-sm font-bold text-[#1E3A2B]">T</div>
            </div>
          </header>

          <div className="bg-[#1E3A2B] px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <p className="truncate text-sm font-semibold text-white">Workspace active · 3 active RFQs · SmartScore average 7.8 · 2 alerts</p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ChatInterface messages={messages} />
            <div className="border-t border-[#E6E0D5] bg-[#FBF9F4] px-4 pt-3 sm:px-6 lg:px-8">
              <QuickActionButtons rfqId={rfqId} />
            </div>
            <InputBar onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </section>
  )
}

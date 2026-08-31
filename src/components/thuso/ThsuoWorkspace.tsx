"use client"

import { ReactNode, useState } from "react"
import { IconMenu2, IconX } from "@tabler/icons-react"
import SupplierSidebar from "./SupplierSidebar"
import ProjectStatusCard from "./ProjectStatusCard"
import QuickActionButtons from "./QuickActionButtons"
import ChatInterface from "./ChatInterface"
import InputBar from "./InputBar"

interface ThsuoWorkspaceProps {
  rfqId?: number
  userId?: string
}

export default function ThsuoWorkspace({ rfqId, userId }: ThsuoWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content: "Hi there! 👋 Welcome to your operational command center.",
    },
  ])

  const handleSendMessage = (message: string, file?: File) => {
    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: message },
    ])

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm here to help you respond to this RFQ. What would you like to do next?",
        },
      ])
    }, 500)
  }

  return (
    <div className="flex min-h-screen bg-[#f8f8f6]">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e0e0db] bg-white text-[#555555] transition hover:text-[#1a3a2a]"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? (
          <IconX className="h-5 w-5" stroke={1.8} />
        ) : (
          <IconMenu2 className="h-5 w-5" stroke={1.8} />
        )}
      </button>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-y-0 left-0 z-40 w-64 border-r border-[#e8e8e6] bg-white p-4 md:relative md:z-auto">
          <SupplierSidebar rfqId={rfqId} onNavigate={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#e8e8e6] bg-white px-6 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-[#999]">Workspace</p>
              <h1 className="mt-1 text-xl font-semibold text-[#1a3a2a]">
                {rfqId ? `RFQ #${rfqId} Response` : "Command Centre"}
              </h1>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0e0db] bg-gradient-to-br from-[#f5f3f0] to-[#eae6e0] text-sm font-bold text-[#1a3a2a]">
              T
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-[#1a3a2a] px-6 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-sm font-semibold text-white">
              Command Centre Active • Total RFQs: 3 • SmartScore avg: 7.8 • Alerts: 2
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Project Status + Quick Actions */}
          <div className="border-b border-[#e8e8e6] bg-[#fafaf8] px-6 py-6 md:px-8 space-y-4">
            <ProjectStatusCard rfqId={rfqId} />
            <QuickActionButtons rfqId={rfqId} />
          </div>

          {/* Chat + Input Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatInterface messages={messages} />
            <InputBar onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { IconCheck, IconMenu2, IconSearch, IconX } from "@tabler/icons-react"
import SupplierSidebar from "./SupplierSidebar"
import QuickActionButtons, { QUICK_ACTIONS } from "./QuickActionButtons"
import ChatInterface from "./ChatInterface"
import type { Message } from "./ChatInterface"
import InputBar from "./InputBar"
import {
  buildRfqSearchIndex,
  buildRfqSystemPromptContext,
  fetchRfqContext,
  searchRfqSections,
  type RfqContext,
  type RfqSearchSection,
} from "@/lib/rfqContextProvider"

interface ThsuoWorkspaceProps {
  rfqId?: number
  userId?: string
  userRole?: "supplier" | "buyer"
}

const ONBOARDING_DISMISSED_KEY = "thuso-workspace-onboarding-dismissed"

const ONBOARDING_STEPS = [
  { title: "Upload docs", detail: "Add your compliance documents and proposal files." },
  { title: "View requirements", detail: "Review the RFQ scope, budget, and compliance checklist." },
  { title: "Check your score", detail: "See your SmartScore and close any gaps before you submit." },
  { title: "Submit your response", detail: "Send your complete response to the buyer." },
]

export default function ThsuoWorkspace({ rfqId, userRole = "supplier" }: ThsuoWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [rfqContext, setRfqContext] = useState<RfqContext | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to your RFQ response workspace. I can help you [upload docs], [view requirements], [check score], and [submit response] — start with the step highlighted below, or ask me anything about this RFQ.",
    },
  ])

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDING_DISMISSED_KEY)) setShowOnboarding(true)
    } catch {
      setShowOnboarding(true)
    }
  }, [])

  useEffect(() => {
    if (!rfqId) return
    let cancelled = false
    fetchRfqContext(rfqId).then((context) => {
      if (!cancelled && context) setRfqContext(context)
    })
    return () => {
      cancelled = true
    }
  }, [rfqId])

  const searchIndex = useMemo(() => (rfqContext ? buildRfqSearchIndex(rfqContext) : []), [rfqContext])
  const searchResults = useMemo(() => searchRfqSections(searchIndex, searchQuery), [searchIndex, searchQuery])

  const dismissOnboarding = () => {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true")
      } catch {
        // localStorage unavailable — the banner will simply reappear next visit
      }
    }
    setShowOnboarding(false)
  }

  const currentStepIndex = QUICK_ACTIONS.findIndex((action) => !completedIds.has(action.id))
  const activeStepIndex = currentStepIndex === -1 ? QUICK_ACTIONS.length - 1 : currentStepIndex

  const handleQuickAction = (id: string) => {
    if (completedIds.has(id)) return
    const action = QUICK_ACTIONS.find((item) => item.id === id)
    if (!action) return

    const nextCompleted = new Set(completedIds)
    nextCompleted.add(id)
    setCompletedIds(nextCompleted)

    const stepNumber = QUICK_ACTIONS.findIndex((item) => item.id === id) + 1
    const nextAction = QUICK_ACTIONS.find((item) => !nextCompleted.has(item.id))
    const followUp = nextAction
      ? `Next up — Step ${stepNumber + 1}/${QUICK_ACTIONS.length}: [${nextAction.label}].`
      : "That's every step done — your response is ready to review."

    setMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        content: `Marked Step ${stepNumber}/${QUICK_ACTIONS.length} (${action.label}) as done. ${followUp}`,
      },
    ])
  }

  const handleSendMessage = async (message: string) => {
    // Strip the UI's [bracket] chip styling before sending history to the model —
    // otherwise it mimics the bracket convention and answers with placeholders
    // like "[insert deadline date]" instead of the real value.
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content: content.replace(/\[([^\]]+)\]/g, "$1") }))
    setMessages((previous) => [...previous, { role: "user", content: message }])
    setIsThinking(true)

    try {
      const response = await fetch("/api/thuso/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          conversationHistory: history,
          rfqContext: rfqContext ? buildRfqSystemPromptContext(rfqContext) : undefined,
          userRole,
        }),
      })
      const data = (await response.json()) as { message?: string; error?: string }
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: (response.ok && data.message) || data.error || "Sorry, I couldn't process that — please try again." },
      ])
    } catch (error) {
      console.error("Thuso chat request failed:", error)
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "Sorry, I'm having trouble responding right now. Please try again in a moment." },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const handleAskAboutSection = (section: RfqSearchSection) => {
    setSearchQuery("")
    void handleSendMessage(`Tell me more about ${section.heading.toLowerCase()} for this RFQ.`)
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

      {showOnboarding ? (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#10261B]/45 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="w-full max-w-md rounded-2xl border border-[#DDD8CC] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="onboarding-title" className="text-lg font-bold text-[#1E3A2B]">Here&apos;s how to respond to an RFQ</h2>
              <button
                type="button"
                onClick={dismissOnboarding}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#7B756B] transition-colors duration-200 hover:bg-[#F4F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
              >
                <IconX className="h-4 w-4" stroke={2} />
              </button>
            </div>

            <ol className="mt-4 space-y-3">
              {ONBOARDING_STEPS.map((step, index) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E3A2B] text-xs font-bold text-white">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#1E3A2B]">{step.title}</p>
                    <p className="text-xs text-[#6F6A61]">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-[#33463A]">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => setDontShowAgain(event.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-[#D8D2C5] text-[#1E3A2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
              />
              Don&apos;t show this again
            </label>

            <button
              type="button"
              onClick={dismissOnboarding}
              className="mt-5 w-full cursor-pointer rounded-xl bg-[#1E3A2B] px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#294D39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
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

          <nav aria-label="Response progress" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-[#E6E0D5] bg-[#FBF9F4] px-4 py-2.5 text-xs sm:px-6 lg:px-8">
            {QUICK_ACTIONS.map((action, index) => {
              const isDone = completedIds.has(action.id)
              const isCurrent = index === activeStepIndex && !isDone
              return (
                <span key={action.id} className="flex items-center gap-1.5">
                  {index > 0 ? <span className="text-[#C9C2B2]">•</span> : null}
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                      isDone
                        ? "text-emerald-700"
                        : isCurrent
                          ? "bg-[#1E3A2B] text-white"
                          : "text-[#7B756B]"
                    }`}
                  >
                    {isDone ? <IconCheck className="h-3 w-3" stroke={3} /> : null}
                    Step {index + 1}/{QUICK_ACTIONS.length}: {action.label}
                  </span>
                </span>
              )
            })}
          </nav>

          {rfqId ? (
            <div className="border-b border-[#E6E0D5] bg-white px-4 py-3 sm:px-6 lg:px-8">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A67832]" stroke={2} aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search RFQ requirements, docs, FAQs"
                  aria-label="Search RFQ requirements, docs, FAQs"
                  className="w-full rounded-xl border border-[#D8D2C5] bg-[#FBF9F4] py-2.5 pl-9 pr-3 text-sm text-[#1E3A2B] placeholder-[#857F75] focus:border-[#1E3A2B]/50 focus:outline-none focus:ring-2 focus:ring-[#1E3A2B]/10"
                />
              </div>

              {searchQuery.trim() ? (
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="text-xs text-[#7B756B]">No matches in this RFQ&apos;s requirements, docs, or FAQs.</p>
                  ) : (
                    searchResults.map((section) => (
                      <div key={section.id} className="rounded-lg border border-[#E6E0D5] bg-[#FBF9F4] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A2B]">{section.heading}</p>
                          <button
                            type="button"
                            onClick={() => handleAskAboutSection(section)}
                            className="shrink-0 cursor-pointer text-xs font-semibold text-[#A67832] hover:underline"
                          >
                            Ask Thuso →
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm text-[#33463A]">{section.content}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ChatInterface messages={messages} isTyping={isThinking} />
            <div className="border-t border-[#E6E0D5] bg-[#FBF9F4] px-4 pt-3 sm:px-6 lg:px-8">
              <QuickActionButtons rfqId={rfqId} completedIds={completedIds} onActionClick={handleQuickAction} />
            </div>
            <InputBar onSendMessage={handleSendMessage} />
          </div>
        </div>
      </div>
    </section>
  )
}

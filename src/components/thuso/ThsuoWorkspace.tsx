"use client"

import { useEffect, useState } from "react"
import { IconCheck, IconMenu2, IconX } from "@tabler/icons-react"
import SupplierSidebar from "./SupplierSidebar"
import QuickActionButtons, { QUICK_ACTIONS } from "./QuickActionButtons"
import ChatInterface from "./ChatInterface"
import type { Message } from "./ChatInterface"
import InputBar from "./InputBar"

interface ThsuoWorkspaceProps {
  rfqId?: number
  userId?: string
}

const ONBOARDING_DISMISSED_KEY = "thuso-workspace-onboarding-dismissed"

const ONBOARDING_STEPS = [
  { title: "Upload docs", detail: "Add your compliance documents and proposal files." },
  { title: "View requirements", detail: "Review the RFQ scope, budget, and compliance checklist." },
  { title: "Check your score", detail: "See your SmartScore and close any gaps before you submit." },
  { title: "Submit your response", detail: "Send your complete response to the buyer." },
]

export default function ThsuoWorkspace({ rfqId }: ThsuoWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to your RFQ response workspace. I can help you [upload docs], [view requirements], [check score], and [submit response] — start with the step highlighted below.",
    },
  ])

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDING_DISMISSED_KEY)) setShowOnboarding(true)
    } catch {
      setShowOnboarding(true)
    }
  }, [])

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

  const handleSendMessage = (message: string) => {
    setMessages((previous) => [...previous, { role: "user", content: message }])

    setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "I can help you [upload docs], [review requirements], [check your score], or [submit]. What's next?",
        },
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ChatInterface messages={messages} />
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

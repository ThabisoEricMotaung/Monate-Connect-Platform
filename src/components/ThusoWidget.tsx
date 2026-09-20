"use client"

import { useState, useRef, useEffect } from "react"

type Message = {
  id: string
  type: "user" | "bot"
  text: string
  timestamp: Date
}

type ThusoContext = "general" | "rfq"
type DisplayMode = "floating" | "modal"

interface ThusoWidgetProps {
  context?: ThusoContext
  displayMode?: DisplayMode
  isOpen?: boolean
  onClose?: () => void
}

export default function ThusoWidget({
  context = "general",
  displayMode = "floating",
  isOpen: externalIsOpen,
  onClose
}: ThusoWidgetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const getInitialMessages = () => {
    return [
      {
        id: "1",
        type: "bot" as const,
        text: "Hi! 👋 I'm Thuso. I can help with procurement questions, opportunities, supplier verification, RFQ analysis, and how to use AiForm Procure.",
        timestamp: new Date(),
      },
      {
        id: "2",
        type: "bot" as const,
        text: "Ask me about: finding opportunities, RFQs, supplier verification, bid analysis, compliance, pricing, or getting started.",
        timestamp: new Date(),
      },
    ]
  }

  const [messages, setMessages] = useState<Message[]>(getInitialMessages())
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()

    // RFQ-specific responses
    if (context === "rfq") {
      // RFQ evaluation
      if (input.includes("evaluat") || input.includes("assess") || input.includes("score") || input.includes("bid")) {
        return "To evaluate bids: 1) Check supplier compliance (BBBEE, CSD, SARS status), 2) Compare pricing and delivery timelines, 3) Review past performance, 4) Use scoring criteria for objective ranking. Visit the Verifications section for supplier details."
      }

      // RFQ requirements
      if (input.includes("require") || input.includes("spec") || input.includes("criteria") || input.includes("must have")) {
        return "Clear RFQ requirements should include: scope of work, delivery timeline, budget, compliance requirements, evaluation criteria, and submission deadlines. Ensure all terms are documented to avoid disputes during execution."
      }

      // Supplier response analysis
      if (input.includes("response") || input.includes("quote") || input.includes("proposal") || input.includes("submit")) {
        return "Review each supplier response against your RFQ criteria. Check: completeness of submission, pricing breakdown, timeline feasibility, compliance documentation, and references. Flag any gaps or unclear items for clarification."
      }

      // Default RFQ help
      return "I can help with: bid evaluation, supplier scoring, compliance verification, RFQ best practices, or next steps in your procurement process. What would you like help with?"
    }

    // General procurement responses
    // RFQ & Opportunities - check this FIRST (before general procure)
    if (input.includes("opportunit") || input.includes("available") || input.includes("rfq") || input.includes("tender")) {
      return "You can browse all live opportunities on our Opportunities page, filtered by industry, province, and closing date. Click 'Opportunities' in the menu to see what's available today. All opportunities are sourced from official government and private procurement listings."
    }

    // Supplier verification
    if (input.includes("verif") || input.includes("compliance") || input.includes("bbbee") || input.includes("csd") || input.includes("trust")) {
      return "We verify suppliers against BBBEE level, CSD status, SARS tax compliance, and POPIA awareness. Visit our Trust Centre to learn how verification works and what each compliance badge means."
    }

    // Getting started / Registration
    if (input.includes("start") || input.includes("register") || input.includes("sign up") || input.includes("begin") || input.includes("how do i")) {
      return "To get started: 1) Browse the Opportunities page to see live tenders, 2) Register free to post RFQs or create a supplier profile, 3) Set up alerts for opportunities in your industry, 4) Verify your business to increase visibility."
    }

    // Pricing
    if (input.includes("price") || input.includes("cost") || input.includes("plan") || input.includes("pricing")) {
      return "Check our Pricing page for flexible plans. We offer free listings for suppliers, plus paid options for RFQ posting, advanced features, and enterprise accounts. We also run pilot programs for procurement teams."
    }

    // General procurement / Platform info
    if (input.includes("procure") || input.includes("sourcing") || input.includes("supplier") || input.includes("purchase") || input.includes("how")) {
      return "AiForm Procure connects buyers with verified suppliers, bringing transparency to government procurement. We screen public tenders, help you source verified businesses, and ensure compliance standards are met."
    }

    // Default response
    return "I can help with questions about finding opportunities, supplier verification, getting started, pricing, or general procurement topics. What would you like to know?"
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Simulate bot response delay
    setTimeout(() => {
      const botResponse = getBotResponse(inputValue)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: botResponse,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)
    }, 800)
  }


  const handleClose = () => {
    if (displayMode === "modal" && onClose) {
      onClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  const handleOpen = () => {
    setInternalIsOpen(true)
  }

  // For modal mode, don't show floating button
  if (displayMode === "modal" && !isOpen) {
    return null
  }

  return (
    <>
      {/* Floating Button - only for floating mode */}
      {displayMode === "floating" && !isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#123c2b] text-white shadow-lg transition hover:bg-[#0f2e21] active:scale-95"
          aria-label="Open chat"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chat Modal/Panel */}
      {isOpen && (
        <div className={displayMode === "modal" ? "fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center" : "fixed bottom-20 right-6 z-40 flex flex-col"}>
          {/* Backdrop - only for modal mode */}
          {displayMode === "modal" && (
            <div
              className="absolute inset-0 bg-black/20"
              onClick={handleClose}
            />
          )}

          {/* Chat Box */}
          <div className="w-full max-w-sm rounded-none border border-[#e5e5e7] bg-white shadow-xl sm:max-h-[600px] flex flex-col" style={displayMode === "floating" ? { width: "360px", maxHeight: "500px" } : {}}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e5e7] bg-[#f9f9fa] p-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#123c2b] flex items-center justify-center text-white text-sm font-bold">
                  T
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1f2937]">Thuso</p>
                  <p className="text-xs text-[#6b7280]">{context === "rfq" ? "RFQ Assistant" : "Support Assistant"}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-[#6b7280] hover:text-[#1f2937]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-white p-4 flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.type === "bot" && (
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[#7B5BA4] to-[#6b4a94] flex items-center justify-center text-white text-xs font-bold">
                      T
                    </div>
                  )}
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      message.type === "user"
                        ? "bg-[#123c2b] text-white"
                        : "bg-[#f3f4f6] text-[#1f2937]"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-[#123c2b] flex items-center justify-center text-white text-xs font-bold">
                    T
                  </div>
                  <div className="bg-[#f3f4f6] text-[#1f2937] rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-[#123c2b] rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-[#123c2b] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="h-2 w-2 bg-[#123c2b] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-[#e5e5e7] bg-[#f9f9fa] p-4 flex-shrink-0">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleSendMessage()
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 rounded-none border border-[#d4d0c4] bg-white px-3 py-2 text-sm text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#123c2b] disabled:bg-[#f3f4f6]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="inline-flex items-center justify-center rounded-none bg-[#123c2b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2e21] disabled:bg-[#9ca3af] disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
              <a
                href="/contact"
                className="block w-full rounded-none border border-[#d4d0c4] bg-white px-3 py-2 text-xs font-semibold text-[#123c2b] transition hover:bg-[#f3f4f6] text-center"
              >
                📧 Contact Support Team
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

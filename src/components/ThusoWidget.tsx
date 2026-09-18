"use client"

import { useState, useRef, useEffect } from "react"

type Message = {
  id: string
  type: "user" | "bot"
  text: string
  timestamp: Date
}

export default function ThusoWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      text: "Hi! 👋 I'm Thuso. I can help answer questions about AiForm Procure and public procurement opportunities.",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "bot",
      text: "Ask me about how to find opportunities, supplier verification, or getting started on the platform.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: "Thanks for your message! For detailed assistance, I recommend emailing our team at aiformstudio@gmail.com and we'll get back to you shortly.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)
    }, 1000)
  }

  const handleEmailWithContext = () => {
    const emailBody = messages
      .filter((msg) => msg.type === "user")
      .map((msg) => `- ${msg.text}`)
      .join("\n")

    const mailtoLink = `mailto:aiformstudio@gmail.com?subject=Support Request from AiForm Procure&body=${encodeURIComponent(
      `Hi Thuso team,\n\nI have the following question(s):\n\n${emailBody}\n\nPlease help me with this.\n\nThanks!`
    )}`

    window.location.href = mailtoLink
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#123c2b] text-white shadow-lg transition hover:bg-[#0f2e21] active:scale-95"
        aria-label="Open chat"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Box */}
          <div className="relative w-full max-w-sm rounded-none border border-[#e5e5e7] bg-white shadow-xl sm:max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e5e7] bg-[#f9f9fa] p-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#123c2b] flex items-center justify-center text-white text-sm font-bold">
                  T
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1f2937]">Thuso</p>
                  <p className="text-xs text-[#6b7280]">Support Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
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
              <button
                onClick={handleEmailWithContext}
                className="w-full rounded-none border border-[#d4d0c4] bg-white px-3 py-2 text-xs font-semibold text-[#123c2b] transition hover:bg-[#f3f4f6]"
              >
                📧 Email Support
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

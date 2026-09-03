"use client"

import { useEffect, useRef } from "react"

export interface Message { role: "user" | "assistant"; content: string }
interface ChatInterfaceProps { messages: Message[] }

function renderContent(content: string, isUser: boolean) {
  const parts = content.split(/(\[[^\]]+\])/g).filter(Boolean)
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]$/)
    if (!match) return <span key={index}>{part}</span>
    return (
      <span
        key={index}
        className={`mx-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${isUser ? "bg-white/20 text-white" : "bg-[#1E3A2B]/10 text-[#1E3A2B]"}`}
      >
        {match[1]}
      </span>
    )
  })
}

export default function ChatInterface({ messages }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-4 py-6 sm:px-6 lg:px-8" aria-live="polite">
      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${message.role === "user" ? "rounded-br-md bg-[#1E3A2B] text-white" : "rounded-bl-md border border-[#E6E0D5] bg-[#F4F0E7] text-[#1E3A2B]"}`}>
            <p className="text-sm leading-6">{renderContent(message.content, message.role === "user")}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

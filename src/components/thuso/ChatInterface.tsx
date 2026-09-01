"use client"

import { useEffect, useRef } from "react"

export interface Message { role: "user" | "assistant"; content: string }
interface ChatInterfaceProps { messages: Message[] }

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
            <p className="text-sm leading-6">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

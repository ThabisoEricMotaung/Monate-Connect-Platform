"use client"

import { useEffect, useRef } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  messages: Message[]
}

export default function ChatInterface({ messages }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-white px-6 py-6 md:px-8 space-y-4"
    >
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-xs lg:max-w-md rounded-lg px-4 py-3 ${
              message.role === "user"
                ? "bg-[#1a3a2a] text-white"
                : "border border-[#e0e0db] bg-[#f5f5f3] text-[#1a3a2a]"
            }`}
          >
            <p className="text-sm leading-6">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

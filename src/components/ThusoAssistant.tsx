"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const greeting =
  "Dumela! I'm Thuso. Ask me anything about using AiForm Procure or how SA procurement works — CSD, BBBEE, tax clearance, RFQs, anything."

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.5 18.2 4 21l3.4-1.1c1.3.7 2.9 1.1 4.6 1.1 5 0 9-3.4 9-7.7s-4-7.7-9-7.7-9 3.4-9 7.7c0 1.9.9 3.7 2.5 4.9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 12.6h7M8.5 9.4h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4 12 16-8-5 16-3-6-8-2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m12 14 3-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-2" aria-label="Thuso is typing">
      <span className="h-2 w-2 animate-pulse rounded-full bg-secondary [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-secondary [animation-delay:120ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-secondary [animation-delay:240ms]" />
    </div>
  )
}

function stripMarkdownMarkers(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)\*([^*\s][^*\n]*?)\*(?=\s|$|[.,;:!?])/g, "$1$2")
}

export default function ThusoAssistant() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showNudge, setShowNudge] = useState(false)
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem("thuso-nudge-seen")
      if (!seen) {
        setShowNudge(true)
        window.localStorage.setItem("thuso-nudge-seen", "true")
      }
    } catch {
      setShowNudge(false)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return

    setMessages((current) =>
      current.length > 0 ? current : [{ role: "assistant", content: greeting }]
    )

    window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, loading])

  function dismissNudge() {
    setShowNudge(false)
  }

  async function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMessage: ChatMessage = { role: "user", content: trimmed }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput("")
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      })

      const data = (await response.json()) as { reply?: string; error?: string }

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Thuso is taking a breather — please try again.")
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply as string },
      ])
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Thuso is taking a breather — please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  if (
    pathname?.startsWith("/auth/") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return null
  }

  return (
    <>
      {open ? (
        <section className="thuso-panel" aria-label="Thuso assistant panel">
          <header className="flex items-start justify-between gap-4 border-b border-panel px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-heading">Thuso</h2>
              <p className="mt-1 text-xs text-secondary">AiForm Procure assistant</p>
            </div>
            <button
              type="button"
              aria-label="Close Thuso assistant"
              onClick={() => setOpen(false)}
              className="rounded-full border border-panel bg-panel px-3 py-1 text-sm font-bold text-secondary transition hover:border-accent hover:text-accent"
            >
              ×
            </button>
          </header>

          <div className="thuso-messages">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`thuso-bubble ${
                  message.role === "user" ? "thuso-bubble--user" : "thuso-bubble--assistant"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {message.role === "assistant"
                    ? stripMarkdownMarkers(message.content)
                    : message.content}
                </p>
              </article>
            ))}
            {loading ? (
              <article className="thuso-bubble thuso-bubble--assistant">
                <TypingDots />
              </article>
            ) : null}
            {error ? (
              <p className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
                {error}
              </p>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-panel p-4">
            <label htmlFor="thuso-input" className="sr-only">
              Ask Thuso
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="thuso-input"
                type="text"
                value={input}
                maxLength={1000}
                aria-label="Ask Thuso a question"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask about RFQs, CSD, BBBEE..."
                className="min-w-0 flex-1 rounded-md border border-panel bg-page px-3 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="submit"
                aria-label="Send message to Thuso"
                disabled={loading || input.trim().length === 0}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent bg-accent text-button shadow-panel transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {showNudge ? (
        <div className="thuso-nudge" role="status">
          <p>Ask me anything about AiForm Procure or SA procurement</p>
          <button type="button" aria-label="Dismiss Thuso tip" onClick={dismissNudge}>
            ×
          </button>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={open ? "Close Thuso assistant" : "Open Thuso assistant"}
        aria-expanded={open}
        onClick={() => {
          dismissNudge()
          setOpen((current) => !current)
        }}
        className="thuso-launcher"
      >
        <ChatIcon />
      </button>
    </>
  )
}

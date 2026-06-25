"use client"

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

type Message = {
  id: number
  role: "user" | "assistant"
  text: string
  imagePreview?: string
}

type FeedbackStatus = "pending" | "liked" | "commenting" | "done"

type FeedbackEntry = {
  status: FeedbackStatus
  detail: string
}

const SUGGESTED = [
  "How does supplier verification work?",
  "What is SmartScore and how is it calculated?",
  "How do I respond to an RFQ?",
]

const GREETING =
  "Dumela! I'm Thuso. Ask me anything about using AiForm Procure or how SA procurement works — CSD, BBBEE, tax clearance, RFQs, anything."

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

let _msgId = 0
function newMsgId() {
  return _msgId++
}

function DataImg({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />
}

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

function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.2a2 2 0 0 1-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ThumbUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ThumbDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Thuso is typing">
      <span className="thuso-dot" style={{ animationDelay: "0ms" }} />
      <span className="thuso-dot" style={{ animationDelay: "150ms" }} />
      <span className="thuso-dot" style={{ animationDelay: "300ms" }} />
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showNudge, setShowNudge] = useState(false)
  const [feedback, setFeedback] = useState<Record<number, FeedbackEntry>>({})
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string } | null>(null)

  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const hasUserMessage = messages.some((m) => m.role === "user")

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
      current.length > 0
        ? current
        : [{ id: newMsgId(), role: "assistant", text: GREETING }]
    )
    window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, loading])

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!open) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) loadImageFile(file)
          break
        }
      }
    }
    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [open])

  function loadImageFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Unsupported image type. Use JPEG, PNG, WebP, or GIF.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be under 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPendingImage({ dataUrl })
      setError("")
    }
    reader.readAsDataURL(file)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) loadImageFile(file)
    event.target.value = ""
  }

  function dismissNudge() {
    setShowNudge(false)
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if ((!text && !pendingImage) || loading) return

    const userMsg: Message = {
      id: newMsgId(),
      role: "user",
      text,
      imagePreview: pendingImage?.dataUrl,
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setPendingImage(null)
    setError("")
    setLoading(true)

    const slice = nextMessages.slice(-12)
    const apiMessages = slice.map((m, i) => {
      const isLast = i === slice.length - 1
      if (m.role === "user" && m.imagePreview && isLast) {
        type TextPart = { type: "text"; text: string }
        type ImgPart = { type: "image_url"; image_url: { url: string } }
        const parts: Array<TextPart | ImgPart> = []
        if (m.text) parts.push({ type: "text", text: m.text })
        parts.push({ type: "image_url", image_url: { url: m.imagePreview } })
        return { role: m.role, content: parts }
      }
      const content =
        m.role === "user" && m.imagePreview && !m.text ? "[shared an image]" : m.text
      return { role: m.role as "user" | "assistant", content }
    })

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      })

      const data = (await response.json()) as { reply?: string; error?: string }

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Thuso is taking a breather — please try again.")
      }

      setMessages((current) => [
        ...current,
        { id: newMsgId(), role: "assistant", text: data.reply as string },
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

  function handleFeedbackYes(msgId: number) {
    setFeedback((prev) => ({ ...prev, [msgId]: { status: "liked", detail: "" } }))
  }

  function handleFeedbackNo(msgId: number) {
    setFeedback((prev) => ({
      ...prev,
      [msgId]: { status: "commenting", detail: prev[msgId]?.detail ?? "" },
    }))
  }

  function handleFeedbackDetailChange(msgId: number, detail: string) {
    setFeedback((prev) => ({ ...prev, [msgId]: { ...prev[msgId], detail } }))
  }

  function handleFeedbackSubmit(msgId: number) {
    const detail = feedback[msgId]?.detail ?? ""
    console.log("[Thuso feedback] negative:", detail)
    setFeedback((prev) => ({ ...prev, [msgId]: { status: "done", detail } }))
  }

  function renderFeedback(msgId: number) {
    const fb = feedback[msgId]
    const status = fb?.status ?? "pending"

    if (status === "liked") {
      return <p className="thuso-feedback-thanks">Thanks!</p>
    }

    if (status === "done") {
      return <p className="thuso-feedback-thanks">Thanks for the feedback!</p>
    }

    if (status === "commenting") {
      return (
        <div className="thuso-feedback-detail">
          <input
            type="text"
            value={fb?.detail ?? ""}
            onChange={(e) => handleFeedbackDetailChange(msgId, e.target.value)}
            placeholder="What went wrong?"
            className="thuso-feedback-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFeedbackSubmit(msgId)
            }}
          />
          <button
            type="button"
            className="thuso-feedback-send"
            onClick={() => handleFeedbackSubmit(msgId)}
          >
            Send
          </button>
        </div>
      )
    }

    return (
      <div className="thuso-feedback-row">
        <span className="thuso-feedback-label">Was this helpful?</span>
        <button
          type="button"
          className="thuso-feedback-btn"
          onClick={() => handleFeedbackYes(msgId)}
          aria-label="Yes, this was helpful"
        >
          <ThumbUpIcon /> Yes
        </button>
        <button
          type="button"
          className="thuso-feedback-btn"
          onClick={() => handleFeedbackNo(msgId)}
          aria-label="No, this was not helpful"
        >
          <ThumbDownIcon /> No
        </button>
      </div>
    )
  }

  if (
    pathname?.startsWith("/auth/") ||
    pathname === "/forgot-password" ||
    pathname === "/auth/reset-password"
  ) {
    return null
  }

  return (
    <>
      {open ? (
        <section className="thuso-panel" aria-label="Thuso assistant panel">
          <header
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ background: "#1a3a2a", borderBottom: "1px solid rgba(240,235,224,0.12)" }}
          >
            <div className="flex items-center gap-2.5">
              <Image
                src="/aiform-mark.png"
                alt="AiForm"
                width={32}
                height={32}
                className="rounded-md shrink-0"
                priority
              />
              <div>
                <h2 className="text-sm font-bold leading-tight" style={{ color: "#f0ebe0" }}>Thuso</h2>
                <p className="text-xs leading-tight" style={{ color: "rgba(240,235,224,0.65)" }}>AiForm Procure assistant</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Thuso assistant"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 text-sm font-bold transition"
              style={{ color: "#f0ebe0", border: "1px solid rgba(240,235,224,0.35)", background: "rgba(240,235,224,0.08)" }}
            >
              ×
            </button>
          </header>

          <div className="thuso-messages">
            {!hasUserMessage ? (
              <div className="thuso-suggestions">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="thuso-suggestion-card"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((msg, index) =>
              msg.role === "assistant" ? (
                <div key={msg.id} className="thuso-message-row flex items-start gap-2">
                  <Image
                    src="/aiform-mark.png"
                    alt=""
                    width={20}
                    height={20}
                    className="thuso-avatar"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <article className="thuso-bubble thuso-bubble--assistant">
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {stripMarkdownMarkers(msg.text)}
                      </p>
                    </article>
                    {index > 0 ? renderFeedback(msg.id) : null}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="thuso-message-row flex justify-end">
                  <article className="thuso-bubble thuso-bubble--user">
                    {msg.imagePreview ? (
                      <DataImg
                        src={msg.imagePreview}
                        alt="Attached image"
                        className="mb-2 max-h-32 w-auto rounded"
                      />
                    ) : null}
                    {msg.text ? (
                      <p className="whitespace-pre-wrap text-sm leading-6">{msg.text}</p>
                    ) : null}
                  </article>
                </div>
              )
            )}

            {loading ? (
              <div className="flex items-start gap-2">
                <Image
                  src="/aiform-mark.png"
                  alt=""
                  width={20}
                  height={20}
                  className="thuso-avatar"
                  aria-hidden="true"
                />
                <article className="thuso-bubble thuso-bubble--assistant">
                  <TypingDots />
                </article>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
                {error}
              </p>
            ) : null}

            <div ref={messageEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 thuso-input-area">
            {pendingImage ? (
              <div className="relative mb-2 inline-block">
                <DataImg
                  src={pendingImage.dataUrl}
                  alt="Pending attachment"
                  className="h-16 w-auto rounded-md border border-panel object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => setPendingImage(null)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-xs font-bold leading-none text-page"
                >
                  ×
                </button>
              </div>
            ) : null}

            <label htmlFor="thuso-input" className="sr-only">
              Ask Thuso
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleFileChange}
              tabIndex={-1}
            />

            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Attach image"
                onClick={() => fileInputRef.current?.click()}
                className="thuso-attach-btn inline-flex h-12 w-10 shrink-0 items-center justify-center rounded-md border transition"
              >
                <PaperclipIcon />
              </button>

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
                disabled={loading || (input.trim().length === 0 && !pendingImage)}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-panel transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "#1a3a2a", border: "1px solid #1a3a2a", color: "#f0ebe0" }}
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

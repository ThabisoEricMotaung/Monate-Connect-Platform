"use client"

import {
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconAdjustmentsHorizontal,
  IconBulb,
  IconCheck,
  IconChevronRight,
  IconCircleHalf2,
  IconLifebuoy,
  IconMessageCircle,
  IconPaperclip,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconTextSize,
  IconUpload,
  IconX,
} from "@tabler/icons-react"
import {
  formatSuggestionAttachmentFileSize,
  imageFileFromClipboardItems,
  validateSuggestionAttachment,
} from "@/lib/suggestionAttachments"
import { submitSuggestion as submitSuggestionRecord } from "@/lib/suggestions"
import { supabase } from "@/lib/supabase"

type SupportTab = "assistant" | "feedback" | "accessibility" | "preferences"
type FontSize = "normal" | "large" | "xlarge"
type FeedbackCategory = "Feature idea" | "Bug report" | "General"

type AccessibilityPreferences = {
  fontSize: FontSize
  highContrast: boolean
  reducedMotion: boolean
}

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

type ProfileRow = {
  full_name?: string | null
  preferred_name?: string | null
  business_name?: string | null
  email?: string | null
  role?: string | null
}

const ACCESSIBILITY_STORAGE_KEY = "monate-accessibility"
const defaultPreferences: AccessibilityPreferences = {
  fontSize: "normal",
  highContrast: false,
  reducedMotion: false,
}
const fontSizeOptions: Array<{ value: FontSize; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra large" },
]
const suggestedQuestions = [
  "How does supplier verification work?",
  "What is SmartScore and how is it calculated?",
  "How do I respond to an RFQ?",
]
const assistantGreeting =
  "Dumela! I'm Thuso. Ask me anything about using AiForm Procure or how SA procurement works - CSD, BBBEE, tax clearance, RFQs, anything."
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const maxImageBytes = 5 * 1024 * 1024

let messageId = 0
function newMessageId() {
  messageId += 1
  return messageId
}

function isFontSize(value: unknown): value is FontSize {
  return value === "normal" || value === "large" || value === "xlarge"
}

function normalizeFontSize(value: unknown): FontSize {
  if (value === "extra-large") return "xlarge"
  return isFontSize(value) ? value : "normal"
}

function readStoredPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return defaultPreferences

  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (!raw) return defaultPreferences
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>

    return {
      fontSize: normalizeFontSize(parsed.fontSize),
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
    }
  } catch {
    return defaultPreferences
  }
}

function applyPreferences(preferences: AccessibilityPreferences) {
  const root = document.documentElement

  root.classList.remove(
    "font-size-normal",
    "font-size-large",
    "font-size-xlarge",
    "prefers-reduced-motion",
    "high-contrast-mode",
  )
  root.classList.add(`font-size-${preferences.fontSize}`)
  root.dataset.fontSize = preferences.fontSize
  root.dataset.contrast = preferences.highContrast ? "high" : "standard"
  root.dataset.motion = preferences.reducedMotion ? "reduced" : "standard"

  if (preferences.reducedMotion) root.classList.add("prefers-reduced-motion")
  if (preferences.highContrast) root.classList.add("high-contrast-mode")
}

function displayNameFrom(profile: ProfileRow | null, fallbackEmail?: string | null) {
  return (
    profile?.preferred_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.business_name?.trim() ||
    profile?.email?.trim() ||
    fallbackEmail?.trim() ||
    "Signed-in user"
  )
}

function stripMarkdownMarkers(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\s)\*([^*\s][^*\n]*?)\*(?=\s|$|[.,;:!?])/g, "$1$2")
}

function DataImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />
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

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string
  detail: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-[72px] items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition ${
        checked
          ? "border-[#c8a060] bg-[#fff8ea] text-[#1a3a2a]"
          : "border-[#ebebeb] bg-white/80 text-[#1a3a2a] hover:border-[#c8a060]/70"
      }`}
    >
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#53665c]">{detail}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          checked ? "border-[#1a3a2a] bg-[#1a3a2a]" : "border-[#d8d8d0] bg-[#f8f4ec]"
        }`}
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-[23px]" : "left-[3px]"
          }`}
        />
      </span>
    </button>
  )
}

export default function UnifiedSupportCenter() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SupportTab>("assistant")
  const [showNudge, setShowNudge] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [assistantError, setAssistantError] = useState("")
  const [assistantFeedback, setAssistantFeedback] = useState<Record<number, FeedbackEntry>>({})
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string } | null>(null)
  const [category, setCategory] = useState<FeedbackCategory>("Feature idea")
  const [suggestion, setSuggestion] = useState("")
  const [suggestionFile, setSuggestionFile] = useState<File | null>(null)
  const [suggestionDragging, setSuggestionDragging] = useState(false)
  const [userId, setUserId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [suggestionError, setSuggestionError] = useState("")
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => readStoredPreferences())

  const launcherRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const assistantFileInputRef = useRef<HTMLInputElement | null>(null)

  const hasUserMessage = messages.some((message) => message.role === "user")
  const isAuthRoute =
    pathname?.startsWith("/auth/") ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password"

  useEffect(() => {
    applyPreferences(preferences)
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

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
    function openAccessibility() {
      setActiveTab("accessibility")
      setOpen(true)
    }
    window.addEventListener("monate:open-accessibility", openAccessibility)
    return () => window.removeEventListener("monate:open-accessibility", openAccessibility)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      if (!supabase || !open) return
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data } = await supabase
        .from("profiles")
        .select("full_name, preferred_name, business_name, email, role")
        .eq("id", user.id)
        .maybeSingle()

      if (cancelled) return
      const profile = (data as ProfileRow | null) ?? null
      setUserId(user.id)
      setEmail(profile?.email ?? user.email ?? null)
      setRole(profile?.role ?? null)
      setDisplayName(displayNameFrom(profile, user.email ?? null))
    }

    loadAccount()

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setMessages((current) =>
      current.length > 0
        ? current
        : [{ id: newMessageId(), role: "assistant", text: assistantGreeting }],
    )
    window.setTimeout(() => {
      if (activeTab === "assistant") inputRef.current?.focus()
      else closeButtonRef.current?.focus()
    }, 80)
  }, [activeTab, open])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        launcherRef.current?.focus()
        return
      }

      if (event.key !== "Tab" || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => !element.hasAttribute("disabled"))

      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: preferences.reducedMotion ? "auto" : "smooth",
      block: "end",
    })
  }, [loading, messages, preferences.reducedMotion])

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      if (!open || activeTab !== "assistant") return
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) loadAssistantImage(file)
          break
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [activeTab, open])

  function dismissNudge() {
    setShowNudge(false)
  }

  function openPanel(tab: SupportTab = activeTab) {
    dismissNudge()
    setActiveTab(tab)
    setOpen(true)
  }

  function closePanel() {
    setOpen(false)
    launcherRef.current?.focus()
  }

  function loadAssistantImage(file: File) {
    if (!acceptedImageTypes.includes(file.type)) {
      setAssistantError("Unsupported image type. Use JPEG, PNG, WebP, or GIF.")
      return
    }
    if (file.size > maxImageBytes) {
      setAssistantError("Image must be under 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setPendingImage({ dataUrl })
      setAssistantError("")
    }
    reader.readAsDataURL(file)
  }

  function handleAssistantFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) loadAssistantImage(file)
    event.target.value = ""
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if ((!text && !pendingImage) || loading) return

    const userMessage: Message = {
      id: newMessageId(),
      role: "user",
      text,
      imagePreview: pendingImage?.dataUrl,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")
    setPendingImage(null)
    setAssistantError("")
    setLoading(true)

    const apiMessages = nextMessages.slice(-12).map((message, index, slice) => {
      const isLast = index === slice.length - 1
      if (message.role === "user" && message.imagePreview && isLast) {
        type TextPart = { type: "text"; text: string }
        type ImgPart = { type: "image_url"; image_url: { url: string } }
        const parts: Array<TextPart | ImgPart> = []
        if (message.text) parts.push({ type: "text", text: message.text })
        parts.push({ type: "image_url", image_url: { url: message.imagePreview } })
        return { role: message.role, content: parts }
      }
      const content =
        message.role === "user" && message.imagePreview && !message.text
          ? "[shared an image]"
          : message.text
      return { role: message.role as "user" | "assistant", content }
    })

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const data = (await response.json()) as { reply?: string; error?: string }

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Thuso is taking a breather - please try again.")
      }

      setMessages((current) => [
        ...current,
        { id: newMessageId(), role: "assistant", text: data.reply as string },
      ])
    } catch (error) {
      setAssistantError(
        error instanceof Error ? error.message : "Thuso is taking a breather - please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  function handleAssistantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage()
  }

  function handleAssistantKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  function clearChat() {
    setMessages([{ id: newMessageId(), role: "assistant", text: assistantGreeting }])
    setInput("")
    setPendingImage(null)
    setAssistantError("")
    setAssistantFeedback({})
    inputRef.current?.focus()
  }

  async function saveThusoFeedback(rating: "helpful" | "not_helpful", detail?: string) {
    const response = await fetch("/api/thuso-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating, detail }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error || "Unable to save feedback.")
    }
  }

  async function handleAssistantFeedbackYes(id: number) {
    setAssistantError("")
    setAssistantFeedback((current) => ({ ...current, [id]: { status: "liked", detail: "" } }))
    try {
      await saveThusoFeedback("helpful")
    } catch (error) {
      setAssistantFeedback((current) => ({ ...current, [id]: { status: "pending", detail: "" } }))
      setAssistantError(error instanceof Error ? error.message : "Unable to save feedback.")
    }
  }

  function handleAssistantFeedbackNo(id: number) {
    setAssistantFeedback((current) => ({
      ...current,
      [id]: { status: "commenting", detail: current[id]?.detail ?? "" },
    }))
  }

  function handleAssistantFeedbackDetailChange(id: number, detail: string) {
    setAssistantFeedback((current) => ({ ...current, [id]: { ...current[id], detail } }))
  }

  async function handleAssistantFeedbackSubmit(id: number) {
    const detail = assistantFeedback[id]?.detail ?? ""
    setAssistantError("")
    try {
      await saveThusoFeedback("not_helpful", detail)
      setAssistantFeedback((current) => ({ ...current, [id]: { status: "done", detail } }))
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : "Unable to save feedback.")
    }
  }

  function renderAssistantFeedback(id: number) {
    const feedback = assistantFeedback[id]
    const status = feedback?.status ?? "pending"

    if (status === "liked") return <p className="thuso-feedback-thanks">Thanks!</p>
    if (status === "done") return <p className="thuso-feedback-thanks">Thanks for the feedback!</p>
    if (status === "commenting") {
      return (
        <div className="thuso-feedback-detail">
          <input
            type="text"
            value={feedback?.detail ?? ""}
            onChange={(event) => handleAssistantFeedbackDetailChange(id, event.target.value)}
            placeholder="What went wrong?"
            className="thuso-feedback-input"
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleAssistantFeedbackSubmit(id)
            }}
          />
          <button type="button" className="thuso-feedback-send" onClick={() => void handleAssistantFeedbackSubmit(id)}>
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
          onClick={() => void handleAssistantFeedbackYes(id)}
          aria-label="Yes, this was helpful"
        >
          Yes
        </button>
        <button
          type="button"
          className="thuso-feedback-btn"
          onClick={() => handleAssistantFeedbackNo(id)}
          aria-label="No, this was not helpful"
        >
          No
        </button>
      </div>
    )
  }

  function chooseSuggestionFile(nextFile: File | null) {
    setSuggestionError("")
    setSubmitted(false)
    if (!nextFile) {
      setSuggestionFile(null)
      return
    }
    const validation = validateSuggestionAttachment(nextFile)
    if (validation) {
      setSuggestionError(validation)
      setSuggestionFile(null)
      return
    }
    setSuggestionFile(nextFile)
  }

  function handleSuggestionDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setSuggestionDragging(false)
    chooseSuggestionFile(event.dataTransfer.files?.[0] ?? null)
  }

  function handleSuggestionPaste(event: ReactClipboardEvent<HTMLElement>) {
    const pastedImage = imageFileFromClipboardItems(event.clipboardData?.items)
    if (!pastedImage) return

    event.preventDefault()
    event.stopPropagation()
    setSubmitted(false)
    chooseSuggestionFile(pastedImage)
  }

  async function submitSuggestion() {
    if (!suggestion.trim()) return
    setSubmitting(true)
    setSuggestionError("")

    try {
      await submitSuggestionRecord({
        userId,
        displayName,
        email,
        category,
        message: suggestion,
        file: suggestionFile,
      })

      setSubmitted(true)
      setSuggestion("")
      setSuggestionFile(null)
      window.setTimeout(() => setSubmitted(false), 2500)
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (isAuthRoute) return null

  const navItems: Array<{ id: SupportTab; label: string; icon: typeof IconMessageCircle }> = [
    { id: "assistant", label: "Assistant", icon: IconMessageCircle },
    { id: "feedback", label: "Share feedback", icon: IconBulb },
    { id: "accessibility", label: "Accessibility", icon: IconTextSize },
    { id: "preferences", label: "Preferences", icon: IconAdjustmentsHorizontal },
  ]

  return (
    <>
      {showNudge && !open ? (
        <div className="fixed bottom-[calc(var(--news-ticker-height,56px)+28px)] right-24 z-[180] hidden max-w-[250px] rounded-lg border border-[#c8a060]/30 bg-white/90 px-4 py-3 text-xs font-semibold leading-5 text-[#1a3a2a] shadow-lg backdrop-blur md:flex">
          <span className="flex-1">Need help? Open the AiForm command centre.</span>
          <button type="button" aria-label="Dismiss support tip" onClick={dismissNudge} className="text-[#53665c]">
            <IconX className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[220] pointer-events-none">
          <button
            type="button"
            className="absolute inset-0 hidden bg-[#10281f]/20 backdrop-blur-[1px] md:block pointer-events-auto"
            aria-label="Close AiForm support centre"
            onClick={closePanel}
          />
          <section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-centre-title"
            className="pointer-events-auto fixed inset-x-0 bottom-0 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#1a3a2a]/15 bg-[#f8f4ec] text-[#1a3a2a] shadow-[0_-20px_70px_rgba(10,32,32,0.22)] md:bottom-[calc(var(--news-ticker-height,56px)+92px)] md:right-6 md:left-auto md:h-[min(760px,82vh)] md:w-[min(940px,calc(100vw-3rem))] md:max-h-[82vh] md:rounded-xl md:shadow-[0_28px_80px_rgba(10,32,32,0.24)]"
          >
            <header className="flex items-center justify-between gap-4 border-b border-[#1a3a2a]/10 bg-white/70 px-4 py-3 backdrop-blur md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1a3a2a] text-[#c8a060]">
                  <IconLifebuoy className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8a060]">
                    AiForm Procure
                  </p>
                  <h2 id="support-centre-title" className="truncate text-base font-bold text-[#1a3a2a]">
                    Command and help centre
                  </h2>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close AiForm support centre"
                onClick={closePanel}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1a3a2a]/10 bg-white text-[#53665c] transition hover:border-[#c8a060] hover:text-[#1a3a2a]"
              >
                <IconX className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[190px_minmax(0,1fr)_220px] md:grid-rows-1">
              <nav
                aria-label="Support centre sections"
                className="flex gap-2 overflow-x-auto border-b border-[#1a3a2a]/10 bg-white/55 px-3 py-2 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
              >
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = item.id === activeTab
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={`support-tab-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-bold transition md:w-full ${
                        active
                          ? "border-[#1a3a2a] bg-[#1a3a2a] text-[#f8f4ec]"
                          : "border-transparent bg-white/40 text-[#53665c] hover:border-[#c8a060]/50 hover:text-[#1a3a2a]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-[#c8a060]" : "text-[#c8a060]"}`} aria-hidden />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="min-h-0 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
                {activeTab === "assistant" ? (
                  <div id="support-tab-assistant" role="tabpanel" className="flex min-h-full flex-col">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold text-[#1a3a2a]">Hi Thabiso! 👋</h3>
                        <p className="mt-1 text-sm leading-6 text-[#53665c]">
                          How can I help you with AiForm Procure today?
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearChat}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#1a3a2a]/10 bg-white px-3 py-2 text-xs font-bold text-[#53665c] transition hover:border-[#c8a060] hover:text-[#1a3a2a]"
                      >
                        <IconRefresh className="h-4 w-4" aria-hidden />
                        Clear chat
                      </button>
                    </div>

                    {!hasUserMessage ? (
                      <div className="mb-4 grid gap-2 md:grid-cols-3">
                        {suggestedQuestions.map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => void sendMessage(question)}
                            className="rounded-lg border border-[#1a3a2a]/10 bg-white/80 p-3 text-left text-sm font-bold leading-5 text-[#1a3a2a] shadow-sm transition hover:border-[#c8a060] hover:bg-[#fff8ea]"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="min-h-[260px] flex-1 space-y-3 rounded-lg border border-[#1a3a2a]/10 bg-white/65 p-3">
                      {messages.map((message, index) =>
                        message.role === "assistant" ? (
                          <div key={message.id} className="flex items-start gap-2">
                            <Image
                              src="/aiform-mark.png"
                              alt=""
                              width={22}
                              height={22}
                              className="mt-1 rounded"
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <article className="max-w-[86%] rounded-lg bg-[#1a3a2a] px-3 py-2 text-[#f8f4ec]">
                                <p className="whitespace-pre-wrap text-sm leading-6">
                                  {stripMarkdownMarkers(message.text)}
                                </p>
                              </article>
                              {index > 0 ? renderAssistantFeedback(message.id) : null}
                            </div>
                          </div>
                        ) : (
                          <div key={message.id} className="flex justify-end">
                            <article className="max-w-[86%] rounded-lg bg-[#c8a060] px-3 py-2 text-[#1a3a2a]">
                              {message.imagePreview ? (
                                <DataImg
                                  src={message.imagePreview}
                                  alt="Attached image"
                                  className="mb-2 max-h-32 w-auto rounded"
                                />
                              ) : null}
                              {message.text ? (
                                <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                              ) : null}
                            </article>
                          </div>
                        ),
                      )}

                      {loading ? (
                        <div className="flex items-start gap-2">
                          <Image
                            src="/aiform-mark.png"
                            alt=""
                            width={22}
                            height={22}
                            className="mt-1 rounded"
                            aria-hidden="true"
                          />
                          <article className="rounded-lg bg-[#1a3a2a] px-3 py-2 text-[#f8f4ec]">
                            <TypingDots />
                          </article>
                        </div>
                      ) : null}

                      {assistantError ? (
                        <p className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                          {assistantError}
                        </p>
                      ) : null}
                      <div ref={messageEndRef} />
                    </div>

                    <form onSubmit={handleAssistantSubmit} className="mt-3 rounded-lg border border-[#1a3a2a]/10 bg-white p-3">
                      {pendingImage ? (
                        <div className="relative mb-2 inline-block">
                          <DataImg
                            src={pendingImage.dataUrl}
                            alt="Pending attachment"
                            className="h-16 w-auto rounded-md border border-[#ebebeb] object-cover"
                          />
                          <button
                            type="button"
                            aria-label="Remove image"
                            onClick={() => setPendingImage(null)}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1a3a2a] text-white"
                          >
                            <IconX className="h-3 w-3" aria-hidden />
                          </button>
                        </div>
                      ) : null}

                      <input
                        ref={assistantFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={handleAssistantFileChange}
                        tabIndex={-1}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label="Attach image to Thuso message"
                          onClick={() => assistantFileInputRef.current?.click()}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#1a3a2a]/15 text-[#53665c] transition hover:border-[#c8a060] hover:text-[#1a3a2a]"
                        >
                          <IconPaperclip className="h-5 w-5" aria-hidden />
                        </button>
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          maxLength={1000}
                          aria-label="Ask Thuso a question"
                          onChange={(event) => setInput(event.target.value)}
                          onKeyDown={handleAssistantKeyDown}
                          placeholder="Ask about RFQs, CSD, BBBEE..."
                          className="min-w-0 flex-1 rounded-lg border border-[#1a3a2a]/10 bg-[#f8f4ec] px-3 py-3 text-sm text-[#1a3a2a] outline-none transition placeholder:text-[#53665c] focus:border-[#c8a060] focus:ring-2 focus:ring-[#c8a060]/20"
                        />
                        <button
                          type="submit"
                          aria-label="Send message to Thuso"
                          disabled={loading || (input.trim().length === 0 && !pendingImage)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1a3a2a] text-[#c8a060] shadow-sm transition hover:bg-[#244f39] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <IconSend className="h-5 w-5" aria-hidden />
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {activeTab === "feedback" ? (
                  <div id="support-tab-feedback" role="tabpanel" onPaste={handleSuggestionPaste}>
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8a060]">
                        Share feedback
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-[#1a3a2a]">Help shape the platform</h3>
                      <p className="mt-2 text-sm leading-6 text-[#53665c]">
                        Signed in as <span className="font-bold text-[#1a3a2a]">{displayName || "your account"}</span>.
                      </p>
                    </div>

                    {!userId ? (
                      <p className="mb-4 rounded-lg border border-[#c8a060]/30 bg-[#fff8ea] px-3 py-2 text-sm font-semibold text-[#1a3a2a]">
                        Please <Link href="/auth/login" className="text-[#9a793e] underline">sign in</Link> to send feedback.
                      </p>
                    ) : null}

                    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Feedback category">
                      {(["Feature idea", "Bug report", "General"] as FeedbackCategory[]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCategory(item)}
                          aria-pressed={category === item}
                          className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
                            category === item
                              ? "border-[#1a3a2a] bg-[#1a3a2a] text-[#c8a060]"
                              : "border-[#ebebeb] bg-white text-[#53665c] hover:border-[#c8a060]"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <label className="block text-sm font-bold text-[#1a3a2a]" htmlFor="support-feedback-message">
                      Idea or issue
                    </label>
                    <textarea
                      id="support-feedback-message"
                      value={suggestion}
                      onChange={(event) => setSuggestion(event.target.value)}
                      placeholder="Describe your idea, bug report, or general feedback..."
                      rows={6}
                      className="mt-2 w-full resize-none rounded-lg border border-[#1a3a2a]/10 bg-white/80 p-3 text-sm text-[#1a3a2a] outline-none transition focus:border-[#c8a060] focus:ring-2 focus:ring-[#c8a060]/20"
                    />

                    <label className="mt-4 block text-sm font-bold text-[#1a3a2a]" htmlFor="support-feedback-email">
                      Optional email
                    </label>
                    <input
                      id="support-feedback-email"
                      type="email"
                      value={email ?? ""}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-lg border border-[#1a3a2a]/10 bg-white/80 p-3 text-sm text-[#1a3a2a] outline-none transition focus:border-[#c8a060] focus:ring-2 focus:ring-[#c8a060]/20"
                    />

                    <label
                      htmlFor="support-feedback-attachment"
                      onDragOver={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setSuggestionDragging(true)
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setSuggestionDragging(false)
                      }}
                      onDrop={handleSuggestionDrop}
                      onPaste={handleSuggestionPaste}
                      className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center text-sm font-semibold transition ${
                        suggestionDragging
                          ? "border-[#5DCAA5] bg-[#e8f7f2] text-[#1a3a2a]"
                          : "border-[#1a3a2a]/20 bg-white/70 text-[#53665c] hover:border-[#c8a060]"
                      }`}
                      tabIndex={0}
                      aria-label="Suggestion attachment"
                    >
                      <IconUpload className="h-7 w-7 text-[#c8a060]" aria-hidden />
                      <span className="mt-2 font-bold text-[#1a3a2a]">Drag and drop an attachment, or click to browse</span>
                      <span className="mt-1 text-xs text-[#53665c]">Images and PDFs only, up to 10MB.</span>
                      <input
                        id="support-feedback-attachment"
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        onChange={(event) => {
                          chooseSuggestionFile(event.target.files?.[0] ?? null)
                          event.target.value = ""
                        }}
                      />
                    </label>

                    {suggestionFile ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#1a3a2a]/10 bg-white/75 px-3 py-2 text-sm text-[#1a3a2a]">
                        <span className="flex min-w-0 items-center gap-2">
                          <IconPaperclip className="h-4 w-4 shrink-0 text-[#c8a060]" aria-hidden />
                          <span className="truncate font-bold">{suggestionFile.name}</span>
                          <span className="shrink-0 text-xs text-[#53665c]">
                            {formatSuggestionAttachmentFileSize(suggestionFile.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => chooseSuggestionFile(null)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1a3a2a]/10 text-[#53665c] transition hover:border-rose-300 hover:text-rose-700"
                          aria-label="Remove attachment"
                        >
                          <IconX className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    ) : null}

                    {suggestionError ? <p className="mt-2 text-xs font-bold text-rose-700">{suggestionError}</p> : null}
                    {submitted ? (
                      <div className="mt-4 rounded-lg bg-[#e8f7f2] py-3 text-center text-sm font-bold text-[#1a3a2a]">
                        Thank you for your feedback.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void submitSuggestion()}
                        disabled={submitting || !suggestion.trim() || !userId}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#c8a060] px-4 py-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d7b575] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <IconSend className="h-4 w-4" aria-hidden />
                        {submitting ? "Submitting..." : "Submit suggestion"}
                      </button>
                    )}
                  </div>
                ) : null}

                {activeTab === "accessibility" ? (
                  <div id="support-tab-accessibility" role="tabpanel">
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8a060]">
                        Accessibility
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-[#1a3a2a]">Display preferences</h3>
                    </div>

                    <section className="rounded-lg border border-[#1a3a2a]/10 bg-white/70 p-4">
                      <p className="mb-3 text-sm font-bold text-[#1a3a2a]">Text size</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {fontSizeOptions.map((option) => {
                          const selected = option.value === preferences.fontSize
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setPreferences((current) => ({ ...current, fontSize: option.value }))}
                              className={`min-h-[76px] rounded-lg border px-3 py-3 text-left text-sm font-bold transition ${
                                selected
                                  ? "border-[#1a3a2a] bg-[#1a3a2a] text-[#c8a060]"
                                  : "border-[#ebebeb] bg-white text-[#1a3a2a] hover:border-[#c8a060]"
                              }`}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </section>

                    <section className="mt-3 grid gap-3">
                      <ToggleRow
                        label="Reduce motion"
                        detail="Minimise animated movement throughout the interface."
                        checked={preferences.reducedMotion}
                        onChange={(checked) => setPreferences((current) => ({ ...current, reducedMotion: checked }))}
                      />
                      <ToggleRow
                        label="High contrast mode"
                        detail="Increase contrast for text, borders, and key controls."
                        checked={preferences.highContrast}
                        onChange={(checked) => setPreferences((current) => ({ ...current, highContrast: checked }))}
                      />
                    </section>
                  </div>
                ) : null}

                {activeTab === "preferences" ? (
                  <div id="support-tab-preferences" role="tabpanel">
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8a060]">
                        Preferences
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-[#1a3a2a]">Support settings</h3>
                    </div>

                    <div className="grid gap-3">
                      <section className="rounded-lg border border-[#1a3a2a]/10 bg-white/75 p-4">
                        <div className="flex items-start gap-3">
                          <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#5DCAA5]" aria-hidden />
                          <div>
                            <h4 className="font-bold text-[#1a3a2a]">Saved preferences active</h4>
                            <p className="mt-1 text-sm leading-6 text-[#53665c]">
                              Accessibility choices are stored in this browser and applied across AiForm Procure.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-lg border border-[#1a3a2a]/10 bg-white/75 p-4">
                        <h4 className="font-bold text-[#1a3a2a]">Profile summary</h4>
                        <dl className="mt-3 grid gap-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#53665c]">User</dt>
                            <dd className="text-right font-bold text-[#1a3a2a]">{displayName || "Not signed in"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#53665c]">Email</dt>
                            <dd className="text-right font-bold text-[#1a3a2a]">{email || "Unavailable"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#53665c]">Role</dt>
                            <dd className="text-right font-bold text-[#1a3a2a]">{role || "Workspace user"}</dd>
                          </div>
                        </dl>
                      </section>

                      <section className="rounded-lg border border-[#c8a060]/25 bg-[#fff8ea] p-4">
                        <h4 className="font-bold text-[#1a3a2a]">Data privacy</h4>
                        <p className="mt-1 text-sm leading-6 text-[#53665c]">
                          Feedback may include your account details so the AiForm team can investigate and respond.
                          Assistant chats are used only to answer your current support questions.
                        </p>
                      </section>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("accessibility")}
                          className="flex items-center justify-between rounded-lg border border-[#1a3a2a]/10 bg-white p-3 text-left text-sm font-bold text-[#1a3a2a] transition hover:border-[#c8a060]"
                        >
                          Accessibility settings
                          <IconChevronRight className="h-4 w-4 text-[#c8a060]" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("feedback")}
                          className="flex items-center justify-between rounded-lg border border-[#1a3a2a]/10 bg-white p-3 text-left text-sm font-bold text-[#1a3a2a] transition hover:border-[#c8a060]"
                        >
                          Share feedback
                          <IconChevronRight className="h-4 w-4 text-[#c8a060]" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="hidden min-h-0 border-l border-[#1a3a2a]/10 bg-white/45 p-4 md:block">
                <div className="rounded-lg border border-[#c8a060]/25 bg-[#fff8ea] p-4">
                  <IconSparkles className="h-5 w-5 text-[#c8a060]" aria-hidden />
                  <p className="mt-3 text-sm font-bold text-[#1a3a2a]">Enterprise support console</p>
                  <p className="mt-2 text-xs leading-5 text-[#53665c]">
                    Assistant, feedback, and accessibility tools now live in one place.
                  </p>
                </div>
                <div className="mt-3 rounded-lg border border-[#1a3a2a]/10 bg-white/75 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#c8a060]">Status</p>
                  <div className="mt-3 space-y-2 text-sm text-[#53665c]">
                    <p className="flex items-center gap-2">
                      <IconCircleHalf2 className="h-4 w-4 text-[#5DCAA5]" aria-hidden />
                      {preferences.highContrast ? "High contrast on" : "Standard contrast"}
                    </p>
                    <p className="flex items-center gap-2">
                      <IconTextSize className="h-4 w-4 text-[#5DCAA5]" aria-hidden />
                      Text size: {fontSizeOptions.find((item) => item.value === preferences.fontSize)?.label}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </div>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        aria-label={open ? "Close AiForm support centre" : "Open AiForm support centre"}
        aria-expanded={open}
        onClick={() => {
          if (open) closePanel()
          else openPanel("assistant")
        }}
        className="fixed bottom-[calc(var(--news-ticker-height,56px)+16px)] right-5 z-[210] flex h-14 w-14 items-center justify-center rounded-full border border-[#c8a060]/40 bg-[#1a3a2a] text-[#c8a060] shadow-[0_16px_40px_rgba(10,32,32,0.32)] transition hover:scale-105 hover:bg-[#244f39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a060]"
      >
        {open ? <IconX className="h-6 w-6" aria-hidden /> : <IconLifebuoy className="h-6 w-6" aria-hidden />}
      </button>
    </>
  )
}

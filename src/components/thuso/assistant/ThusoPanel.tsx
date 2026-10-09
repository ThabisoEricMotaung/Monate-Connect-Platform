"use client"

import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent, type RefObject } from "react"
import { IconArrowsExchange, IconRefresh, IconSend, IconX } from "@tabler/icons-react"
import type { ThusoSession, ThusoState, ThusoViewerLabel } from "@/lib/thuso/session"
import type { PageRecord } from "./ThusoProvider"
import { useDialogFocus } from "@/hooks/useDialogFocus"

const MAX_CHARS = 2000

const VIEWER_SUBTITLE: Record<ThusoViewerLabel, string> = {
  anonymous: "Public help",
  unverified: "Public help",
  supplier: "Supplier assistant",
  buyer: "Buyer assistant",
  admin: "Admin assistant",
}

const SUGGESTIONS: Record<"public" | "supplier" | "buyer" | "admin", string[]> = {
  public: ["How do I find tenders in my province?", "What documents do suppliers usually need?", "How does supplier verification work?"],
  supplier: ["How do I improve my SmartScore?", "What should I check before quoting?", "What is a CSD number?"],
  buyer: ["How do I write a clear RFQ scope?", "How should I compare supplier quotes?", "What compliance checks matter most?"],
  admin: ["Where do I review pending verifications?", "How does tender curation work?", "What does quarantining a listing do?"],
}

function audienceFor(viewer: ThusoViewerLabel | null, pathname: string | null): keyof typeof SUGGESTIONS {
  if (viewer === "supplier" || viewer === "buyer" || viewer === "admin") return viewer
  if (viewer === "anonymous" || viewer === "unverified") return "public"
  if (pathname?.startsWith("/dashboard/admin")) return "admin"
  if (pathname?.startsWith("/dashboard/buyer")) return "buyer"
  if (pathname?.startsWith("/dashboard")) return "supplier"
  return "public"
}

// Replies are plain text; drop stray markdown emphasis the model sometimes adds.
function plain(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1")
}

function pageRecordLabel(record: PageRecord): string {
  const heading = document.querySelector("main h1, h1")?.textContent?.replace(/\s+/g, " ").trim()
  return heading && heading.length <= 160 ? heading : `${record.noun === "tender" ? "Tender" : "RFQ"} #${record.id}`
}

export default function ThusoPanel({
  open,
  onClose,
  state,
  session,
  draft,
  onDraftChange,
  pageRecord,
  pathname,
  fallbackFocusRef,
}: {
  open: boolean
  onClose: () => void
  state: ThusoState
  session: ThusoSession
  draft: string
  onDraftChange: (value: string) => void
  pageRecord: PageRecord | null
  pathname: string | null
  fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const noteId = useId()

  useDialogFocus({ open, dialogRef, initialFocusRef: inputRef, fallbackFocusRef, onClose })

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [open, state.entries.length, state.pending])

  if (!open) return null

  const ready = state.owner !== null
  const hasMessages = state.entries.some((entry) => entry.kind === "message")
  const offerPageRecord = pageRecord && state.context?.id !== pageRecord.id
  const subtitle = state.viewer ? VIEWER_SUBTITLE[state.viewer] : "AiForm Procure assistant"

  function send(text: string) {
    if (!text.trim() || state.pending || !ready) return
    onDraftChange("")
    void session.send(text)
    inputRef.current?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    send(draft)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(draft)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] print:hidden" data-thuso-panel="">
      <div className="absolute inset-0 hidden bg-[#10261B]/30 lg:block" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        className="absolute inset-0 flex h-[100dvh] flex-col bg-[#FBF9F4] text-[#1E3A2B] lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[420px] lg:border-l lg:border-[#DDD8CC] lg:shadow-[-24px_0_60px_rgba(16,38,27,0.18)]"
      >
        <header className="flex items-center gap-3 border-b border-[#E6E0D5] bg-white px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1E3A2B] text-sm font-bold text-[#F4F0E7]" aria-hidden="true">T</span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold leading-tight">Thuso</h2>
            <p className="truncate text-xs text-[#6F6A61]">{subtitle}</p>
          </div>
          {hasMessages ? (
            <button
              type="button"
              onClick={() => session.clear()}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#53665C] transition-colors hover:bg-[#F4F0E7] hover:text-[#1E3A2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
            >
              <IconRefresh className="h-4 w-4" stroke={2} aria-hidden="true" />
              New chat
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Thuso"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#53665C] transition-colors hover:bg-[#F4F0E7] hover:text-[#1E3A2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
          >
            <IconX className="h-5 w-5" stroke={2} aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-[#E6E0D5] bg-[#F4F0E7] px-4 py-2.5 text-xs">
          {state.context ? (
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1">
                <span className="font-semibold text-[#A67832]">Discussing: </span>
                <span className="font-semibold">{state.context.label}</span>
              </p>
              <button
                type="button"
                onClick={() => session.setContext(null)}
                className="shrink-0 cursor-pointer rounded font-semibold text-[#53665C] underline-offset-2 hover:text-[#1E3A2B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
              >
                General help
              </button>
            </div>
          ) : (
            <p><span className="font-semibold text-[#A67832]">General help</span> · no tender selected</p>
          )}
          {offerPageRecord ? (
            <button
              type="button"
              onClick={() => session.setContext({ type: "rfq", id: pageRecord.id, label: pageRecordLabel(pageRecord) })}
              className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#1E3A2B]/25 bg-white px-3 py-1.5 font-semibold text-[#1E3A2B] transition-colors hover:border-[#1E3A2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
            >
              <IconArrowsExchange className="h-3.5 w-3.5" stroke={2} aria-hidden="true" />
              Ask about the {pageRecord.noun} on this page
            </button>
          ) : null}
        </div>

        <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {!hasMessages ? (
            <div className="rounded-xl border border-[#E6E0D5] bg-white p-4">
              <p className="text-sm font-semibold">Hi, I&apos;m Thuso.</p>
              <p className="mt-1 text-sm leading-6 text-[#53665C]">
                Ask about tenders, compliance documents, or how AiForm Procure works.
              </p>
              <ul className="mt-3 space-y-2" aria-label="Suggested questions">
                {SUGGESTIONS[audienceFor(state.viewer, pathname)].map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      disabled={!ready || state.pending}
                      onClick={() => send(question)}
                      className="w-full cursor-pointer rounded-lg border border-[#E6E0D5] bg-[#FBF9F4] px-3 py-2 text-left text-sm font-medium transition-colors hover:border-[#C8A060] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.entries.map((entry) =>
            entry.kind === "notice" ? (
              <p
                key={entry.id}
                className={`mx-auto max-w-[95%] rounded-md px-3 py-1.5 text-center text-xs font-semibold ${entry.tone === "error" ? "border border-amber-500/30 bg-amber-50 text-amber-900" : "text-[#7B756B]"}`}
              >
                {entry.content}
              </p>
            ) : (
              <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${entry.role === "user" ? "rounded-br-md bg-[#1E3A2B] text-white" : "rounded-bl-md border border-[#E6E0D5] bg-white"}`}
                >
                  <span className="sr-only">{entry.role === "user" ? "You: " : "Thuso: "}</span>
                  {entry.role === "assistant" ? plain(entry.content) : entry.content}
                </p>
              </div>
            ),
          )}

          {state.pending ? (
            <div className="flex justify-start">
              <p className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[#E6E0D5] bg-white px-4 py-3" role="status">
                <span className="sr-only">Thuso is replying</span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1E3A2B]/50 [animation-delay:-0.3s]" aria-hidden="true" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1E3A2B]/50 [animation-delay:-0.15s]" aria-hidden="true" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1E3A2B]/50" aria-hidden="true" />
              </p>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[#E6E0D5] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-end gap-2 rounded-xl border border-[#D8D2C5] bg-[#FBF9F4] p-1.5 focus-within:border-[#1E3A2B]/50 focus-within:ring-2 focus-within:ring-[#1E3A2B]/10">
            <label htmlFor={`${titleId}-input`} className="sr-only">Message Thuso</label>
            <textarea
              id={`${titleId}-input`}
              ref={inputRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_CHARS}
              rows={2}
              placeholder={ready ? "Ask Thuso a question…" : "Checking your session…"}
              className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-base text-[#1E3A2B] placeholder-[#857F75] focus:outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={!ready || state.pending || !draft.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#1E3A2B] text-white transition-colors hover:bg-[#294D39] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2"
            >
              <IconSend className="h-5 w-5" stroke={2} aria-hidden="true" />
            </button>
          </div>
          <p id={noteId} className="mt-2 text-[11px] leading-4 text-[#7B756B]">
            Thuso explains and guides. It can&apos;t upload, submit or change anything, and it can make mistakes, so check the tender documents.
          </p>
        </form>
      </section>
    </div>
  )
}

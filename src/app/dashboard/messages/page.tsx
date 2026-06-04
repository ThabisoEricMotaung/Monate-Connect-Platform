"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import {
  getInboxMessages,
  getSentMessages,
  markMessageRead,
  sendMessage,
  type ProcurementMessage,
} from "@/lib/messages"
import { supabase } from "@/lib/supabase"

type MessageTab = "inbox" | "sent"

type ProfileSummary = {
  id: string
  business_name: string | null
  email: string | null
  role: string | null
}

type ComposerState = {
  receiverId: string
  subject: string
  message: string
  rfqId: string
  quoteId: string
}

const fieldClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const emptyComposer: ComposerState = {
  receiverId: "",
  subject: "",
  message: "",
  rfqId: "",
  quoteId: "",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function parseOptionalNumber(value: string, label: "RFQ ID" | "Quote ID"): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const numericValue = Number(trimmed)

  if (!Number.isSafeInteger(numericValue) || numericValue < 1) {
    throw new Error(`${label} must be a number.`)
  }

  return numericValue
}

function displayProfile(id: string, profiles: Record<string, ProfileSummary>) {
  const profile = profiles[id]

  if (!profile) return id

  return profile.business_name || profile.email || profile.id
}

function readInitialComposer(): Partial<ComposerState> & {
  receiverRole?: string
} {
  if (typeof window === "undefined") return {}

  const params = new URLSearchParams(window.location.search)

  return {
    receiverId: params.get("receiver_id") ?? "",
    receiverRole: params.get("receiver_role") ?? undefined,
    subject: params.get("subject") ?? "",
    message: params.get("message") ?? "",
    rfqId: params.get("rfq_id") ?? "",
    quoteId: params.get("quote_id") ?? "",
  }
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<MessageTab>("inbox")
  const [inboxMessages, setInboxMessages] = useState<ProcurementMessage[]>([])
  const [sentMessages, setSentMessages] = useState<ProcurementMessage[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({})
  const [composer, setComposer] = useState<ComposerState>(emptyComposer)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const loadProfilesForMessages = useCallback(async (messages: ProcurementMessage[]) => {
    if (!supabase || messages.length === 0) {
      setProfiles({})
      return
    }

    const profileIds = Array.from(
      new Set(
        messages.flatMap((message) => [
          message.sender_id,
          message.receiver_id,
        ])
      )
    )

    const { data, error } = await supabase
      .from("profiles")
      .select("id, business_name, email, role")
      .in("id", profileIds)

    if (error) {
      console.error("Message profile lookup failed:", error)
      setProfiles({})
      return
    }

    setProfiles(
      Object.fromEntries(
        ((data ?? []) as ProfileSummary[]).map((profile) => [
          profile.id,
          profile,
        ])
      )
    )
  }, [])

  const resolveReceiverRole = useCallback(async (receiverRole: string) => {
    if (!supabase) return

    const roles =
      receiverRole === "buyer-admin"
        ? ["buyer", "admin"]
        : [receiverRole]

    const { data, error } = await supabase
      .from("profiles")
      .select("id, business_name, email, role")
      .in("role", roles)
      .limit(1)
      .maybeSingle()

    if (error || !data) return

    const profile = data as ProfileSummary

    setProfiles((currentProfiles) => ({
      ...currentProfiles,
      [profile.id]: profile,
    }))
    setComposer((currentComposer) => ({
      ...currentComposer,
      receiverId: currentComposer.receiverId || profile.id,
    }))
  }, [])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")

    try {
      const [inbox, sent] = await Promise.all([
        getInboxMessages(),
        getSentMessages(),
      ])

      setInboxMessages(inbox)
      setSentMessages(sent)
      await loadProfilesForMessages([...inbox, ...sent])
    } finally {
      setLoading(false)
    }
  }, [loadProfilesForMessages])

  useEffect(() => {
    const initialComposer = readInitialComposer()

    setComposer((currentComposer) => ({
      ...currentComposer,
      receiverId: initialComposer.receiverId ?? "",
      subject: initialComposer.subject ?? "",
      message: initialComposer.message ?? "",
      rfqId: initialComposer.rfqId ?? "",
      quoteId: initialComposer.quoteId ?? "",
    }))

    if (initialComposer.receiverRole) {
      resolveReceiverRole(initialComposer.receiverRole)
    }

    loadMessages()
  }, [loadMessages, resolveReceiverRole])

  const visibleMessages = activeTab === "inbox" ? inboxMessages : sentMessages
  const unreadCount = useMemo(
    () => inboxMessages.filter((message) => !message.is_read).length,
    [inboxMessages]
  )

  function updateComposer(field: keyof ComposerState, value: string) {
    setComposer((currentComposer) => ({
      ...currentComposer,
      [field]: value,
    }))
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const rfqId = parseOptionalNumber(composer.rfqId, "RFQ ID")
      const quoteId = parseOptionalNumber(composer.quoteId, "Quote ID")

      await sendMessage({
        receiverId: composer.receiverId,
        subject: composer.subject,
        message: composer.message,
        rfqId,
        quoteId,
      })
    } catch (error) {
      console.error("Message submission failed:", error)
      setErrorMessage(
        error instanceof Error ? error.message : "Message could not be sent."
      )
      setSending(false)
      return
    }

    setSending(false)
    setSuccessMessage("Message sent and recorded in the procurement history.")
    setComposer((currentComposer) => ({
      ...emptyComposer,
      receiverId: currentComposer.receiverId,
    }))
    setActiveTab("sent")
    await loadMessages()
  }

  async function handleMarkRead(messageId: number) {
    await markMessageRead(messageId)
    setInboxMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId ? { ...message, is_read: true } : message
      )
    )
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Internal Communication
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Procurement Messages
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Send and review traceable RFQ, quote, and supplier communication inside
          the Monate Vendor Network workspace.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="border-b border-panel pb-4">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            Message Composer
          </p>
          <h2 className="mt-2 text-lg font-semibold text-heading">
            Start a traceable conversation
          </h2>
        </div>

        <form onSubmit={handleSendMessage} className="mt-5 grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="message-receiver"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                Receiver ID
              </label>
              <input
                id="message-receiver"
                value={composer.receiverId}
                onChange={(event) =>
                  updateComposer("receiverId", event.target.value)
                }
                placeholder="User profile UUID"
                className={fieldClass}
                required
              />
              {composer.receiverId && profiles[composer.receiverId] ? (
                <p className="mt-2 text-xs text-muted">
                  Receiver: {displayProfile(composer.receiverId, profiles)}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="message-subject"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                Subject
              </label>
              <input
                id="message-subject"
                value={composer.subject}
                onChange={(event) =>
                  updateComposer("subject", event.target.value)
                }
                placeholder="RFQ clarification, quote review, or next steps"
                className={fieldClass}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label
                htmlFor="message-rfq"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                Related RFQ ID
              </label>
              <input
                id="message-rfq"
                type="number"
                min="1"
                value={composer.rfqId}
                onChange={(event) => updateComposer("rfqId", event.target.value)}
                placeholder="Optional"
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="message-quote"
                className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
              >
                Related Quote ID
              </label>
              <input
                id="message-quote"
                type="number"
                min="1"
                value={composer.quoteId}
                onChange={(event) =>
                  updateComposer("quoteId", event.target.value)
                }
                placeholder="Optional"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="message-body"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Message
            </label>
            <textarea
              id="message-body"
              rows={5}
              value={composer.message}
              onChange={(event) => updateComposer("message", event.target.value)}
              placeholder="Write a clear procurement message that can be referenced later."
              className={`${fieldClass} min-h-[140px] resize-y`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-fit rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </section>

      <section className="rounded-md border border-panel bg-card shadow-panel">
        <div className="flex flex-col gap-4 border-b border-panel p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Message History
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading">
              Inbox and sent records
            </h2>
          </div>
          <div className="flex rounded-md border border-panel bg-panel p-1">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`rounded px-4 py-2 text-sm font-semibold transition ${
                activeTab === "inbox"
                  ? "bg-surface text-heading shadow-sm"
                  : "text-secondary hover:text-heading"
              }`}
            >
              Inbox {unreadCount > 0 ? `(${unreadCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sent")}
              className={`rounded px-4 py-2 text-sm font-semibold transition ${
                activeTab === "sent"
                  ? "bg-surface text-heading shadow-sm"
                  : "text-secondary hover:text-heading"
              }`}
            >
              Sent
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-md border border-panel bg-panel"
              />
            ))}
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-heading">
              No {activeTab} messages found.
            </p>
            <p className="mt-2 text-xs text-muted">
              Procurement communication will appear here once messages are sent.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-panel">
            {visibleMessages.map((message) => {
              const sender = displayProfile(message.sender_id, profiles)
              const receiver = displayProfile(message.receiver_id, profiles)

              return (
                <article
                  key={message.id}
                  className="grid gap-4 p-5 transition hover:bg-surface lg:grid-cols-[1fr_220px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-heading">
                        {message.subject}
                      </h3>
                      <span
                        className={`rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${
                          message.is_read
                            ? "border-panel bg-panel text-secondary"
                            : "border-accent bg-accent text-button"
                        }`}
                      >
                        {message.is_read ? "Read" : "Unread"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-secondary">
                      {message.message}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                      <span>Sender: {sender}</span>
                      <span>Receiver: {receiver}</span>
                      <span>
                        RFQ: {message.rfq_id != null ? `RFQ-${message.rfq_id}` : "-"}
                      </span>
                      <span>
                        Quote: {message.quote_id != null ? `Q-${message.quote_id}` : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <p className="text-xs font-medium text-secondary">
                      {formatDate(message.created_at)}
                    </p>
                    {activeTab === "inbox" && !message.is_read ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(message.id)}
                        className="w-fit rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-surface hover:text-heading"
                      >
                        Mark Read
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react"
import { IconPaperclip, IconSend, IconUpload, IconX } from "@tabler/icons-react"
import Link from "next/link"
import {
  formatSuggestionAttachmentFileSize,
  imageFileFromClipboardItems,
  validateSuggestionAttachment,
} from "@/lib/suggestionAttachments"
import {
  suggestionSelect,
  submitSuggestion as submitSuggestionRecord,
  type SuggestionCategory,
  type SuggestionRecord,
} from "@/lib/suggestions"
import { supabase } from "@/lib/supabase"

type ProfileRow = {
  id: string
  full_name?: string | null
  preferred_name?: string | null
  business_name?: string | null
  email?: string | null
  role?: string | null
}

const categories: SuggestionCategory[] = ["Feature idea", "Bug report", "General"]

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

export default function HaveYourSayPanel({ showMySuggestions = true }: { showMySuggestions?: boolean }) {
  const [userId, setUserId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState<string | null>(null)
  const [category, setCategory] = useState<SuggestionCategory>("Feature idea")
  const [message, setMessage] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const canSubmit = Boolean(userId && message.trim() && !submitting)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!supabase) {
        setError("Have Your Say is not configured yet.")
        setLoading(false)
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        if (!cancelled) {
          setLoading(false)
          setError("Please sign in to send a suggestion.")
        }
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name, business_name, email, role")
        .eq("id", user.id)
        .maybeSingle()

      if (cancelled) return

      const profileRow = (profile as ProfileRow | null) ?? null
      setUserId(user.id)
      setEmail(profileRow?.email ?? user.email ?? null)
      setDisplayName(displayNameFrom(profileRow, user.email ?? null))

      if (showMySuggestions) {
        const { data, error: suggestionsError } = await supabase
          .from("suggestions")
          .select(suggestionSelect)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (suggestionsError) {
          setError(suggestionsError.message)
        } else {
          setSuggestions((data as SuggestionRecord[]) ?? [])
        }
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [showMySuggestions])

  function chooseFile(nextFile: File | null) {
    setError("")
    setSuccess("")
    if (!nextFile) {
      setFile(null)
      return
    }

    const validation = validateSuggestionAttachment(nextFile)
    if (validation) {
      setError(validation)
      setFile(null)
      return
    }

    setFile(nextFile)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    chooseFile(event.dataTransfer.files?.[0] ?? null)
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const pastedImage = imageFileFromClipboardItems(event.clipboardData?.items)
    if (!pastedImage) return

    event.preventDefault()
    event.stopPropagation()
    chooseFile(pastedImage)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !canSubmit) return

    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      const data = await submitSuggestionRecord({
        userId,
        displayName,
        email,
        category,
        message,
        file,
      })
      setSuggestions((current) => [data, ...current])
      setMessage("")
      setFile(null)
      setSuccess("Thank you. Your suggestion has been sent to the AiForm team.")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Suggestion could not be submitted.")
    } finally {
      setSubmitting(false)
    }
  }

  const sortedSuggestions = useMemo(() => suggestions, [suggestions])

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-xl border border-[#1a3a2a]/10 bg-white/60 p-6 shadow-md backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c8a060]">Internal suggestion box</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-[#1a3a2a]">Have Your Say</h1>
        <p className="mt-3 font-serif text-sm leading-7 text-[#53665c]">
          Share practical ideas, issues, or workflow improvements. Suggestions are linked to your signed-in account so the team can respond properly.
        </p>

        <div className="mt-5 rounded-xl border border-[#1a3a2a]/10 bg-[#f8f4ec] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6c7c72]">Submitting as</p>
          <p className="mt-1 text-base font-semibold text-[#1a3a2a]">{loading ? "Loading account..." : displayName || "Not signed in"}</p>
          {email && <p className="mt-1 text-xs text-[#53665c]">{email}</p>}
        </div>

        {!userId && !loading && (
          <div className="mt-5 rounded-xl border border-[#c8a060]/30 bg-[#fff8ea] p-4 text-sm font-semibold text-[#1a3a2a]">
            Please <Link href="/auth/login" className="text-[#c8a060] underline">sign in</Link> to submit a suggestion.
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} onPaste={handlePaste} className="rounded-xl border border-[#1a3a2a]/10 bg-white/60 p-6 shadow-md backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                category === item
                  ? "border-[#1a3a2a] bg-[#1a3a2a] text-[#c8a060]"
                  : "border-[#1a3a2a]/10 bg-white/70 text-[#1a3a2a] hover:border-[#c8a060]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <label className="mt-5 block" htmlFor="suggestion-message">
          <span className="text-sm font-semibold text-[#1a3a2a]">Suggestion</span>
          <textarea
            id="suggestion-message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              setError("")
              setSuccess("")
            }}
            rows={7}
            required
            className="mt-2 w-full rounded-xl border border-[#1a3a2a]/10 bg-white/80 px-4 py-3 text-sm leading-7 text-[#1a3a2a] outline-none transition focus:border-[#5DCAA5] focus:ring-2 focus:ring-[#5DCAA5]/20"
            placeholder="Tell us what would make the platform clearer, faster, or more useful."
          />
        </label>

        <label
          htmlFor="suggestion-file"
          onDragOver={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setDragging(false)
          }}
          onDrop={handleDrop}
          onPaste={handlePaste}
          tabIndex={0}
          aria-label="Suggestion attachment"
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition ${
            dragging ? "border-[#5DCAA5] bg-[#e8f7f2]" : "border-[#1a3a2a]/20 bg-[#f8f4ec] hover:border-[#c8a060]"
          }`}
        >
          <IconUpload className="h-8 w-8 text-[#c8a060]" aria-hidden />
          <span className="mt-2 text-sm font-bold text-[#1a3a2a]">Drag and drop an attachment, or click to browse</span>
          <span className="mt-1 text-xs text-[#53665c]">Images and PDFs only, up to 10MB.</span>
          <input
            id="suggestion-file"
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {file && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#1a3a2a]/10 bg-white/70 px-4 py-3 text-sm text-[#1a3a2a]">
            <span className="flex min-w-0 items-center gap-2">
              <IconPaperclip className="h-4 w-4 shrink-0 text-[#c8a060]" aria-hidden />
              <span className="truncate font-semibold">{file.name}</span>
              <span className="shrink-0 text-xs text-[#53665c]">{formatSuggestionAttachmentFileSize(file.size)}</span>
            </span>
            <button type="button" onClick={() => setFile(null)} className="text-[#53665c] hover:text-[#1a3a2a]" aria-label="Remove attachment">
              <IconX className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {success && <p className="mt-4 rounded-xl border border-[#5DCAA5]/30 bg-[#e8f7f2] px-4 py-3 text-sm font-semibold text-[#1a3a2a]">{success}</p>}
        {error && <p className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#c8a060] bg-[#c8a060] px-5 py-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d7b575] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconSend className="h-4 w-4" aria-hidden />
          {submitting ? "Submitting..." : "Submit suggestion"}
        </button>
      </form>

      {showMySuggestions && (
        <section className="rounded-xl border border-[#1a3a2a]/10 bg-white/60 p-6 shadow-md backdrop-blur lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c8a060]">Your history</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#1a3a2a]">My Suggestions</h2>
            </div>
            <p className="text-sm font-semibold text-[#53665c]">{sortedSuggestions.length} submitted</p>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? (
              <div className="h-28 animate-pulse rounded-xl border border-[#1a3a2a]/10 bg-white/60" />
            ) : sortedSuggestions.length === 0 ? (
              <div className="rounded-xl border border-[#1a3a2a]/10 bg-[#f8f4ec] p-6 text-sm font-semibold text-[#53665c]">
                Your submitted suggestions will appear here.
              </div>
            ) : (
              sortedSuggestions.map((suggestion) => (
                <article key={suggestion.id} className="rounded-xl border border-[#1a3a2a]/10 bg-white/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-[#c8a060]/30 bg-[#faf7f2] px-3 py-1 text-xs font-bold text-[#1a3a2a]">
                      {suggestion.category ?? "General"}
                    </span>
                    <span className="text-xs font-semibold text-[#53665c]">{new Date(suggestion.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#1a3a2a]">{suggestion.message}</p>
                  {suggestion.attachment_name && (
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#53665c]">
                      <IconPaperclip className="h-4 w-4 text-[#c8a060]" aria-hidden />
                      {suggestion.attachment_name} {formatSuggestionAttachmentFileSize(suggestion.attachment_size)}
                    </p>
                  )}
                  {(suggestion.admin_response || suggestion.admin_reaction || suggestion.admin_rating) && (
                    <div className="mt-4 rounded-xl border border-[#5DCAA5]/25 bg-[#e8f7f2] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1a3a2a]">Admin response</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-[#1a3a2a]">
                        {suggestion.admin_reaction && <span>{suggestion.admin_reaction}</span>}
                        {suggestion.admin_rating && <span>{suggestion.admin_rating}/5</span>}
                      </div>
                      {suggestion.admin_response && <p className="mt-2 text-sm leading-6 text-[#1a3a2a]">{suggestion.admin_response}</p>}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}

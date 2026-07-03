"use client"

import { useEffect, useState, type ClipboardEvent } from "react"
import { IconBulb, IconPaperclip, IconSend, IconX } from "@tabler/icons-react"
import Link from "next/link"
import {
  cleanSuggestionAttachmentFileName,
  formatSuggestionAttachmentFileSize,
  imageFileFromClipboardItems,
  validateSuggestionAttachment,
} from "@/lib/suggestionAttachments"
import { supabase } from "@/lib/supabase"

type Category = "Feature idea" | "Bug report" | "General"
type ProfileRow = { full_name?: string | null; preferred_name?: string | null; business_name?: string | null; email?: string | null }

function displayNameFrom(profile: ProfileRow | null, fallbackEmail?: string | null) {
  return profile?.preferred_name?.trim() || profile?.full_name?.trim() || profile?.business_name?.trim() || profile?.email?.trim() || fallbackEmail?.trim() || "Signed-in user"
}

export default function SuggestionBox() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>("Feature idea")
  const [message, setMessage] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [userId, setUserId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      if (!supabase) return
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data } = await supabase
        .from("profiles")
        .select("full_name, preferred_name, business_name, email")
        .eq("id", user.id)
        .maybeSingle()

      if (cancelled) return
      const profile = (data as ProfileRow | null) ?? null
      setUserId(user.id)
      setEmail(profile?.email ?? user.email ?? null)
      setDisplayName(displayNameFrom(profile, user.email ?? null))
    }

    if (open) loadAccount()

    return () => {
      cancelled = true
    }
  }, [open])

  function chooseFile(nextFile: File | null) {
    setError("")
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

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const pastedImage = imageFileFromClipboardItems(event.clipboardData?.items)
    if (!pastedImage) return

    event.preventDefault()
    event.stopPropagation()
    setSubmitted(false)
    chooseFile(pastedImage)
  }

  async function uploadAttachment() {
    if (!file || !supabase || !userId) return null
    const path = `${userId}/${Date.now()}-${cleanSuggestionAttachmentFileName(file.name)}`
    const { error: uploadError } = await supabase.storage
      .from("suggestion-attachments")
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from("suggestion-attachments").getPublicUrl(path)
    return {
      attachment_path: path,
      attachment_url: data.publicUrl || path,
      attachment_name: file.name,
      attachment_type: file.type,
      attachment_size: file.size,
    }
  }

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    setError("")

    try {
      if (!supabase) throw new Error("Suggestion capture is not configured yet.")
      if (!userId) throw new Error("Please sign in to submit a suggestion.")

      const attachment = await uploadAttachment()
      const { error: insertError } = await supabase.from("suggestions").insert({
        user_id: userId,
        display_name: displayName,
        email,
        category,
        message: message.trim(),
        created_at: new Date().toISOString(),
        ...(attachment ?? {}),
      })

      if (insertError) throw insertError

      setSubmitted(true)
      setMessage("")
      setFile(null)
      setTimeout(() => {
        setSubmitted(false)
        setOpen(false)
      }, 2500)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const categories: Category[] = ["Feature idea", "Bug report", "General"]

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[200] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-[#1a3a2a]/10 bg-white/80 shadow-lg backdrop-blur">
          <div className="p-4" onPaste={handlePaste}>
            <div className="mb-1 flex items-start justify-between">
              <div>
                <p className="font-display text-xl font-semibold text-[#1a3a2a]">Have Your Say</p>
                <span className="mt-1 inline-block rounded-full border border-[#c8a060]/30 bg-[#faf3e8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#c8a060]">
                  Internal suggestion box
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-[#aaaaaa] transition-colors hover:text-[#1a3a2a]" aria-label="Close suggestion box">
                <IconX size={16} stroke={1.8} />
              </button>
            </div>

            <p className="mb-3 mt-2 text-xs leading-relaxed text-[#53665c]">
              Signed in as <span className="font-bold text-[#1a3a2a]">{displayName || "your account"}</span>.
            </p>

            {!userId && (
              <p className="mb-3 rounded-lg border border-[#c8a060]/30 bg-[#fff8ea] px-3 py-2 text-xs font-semibold text-[#1a3a2a]">
                Please <Link href="/auth/login" className="text-[#c8a060] underline">sign in</Link> to send a suggestion.
              </p>
            )}

            <div className="mb-3 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    category === cat ? "border-[#1a3a2a] bg-[#1a3a2a] text-[#c8a060]" : "border-[#ebebeb] bg-white text-[#555] hover:border-[#1a3a2a]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe your idea or suggestion..."
              rows={4}
              className="w-full resize-none rounded-lg border border-[#1a3a2a]/10 bg-white/80 p-2.5 text-sm transition-colors focus:border-[#5DCAA5] focus:outline-none"
            />

            <label
              className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#1a3a2a]/20 bg-[#f8f4ec] px-3 py-2 text-xs font-semibold text-[#53665c] hover:border-[#c8a060]"
              onPaste={handlePaste}
              tabIndex={0}
              aria-label="Suggestion attachment"
            >
              <IconPaperclip className="h-4 w-4 text-[#c8a060]" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file ? file.name : "Attach image or PDF up to 10MB"}</span>
              {file && <span className="shrink-0 text-[10px] text-[#53665c]">{formatSuggestionAttachmentFileSize(file.size)}</span>}
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            </label>

            {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

            {submitted ? (
              <div className="mt-3 rounded-lg bg-[#e8f7f2] py-2 text-center text-sm font-semibold text-[#1a3a2a]">
                Thank you for your feedback.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !message.trim() || !userId}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c8a060] py-2 text-sm font-bold text-[#1a3a2a] transition-colors hover:bg-[#d7b575] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconSend size={14} stroke={1.8} />
                {submitting ? "Submitting..." : "Submit suggestion"}
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed bottom-5 right-20 z-[200] flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors ${open ? "bg-[#c8a060]" : "bg-[#1a3a2a]"}`}
        aria-label={open ? "Close Have Your Say" : "Open Have Your Say"}
      >
        {open ? <IconX size={20} stroke={1.8} className="text-[#1a3a2a]" /> : <IconBulb size={20} stroke={1.8} className="text-[#c8a060]" />}
      </button>
    </>
  )
}

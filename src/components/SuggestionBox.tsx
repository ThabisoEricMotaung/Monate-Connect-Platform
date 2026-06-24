"use client"

import { useState } from "react"
import { IconBulb, IconSend, IconX } from "@tabler/icons-react"
import { supabase } from "@/lib/supabase"

type Category = "Feature idea" | "Bug report" | "General"

export default function SuggestionBox() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>("Feature idea")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    setError("")

    try {
      if (supabase) {
        const { error: insertError } = await supabase.from("suggestions").insert({
          category,
          message: message.trim(),
          email: email.trim() || null,
          created_at: new Date().toISOString(),
        })

        if (insertError) throw insertError
      }

      setSubmitted(true)
      setMessage("")
      setEmail("")
      setTimeout(() => {
        setSubmitted(false)
        setOpen(false)
      }, 2500)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const categories: Category[] = ["Feature idea", "Bug report", "General"]
  const categoryEmoji: Record<Category, string> = {
    "Feature idea": "\u{1F4A1}",
    "Bug report": "\u{1F41B}",
    General: "\u{1F4AC}",
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[200] w-[300px] rounded-xl border border-[#ebebeb] bg-white shadow-lg">
          <div className="p-4">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1a3a2a]">Share your idea</p>
                <span className="mt-1 inline-block rounded-full border border-[#c8a060]/30 bg-[#faf3e8] px-2 py-0.5 text-[10px] font-medium text-[#c8a060]">
                  Suggestion box
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#aaaaaa] transition-colors hover:text-[#1a3a2a]"
                aria-label="Close suggestion box"
              >
                <IconX size={16} stroke={1.8} />
              </button>
            </div>

            <p className="mb-3 mt-2 text-xs leading-relaxed text-[#888]">
              Help shape AiForm Procure. Your feedback goes directly to the team.
            </p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                    category === cat
                      ? "border-[#1a3a2a] bg-[#1a3a2a] text-[#c8a060]"
                      : "border-[#ebebeb] bg-white text-[#555] hover:border-[#1a3a2a]"
                  }`}
                >
                  {categoryEmoji[cat]} {cat}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe your idea or suggestion..."
              rows={4}
              className="w-full resize-none rounded-lg border border-[#ebebeb] p-2.5 text-sm transition-colors focus:border-[#1a3a2a] focus:outline-none"
            />

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email (optional)"
              className="mt-2 w-full rounded-lg border border-[#ebebeb] p-2.5 text-sm transition-colors focus:border-[#1a3a2a] focus:outline-none"
            />

            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

            {submitted ? (
              <div className="mt-3 rounded-lg bg-[#f0f7f3] py-2 text-center text-sm font-semibold text-[#1a3a2a]">
                &#10003; Thank you for your feedback!
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a3a2a] py-2 text-sm font-semibold text-[#c8a060] transition-colors hover:bg-[#244f39] disabled:cursor-not-allowed disabled:opacity-50"
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
        className={`fixed bottom-5 right-20 z-[200] flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-colors ${
          open ? "bg-[#c8a060]" : "bg-[#1a3a2a]"
        }`}
        aria-label={open ? "Close suggestion box" : "Open suggestion box"}
      >
        {open ? (
          <IconX size={20} stroke={1.8} className="text-[#1a3a2a]" />
        ) : (
          <IconBulb size={20} stroke={1.8} className="text-[#c8a060]" />
        )}
      </button>
    </>
  )
}

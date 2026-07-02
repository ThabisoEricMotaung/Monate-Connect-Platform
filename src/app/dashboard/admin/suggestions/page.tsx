"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { IconPaperclip, IconSend } from "@tabler/icons-react"
import { getCurrentProfile } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type Suggestion = {
  id: number
  user_id: string | null
  display_name: string | null
  category: string | null
  message: string
  email: string | null
  attachment_path: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: string | null
  attachment_size: number | null
  admin_response: string | null
  admin_reaction: string | null
  admin_rating: number | null
  admin_responded_at: string | null
  created_at: string
}

type ResponseDraft = {
  admin_response: string
  admin_reaction: string
  admin_rating: string
}

const categoryColors: Record<string, string> = {
  "Feature idea": "bg-[#f0f7f3] text-[#1a3a2a] border-[#1a3a2a]/20",
  "Bug report": "bg-rose-50 text-rose-700 border-rose-200",
  General: "bg-[#faf3e8] text-[#c8a060] border-[#c8a060]/30",
}

const categoryEmoji: Record<string, string> = {
  "Feature idea": "Idea",
  "Bug report": "Bug",
  General: "Note",
}

const reactions = ["", "??", "?", "?", "??", "??"]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatFileSize(size: number | null) {
  if (!size) return ""
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function draftFrom(suggestion: Suggestion): ResponseDraft {
  return {
    admin_response: suggestion.admin_response ?? "",
    admin_reaction: suggestion.admin_reaction ?? "",
    admin_rating: suggestion.admin_rating ? String(suggestion.admin_rating) : "",
  }
}

export default function SuggestionsPage() {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [drafts, setDrafts] = useState<Record<number, ResponseDraft>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("All")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      const profile = await getCurrentProfile()
      if (profile?.role !== "admin") {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        if (!cancelled) setLoading(false)
        return
      }

      const { data, error: loadError } = await supabase
        .from("suggestions")
        .select("id, user_id, display_name, category, message, email, attachment_path, attachment_url, attachment_name, attachment_type, attachment_size, admin_response, admin_reaction, admin_rating, admin_responded_at, created_at")
        .order("created_at", { ascending: false })

      if (!cancelled) {
        if (loadError) {
          setError(loadError.message)
          setSuggestions([])
        } else {
          const rows = ((data as Suggestion[]) ?? [])
          setSuggestions(rows)
          setDrafts(Object.fromEntries(rows.map((suggestion) => [suggestion.id, draftFrom(suggestion)])))
        }
        setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [router])

  const categories = ["All", "Feature idea", "Bug report", "General"]
  const filtered = filter === "All" ? suggestions : suggestions.filter((suggestion) => suggestion.category === filter)

  const counts = useMemo(() => ({
    All: suggestions.length,
    "Feature idea": suggestions.filter((suggestion) => suggestion.category === "Feature idea").length,
    "Bug report": suggestions.filter((suggestion) => suggestion.category === "Bug report").length,
    General: suggestions.filter((suggestion) => suggestion.category === "General").length,
  }), [suggestions])

  function updateDraft(id: number, patch: Partial<ResponseDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { admin_response: "", admin_reaction: "", admin_rating: "" }), ...patch },
    }))
  }

  async function saveResponse(suggestion: Suggestion) {
    if (!supabase) return
    const draft = drafts[suggestion.id] ?? draftFrom(suggestion)
    setSavingId(suggestion.id)
    setError("")

    const { data: authData } = await supabase.auth.getUser()
    const payload = {
      admin_response: draft.admin_response.trim() || null,
      admin_reaction: draft.admin_reaction || null,
      admin_rating: draft.admin_rating ? Number(draft.admin_rating) : null,
      admin_responded_at: new Date().toISOString(),
      admin_responder_id: authData.user?.id ?? null,
    }

    const { error: updateError } = await supabase
      .from("suggestions")
      .update(payload)
      .eq("id", suggestion.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuggestions((current) => current.map((item) => item.id === suggestion.id ? { ...item, ...payload } : item))
    }

    setSavingId(null)
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Admin</p>
        <h1 className="font-display text-4xl font-semibold text-[#1a3a2a]">Have Your Say</h1>
        <p className="enterprise-page-description">
          User-submitted ideas, bug reports, attachments, and admin responses from the suggestion box.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              filter === cat ? "border-[#1a3a2a] bg-[#f0f7f3]" : "border-panel bg-card hover:border-[#1a3a2a]/30"
            }`}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary">
              {cat === "All" ? "Inbox" : categoryEmoji[cat]} {cat}
            </p>
            <p className="text-2xl font-bold text-heading">{counts[cat as keyof typeof counts]}</p>
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl border border-panel bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-panel bg-card">
          <div className="text-center">
            <p className="text-sm font-semibold text-heading">No suggestions yet</p>
            <p className="mt-1 text-xs text-muted">Submissions will appear here as users send them.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((suggestion) => {
            const draft = drafts[suggestion.id] ?? draftFrom(suggestion)
            return (
              <div key={suggestion.id} className="rounded-xl border border-[#1a3a2a]/10 bg-white/60 p-5 shadow-md backdrop-blur">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${categoryColors[suggestion.category ?? "General"] ?? categoryColors.General}`}>
                    {categoryEmoji[suggestion.category ?? "General"]} {suggestion.category ?? "General"}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(suggestion.created_at)}</span>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-heading">{suggestion.message}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted">
                  <span>From: <span className="font-semibold text-heading">{suggestion.display_name ?? "Signed-in user"}</span></span>
                  {suggestion.email && <a href={`mailto:${suggestion.email}`} className="text-accent hover:underline">{suggestion.email}</a>}
                  {suggestion.attachment_name && (
                    <span className="inline-flex items-center gap-1 font-semibold text-heading">
                      <IconPaperclip className="h-4 w-4 text-[#c8a060]" aria-hidden />
                      {suggestion.attachment_name} {formatFileSize(suggestion.attachment_size)}
                    </span>
                  )}
                </div>

                <div className="mt-5 rounded-xl border border-[#1a3a2a]/10 bg-[#f8f4ec] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6c7c72]">Admin response</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[120px_120px_1fr]">
                    <select
                      value={draft.admin_reaction}
                      onChange={(event) => updateDraft(suggestion.id, { admin_reaction: event.target.value })}
                      className="rounded-lg border border-[#1a3a2a]/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#5DCAA5]"
                      aria-label="Admin reaction"
                    >
                      {reactions.map((reaction) => <option key={reaction || "none"} value={reaction}>{reaction || "Reaction"}</option>)}
                    </select>
                    <select
                      value={draft.admin_rating}
                      onChange={(event) => updateDraft(suggestion.id, { admin_rating: event.target.value })}
                      className="rounded-lg border border-[#1a3a2a]/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#5DCAA5]"
                      aria-label="Admin rating"
                    >
                      <option value="">Rating</option>
                      {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}
                    </select>
                    <textarea
                      value={draft.admin_response}
                      onChange={(event) => updateDraft(suggestion.id, { admin_response: event.target.value })}
                      rows={2}
                      className="rounded-lg border border-[#1a3a2a]/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#5DCAA5]"
                      placeholder="Write a short response users can see in My Suggestions."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => saveResponse(suggestion)}
                    disabled={savingId === suggestion.id}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#c8a060] bg-[#c8a060] px-4 py-2 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d7b575] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <IconSend className="h-4 w-4" aria-hidden />
                    {savingId === suggestion.id ? "Saving..." : "Save response"}
                  </button>
                  {suggestion.admin_responded_at && <p className="mt-2 text-xs text-muted">Last responded {timeAgo(suggestion.admin_responded_at)}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

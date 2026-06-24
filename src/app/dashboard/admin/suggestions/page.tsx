"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type Suggestion = {
  id: number
  category: string | null
  message: string
  email: string | null
  created_at: string
}

const categoryColors: Record<string, string> = {
  "Feature idea": "bg-[#f0f7f3] text-[#1a3a2a] border-[#1a3a2a]/20",
  "Bug report": "bg-rose-50 text-rose-700 border-rose-200",
  General: "bg-[#faf3e8] text-[#c8a060] border-[#c8a060]/30",
}

const categoryEmoji: Record<string, string> = {
  "Feature idea": "\u{1F4A1}",
  "Bug report": "\u{1F41B}",
  General: "\u{1F4AC}",
}

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

export default function SuggestionsPage() {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("All")

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

      const { data } = await supabase
        .from("suggestions")
        .select("id, category, message, email, created_at")
        .order("created_at", { ascending: false })

      if (!cancelled) {
        setSuggestions((data as Suggestion[]) ?? [])
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

  const counts = {
    All: suggestions.length,
    "Feature idea": suggestions.filter((suggestion) => suggestion.category === "Feature idea").length,
    "Bug report": suggestions.filter((suggestion) => suggestion.category === "Bug report").length,
    General: suggestions.filter((suggestion) => suggestion.category === "General").length,
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Admin</p>
        <h1 className="enterprise-page-title">Suggestions</h1>
        <p className="enterprise-page-description">
          User-submitted ideas, bug reports, and feedback from the suggestion box.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              filter === cat
                ? "border-[#1a3a2a] bg-[#f0f7f3]"
                : "border-panel bg-card hover:border-[#1a3a2a]/30"
            }`}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary">
              {cat === "All" ? "\u{1F4EC}" : categoryEmoji[cat]} {cat}
            </p>
            <p className="text-2xl font-bold text-heading">{counts[cat as keyof typeof counts]}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border border-panel bg-card" />
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
        <div className="space-y-3">
          {filtered.map((suggestion) => (
            <div key={suggestion.id} className="rounded-xl border border-panel bg-card p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    categoryColors[suggestion.category ?? "General"] ?? categoryColors.General
                  }`}
                >
                  {categoryEmoji[suggestion.category ?? "General"]} {suggestion.category ?? "General"}
                </span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(suggestion.created_at)}</span>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-heading">{suggestion.message}</p>
              {suggestion.email && (
                <p className="text-xs text-muted">
                  From:{" "}
                  <a href={`mailto:${suggestion.email}`} className="text-accent hover:underline">
                    {suggestion.email}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

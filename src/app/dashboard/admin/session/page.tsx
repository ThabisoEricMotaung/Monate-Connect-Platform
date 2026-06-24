"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type SessionNote = {
  id: number
  note: string
  created_at: string
  admin_id: string | null
}

type SessionEvent = {
  id: number
  user_id: string | null
  event_type: string
  route: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Viewed",
  page_exit: "Left",
  quote_submitted: "Submitted quote",
  document_uploaded: "Uploaded document",
  rfq_created: "Created RFQ",
  po_issued: "Issued PO",
  profile_saved: "Saved profile",
  supplier_verified: "Verified supplier",
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

export default function SessionPage() {
  const router = useRouter()
  const notesEndRef = useRef<HTMLDivElement | null>(null)
  const [notes, setNotes] = useState<SessionNote[]>([])
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [newNote, setNewNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      if (!supabase) return

      const { data } = await supabase
        .from("session_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (!cancelled) {
        setEvents((data as SessionEvent[]) ?? [])
      }
    }

    async function load() {
      const profile = await getCurrentProfile()

      if (profile?.role !== "admin") {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setLoading(false)
        return
      }

      const [notesRes, eventsRes] = await Promise.all([
        supabase.from("session_notes").select("*").order("created_at", { ascending: true }),
        supabase
          .from("session_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ])

      if (cancelled) return

      setNotes((notesRes.data as SessionNote[]) ?? [])
      setEvents((eventsRes.data as SessionEvent[]) ?? [])
      setLoading(false)
    }

    void load()

    const interval = window.setInterval(() => {
      void loadEvents()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [router])

  async function saveNote() {
    if (!newNote.trim() || !supabase) return

    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data } = await supabase
      .from("session_notes")
      .insert({ note: newNote.trim(), admin_id: user?.id ?? null })
      .select()
      .single()

    if (data) {
      setNotes((prev) => [...prev, data as SessionNote])
      setNewNote("")
      window.setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }

    setSaving(false)
  }

  async function deleteNote(id: number) {
    if (!supabase) return

    await supabase.from("session_notes").delete().eq("id", id)
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Admin</p>
        <h1 className="enterprise-page-title">Session Monitor</h1>
        <p className="enterprise-page-description">
          Real-time session notes and user activity tracking during testing sessions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="enterprise-card flex flex-col gap-4">
            <div className="border-b border-panel pb-3">
              <p className="enterprise-section-label">Live notes</p>
              <h2 className="text-base font-bold text-heading">Session observations</h2>
            </div>

            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <div className="h-20 animate-pulse rounded-lg bg-panel" />
              ) : notes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No notes yet. Start typing below.</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="group flex items-start gap-2 rounded-lg border border-panel bg-surface p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-heading">{note.note}</p>
                      <p className="mt-1 text-xs text-muted">{timeAgo(note.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      className="shrink-0 text-xs text-rose-500 opacity-0 transition-opacity hover:text-rose-700 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
              <div ref={notesEndRef} />
            </div>

            <div className="flex gap-2 border-t border-panel pt-3">
              <textarea
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void saveNote()
                  }
                }}
                placeholder="Type observation and press Enter..."
                rows={2}
                className="flex-1 resize-none rounded-lg border border-panel p-2.5 text-sm transition-colors focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={saveNote}
                disabled={saving || !newNote.trim()}
                className="self-end rounded-lg bg-[#1a3a2a] px-4 py-2 text-sm font-semibold text-[#c8a060] transition-colors hover:bg-[#244f39] disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="enterprise-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-panel pb-3">
            <div>
              <p className="enterprise-section-label">Auto-captured</p>
              <h2 className="text-base font-bold text-heading">User activity</h2>
            </div>
            <span className="text-xs text-muted">Refreshes every 15s</span>
          </div>

          <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
            {loading ? (
              <div className="h-20 animate-pulse rounded-lg bg-panel" />
            ) : events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No activity yet. Events appear as users interact.
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg border border-panel bg-surface p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-heading">
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                      {event.route && <span className="ml-1 font-normal text-muted">{event.route}</span>}
                    </p>
                    {event.metadata && event.event_type === "page_exit" && (
                      <p className="text-xs text-muted">
                        {String(event.metadata.duration_seconds ?? 0)}s on page
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted">{timeAgo(event.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

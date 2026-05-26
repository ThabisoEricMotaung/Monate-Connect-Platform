"use client"

import { useEffect, useState } from "react"
import { isRFQSaved, saveRFQ, unsaveRFQ } from "@/lib/savedRFQs"

type Props = {
  rfqId: number
  compact?: boolean
  onRemoved?: () => void
}

export default function SaveRFQControl({
  rfqId,
  compact = false,
  onRemoved,
}: Props) {
  const [saved, setSaved] = useState(false)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function check() {
      try {
        setSaved(await isRFQSaved(rfqId))
      } catch {
        // unauthenticated or table missing — silently degrade
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [rfqId])

  async function handleSave() {
    setLoading(true)
    setMessage("")
    setErrorMessage("")
    try {
      await saveRFQ(rfqId, notes)
      setSaved(true)
      setNotes("")
      setMessage("RFQ saved to your shortlist.")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Save failed.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsave() {
    setLoading(true)
    setMessage("")
    setErrorMessage("")
    try {
      await unsaveRFQ(rfqId)
      setSaved(false)
      setMessage("RFQ removed from shortlist.")
      onRemoved?.()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Remove failed.")
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          disabled={loading}
          onClick={saved ? handleUnsave : handleSave}
          aria-label={saved ? "Remove RFQ from shortlist" : "Save RFQ to shortlist"}
          className={[
            "inline-flex items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
            saved
              ? "border-rose-500/35 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15"
              : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
          ].join(" ")}
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          {loading ? "…" : saved ? "Saved" : "Save RFQ"}
        </button>
        {message && (
          <p className="text-xs font-semibold text-success">{message}</p>
        )}
        {errorMessage && (
          <p className="text-xs font-semibold text-rose-700">{errorMessage}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <p className="mb-3 text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
        Save to Shortlist
      </p>

      {!saved && (
        <textarea
          rows={3}
          placeholder="Optional shortlist notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mb-3 w-full rounded-md border border-panel bg-card px-3 py-2 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {saved ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleUnsave}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove from Shortlist
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            {loading ? "Checking…" : "Save RFQ"}
          </button>
        )}
      </div>

      {message && (
        <p className="mt-2 text-xs font-semibold text-success">{message}</p>
      )}
      {errorMessage && (
        <p className="mt-2 text-xs font-semibold text-rose-700">{errorMessage}</p>
      )}
    </div>
  )
}

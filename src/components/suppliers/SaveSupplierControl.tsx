"use client"

import { useEffect, useState } from "react"
import {
  isSupplierSaved,
  saveSupplier,
  unsaveSupplier,
} from "@/lib/savedSuppliers"

type SaveSupplierControlProps = {
  supplierId: string
  compact?: boolean
  onRemoved?: () => void
}

export default function SaveSupplierControl({
  supplierId,
  compact = false,
  onRemoved,
}: SaveSupplierControlProps) {
  const [saved, setSaved] = useState(false)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadSavedState() {
      try {
        setSaved(await isSupplierSaved(supplierId))
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadSavedState()
  }, [supplierId])

  async function handleSave() {
    setLoading(true)
    setMessage("")
    setErrorMessage("")

    try {
      await saveSupplier(supplierId, notes)
      setSaved(true)
      setNotes("")
      setMessage("Supplier saved to shortlist.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsave() {
    setLoading(true)
    setMessage("")
    setErrorMessage("")

    try {
      await unsaveSupplier(supplierId)
      setSaved(false)
      setMessage("Supplier removed from shortlist.")
      onRemoved?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Remove failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={compact ? "space-y-2" : "rounded-md border border-panel bg-panel p-4"}>
      {!saved && !compact && (
        <textarea
          rows={3}
          placeholder="Optional shortlist notes..."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mb-3 w-full rounded-md border border-panel bg-card px-3 py-2 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {saved ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleUnsave}
            className="inline-flex items-center justify-center rounded-md border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove from Shortlist
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Checking..." : "Save Supplier"}
          </button>
        )}
      </div>

      {message && <p className="text-xs font-semibold text-success">{message}</p>}
      {errorMessage && (
        <p className="text-xs font-semibold text-rose-700">{errorMessage}</p>
      )}
    </div>
  )
}

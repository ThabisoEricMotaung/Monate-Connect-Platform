"use client"

import { useState } from "react"
import { SupabaseClient } from "@supabase/supabase-js"
import { verifyRelatedEntity, disputeRelatedEntity, type SupplierRelatedEntity } from "@/lib/supplierRelatedEntities"

interface VerificationWorkflowProps {
  entity: SupplierRelatedEntity
  supabase: SupabaseClient
  onVerified: () => void
}

type Action = "verify" | "flag" | "none"

export default function VerificationWorkflow({ entity, supabase, onVerified }: VerificationWorkflowProps) {
  const [action, setAction] = useState<Action>("none")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user?.id) {
        setError("Not authenticated")
        setLoading(false)
        return
      }

      if (action === "verify") {
        const result = await verifyRelatedEntity(supabase, entity.id, user.user.id, notes || undefined)
        if (!result.ok) {
          setError(result.error)
          setLoading(false)
          return
        }
        setSuccess(true)
        setAction("none")
        setNotes("")
        onVerified()
      } else if (action === "flag") {
        if (!notes.trim()) {
          setError("Please provide a reason for flagging")
          setLoading(false)
          return
        }
        const result = await disputeRelatedEntity(supabase, entity.id, notes)
        if (!result.ok) {
          setError(result.error)
          setLoading(false)
          return
        }
        setSuccess(true)
        setAction("none")
        setNotes("")
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (entity.verified) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3">
        <p className="text-xs font-semibold text-green-700">✓ Verified</p>
        {entity.verification_notes && (
          <p className="mt-1 text-xs text-green-600">{entity.verification_notes}</p>
        )}
      </div>
    )
  }

  if (entity.dispute_status === "disputed_by_supplier") {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
        <p className="text-xs font-semibold text-yellow-700">⚠ Disputed by supplier</p>
        {entity.dispute_notes && (
          <p className="mt-1 text-xs text-yellow-600">{entity.dispute_notes}</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-panel bg-surface p-4 space-y-3">
      {success && (
        <div className="rounded-md border border-green-300 bg-green-50 p-2 text-xs text-green-700">
          ✓ {action === "verify" ? "Entity verified" : "Entity flagged for review"}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-primary">Action</label>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="radio"
              name="action"
              value="verify"
              checked={action === "verify"}
              onChange={(e) => setAction(e.target.value as Action)}
              disabled={loading}
              className="h-4 w-4"
            />
            <span className="text-xs text-secondary">Approve as verified</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="radio"
              name="action"
              value="flag"
              checked={action === "flag"}
              onChange={(e) => setAction(e.target.value as Action)}
              disabled={loading}
              className="h-4 w-4"
            />
            <span className="text-xs text-secondary">Flag for review</span>
          </label>
        </div>
      </div>

      {action !== "none" && (
        <div>
          <label htmlFor={`notes-${entity.id}`} className="block text-xs font-semibold text-primary">
            {action === "verify" ? "Verification notes (optional)" : "Reason for flag *"}
          </label>
          <textarea
            id={`notes-${entity.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              action === "verify"
                ? "e.g., Verified against CIPC records"
                : "e.g., Unable to verify against CIPC, needs clarification"
            }
            rows={2}
            disabled={loading}
            className="mt-1 w-full rounded-sm border border-panel bg-surface px-2 py-1 text-xs text-primary outline-none transition focus:border-accent disabled:opacity-50"
            required={action === "flag"}
          />
        </div>
      )}

      {action !== "none" && (
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || (action === "flag" && !notes.trim())}
            className={`flex-1 rounded-sm px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${
              action === "verify" ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {loading ? "Saving..." : action === "verify" ? "Verify" : "Flag"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAction("none")
              setNotes("")
            }}
            disabled={loading}
            className="rounded-sm border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:text-accent disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  )
}

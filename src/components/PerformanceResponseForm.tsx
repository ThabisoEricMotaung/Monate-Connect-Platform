"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { submitPerformanceResponse } from "@/lib/performanceRecords"

interface PerformanceResponseFormProps {
  recordId: string
  supplierId: string
  concernDescription: string
  onSuccess: () => void
}

export default function PerformanceResponseForm({
  recordId,
  supplierId,
  concernDescription,
  onSuccess,
}: PerformanceResponseFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    dispute_claim: false,
    response_text: "",
    corrective_actions_taken: "",
    corrective_actions_planned: "",
    timeline_for_resolution: "",
    evidence_file: null as File | null,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData((prev) => ({ ...prev, evidence_file: e.target.files![0] }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!supabase) {
        setError("Supabase client not configured")
        setLoading(false)
        return
      }

      if (!formData.response_text.trim()) {
        setError("Response is required")
        setLoading(false)
        return
      }

      let evidenceUrl: string | null = null

      // Upload evidence if provided
      if (formData.evidence_file) {
        const timestamp = Date.now()
        const fileName = `${supplierId}/performance-responses/${timestamp}-${formData.evidence_file.name}`
        const { error: uploadError } = await supabase.storage
          .from("supplier-documents")
          .upload(fileName, formData.evidence_file, { upsert: false })

        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`)
          setLoading(false)
          return
        }
        evidenceUrl = fileName
      }

      // Submit response
      const result = await submitPerformanceResponse(supabase, recordId, supplierId, {
        response_text: formData.response_text,
        dispute_claim: formData.dispute_claim,
        evidence_url: evidenceUrl,
        evidence_type: evidenceUrl ? "correspondence" : undefined,
        corrective_actions_taken: formData.corrective_actions_taken || null,
        corrective_actions_planned: formData.corrective_actions_planned || null,
        timeline_for_resolution: formData.timeline_for_resolution || null,
      })

      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Reset form
      setFormData({
        dispute_claim: false,
        response_text: "",
        corrective_actions_taken: "",
        corrective_actions_planned: "",
        timeline_for_resolution: "",
        evidence_file: null,
      })

      setIsOpen(false)
      onSuccess()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-accent bg-blue-50 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-blue-100"
      >
        <span>+ Respond to Concern</span>
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-panel bg-card p-6">
      <h3 className="mb-4 text-base font-bold text-heading">Your Response</h3>
      <p className="mb-4 text-xs text-secondary">
        You have 7 days to respond. Provide your explanation, any supporting evidence, and describe corrective actions.
      </p>

      {/* Original Concern (read-only) */}
      <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-3">
        <p className="text-xs font-semibold text-yellow-900">Concern Summary</p>
        <p className="mt-1 text-xs text-yellow-700 line-clamp-2">{concernDescription}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Dispute Claim */}
        <div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.dispute_claim}
              onChange={(e) => setFormData((prev) => ({ ...prev, dispute_claim: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-panel text-accent"
            />
            <div>
              <p className="text-xs font-semibold text-primary">I dispute this concern</p>
              <p className="text-xs text-secondary">Check this if you believe the concern is inaccurate or unfounded</p>
            </div>
          </label>
        </div>

        {/* Response Text */}
        <div>
          <label htmlFor="response" className="block text-xs font-semibold text-primary">
            Your Response *
          </label>
          <textarea
            id="response"
            value={formData.response_text}
            onChange={(e) => setFormData((prev) => ({ ...prev, response_text: e.target.value }))}
            placeholder="Explain what happened, provide context, or describe any corrective actions already taken..."
            rows={5}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
            required
          />
          <p className="mt-1 text-xs text-muted">Be specific and factual. Context matters.</p>
        </div>

        {/* Corrective Actions Taken */}
        <div>
          <label htmlFor="actions-taken" className="block text-xs font-semibold text-primary">
            Corrective Actions Already Taken
          </label>
          <textarea
            id="actions-taken"
            value={formData.corrective_actions_taken}
            onChange={(e) => setFormData((prev) => ({ ...prev, corrective_actions_taken: e.target.value }))}
            placeholder="e.g., 'Implemented new quality control process', 'Replaced the material supplier', etc."
            rows={3}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Corrective Actions Planned */}
        <div>
          <label htmlFor="actions-planned" className="block text-xs font-semibold text-primary">
            Corrective Actions Planned
          </label>
          <textarea
            id="actions-planned"
            value={formData.corrective_actions_planned}
            onChange={(e) => setFormData((prev) => ({ ...prev, corrective_actions_planned: e.target.value }))}
            placeholder="e.g., 'Will implement by end of month', 'Team training scheduled for next quarter', etc."
            rows={3}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Timeline */}
        <div>
          <label htmlFor="timeline" className="block text-xs font-semibold text-primary">
            Timeline for Resolution
          </label>
          <input
            id="timeline"
            type="text"
            value={formData.timeline_for_resolution}
            onChange={(e) => setFormData((prev) => ({ ...prev, timeline_for_resolution: e.target.value }))}
            placeholder="e.g., 'Resolved within 2 weeks', 'Ongoing monitoring through Q4', etc."
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Evidence Upload */}
        <div>
          <label htmlFor="evidence" className="block text-xs font-semibold text-primary">
            Supporting Evidence (Optional)
          </label>
          <p className="mt-1 text-xs text-secondary mb-2">Photos, correspondence, inspection reports, certificates, etc.</p>
          <input
            id="evidence"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.png,.xls,.xlsx"
            className="w-full text-xs text-secondary file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-accent"
          />
          {formData.evidence_file && (
            <p className="mt-2 text-xs text-secondary">Selected: {formData.evidence_file.name}</p>
          )}
        </div>

        {/* Important Note */}
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <strong>Important:</strong> Your response will be reviewed by procurement staff. The quality of your explanation and evidence can influence the final assessment.
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Response"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md border border-panel bg-surface px-4 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

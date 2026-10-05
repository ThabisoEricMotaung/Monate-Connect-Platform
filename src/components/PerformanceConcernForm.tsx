"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { submitPerformanceConcern, type ConcernType, type Severity } from "@/lib/performanceRecords"

const concernTypes: { value: ConcernType; label: string; description: string }[] = [
  { value: "delivery_delay", label: "Delivery Delay", description: "Late delivery or milestone" },
  { value: "quality_defect", label: "Quality Defect", description: "Poor workmanship, defective goods" },
  { value: "non_compliance", label: "Non-Compliance", description: "Failed to meet contract specifications" },
  { value: "safety_breach", label: "Safety Breach", description: "Safety or health violation" },
  { value: "financial_issue", label: "Financial Issue", description: "Invoice, payment, or financial problem" },
  { value: "subcontractor_default", label: "Subcontractor Default", description: "Subcontractor or sub-supplier failure" },
  { value: "other", label: "Other", description: "Other performance issue" },
]

const severityLevels: { value: Severity; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "text-rose-700 bg-rose-100" },
  { value: "major", label: "Major", color: "text-orange-700 bg-orange-100" },
  { value: "minor", label: "Minor", color: "text-amber-700 bg-amber-100" },
]

interface PerformanceConcernFormProps {
  buyerId: string
  supplierId: string
  onSuccess: () => void
}

export default function PerformanceConcernForm({ buyerId, supplierId, onSuccess }: PerformanceConcernFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    concern_type: "delivery_delay" as ConcernType,
    severity: "major" as Severity,
    source_contract_title: "",
    source_contract_reference: "",
    date_occurred: "",
    description: "",
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
      if (!formData.source_contract_title.trim()) {
        setError("Contract title is required")
        setLoading(false)
        return
      }

      if (!formData.description.trim()) {
        setError("Description is required")
        setLoading(false)
        return
      }

      let evidenceUrl: string | null = null

      // Upload evidence file if provided
      if (formData.evidence_file) {
        const timestamp = Date.now()
        const fileName = `${buyerId}/performance-concerns/${timestamp}-${formData.evidence_file.name}`
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

      // Submit concern
      const result = await submitPerformanceConcern(
        supabase,
        {
          supplier_id: supplierId,
          buyer_id: buyerId,
          concern_type: formData.concern_type,
          severity: formData.severity,
          source_contract_title: formData.source_contract_title,
          source_contract_reference: formData.source_contract_reference || null,
          date_occurred: formData.date_occurred || null,
          description: formData.description,
          documented_evidence_url: evidenceUrl,
          date_reported: new Date().toISOString(),
        },
        buyerId
      )

      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      // TODO: Send notification email to supplier

      // Reset form
      setFormData({
        concern_type: "delivery_delay",
        severity: "major",
        source_contract_title: "",
        source_contract_reference: "",
        date_occurred: "",
        description: "",
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
        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        <span>+ Report Performance Concern</span>
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-panel bg-card p-6">
      <h3 className="mb-4 text-base font-bold text-heading">Report Performance Concern</h3>
      <p className="mb-6 text-xs text-secondary">
        Document performance issues with specific details and evidence. The supplier will have 7 days to respond. Your feedback helps maintain procurement integrity.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Contract Title */}
        <div>
          <label htmlFor="contract-title" className="block text-xs font-semibold text-primary">
            Contract / Project Title *
          </label>
          <input
            id="contract-title"
            type="text"
            value={formData.source_contract_title}
            onChange={(e) => setFormData((prev) => ({ ...prev, source_contract_title: e.target.value }))}
            placeholder="e.g., Tender: Supply of Office Equipment 2026"
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Contract Reference */}
        <div>
          <label htmlFor="contract-ref" className="block text-xs font-semibold text-primary">
            Contract / PO Reference
          </label>
          <input
            id="contract-ref"
            type="text"
            value={formData.source_contract_reference}
            onChange={(e) => setFormData((prev) => ({ ...prev, source_contract_reference: e.target.value }))}
            placeholder="e.g., PO-2026-001234 or Contract #ABC-999"
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Concern Type */}
        <div>
          <label htmlFor="concern-type" className="block text-xs font-semibold text-primary">
            Type of Concern *
          </label>
          <select
            id="concern-type"
            value={formData.concern_type}
            onChange={(e) => setFormData((prev) => ({ ...prev, concern_type: e.target.value as ConcernType }))}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          >
            {concernTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.description}
              </option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-semibold text-primary">Severity *</label>
          <div className="mt-2 flex gap-3">
            {severityLevels.map((level) => (
              <label key={level.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="severity"
                  value={level.value}
                  checked={formData.severity === level.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, severity: e.target.value as Severity }))}
                  className="h-4 w-4 text-accent"
                />
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${level.color}`}>
                  {level.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Occurred */}
        <div>
          <label htmlFor="date-occurred" className="block text-xs font-semibold text-primary">
            When Did This Occur?
          </label>
          <input
            id="date-occurred"
            type="date"
            value={formData.date_occurred}
            onChange={(e) => setFormData((prev) => ({ ...prev, date_occurred: e.target.value }))}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-semibold text-primary">
            Detailed Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Provide specific details: What was expected? What actually happened? When? Who was involved? What was the impact?"
            rows={5}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
          <p className="mt-1 text-xs text-muted">Be specific and factual. The supplier will see this and have the opportunity to respond.</p>
        </div>

        {/* Evidence Upload */}
        <div>
          <label htmlFor="evidence" className="block text-xs font-semibold text-primary">
            Supporting Evidence (Optional)
          </label>
          <p className="mt-1 text-xs text-secondary mb-2">Photos, correspondence, invoices, inspection reports, etc.</p>
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

        {/* Compliance Note */}
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <strong>Important:</strong> The supplier has 7 days to respond to this concern. They may explain the situation, provide evidence, or dispute your claim. This is not a disqualification—context matters in procurement decisions.
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Concern"}
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

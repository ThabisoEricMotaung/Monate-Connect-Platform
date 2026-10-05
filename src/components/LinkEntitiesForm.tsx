"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { addSupplierRelatedEntity, logEntityAudit, type EntityType, type EvidenceType } from "@/lib/supplierRelatedEntities"

const entityTypes: { value: EntityType; label: string }[] = [
  { value: "director", label: "Director" },
  { value: "beneficial_owner", label: "Beneficial Owner (Shareholder)" },
  { value: "linked_supplier", label: "Related Company/Supplier" },
  { value: "shareholder", label: "Shareholder" },
  { value: "other", label: "Other Relationship" },
]

const evidenceTypes: { value: EvidenceType; label: string; description: string }[] = [
  { value: "self_disclosed", label: "Self-Disclosed", description: "You're providing this information" },
  { value: "cipc", label: "CIPC Record", description: "From CIPC registration or beneficial-ownership register" },
  { value: "csd", label: "CSD Record", description: "From Central Supplier Database" },
  { value: "user_uploaded", label: "Supporting Document", description: "Trust deed, article of association, ID, etc." },
]

interface LinkEntitiesFormProps {
  supplierId: string
  onSuccess: () => void
}

export default function LinkEntitiesForm({ supplierId, onSuccess }: LinkEntitiesFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    entity_type: "director" as EntityType,
    entity_name: "",
    entity_registration_number: "",
    relationship_description: "",
    evidence_type: "self_disclosed" as EvidenceType,
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
      if (!formData.entity_name.trim()) {
        setError("Entity name is required")
        setLoading(false)
        return
      }

      let evidenceUrl: string | null = null

      // Upload evidence file if provided
      if (formData.evidence_file) {
        const timestamp = Date.now()
        const fileName = `${supplierId}/linked-entities/${timestamp}-${formData.evidence_file.name}`
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

      // Create entity record
      const result = await addSupplierRelatedEntity(supabase, supplierId, {
        entity_type: formData.entity_type,
        entity_name: formData.entity_name,
        entity_registration_number: formData.entity_registration_number || null,
        relationship_description: formData.relationship_description || null,
        evidence_type: formData.evidence_type,
        evidence_url: evidenceUrl,
        evidence_uploaded_at: evidenceUrl ? new Date().toISOString() : null,
        dispute_status: "none",
        verification_notes: null,
      })

      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Log audit
      await logEntityAudit(supabase, supplierId, "disclosed", result.entity.id, "Entity disclosed by supplier")

      // Reset form
      setFormData({
        entity_type: "director",
        entity_name: "",
        entity_registration_number: "",
        relationship_description: "",
        evidence_type: "self_disclosed",
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
        <span>+ Add Linked Entity</span>
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-panel bg-card p-6">
      <h3 className="mb-4 text-base font-bold text-heading">Disclose Linked Enterprise</h3>
      <p className="mb-6 text-xs text-secondary">
        Help procurement bodies understand your company structure. Disclosure of directors, beneficial owners, and related companies demonstrates transparency.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Entity Type */}
        <div>
          <label htmlFor="entity-type" className="block text-xs font-semibold text-primary">
            Relationship Type *
          </label>
          <select
            id="entity-type"
            value={formData.entity_type}
            onChange={(e) => setFormData((prev) => ({ ...prev, entity_type: e.target.value as EntityType }))}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          >
            {entityTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Name */}
        <div>
          <label htmlFor="entity-name" className="block text-xs font-semibold text-primary">
            Full Name / Company Name *
          </label>
          <input
            id="entity-name"
            type="text"
            value={formData.entity_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, entity_name: e.target.value }))}
            placeholder="e.g., Jane Smith or ABC Trading (Pty) Ltd"
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Registration Number */}
        <div>
          <label htmlFor="reg-number" className="block text-xs font-semibold text-primary">
            Registration / ID Number
          </label>
          <input
            id="reg-number"
            type="text"
            value={formData.entity_registration_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, entity_registration_number: e.target.value }))}
            placeholder="e.g., CIPC registration number, ID number"
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Relationship Description */}
        <div>
          <label htmlFor="relationship" className="block text-xs font-semibold text-primary">
            Relationship Details
          </label>
          <textarea
            id="relationship"
            value={formData.relationship_description}
            onChange={(e) => setFormData((prev) => ({ ...prev, relationship_description: e.target.value }))}
            placeholder="e.g., 'Director (appointed 2020)', 'Shareholder (40% stake)', 'Parent company'"
            rows={3}
            className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* Evidence Type */}
        <div>
          <label className="block text-xs font-semibold text-primary">Evidence Type</label>
          <div className="mt-2 space-y-2">
            {evidenceTypes.map((type) => (
              <label key={type.value} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="evidence-type"
                  value={type.value}
                  checked={formData.evidence_type === type.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, evidence_type: e.target.value as EvidenceType }))}
                  className="mt-1 h-4 w-4 text-accent"
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-primary">{type.label}</div>
                  <div className="text-xs text-secondary">{type.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Evidence File Upload */}
        {formData.evidence_type === "user_uploaded" && (
          <div>
            <label htmlFor="evidence-file" className="block text-xs font-semibold text-primary">
              Upload Supporting Document
            </label>
            <input
              id="evidence-file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.png"
              className="mt-2 w-full text-xs text-secondary file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-accent"
            />
            {formData.evidence_file && (
              <p className="mt-2 text-xs text-secondary">Selected: {formData.evidence_file.name}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save & Disclose"}
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

"use client"

import { useEffect, useState } from "react"
import { SupabaseClient } from "@supabase/supabase-js"
import { getSupplierRelatedEntities, type SupplierRelatedEntity } from "@/lib/supplierRelatedEntities"

interface LinkEntitiesGalleryProps {
  supplierId: string
  supabase: SupabaseClient
}

export default function LinkEntitiesGallery({ supplierId, supabase }: LinkEntitiesGalleryProps) {
  const [entities, setEntities] = useState<SupplierRelatedEntity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEntities = async () => {
      const data = await getSupplierRelatedEntities(supabase, supplierId)
      setEntities(data)
      setLoading(false)
    }

    loadEntities()
  }, [supplierId, supabase])

  if (loading) {
    return <div className="text-xs text-secondary">Loading linked entities...</div>
  }

  if (entities.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-panel bg-surface p-6 text-center">
        <p className="text-sm text-secondary">No linked entities disclosed yet.</p>
        <p className="mt-1 text-xs text-muted">Disclose your directors, beneficial owners, and related companies to build trust with procurement bodies.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entities.map((entity) => {
        const verificationBadge = entity.verified ? (
          <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
            ✓ Verified
          </span>
        ) : entity.dispute_status === "disputed_by_supplier" ? (
          <span className="inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">
            ⚠ Disputed
          </span>
        ) : (
          <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            ○ Self-Disclosed
          </span>
        )

        return (
          <div key={entity.id} className="rounded-md border border-panel bg-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-heading">{entity.entity_name}</h4>
                <p className="text-xs text-secondary capitalize">{entity.entity_type.replace(/_/g, " ")}</p>
              </div>
              {verificationBadge}
            </div>

            {entity.relationship_description && (
              <p className="mb-2 text-xs text-secondary">{entity.relationship_description}</p>
            )}

            {entity.entity_registration_number && (
              <p className="mb-2 text-xs text-muted">Reg: {entity.entity_registration_number}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-secondary">
              <span>{entity.evidence_type?.replace(/_/g, " ")}</span>
              {entity.evidence_url && (
                <a href={entity.evidence_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  View evidence
                </a>
              )}
            </div>

            {entity.verification_notes && (
              <div className="mt-2 rounded-sm bg-blue-50 p-2 text-xs text-blue-700">
                <strong>Admin note:</strong> {entity.verification_notes}
              </div>
            )}

            {entity.dispute_status === "disputed_by_supplier" && entity.dispute_notes && (
              <div className="mt-2 rounded-sm bg-yellow-50 p-2 text-xs text-yellow-700">
                <strong>Your dispute:</strong> {entity.dispute_notes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import EnterpriseExplorer from "@/components/EnterpriseExplorer"
import VerificationWorkflow from "@/components/VerificationWorkflow"
import { getSupplierRelatedEntities, type SupplierRelatedEntity } from "@/lib/supplierRelatedEntities"

export default function EnterpriseGraphPage() {
  const [selectedEntity, setSelectedEntity] = useState<SupplierRelatedEntity | null>(null)
  const [activeTab, setActiveTab] = useState<"explorer" | "pending-verification">("explorer")
  const [pendingEntities, setPendingEntities] = useState<SupplierRelatedEntity[]>([])
  const [loadingPending, setLoadingPending] = useState(false)

  const handleLoadPending = async () => {
    if (!supabase) return
    setLoadingPending(true)

    try {
      // This is a simplified version - in production, you'd query unverified entities
      // across all suppliers. For now, we'll show the interface
      setPendingEntities([])
    } catch (err) {
      console.error("Error loading pending entities:", err)
    } finally {
      setLoadingPending(false)
    }
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          Supabase client not configured
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-heading">Enterprise Relationship Graph</h1>
          <p className="text-sm text-secondary">
            Search supplier relationships, verify disclosed entities, and explore enterprise connections.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-panel">
          <button
            onClick={() => setActiveTab("explorer")}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === "explorer"
                ? "border-b-2 border-accent text-accent"
                : "text-secondary hover:text-primary"
            }`}
          >
            Enterprise Explorer
          </button>
          <button
            onClick={() => {
              setActiveTab("pending-verification")
              handleLoadPending()
            }}
            className={`px-4 py-2 text-sm font-semibold transition ${
              activeTab === "pending-verification"
                ? "border-b-2 border-accent text-accent"
                : "text-secondary hover:text-primary"
            }`}
          >
            Pending Verification {pendingEntities.length > 0 && `(${pendingEntities.length})`}
          </button>
        </div>

        {/* Content */}
        {activeTab === "explorer" && <EnterpriseExplorer supabase={supabase} />}

        {activeTab === "pending-verification" && (
          <div className="space-y-6">
            {loadingPending ? (
              <div className="text-sm text-secondary">Loading pending entities...</div>
            ) : pendingEntities.length === 0 ? (
              <div className="rounded-md border border-dashed border-panel bg-surface p-8 text-center">
                <p className="text-sm text-secondary">No pending entities at this time.</p>
                <p className="mt-1 text-xs text-muted">
                  Self-disclosed entities will appear here for verification.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingEntities.map((entity) => (
                  <div key={entity.id} className="rounded-lg border border-panel bg-card p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-heading">{entity.entity_name}</h3>
                        <p className="text-xs text-secondary capitalize mt-1">
                          {entity.entity_type.replace(/_/g, " ")}
                        </p>
                        {entity.relationship_description && (
                          <p className="text-xs text-muted mt-2">{entity.relationship_description}</p>
                        )}
                        {entity.entity_registration_number && (
                          <p className="text-xs text-muted mt-1">
                            Registration: {entity.entity_registration_number}
                          </p>
                        )}
                      </div>
                      <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 whitespace-nowrap">
                        Pending
                      </span>
                    </div>

                    {entity.evidence_url && (
                      <div className="mb-4 text-xs">
                        <a
                          href={entity.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          📎 View evidence
                        </a>
                      </div>
                    )}

                    <VerificationWorkflow
                      entity={entity}
                      supabase={supabase}
                      onVerified={() => {
                        setPendingEntities(pendingEntities.filter((e) => e.id !== entity.id))
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

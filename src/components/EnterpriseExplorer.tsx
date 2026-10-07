"use client"

import { useState } from "react"
import { SupabaseClient } from "@supabase/supabase-js"
import { getSupplierRelatedEntities, getEnterpriseLinksForSupplier, type SupplierRelatedEntity, type EnterpriseLink } from "@/lib/supplierRelatedEntities"

interface ExplorerState {
  seedSupplierId: string
  seedSupplierName: string
  direction: "outbound" | "inbound" | "both"
  verifiedOnly: boolean
}

interface ExplorerResult {
  seed: {
    id: string
    name: string
  }
  entities: SupplierRelatedEntity[]
  outboundLinks: EnterpriseLink[]
  inboundLinks: EnterpriseLink[]
}

interface EnterpriseExplorerProps {
  supabase: SupabaseClient
}

export default function EnterpriseExplorer({ supabase }: EnterpriseExplorerProps) {
  const [state, setState] = useState<ExplorerState>({
    seedSupplierId: "",
    seedSupplierName: "",
    direction: "both",
    verifiedOnly: false,
  })

  const [result, setResult] = useState<ExplorerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)

    try {
      if (!state.seedSupplierId.trim()) {
        setError("Please enter a supplier ID")
        setLoading(false)
        return
      }

      // Fetch entities for this supplier
      const entities = await getSupplierRelatedEntities(supabase, state.seedSupplierId, {
        verified: state.verifiedOnly ? true : undefined,
      })

      // Fetch enterprise links
      const links = await getEnterpriseLinksForSupplier(supabase, state.seedSupplierId)

      setResult({
        seed: {
          id: state.seedSupplierId,
          name: state.seedSupplierName || state.seedSupplierId,
        },
        entities,
        outboundLinks: links.outbound,
        inboundLinks: links.inbound,
      })
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const displayedLinks =
    state.direction === "outbound"
      ? result?.outboundLinks
      : state.direction === "inbound"
        ? result?.inboundLinks
        : [...(result?.outboundLinks || []), ...(result?.inboundLinks || [])]

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="rounded-lg border border-panel bg-card p-6">
        <h3 className="mb-4 text-base font-bold text-heading">Search Enterprise Relationships</h3>

        <div className="space-y-4">
          {/* Supplier ID Input */}
          <div>
            <label htmlFor="supplier-id" className="block text-xs font-semibold text-primary">
              Supplier ID or Email *
            </label>
            <input
              id="supplier-id"
              type="text"
              value={state.seedSupplierId}
              onChange={(e) => setState((prev) => ({ ...prev, seedSupplierId: e.target.value }))}
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000 or supplier@example.com"
              className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
            />
          </div>

          {/* Supplier Name (optional) */}
          <div>
            <label htmlFor="supplier-name" className="block text-xs font-semibold text-primary">
              Supplier Name (optional)
            </label>
            <input
              id="supplier-name"
              type="text"
              value={state.seedSupplierName}
              onChange={(e) => setState((prev) => ({ ...prev, seedSupplierName: e.target.value }))}
              placeholder="e.g., ABC Trading (Pty) Ltd"
              className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-accent"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="block text-xs font-semibold text-primary mb-2">Show Relationships</label>
            <div className="flex gap-3">
              {[
                { value: "outbound", label: "Companies this supplier links to" },
                { value: "inbound", label: "Companies that link to this supplier" },
                { value: "both", label: "All relationships (both directions)" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={opt.value}
                    checked={state.direction === opt.value}
                    onChange={(e) => setState((prev) => ({ ...prev, direction: e.target.value as string }))}
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-secondary">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Verified Only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.verifiedOnly}
              onChange={(e) => setState((prev) => ({ ...prev, verifiedOnly: e.target.checked }))}
              className="h-4 w-4 rounded border-panel text-accent"
            />
            <span className="text-xs text-secondary">Show only verified entities</span>
          </label>

          {error && (
            <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search Relationships"}
          </button>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-bold text-blue-900">Results for {result.seed.name}</h3>
            <p className="mt-2 text-xs text-blue-700">
              Found <strong>{result.entities.length}</strong> disclosed entities and{" "}
              <strong>{displayedLinks?.length || 0}</strong> enterprise links
            </p>
          </div>

          {/* Entities */}
          {result.entities.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-bold text-heading">Disclosed Entities</h4>
              <div className="space-y-2">
                {result.entities.map((entity) => (
                  <div key={entity.id} className="rounded-md border border-panel bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-heading">{entity.entity_name}</p>
                        <p className="text-xs text-secondary capitalize mt-1">{entity.entity_type.replace(/_/g, " ")}</p>
                        {entity.relationship_description && (
                          <p className="text-xs text-muted mt-1">{entity.relationship_description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 items-center">
                        {entity.verified ? (
                          <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            Self-Disclosed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enterprise Links */}
          {displayedLinks && displayedLinks.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-bold text-heading">Enterprise Links</h4>
              <div className="space-y-2">
                {displayedLinks.map((link) => {
                  const isOutbound = link.source_supplier_id === result.seed.id
                  return (
                    <div key={link.id} className="rounded-md border border-panel bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-heading capitalize">
                            {link.link_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-secondary mt-1">
                            {isOutbound ? "→" : "←"} Supplier: {isOutbound ? link.target_supplier_id : link.source_supplier_id}
                          </p>
                        </div>
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                            link.strength === "strong"
                              ? "bg-rose-100 text-rose-700"
                              : link.strength === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {link.strength}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {result.entities.length === 0 && (!displayedLinks || displayedLinks.length === 0) && (
            <div className="rounded-md border border-dashed border-panel bg-surface p-6 text-center">
              <p className="text-sm text-secondary">No entities or links found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

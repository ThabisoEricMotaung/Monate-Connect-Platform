"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import PerformanceResponseForm from "@/components/PerformanceResponseForm"
import { getSupplierPerformanceRecords, getPerformanceRecordDetail, type SupplierPerformanceRecord, type PerformanceResponse } from "@/lib/performanceRecords"

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  disputed: "bg-orange-100 text-orange-700",
  dismissed: "bg-gray-100 text-gray-700",
  under_appeal: "bg-purple-100 text-purple-700",
}

interface ConcernWithResponse extends SupplierPerformanceRecord {
  response?: PerformanceResponse | null
}

export default function SupplierPerformanceConcernsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [concerns, setConcerns] = useState<ConcernWithResponse[]>([])
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
        setError("Supabase client not configured")
        setLoading(false)
        return
      }

      const client = supabase

      const { data: { user } } = await client.auth.getUser()
      if (!user) {
        router.push("/auth/signin")
        return
      }

      setUserId(user.id)

      // Fetch all performance records for this supplier
      const records = await getSupplierPerformanceRecords(client, user.id)

      // Fetch response details for each record
      const concernsWithResponses = await Promise.all(
        records.map(async (record) => {
          const detail = await getPerformanceRecordDetail(client, record.id)
          if ("ok" in detail && !detail.ok) {
            return record as ConcernWithResponse
          }
          return {
            ...record,
            response: detail.response || null,
          } as ConcernWithResponse
        })
      )

      setConcerns(concernsWithResponses)
      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl text-sm text-secondary">Loading concerns...</div>
      </div>
    )
  }

  const openConcerns = concerns.filter((c) => c.status === "open")
  const respondedConcerns = concerns.filter((c) => c.status !== "open" || c.response)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-heading">Performance Concerns</h1>
          <p className="text-sm text-secondary">
            {openConcerns.length > 0
              ? `You have ${openConcerns.length} concern(s) requiring your response.`
              : "No active performance concerns at this time."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Open Concerns Requiring Response */}
        {openConcerns.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
              <h2 className="text-sm font-bold text-orange-900">⚠ Action Required</h2>
              <p className="mt-1 text-xs text-orange-700">
                You have 7 days from the concern date to respond. Submit your response below to demonstrate due diligence.
              </p>
            </div>

            <div className="space-y-4">
              {openConcerns.map((concern) => (
                <div key={concern.id} className="rounded-lg border border-panel bg-card p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-heading">{concern.source_contract_title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusColors[concern.status]}`}>
                          {concern.status.replace(/_/g, " ")}
                        </span>
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                          concern.severity === "critical"
                            ? "bg-rose-100 text-rose-700"
                            : concern.severity === "major"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-amber-100 text-amber-700"
                        }`}>
                          {concern.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedConcernId(selectedConcernId === concern.id ? null : concern.id)}
                      className="rounded-md border border-panel bg-surface px-3 py-2 text-xs font-semibold text-secondary transition hover:text-accent"
                    >
                      {selectedConcernId === concern.id ? "Hide Details" : "Show Details"}
                    </button>
                  </div>

                  {selectedConcernId === concern.id && (
                    <div className="mt-4 space-y-4 border-t border-panel pt-4">
                      <div>
                        <p className="text-xs font-semibold text-primary mb-2">Concern Details</p>
                        <p className="text-xs text-secondary bg-surface p-3 rounded-md">{concern.description}</p>
                      </div>

                      {concern.date_occurred && (
                        <p className="text-xs text-muted">
                          Occurred: {new Date(concern.date_occurred).toLocaleDateString()}
                        </p>
                      )}

                      {concern.documented_evidence_url && (
                        <p className="text-xs">
                          <a href={concern.documented_evidence_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            📎 View buyer&apos;s evidence
                          </a>
                        </p>
                      )}

                      {!concern.response ? (
                        <div className="pt-2 border-t border-panel">
                          <PerformanceResponseForm
                            recordId={concern.id}
                            supplierId={userId}
                            concernDescription={concern.description}
                            onSuccess={() => {
                              // Refresh concerns
                              if (supabase) {
                                getSupplierPerformanceRecords(supabase, userId).then(setConcerns)
                              }
                              setSelectedConcernId(null)
                            }}
                          />
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-panel rounded-md border border-green-200 bg-green-50 p-3">
                          <p className="text-xs font-semibold text-green-700">✓ Response Submitted</p>
                          <p className="mt-1 text-xs text-green-600 line-clamp-2">{concern.response.response_text}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved/Historical Concerns */}
        {respondedConcerns.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-heading">
              Resolved & Historical Concerns ({respondedConcerns.length})
            </h2>
            <div className="space-y-2">
              {respondedConcerns.map((concern) => (
                <div key={concern.id} className="rounded-md border border-panel bg-card p-4 hover:border-accent/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-heading truncate">{concern.source_contract_title}</h3>
                      <p className="text-xs text-secondary capitalize mt-1">{concern.concern_type.replace(/_/g, " ")}</p>
                    </div>
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusColors[concern.status]}`}>
                      {concern.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {concerns.length === 0 && (
          <div className="rounded-md border border-dashed border-panel bg-surface p-8 text-center">
            <p className="text-sm text-secondary">No performance concerns at this time.</p>
            <p className="mt-1 text-xs text-muted">You&apos;re all clear! Keep up the good work.</p>
          </div>
        )}
      </div>
    </div>
  )
}

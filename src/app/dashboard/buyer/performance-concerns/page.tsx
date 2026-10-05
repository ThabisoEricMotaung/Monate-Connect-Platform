"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import PerformanceConcernForm from "@/components/PerformanceConcernForm"
import { getSupplierPerformanceRecords, type SupplierPerformanceRecord } from "@/lib/performanceRecords"

const severityColors: Record<string, string> = {
  critical: "bg-rose-100 text-rose-700",
  major: "bg-orange-100 text-orange-700",
  minor: "bg-amber-100 text-amber-700",
}

export default function PerformanceConcernsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [buyerId, setBuyerId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [concerns, setConcerns] = useState<SupplierPerformanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadData = async () => {
      if (!supabase) {
        setError("Supabase client not configured")
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/signin")
        return
      }

      setBuyerId(user.id)
      const supplierIdParam = searchParams.get("supplierId")
      const supplierNameParam = searchParams.get("supplierName")

      if (!supplierIdParam) {
        setError("No supplier selected")
        setLoading(false)
        return
      }

      setSupplierId(supplierIdParam)
      if (supplierNameParam) setSupplierName(decodeURIComponent(supplierNameParam))

      const records = await getSupplierPerformanceRecords(supabase, supplierIdParam)
      setConcerns(records)
      setLoading(false)
    }

    loadData()
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl text-sm text-secondary">Loading...</div>
      </div>
    )
  }

  if (!supplierId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl rounded-md border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-700">
          <strong>No supplier selected.</strong> Use the supplier search to select a supplier before reporting a performance concern.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-heading">Performance Concerns</h1>
          {supplierName && <p className="text-sm text-secondary">Supplier: <strong>{supplierName}</strong></p>}
          <p className="mt-2 text-sm text-secondary">
            Report performance issues with specific details. The supplier has 7 days to respond.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Submission Form */}
        <div className="mb-8 rounded-lg border border-panel bg-card p-6">
          <PerformanceConcernForm
            buyerId={buyerId}
            supplierId={supplierId}
            onSuccess={() => {
              getSupplierPerformanceRecords(supabase, supplierId).then(setConcerns)
            }}
          />
        </div>

        {/* Existing Concerns */}
        {concerns.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-heading">Your Submitted Concerns ({concerns.length})</h2>
            <div className="space-y-3">
              {concerns.map((concern) => (
                <div key={concern.id} className="rounded-md border border-panel bg-card p-4 hover:border-accent/30 transition">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-heading truncate">{concern.source_contract_title}</h3>
                      <p className="text-xs text-secondary capitalize mt-1">
                        {concern.concern_type.replace(/_/g, " ")}
                      </p>
                      {concern.source_contract_reference && (
                        <p className="text-xs text-muted mt-1">Ref: {concern.source_contract_reference}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${severityColors[concern.severity]}`}>
                        {concern.severity.toUpperCase()}
                      </span>
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                        concern.status === "open" ? "bg-blue-100 text-blue-700" :
                        concern.status === "under_review" ? "bg-yellow-100 text-yellow-700" :
                        concern.status === "resolved" ? "bg-green-100 text-green-700" :
                        concern.status === "dismissed" ? "bg-gray-100 text-gray-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {concern.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-secondary line-clamp-2 mb-3">{concern.description}</p>

                  <div className="flex items-center gap-3 text-xs text-muted">
                    {concern.date_occurred && (
                      <span>Occurred: {new Date(concern.date_occurred).toLocaleDateString()}</span>
                    )}
                    <span>Reported: {new Date(concern.date_reported).toLocaleDateString()}</span>
                    {concern.documented_evidence_url && (
                      <span className="text-accent">📎 Evidence attached</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {concerns.length === 0 && (
          <div className="rounded-md border border-dashed border-panel bg-surface p-6 text-center">
            <p className="text-sm text-secondary">No performance concerns submitted yet.</p>
            <p className="mt-1 text-xs text-muted">Submit a concern above to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

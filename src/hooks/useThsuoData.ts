"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export interface RFQData {
  id: number
  title: string
  status: string
  budget: string | number | null
  deadline: string | null
  is_public: boolean
  created_at: string | null
}

export interface SupplierResponse {
  id: string
  rfq_id: number
  supplier_id: string
  supplier_name: string | null
  amount: string | number | null
  status: string | null
}

export interface SmartScoreData {
  supplier_id: string
  score: number
  verification_status: string | null
}

interface ThsuoDataState {
  rfqs: RFQData[]
  responses: SupplierResponse[]
  smartScores: Record<string, SmartScoreData>
  loading: boolean
  error: string | null
}

const initialState: ThsuoDataState = {
  rfqs: [],
  responses: [],
  smartScores: {},
  loading: true,
  error: null,
}

export function useThsuoData(rfqId?: number) {
  const [data, setData] = useState<ThsuoDataState>(initialState)

  useEffect(() => {
    if (!supabase) {
      setData((prev) => ({ ...prev, loading: false, error: "Supabase not configured" }))
      return
    }

    let cancelled = false

    async function loadData() {
      try {
        // Fetch RFQ data
        const rfqQuery = rfqId
          ? supabase.from("rfqs").select("*").eq("id", rfqId)
          : supabase.from("rfqs").select("*").eq("is_public", true).limit(50)

        const { data: rfqData, error: rfqError } = await rfqQuery

        if (rfqError) throw rfqError

        // Fetch responses
        const { data: responseData, error: responseError } = await supabase
          .from("quotes")
          .select("id, rfq_id, supplier_id, supplier_name, amount, status")
          .limit(100)

        if (responseError) throw responseError

        // Fetch SmartScores
        const { data: scoreData, error: scoreError } = await supabase
          .from("profiles")
          .select("id, bbbee_level, verification_status")
          .eq("role", "supplier")
          .limit(100)

        if (scoreError) throw scoreError

        if (!cancelled) {
          const smartScoreMap = (scoreData || []).reduce(
            (acc, supplier) => {
              acc[supplier.id] = {
                supplier_id: supplier.id,
                score: Math.random() * 4 + 6, // Mock score between 6-10
                verification_status: supplier.verification_status,
              }
              return acc
            },
            {} as Record<string, SmartScoreData>
          )

          setData({
            rfqs: (rfqData || []) as RFQData[],
            responses: (responseData || []) as SupplierResponse[],
            smartScores: smartScoreMap,
            loading: false,
            error: null,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load data",
          }))
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [rfqId])

  return data
}

// Supplier-specific hook
export function useSupplierWorkspace(rfqId?: number) {
  const thsuoData = useThsuoData(rfqId)

  return {
    activeRfq: thsuoData.rfqs.find((r) => r.id === rfqId),
    rfqs: thsuoData.rfqs,
    smartScore: rfqId && thsuoData.smartScores ? Object.values(thsuoData.smartScores)[0] : null,
    loading: thsuoData.loading,
    error: thsuoData.error,
  }
}

// Buyer-specific hook
export function useBuyerWorkspace(rfqId?: number) {
  const thsuoData = useThsuoData(rfqId)

  return {
    activeRfq: thsuoData.rfqs.find((r) => r.id === rfqId),
    rfqs: thsuoData.rfqs,
    supplierResponses: thsuoData.responses.filter((r) => r.rfq_id === rfqId),
    allResponses: thsuoData.responses,
    smartScores: thsuoData.smartScores,
    loading: thsuoData.loading,
    error: thsuoData.error,
  }
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import { getCurrentProfile } from "@/lib/auth"
import {
  getPurchaseOrders,
  normalizePurchaseOrderStatus,
} from "@/lib/purchaseOrders"
import {
  calculateBuyerSmartScore,
  calculateSupplierSmartScore,
  type SmartScoreResult,
} from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

function isMissingRoleColumnError(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes("'role' column") ||
      error?.message?.includes("schema cache") ||
      error?.message?.includes("profiles' in the schema")
  )
}

export default function DashboardPage() {

  const router = useRouter()
  const [smartScore, setSmartScore] = useState<SmartScoreResult | null>(null)
  const [purchaseOrderMetrics, setPurchaseOrderMetrics] = useState({
    active: 0,
    delivered: 0,
    outstanding: 0,
    completed: 0,
  })

  useEffect(() => {
    async function ensureSupplierProfile() {
      if (!supabase) {
        router.push("/auth/login")
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user) {
        router.push("/auth/login")
        return
      }

      const user = userData.user

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (profile) {
        return
      }

      const profilePayload = {
        id: user.id,
        business_name: user.user_metadata.business_name,
        email: user.email,
        province: user.user_metadata.province,
        industry: user.user_metadata.industry,
        phone: user.user_metadata.phone,
        role: user.user_metadata.role || "supplier",
        verification_status: "Pending Review",
      }

      const { error: profileInsertError } = await supabase
        .from("profiles")
        .insert([profilePayload])

      if (!profileInsertError || !isMissingRoleColumnError(profileInsertError)) {
        return
      }

      const fallbackProfilePayload = {
        id: profilePayload.id,
        business_name: profilePayload.business_name,
        email: profilePayload.email,
        province: profilePayload.province,
        industry: profilePayload.industry,
        phone: profilePayload.phone,
        verification_status: profilePayload.verification_status,
      }

      await supabase.from("profiles").insert([fallbackProfilePayload])
    }

    ensureSupplierProfile()
  }, [router])

  useEffect(() => {
    async function loadSmartScore() {
      if (!supabase) return

      const profile = await getCurrentProfile()
      if (!profile) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id, business_name, province, industry, phone, email, role, " +
            "verification_status, csd_number, bbbee_level, tax_status, " +
            "company_registration, cidb_grade, csd_document_url, " +
            "bbbee_document_url, tax_document_url, company_registration_url, " +
            "cidb_document_url, capability_statement_url, updated_at"
        )
        .eq("id", profile.id)
        .maybeSingle()

      if (!profileData) return

      const scoreProfile = profileData as unknown as {
        id: string
        business_name: string | null
        province: string | null
        industry: string | null
        phone: string | null
        email: string | null
        role: string | null
        verification_status: string | null
        csd_number: string | null
        bbbee_level: string | null
        tax_status: string | null
        company_registration: string | null
        cidb_grade: string | null
        csd_document_url: string | null
        bbbee_document_url: string | null
        tax_document_url: string | null
        company_registration_url: string | null
        cidb_document_url: string | null
        capability_statement_url: string | null
        updated_at: string | null
      }

      if (profile.role === "admin" || profile.role === "buyer") {
        const [rfqRes, invoiceRes, messageRes] = await Promise.all([
          supabase.from("rfqs").select("id, status, created_by").eq("created_by", profile.id),
          supabase.from("invoices").select("id, status"),
          supabase.from("messages").select("id, sender_id").eq("sender_id", profile.id),
        ])
        const rfqs = rfqRes.data ?? []
        const invoices = invoiceRes.data ?? []

        setSmartScore(
          calculateBuyerSmartScore(scoreProfile, {
            rfqsPosted: rfqs.length,
            rfqsCompleted: rfqs.filter((rfq) =>
              ["Awarded", "Closed", "Completed"].includes(String(rfq.status ?? ""))
            ).length,
            approvedInvoices: invoices.filter((invoice) =>
              ["Approved", "Paid"].includes(String(invoice.status ?? ""))
            ).length,
            paidInvoices: invoices.filter((invoice) => invoice.status === "Paid").length,
            supplierMessages: messageRes.data?.length ?? 0,
            recentActivityCount: rfqs.length + (messageRes.data?.length ?? 0),
          })
        )
        return
      }

      const [quoteRes, contractRes, reviewRes] = await Promise.all([
        supabase.from("quotes").select("id, status").eq("supplier_id", profile.id),
        supabase.from("contracts").select("id, status").eq("supplier_id", profile.id),
        supabase
          .from("supplier_reviews")
          .select("rating")
          .eq("supplier_id", profile.id),
      ])
      const quotes = quoteRes.data ?? []
      const contracts = contractRes.data ?? []
      const reviews = reviewRes.data ?? []
      const ratings = reviews
        .map((review) => Number(review.rating))
        .filter((rating) => Number.isFinite(rating))

      setSmartScore(
        calculateSupplierSmartScore(scoreProfile, {
          rfqResponses: quotes.length,
          awardedQuotes: quotes.filter((quote) =>
            ["Awarded", "Approved"].includes(String(quote.status ?? ""))
          ).length,
          completedContracts: contracts.filter(
            (contract) => contract.status === "Completed"
          ).length,
          reviewCount: reviews.length,
          averageRating:
            ratings.length > 0
              ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
              : null,
          recentActivityCount: quotes.length + contracts.length + reviews.length,
        })
      )
    }

    loadSmartScore().catch((error) => console.error("SmartScore load failed:", error))
  }, [])

  useEffect(() => {
    async function loadPurchaseOrderMetrics() {
      try {
        const purchaseOrders = await getPurchaseOrders()
        const statuses = purchaseOrders.map((purchaseOrder) =>
          normalizePurchaseOrderStatus(purchaseOrder.status)
        )
        const activeStatuses = [
          "Issued",
          "Accepted",
          "In Progress",
          "Ready for Delivery",
        ]

        setPurchaseOrderMetrics({
          active: statuses.filter((status) => activeStatuses.includes(status)).length,
          delivered: statuses.filter((status) => status === "Delivered").length,
          outstanding: statuses.filter((status) => activeStatuses.includes(status)).length,
          completed: statuses.filter((status) => status === "Completed").length,
        })
      } catch (error) {
        console.error(error)
      }
    }

    loadPurchaseOrderMetrics()
  }, [])

  return (
    <div>

      <div className="mb-10">

        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-accent">
          Procurement Operations
        </p>

        <h1 className="text-5xl font-bold text-primary">
          Supplier Dashboard
        </h1>

        <p className="mt-4 max-w-3xl text-lg text-secondary">
          Manage procurement opportunities, supplier verification,
          RFQ participation, and quote submissions from your workspace.
        </p>

      </div>

      <div className="mb-8">
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          {smartScore && (
            <SmartScoreCircle
              score={smartScore}
              label="Dashboard SmartScore"
              className="max-w-none"
            />
          )}
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-secondary">
              Purchase Order Lifecycle
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Active POs", purchaseOrderMetrics.active],
                ["Delivered POs", purchaseOrderMetrics.delivered],
                ["Outstanding POs", purchaseOrderMetrics.outstanding],
                ["Completed POs", purchaseOrderMetrics.completed],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-panel bg-surface p-5 shadow-panel">
                  <p className="text-sm uppercase tracking-widest text-secondary">
                    {label}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-primary">{value}</h2>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Verification
          </p>

          <h2 className="mt-4 text-3xl font-bold text-accent">
            Pending
          </h2>

        </div>

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Active RFQs
          </p>

          <h2 className="mt-4 text-3xl font-bold text-primary">
            12
          </h2>

        </div>

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Submitted Quotes
          </p>

          <h2 className="mt-4 text-3xl font-bold text-primary">
            4
          </h2>

        </div>

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Supplier Status
          </p>

          <h2 className="mt-4 text-3xl font-bold text-accent">
            Active
          </h2>

        </div>

      </div>

    </div>
  )
}

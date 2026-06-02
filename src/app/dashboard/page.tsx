"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getPurchaseOrders,
  normalizePurchaseOrderStatus,
} from "@/lib/purchaseOrders"
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

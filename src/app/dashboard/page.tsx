"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {

  const router = useRouter()

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

      await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            business_name: user.user_metadata.business_name,
            email: user.email,
            province: user.user_metadata.province,
            industry: user.user_metadata.industry,
            phone: user.user_metadata.phone,
            role: user.user_metadata.role || "supplier",
            verification_status: "Pending Review",
          },
        ])
    }

    ensureSupplierProfile()
  }, [router])

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

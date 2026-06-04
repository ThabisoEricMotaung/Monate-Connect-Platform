"use client"

import { useEffect, useState } from "react"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  email: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  cidb_grade: string | null
  verification_notes: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  updated_at?: string | null
}

function valueOrDash(value: string | null | undefined): string {
  return value || "-"
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setErrorMessage(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setErrorMessage("You must be logged in to view your supplier profile.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, business_name, province, industry, phone, email, verification_status, csd_number, bbbee_level, tax_status, company_registration, cidb_grade, verification_notes, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setProfile((data ?? null) as SupplierProfile | null)
      setLoading(false)
    }

    loadProfile()
  }, [])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Supplier profile
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier account management
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Manage business details, verification status, category data, and
          procurement readiness in a trusted supplier workspace.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Supplier profile failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="rounded-md border border-panel bg-panel p-6"
            >
              <div className="h-5 w-56 animate-pulse rounded bg-card" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((field) => (
                  <div
                    key={field}
                    className="h-20 animate-pulse rounded-md bg-card"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !errorMessage && !profile && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No supplier profile found.
          </p>
          <p className="mt-2 text-xs text-muted">
            Your profile will appear here after account setup is completed.
          </p>
        </div>
      )}

      {!loading && profile && (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-md border border-panel bg-panel p-6">
              <div className="flex flex-col gap-3 border-b border-panel pb-5">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  Business information
                </p>
                <h2 className="text-xl font-semibold text-heading">
                  {profile.business_name || "Supplier Profile"}
                </h2>
                <p className="text-sm leading-7 text-secondary">
                  Supplier details used for procurement matching, contact
                  workflows, and readiness scoring.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Business name
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {valueOrDash(profile.business_name)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Province
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {valueOrDash(profile.province)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Industry
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {valueOrDash(profile.industry)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Phone
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {valueOrDash(profile.phone)}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <SmartScoreCircle
                  score={calculateSupplierSmartScore(profile)}
                  label="Supplier SmartScore"
                  className="max-w-none"
                />
              </div>
            </section>

            <section className="rounded-md border border-panel bg-panel p-6">
              <div className="flex flex-col gap-3 border-b border-panel pb-5">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  Verification status
                </p>
                <h2 className="text-xl font-semibold text-heading">
                  {profile.verification_status || "Pending Review"}
                </h2>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    CSD Number
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {valueOrDash(profile.csd_number)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Tax Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-heading">
                    {valueOrDash(profile.tax_status)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Action required
                  </p>
                  <p className="mt-2 text-sm text-secondary">
                    Upload missing compliance documents and keep credentials
                    current to improve procurement readiness.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-md border border-panel bg-panel p-6">
              <div className="border-b border-panel pb-5">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  Contact information
                </p>
                <h2 className="mt-2 text-lg font-semibold text-heading">
                  Primary contact
                </h2>
              </div>
              <div className="mt-6 space-y-4 text-sm text-secondary">
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Email
                  </p>
                  <p className="mt-2 font-semibold text-heading">
                    {valueOrDash(profile.email)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Phone
                  </p>
                  <p className="mt-2 font-semibold text-heading">
                    {valueOrDash(profile.phone)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-panel bg-panel p-6">
              <div className="border-b border-panel pb-5">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  Supplier category
                </p>
                <h2 className="mt-2 text-lg font-semibold text-heading">
                  Vendor classification
                </h2>
              </div>
              <div className="mt-6 space-y-4 text-sm text-secondary">
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Sector
                  </p>
                  <p className="mt-2 font-semibold text-heading">
                    {valueOrDash(profile.industry)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    B-BBEE Level
                  </p>
                  <p className="mt-2 font-semibold text-heading">
                    {valueOrDash(profile.bbbee_level)}
                  </p>
                </div>
                <div className="rounded-md border border-panel bg-card p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                    Company Registration
                  </p>
                  <p className="mt-2 font-semibold text-heading">
                    {valueOrDash(profile.company_registration)}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

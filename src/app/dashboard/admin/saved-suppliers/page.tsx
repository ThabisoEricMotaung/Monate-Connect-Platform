"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import SaveSupplierControl from "@/components/suppliers/SaveSupplierControl"
import { requireAdminOrBuyer } from "@/lib/auth"
import { getSavedSuppliers, type SavedSupplier } from "@/lib/savedSuppliers"
import { getSmartScoreLevel, type SmartScoreResult } from "@/lib/smartScore"
import { getCanonicalSupplierSmartScoreBatch } from "@/lib/supplierScoring"
import { supabase } from "@/lib/supabase"

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  phone: string | null
  email?: string | null
  csd_number: string | null
  csd_verified?: boolean | null
  bbbee_level: string | null
  bbbee_verified?: boolean | null
  tax_status: string | null
  tax_verified?: boolean | null
  company_registration: string | null
  bank_verified?: boolean | null
  banking_verified?: boolean | null
  director_verified?: boolean | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
}

type SavedSupplierRow = {
  saved: SavedSupplier
  supplier: SupplierProfile | null
}

const statusStyles: Record<string, string> = {
  Verified: "border-success bg-success-soft text-success",
  "Under Review": "border-warning bg-warning-soft text-warning",
  "Pending Review": "border-warning bg-warning-soft text-warning",
  Pending: "border-warning bg-warning-soft text-warning",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-700",
}

function statusBadgeClass(status: string | null): string {
  return statusStyles[status || ""] ?? "border-panel bg-panel text-secondary"
}

function scoreTone(score: number): string {
  if (score <= 39) return "border-rose-500/30 bg-rose-500/10 text-rose-700"
  if (score <= 69) return "border-warning bg-warning-soft text-warning"
  if (score <= 89) return "border-sky-500/30 bg-sky-500/10 text-sky-700"
  return "border-success bg-success-soft text-success"
}

function scoreBar(score: number): string {
  if (score <= 39) return "bg-rose-500"
  if (score <= 69) return "bg-warning"
  if (score <= 89) return "bg-sky-500"
  return "bg-success"
}

function ReadinessScore({ readiness }: { readiness: SmartScoreResult }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-heading">{readiness.score}/100</p>
        <span
          className={`inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${scoreTone(readiness.score)}`}
        >
          {readiness.label}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel">
        <div
          className={`h-full rounded-full ${scoreBar(readiness.score)}`}
          style={{ width: `${readiness.score}%` }}
        />
      </div>
    </div>
  )
}

function SavedSuppliersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-md border border-panel bg-card p-6 shadow-panel"
        >
          <div className="h-4 w-56 animate-pulse rounded bg-panel" />
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((__, fieldIndex) => (
              <div
                key={fieldIndex}
                className="h-16 animate-pulse rounded-md bg-panel"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminSavedSuppliersPage() {
  const router = useRouter()
  const [rows, setRows] = useState<SavedSupplierRow[]>([])
  const [readinessScores, setReadinessScores] = useState<Record<string, SmartScoreResult>>({})
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  async function loadSavedSupplierRows() {
    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      setLoading(false)
      return
    }

    const savedSuppliers = await getSavedSuppliers()
    const supplierIds = savedSuppliers.map((saved) => saved.supplier_id)

    if (supplierIds.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, business_name, province, industry, verification_status, phone, email, csd_number, csd_verified, bbbee_level, bbbee_verified, tax_status, tax_verified, company_registration, bank_verified, banking_verified, director_verified, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url")
      .in("id", supplierIds)

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const profileRows = (data ?? []) as SupplierProfile[]
    const canonicalScores = await getCanonicalSupplierSmartScoreBatch({
      supplierIds,
      client: supabase,
      profiles: profileRows,
    })
    const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]))

    setReadinessScores(
      Object.fromEntries(
        Object.entries(canonicalScores).map(([id, record]) => [id, record.result])
      )
    )
    setRows(
      savedSuppliers.map((saved) => ({
        saved,
        supplier: profilesById.get(saved.supplier_id) ?? null,
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    async function loadPage() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      try {
        await loadSavedSupplierRows()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Saved suppliers failed to load.")
        setLoading(false)
      }
    }

    loadPage()
  }, [router])

  const availableRows = useMemo(
    () => rows.filter((row) => row.supplier),
    [rows]
  )

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Supplier Shortlist
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Saved Suppliers
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review shortlisted suppliers, compare procurement readiness, and keep
          notes for later buyer evaluation.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Saved suppliers failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && <SavedSuppliersSkeleton />}

      {!loading && !errorMessage && rows.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No suppliers have been saved yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Use Save Supplier from the directory, supplier profile, or
            verification review to build a shortlist.
          </p>
        </div>
      )}

      {!loading && !errorMessage && rows.length > 0 && availableRows.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            Saved supplier profiles are no longer available.
          </p>
          <p className="mt-2 text-xs text-muted">
            Remove unavailable records from your shortlist and save active
            supplier profiles again.
          </p>
        </div>
      )}

      {!loading && !errorMessage && availableRows.length > 0 && (
        <div className="space-y-5">
          {availableRows.map(({ saved, supplier }) => {
            if (!supplier) return null

            return (
              <article
                key={saved.id}
                className="rounded-md border border-panel bg-card p-6 shadow-panel"
              >
                <div className="flex flex-col gap-4 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                      Saved Supplier
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-heading">
                      {supplier.business_name || "Supplier Profile"}
                    </h2>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(supplier.verification_status)}`}
                  >
                    {supplier.verification_status || "Pending Review"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Province
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {supplier.province || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Industry
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {supplier.industry || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4 xl:col-span-2">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Readiness Score
                    </p>
                    <div className="mt-2">
                      <ReadinessScore readiness={readinessScores[supplier.id] ?? getSmartScoreLevel(0)} />
                    </div>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4 md:col-span-2 xl:col-span-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Notes
                    </p>
                    <p className="mt-2 text-sm leading-7 text-heading">
                      {saved.notes || "No notes captured."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-panel pt-5">
                  <Link
                    href={`/dashboard/suppliers/${supplier.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
                  >
                    View Profile
                  </Link>
                  <SaveSupplierControl
                    supplierId={supplier.id}
                    compact
                    onRemoved={() =>
                      setRows((currentRows) =>
                        currentRows.filter((row) => row.saved.id !== saved.id)
                      )
                    }
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

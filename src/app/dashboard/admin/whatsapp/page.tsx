"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import SmartScoreCircle from "@/components/SmartScoreCircle"
import { requireAdminOrBuyer } from "@/lib/auth"
import { calculateSupplierSmartScore, type SmartScoreResult } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"
import {
  createRFQWhatsAppMessage,
  createWhatsAppLink,
  logWhatsAppAlert,
  type WhatsAppAlertType,
} from "@/lib/whatsapp"

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
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  updated_at: string | null
  smartScore: SmartScoreResult
}

type RFQOption = {
  id: number
  title: string | null
  category: string | null
  province: string | null
  deadline: string | null
  budget: string | null
  status: string | null
}

const ALERT_TYPES: WhatsAppAlertType[] = [
  "New RFQ",
  "Closing Soon",
  "Award Notice",
  "PO Issued",
  "Invoice Reminder",
  "Compliance Reminder",
]

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("does not exist") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
}

function createGenericMessage(alertType: WhatsAppAlertType, supplier: SupplierProfile): string {
  const supplierName = supplier.business_name || "Supplier"

  if (alertType === "Compliance Reminder") {
    return `Hi ${supplierName}, Monate Connect compliance reminder: please update your supplier profile, compliance documents, and banking details so procurement teams can continue processing opportunities.`
  }

  if (alertType === "Invoice Reminder") {
    return `Hi ${supplierName}, Monate Connect invoice reminder: please review outstanding invoice actions in your supplier dashboard.`
  }

  if (alertType === "PO Issued") {
    return `Hi ${supplierName}, Monate Connect notice: a purchase order action may require your review. Please sign in to your dashboard.`
  }

  if (alertType === "Award Notice") {
    return `Hi ${supplierName}, Monate Connect award notice: please sign in to your supplier dashboard for procurement award updates.`
  }

  return `Hi ${supplierName}, procurement alert from Monate Connect. Please sign in to your supplier dashboard for the latest opportunity updates.`
}

export default function AdminWhatsAppNetworkPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([])
  const [rfqs, setRfqs] = useState<RFQOption[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [alertType, setAlertType] = useState<WhatsAppAlertType>("New RFQ")
  const [selectedRfqId, setSelectedRfqId] = useState("")
  const [provinceFilter, setProvinceFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const params = new URLSearchParams(window.location.search)
      const rfqId = params.get("rfq_id")
      if (rfqId) {
        setSelectedRfqId(rfqId)
        setAlertType("New RFQ")
      }

      const [supplierResult, rfqResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, business_name, province, industry, phone, email, verification_status, " +
              "csd_number, bbbee_level, tax_status, company_registration, cidb_grade, " +
              "csd_document_url, bbbee_document_url, tax_document_url, " +
              "company_registration_url, cidb_document_url, capability_statement_url, updated_at"
          )
          .eq("role", "supplier")
          .order("business_name", { ascending: true }),
        supabase
          .from("rfqs")
          .select("id, title, category, province, deadline, budget, status")
          .order("created_at", { ascending: false })
          .limit(100),
      ])

      if (supplierResult.error) {
        setErrorMessage(supplierResult.error.message)
        setLoading(false)
        return
      }

      if (rfqResult.error && !isMissingTableError(rfqResult.error)) {
        setErrorMessage(rfqResult.error.message)
        setLoading(false)
        return
      }

      setSuppliers(
        ((supplierResult.data ?? []) as Omit<SupplierProfile, "smartScore">[]).map(
          (supplier) => ({
            ...supplier,
            smartScore: calculateSupplierSmartScore(supplier),
          })
        )
      )
      setRfqs((rfqResult.data ?? []) as RFQOption[])
      setLoading(false)
    }

    load()
  }, [router])

  const selectedRfq = useMemo(
    () => rfqs.find((rfq) => String(rfq.id) === selectedRfqId) ?? null,
    [rfqs, selectedRfqId]
  )

  const options = useMemo(
    () => ({
      provinces: Array.from(new Set(suppliers.map((supplier) => supplier.province).filter(Boolean))).sort() as string[],
      industries: Array.from(new Set(suppliers.map((supplier) => supplier.industry).filter(Boolean))).sort() as string[],
      statuses: Array.from(new Set(suppliers.map((supplier) => supplier.verification_status).filter(Boolean))).sort() as string[],
      levels: Array.from(new Set(suppliers.map((supplier) => supplier.smartScore.label))).sort(),
    }),
    [suppliers]
  )

  const filteredSuppliers = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return suppliers.filter((supplier) => {
      const matchesSearch =
        !needle ||
        (supplier.business_name ?? "").toLowerCase().includes(needle) ||
        (supplier.email ?? "").toLowerCase().includes(needle)
      const matchesProvince = !provinceFilter || supplier.province === provinceFilter
      const matchesIndustry = !industryFilter || supplier.industry === industryFilter
      const matchesStatus = !statusFilter || supplier.verification_status === statusFilter
      const matchesLevel = !levelFilter || supplier.smartScore.label === levelFilter

      return matchesSearch && matchesProvince && matchesIndustry && matchesStatus && matchesLevel
    })
  }, [industryFilter, levelFilter, provinceFilter, search, statusFilter, suppliers])

  const selectedSuppliers = useMemo(
    () => suppliers.filter((supplier) => selectedIds.includes(supplier.id)),
    [selectedIds, suppliers]
  )

  const previewSupplier = selectedSuppliers[0] ?? filteredSuppliers[0] ?? null
  const previewMessage = previewSupplier
    ? selectedRfq
      ? createRFQWhatsAppMessage(selectedRfq, previewSupplier, alertType)
      : createGenericMessage(alertType, previewSupplier)
    : "Select a supplier to generate a WhatsApp message preview."

  function toggleSupplier(supplierId: string) {
    setSelectedIds((current) =>
      current.includes(supplierId)
        ? current.filter((id) => id !== supplierId)
        : [...current, supplierId]
    )
  }

  function selectFiltered() {
    setSelectedIds(filteredSuppliers.map((supplier) => supplier.id))
  }

  async function openWhatsAppForSupplier(supplier: SupplierProfile) {
    const message = selectedRfq
      ? createRFQWhatsAppMessage(selectedRfq, supplier, alertType)
      : createGenericMessage(alertType, supplier)
    const link = createWhatsAppLink({ phone: supplier.phone, message })

    if (!link) {
      setErrorMessage(`${supplier.business_name || "Supplier"} does not have a valid WhatsApp phone number.`)
      return
    }

    window.open(link, "_blank", "noopener,noreferrer")
    await logWhatsAppAlert({
      supplier_id: supplier.id,
      supplier_phone: supplier.phone,
      alert_type: alertType,
      message,
      rfq_id: selectedRfq?.id ?? null,
      metadata: {
        supplier_name: supplier.business_name,
        rfq_title: selectedRfq?.title ?? null,
        smart_score: supplier.smartScore.score,
        smart_score_level: supplier.smartScore.label,
      },
    })
    setSuccessMessage(`WhatsApp alert prepared for ${supplier.business_name || "Supplier"}.`)
  }

  async function openSelectedWhatsAppAlerts() {
    setErrorMessage("")
    setSuccessMessage("")

    if (selectedSuppliers.length === 0) {
      setErrorMessage("Select at least one supplier before opening WhatsApp alerts.")
      return
    }

    const preparedAlerts = selectedSuppliers
      .map((supplier) => {
        const message = selectedRfq
          ? createRFQWhatsAppMessage(selectedRfq, supplier, alertType)
          : createGenericMessage(alertType, supplier)
        const link = createWhatsAppLink({ phone: supplier.phone, message })

        return { supplier, message, link }
      })
      .filter((alert) => Boolean(alert.link))

    if (preparedAlerts.length === 0) {
      setErrorMessage("None of the selected suppliers have valid WhatsApp phone numbers.")
      return
    }

    preparedAlerts.forEach(({ link }) => {
      if (link) window.open(link, "_blank", "noopener,noreferrer")
    })

    await Promise.all(
      preparedAlerts.map(({ supplier, message }) =>
        logWhatsAppAlert({
          supplier_id: supplier.id,
          supplier_phone: supplier.phone,
          alert_type: alertType,
          message,
          rfq_id: selectedRfq?.id ?? null,
          metadata: {
            supplier_name: supplier.business_name,
            rfq_title: selectedRfq?.title ?? null,
            smart_score: supplier.smartScore.score,
            smart_score_level: supplier.smartScore.label,
            batch_alert: true,
          },
        })
      )
    )

    const skippedCount = selectedSuppliers.length - preparedAlerts.length
    setSuccessMessage(
      `Prepared ${preparedAlerts.length} WhatsApp alert${preparedAlerts.length === 1 ? "" : "s"}${
        skippedCount > 0 ? `; skipped ${skippedCount} without valid phone numbers.` : "."
      }`
    )
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Supplier Communications
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          WhatsApp Procurement Network
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Generate WhatsApp-ready procurement alerts with wa.me deep links for
          RFQs, purchase orders, invoices, awards, and compliance reminders.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">WhatsApp network alert</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="whatsapp-search" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Search
            </label>
            <input
              id="whatsapp-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Supplier name or email"
              className={filterClass}
            />
          </div>
          <div>
            <label htmlFor="whatsapp-province" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Province
            </label>
            <select id="whatsapp-province" value={provinceFilter} onChange={(event) => setProvinceFilter(event.target.value)} className={filterClass}>
              <option value="">All provinces</option>
              {options.provinces.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="whatsapp-industry" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Industry
            </label>
            <select id="whatsapp-industry" value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)} className={filterClass}>
              <option value="">All industries</option>
              {options.industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="whatsapp-verification" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Verification
            </label>
            <select id="whatsapp-verification" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={filterClass}>
              <option value="">All statuses</option>
              {options.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="whatsapp-smartscore" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              SmartScore Level
            </label>
            <select id="whatsapp-smartscore" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className={filterClass}>
              <option value="">All levels</option>
              {options.levels.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="whatsapp-alert-type" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Alert Type
            </label>
            <select id="whatsapp-alert-type" value={alertType} onChange={(event) => setAlertType(event.target.value as WhatsAppAlertType)} className={filterClass}>
              {ALERT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="whatsapp-rfq-context" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              RFQ Context
            </label>
            <select id="whatsapp-rfq-context" value={selectedRfqId} onChange={(event) => setSelectedRfqId(event.target.value)} className={filterClass}>
              <option value="">No RFQ selected</option>
              {rfqs.map((rfq) => (
                <option key={rfq.id} value={rfq.id}>
                  RFQ-{rfq.id}: {rfq.title || "Untitled RFQ"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={selectFiltered}
            className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Select Filtered Suppliers
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
          >
            Clear Selection
          </button>
          <button
            type="button"
            onClick={openSelectedWhatsAppAlerts}
            className="rounded-md border border-success bg-success-soft px-5 py-2.5 text-sm font-semibold text-success transition hover:bg-success/10"
          >
            Open WhatsApp for Selected
          </button>
          <span className="inline-flex items-center rounded-md border border-panel bg-panel px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            {selectedIds.length} selected
          </span>
        </div>
      </section>

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
          Message Preview
        </p>
        <pre className="mt-3 whitespace-pre-wrap rounded-md border border-panel bg-panel p-4 text-sm leading-7 text-heading">
          {previewMessage}
        </pre>
      </section>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
          ))}
        </div>
      )}

      {!loading && suppliers.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No suppliers found.</p>
          <p className="mt-2 text-xs text-muted">WhatsApp alerts can be prepared once supplier profiles exist.</p>
        </div>
      )}

      {!loading && suppliers.length > 0 && filteredSuppliers.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No suppliers match these filters.</p>
          <p className="mt-2 text-xs text-muted">Adjust province, industry, verification, or SmartScore filters.</p>
        </div>
      )}

      {!loading && filteredSuppliers.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredSuppliers.map((supplier) => {
            const isSelected = selectedIds.includes(supplier.id)
            const message = selectedRfq
              ? createRFQWhatsAppMessage(selectedRfq, supplier, alertType)
              : createGenericMessage(alertType, supplier)
            const link = createWhatsAppLink({ phone: supplier.phone, message })

            return (
              <article key={supplier.id} className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.24em] text-secondary">
                      Supplier
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">
                      {supplier.business_name || "Unnamed Supplier"}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {[supplier.province, supplier.industry].filter(Boolean).join(" | ") || "No location/industry"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Phone: {supplier.phone || "No phone on profile"}
                    </p>
                  </div>
                  <SmartScoreCircle score={supplier.smartScore} size="sm" compact className="max-w-[180px] bg-panel p-4" />
                </div>

                <div className="mt-4 flex flex-wrap gap-3 border-t border-panel pt-4">
                  <button
                    type="button"
                    onClick={() => toggleSupplier(supplier.id)}
                    className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "border-accent bg-accent text-button"
                        : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                  {link ? (
                    <button
                      type="button"
                      onClick={() => openWhatsAppForSupplier(supplier)}
                      className="rounded-md border border-success bg-success-soft px-4 py-2 text-sm font-semibold text-success transition hover:bg-success/10"
                    >
                      Open WhatsApp
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-muted opacity-70"
                    >
                      No WhatsApp phone
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

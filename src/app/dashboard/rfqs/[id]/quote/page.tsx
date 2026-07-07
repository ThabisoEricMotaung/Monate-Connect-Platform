"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { logActivity } from "@/lib/activity"
import { logAuditAction } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { createNotificationsForRoles } from "@/lib/notifications"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"
import {
  applySupplierDocuments,
  fetchSupplierDocumentsForProfile,
  type SupplierDocument,
} from "@/lib/supplierDocuments"

type RFQ = {
  id: number
  title: string | null
  description: string | null
  province: string | null
  region: string | null
  category: string | null
  budget: string | null
  deadline: string | null
  status: string | null
  attachment_url?: string | null
  created_by?: string | null
  buyer_name?: string | null
  buyer?: string | null
  organization_name?: string | null
  bbee_requirement?: string | null
  bbbee_requirement?: string | null
  bbbee_level?: string | null
  line_items?: RFQLineItem[] | string | null
  is_external_opportunity?: boolean | null
  original_source_url?: string | null
  source_name?: string | null
}

type RFQLineItem = {
  description?: string
  spec?: string
  qty?: number | string
  unit_price?: number | string
}

type SupplierProfile = {
  id: string
  business_name: string | null
  email: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  company_registration: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  supplier_documents?: SupplierDocument[]
  updated_at?: string | null
}

type BuyerProfile = {
  id: string
  business_name?: string | null
  organisation_name?: string | null
  organization_name?: string | null
  organisation_type?: string | null
  organization_type?: string | null
  province?: string | null
  verification_status?: string | null
}

type QuoteLineItem = {
  id: string
  description: string
  spec: string
  qty: string
  unitPrice: string
  locked: boolean
}

type QuoteDraft = {
  lineItems: QuoteLineItem[]
  validity: string
  deliveryLeadTime: string
  coverNote: string
  paymentTerms: string
  documents: string[]
}

type ValidationErrors = {
  lineItems?: string
  validity?: string
  deliveryLeadTime?: string
  paymentTerms?: string
}

const validityOptions = ["30 days", "45 days", "60 days", "90 days"]
const deliveryOptions = ["1-2 weeks", "2-4 weeks", "4-6 weeks", "6+ weeks"]
const paymentOptions = [
  "30 days from invoice",
  "30 days EOM",
  "50% upfront / 50% on delivery",
  "COD",
]

function cleanAmount(value: string): string {
  return value.replace(/[^\d.]/g, "")
}

function numeric(value: string): number {
  const parsed = Number(cleanAmount(value))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: number): string {
  return `R ${Math.round(value).toLocaleString("en-ZA")}`
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

function daysUntil(value: string | null): number | null {
  if (!value) return null
  const deadline = new Date(`${value}T00:00:00`)
  if (Number.isNaN(deadline.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
}

function deadlineLabel(days: number | null): string {
  if (days === null) return "Closing date TBC"
  if (days < 0) return "Closed"
  if (days === 0) return "Closes today"
  if (days === 1) return "Closes in 1 day"
  return `Closes in ${days} days`
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function parseBBBEELevel(value: string | null | undefined): number | null {
  if (!value) return null
  if (value.toLowerCase().includes("non-compliant")) return 9
  const match = value.match(/level\s*(\d)/i)
  return match ? Number(match[1]) : null
}

function qualifiesForBBBEE(supplierLevel: string | null | undefined, requiredLevel: string | null | undefined): boolean {
  const required = parseBBBEELevel(requiredLevel)
  if (!required) return true
  const supplier = parseBBBEELevel(supplierLevel)
  if (!supplier) return false
  return supplier <= required
}

function buyerName(rfq: RFQ | null, buyer: BuyerProfile | null): string {
  return (
    rfq?.buyer_name ||
    rfq?.buyer ||
    rfq?.organization_name ||
    buyer?.organisation_name ||
    buyer?.organization_name ||
    buyer?.business_name ||
    "Procurement buyer"
  )
}

function rfqProvince(rfq: RFQ | null): string {
  return rfq?.province || rfq?.region || "South Africa"
}

function bbeeRequirement(rfq: RFQ | null): string {
  return rfq?.bbee_requirement || rfq?.bbbee_requirement || rfq?.bbbee_level || "Any level / not specified"
}

function getInitialLineItems(rfq: RFQ | null): QuoteLineItem[] {
  const rawItems = rfq?.line_items
  let parsed: RFQLineItem[] = []

  if (Array.isArray(rawItems)) {
    parsed = rawItems
  } else if (typeof rawItems === "string" && rawItems.trim()) {
    try {
      const value = JSON.parse(rawItems)
      parsed = Array.isArray(value) ? value : []
    } catch {
      parsed = []
    }
  }

  if (parsed.length === 0) {
    return [{ id: crypto.randomUUID(), description: "", spec: "", qty: "", unitPrice: "", locked: false }]
  }

  return parsed.map((item, index) => ({
    id: `rfq-${index}`,
    description: item.description ?? "",
    spec: item.spec ?? "",
    qty: item.qty ? String(item.qty) : "",
    unitPrice: item.unit_price ? String(item.unit_price) : "",
    locked: true,
  }))
}

function hasVatRegistration(profile: SupplierProfile | null): boolean {
  return Boolean(
    profile?.tax_status?.toLowerCase().includes("vat") ||
      profile?.tax_document_url ||
      profile?.company_registration?.toLowerCase().includes("vat")
  )
}

function FileIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M7 3h7l5 5v13H7V3Z" />
    </svg>
  )
}

function ChecklistIcon({ state }: { state: "success" | "warning" | "muted" }) {
  const classes =
    state === "success"
      ? "border-success bg-success-soft text-success"
      : state === "warning"
        ? "border-warning bg-warning-soft text-warning"
        : "border-panel bg-panel text-muted"

  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${classes}`}>
      {state === "success" ? "✓" : state === "warning" ? "!" : ""}
    </span>
  )
}

export default function QuoteSubmissionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const firstErrorRef = useRef<HTMLDivElement | null>(null)
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [profile, setProfile] = useState<SupplierProfile | null>(null)
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null)
  const [buyerRFQCount, setBuyerRFQCount] = useState<number | null>(null)
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([])
  const [validity, setValidity] = useState("30 days")
  const [deliveryLeadTime, setDeliveryLeadTime] = useState("")
  const [coverNote, setCoverNote] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")
  const [documents, setDocuments] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [draftBanner, setDraftBanner] = useState("")
  const [showFullDescription, setShowFullDescription] = useState(false)

  const draftKey = `monate-quote-draft-${params.id}`

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data: rfqData, error: rfqError } = await supabase
        .from("rfqs")
        .select("*")
        .eq("id", Number(params.id))
        .single()

      if (rfqError) {
        setErrorMessage(rfqError.message)
        setLoading(false)
        return
      }

      const currentRfq = rfqData as RFQ
      setRfq(currentRfq)
      setLineItems(getInitialLineItems(currentRfq))

      const user = await getCurrentUser()
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, business_name, email, province, industry, verification_status, csd_number, bbbee_level, tax_status, company_registration, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url, updated_at")
          .eq("id", user.id)
          .maybeSingle()

        if (profileData) {
          const documentResult = await fetchSupplierDocumentsForProfile(user.id)
          if (documentResult.error) {
            setErrorMessage(documentResult.error)
            setLoading(false)
            return
          }
          setProfile(applySupplierDocuments(profileData as SupplierProfile, documentResult.documents))
        } else {
          setProfile(null)
        }
      }

      if (currentRfq.created_by) {
        const { data: buyerData } = await supabase
          .from("profiles")
          .select("id, business_name, province, verification_status")
          .eq("id", currentRfq.created_by)
          .maybeSingle()

        setBuyer((buyerData ?? null) as BuyerProfile | null)

        const { count } = await supabase
          .from("rfqs")
          .select("id", { count: "exact", head: true })
          .eq("created_by", currentRfq.created_by)

        setBuyerRFQCount(count ?? null)
      }

      const savedDraft = window.localStorage.getItem(draftKey)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft) as QuoteDraft & { savedAt?: string }
          setLineItems(parsed.lineItems?.length ? parsed.lineItems : getInitialLineItems(currentRfq))
          setValidity(parsed.validity || "30 days")
          setDeliveryLeadTime(parsed.deliveryLeadTime || "")
          setCoverNote(parsed.coverNote || "")
          setPaymentTerms(parsed.paymentTerms || "")
          setDraftSavedAt(parsed.savedAt ?? null)
        } catch {
          window.localStorage.removeItem(draftKey)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [draftKey, params.id])

  const daysLeft = daysUntil(rfq?.deadline ?? null)
  const isClosed = getRFQDisplayStatus(rfq?.status, rfq?.deadline) === "Closed"
  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + numeric(item.qty) * numeric(item.unitPrice), 0),
    [lineItems]
  )
  const vatRegistered = hasVatRegistration(profile)
  const vat = vatRegistered ? subtotal * 0.15 : 0
  const total = subtotal + vat
  const coverWords = wordCount(coverNote)
  const smartScore = calculateSupplierSmartScore(profile)
  const bbeeQualifies = qualifiesForBBBEE(profile?.bbbee_level, bbeeRequirement(rfq))
  const lineItemsPriced = lineItems.length > 0 && lineItems.every((item) => numeric(item.qty) > 0 && numeric(item.unitPrice) > 0)
  const csdActive = Boolean(profile?.csd_number?.trim())
  const hasTaxDocument = documents.some((file) => file.name.toLowerCase().includes("tax")) || Boolean(profile?.tax_document_url)
  const checklistComplete = lineItemsPriced && csdActive && bbeeQualifies && coverWords >= 20 && hasTaxDocument && Boolean(validity)
  const descriptionLong = (rfq?.description ?? "").length > 220

  function updateLineItem(id: string, field: keyof QuoteLineItem, value: string) {
    setLineItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
    setErrors((current) => ({ ...current, lineItems: undefined }))
  }

  function addLineItem() {
    setLineItems((current) => [
      ...current,
      { id: crypto.randomUUID(), description: "", spec: "", qty: "", unitPrice: "", locked: false },
    ])
  }

  function removeLineItem(id: string) {
    setLineItems((current) => current.filter((item) => item.id !== id || item.locked))
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).filter((file) => file.size <= 10 * 1024 * 1024)
    setDocuments((current) => [...current, ...selected])
    event.target.value = ""
  }

  function saveDraft() {
    const savedAt = new Date().toISOString()
    const draft: QuoteDraft & { savedAt: string } = {
      lineItems,
      validity,
      deliveryLeadTime,
      coverNote,
      paymentTerms,
      documents: documents.map((file) => file.name),
      savedAt,
    }

    window.localStorage.setItem(draftKey, JSON.stringify(draft))
    setDraftSavedAt(savedAt)
    setDraftBanner("Draft saved")
    window.setTimeout(() => setDraftBanner(""), 3000)
  }

  function validate(): boolean {
    const nextErrors: ValidationErrors = {}

    if (!lineItemsPriced) nextErrors.lineItems = "All line items must have a quantity and unit price greater than 0."
    if (!validity) nextErrors.validity = "Quote validity period is required."
    if (!deliveryLeadTime) nextErrors.deliveryLeadTime = "Delivery lead time is required."
    if (!paymentTerms) nextErrors.paymentTerms = "Payment terms are required."

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      window.setTimeout(() => firstErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
      return false
    }

    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(false)
    setErrorMessage("")

    if (!validate()) return

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    const user = await getCurrentUser()
    if (!user) {
      setErrorMessage("You must be signed in as a supplier before submitting a quote.")
      return
    }

    setSubmitting(true)

    const { data: latestRfq, error: latestRfqError } = await supabase
      .from("rfqs")
      .select("id, is_external_opportunity")
      .eq("id", Number(params.id))
      .single()

    if (latestRfqError) {
      setSubmitting(false)
      setErrorMessage(latestRfqError.message)
      return
    }

    if (latestRfq?.is_external_opportunity) {
      setSubmitting(false)
      setErrorMessage("This is an externally-sourced opportunity. Apply through the original tender source; quotes cannot be submitted through AiForm Procure.")
      window.setTimeout(() => router.push(`/dashboard/rfqs/${params.id}`), 1200)
      return
    }

    const supplierName =
      profile?.business_name ||
      user.user_metadata?.business_name ||
      profile?.email ||
      user.email ||
      "Supplier"
    const scope = lineItems
      .map((item, index) => `${index + 1}. ${item.description || "Line item"}${item.spec ? ` - ${item.spec}` : ""}: ${item.qty} x R${item.unitPrice}`)
      .join("\n")
    const supportingNotes = [
      coverNote ? `Cover note: ${coverNote}` : "",
      `Quote validity: ${validity}`,
      `Delivery lead time: ${deliveryLeadTime}`,
      `Payment terms: ${paymentTerms}`,
      documents.length ? `Uploaded document names: ${documents.map((file) => file.name).join(", ")}` : "",
      `Subtotal: ${formatCurrency(subtotal)}`,
      vatRegistered ? `VAT: ${formatCurrency(vat)}` : "",
      `Total quote value: ${formatCurrency(total)}`,
    ].filter(Boolean).join("\n")

    const quotePayload = {
      rfq_id: Number(params.id),
      supplier_id: user.id,
      supplier_name: supplierName,
      amount: String(Math.round(total)),
      timeline: deliveryLeadTime,
      scope,
      supporting_notes: supportingNotes,
      status: "Pending",
    }

    const { data: quoteData, error } = await supabase
      .from("quotes")
      .insert([quotePayload])
      .select("id")
      .single()

    if (error) {
      setSubmitting(false)
      setErrorMessage(error.message)
      return
    }

    try {
      await logAuditAction({
        action: "quote.submitted",
        entity_type: "quote",
        entity_id: quoteData?.id ?? null,
        old_values: null,
        new_values: quotePayload,
        metadata: { rfq_id: Number(params.id), supplier_id: user.id },
      })
      await logActivity({
        action: "quote.submitted",
        entity_type: "quote",
        entity_id: quoteData?.id ?? null,
        metadata: {
          rfq_id: Number(params.id),
          supplier_id: user.id,
          supplier_name: supplierName,
          amount: String(Math.round(total)),
          timeline: deliveryLeadTime,
        },
      })
    } catch (activityError) {
      console.warn("Quote submission audit/activity logging failed:", activityError)
    }

    await createNotificationsForRoles(["admin", "buyer"], {
      type: "Quote Submitted",
      title: "New quote submitted",
      message: `A supplier submitted a quote for ${rfq?.title || `RFQ-${params.id}`}.`,
      link: `/dashboard/admin/rfqs/${params.id}/quotes`,
      metadata: { quote_id: quoteData?.id ?? null, rfq_id: Number(params.id) },
    })

    window.localStorage.removeItem(draftKey)
    setSubmitting(false)
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="h-5 w-56 animate-pulse rounded bg-panel" />
            <div className="mt-5 h-24 animate-pulse rounded bg-panel" />
          </div>
        ))}
      </div>
    )
  }

  if (errorMessage && !rfq) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-6">
        <p className="text-sm font-semibold text-rose-700">Quote page failed to load</p>
        <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
      </div>
    )
  }

  if (rfq?.is_external_opportunity) {
    const sourceName = rfq.source_name?.trim() || "the original tender source"
    return (
      <div className="rounded-md border border-accent/30 bg-accent/10 p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          External opportunity
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-heading">Apply through the official source</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          This opportunity is sourced from {sourceName}. Quotes cannot be submitted through AiForm Procure for this listing.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {rfq.original_source_url && (
            <a
              href={rfq.original_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-3 text-sm font-semibold text-button transition hover:bg-accent-strong"
            >
              View Original Tender
            </a>
          )}
          <Link
            href={`/dashboard/rfqs/${params.id}`}
            className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-3 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Back to RFQ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Dashboard &gt; RFQs &gt; {rfq?.title || `RFQ-${params.id}`} &gt; Submit quote
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-heading">Submit quote</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            {buyerName(rfq, buyer)} · {rfq?.title || `RFQ-${params.id}`} · {rfqProvince(rfq)}
          </p>
        </div>
        <span
          className={`w-fit rounded-md border px-4 py-2 text-sm font-semibold ${
            daysLeft !== null && daysLeft <= 3
              ? "border-warning bg-warning-soft text-warning"
              : "border-panel bg-panel text-secondary"
          }`}
        >
          {deadlineLabel(daysLeft)}
        </span>
      </div>

      {draftSavedAt && (
        <div className="mb-6 rounded-md border border-accent bg-surface px-5 py-4 shadow-panel">
          <p className="text-sm font-semibold text-heading">
            You have a saved draft from {new Date(draftSavedAt).toLocaleString("en-ZA")}.
          </p>
        </div>
      )}

      {draftBanner && (
        <div className="mb-6 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{draftBanner}</p>
        </div>
      )}

      {submitted && (
        <div className="mb-6 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">Quote submitted successfully for procurement review.</p>
        </div>
      )}

      {errorMessage && rfq && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-6">
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="flex items-center justify-between gap-4 border-b border-panel pb-4">
              <h2 className="text-lg font-semibold text-heading">RFQ summary</h2>
              <Link href={`/dashboard/rfqs/${params.id}`} className="text-sm font-semibold text-accent transition hover:text-accent-strong">
                View full RFQ →
              </Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Buyer name", buyerName(rfq, buyer)],
                ["Category / industry", rfq?.category || "General procurement"],
                ["Province", rfqProvince(rfq)],
                ["BBBEE level required", bbeeRequirement(rfq)],
                ["Estimated value range", rfq?.budget ? formatCurrency(numeric(rfq.budget)) : "Not disclosed"],
                ["Closing date", formatDate(rfq?.deadline ?? null)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-panel bg-panel p-4">
                  <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">{label}</p>
                  <p className={`mt-2 text-sm font-semibold ${label === "Closing date" && daysLeft !== null && daysLeft <= 3 ? "text-warning" : "text-heading"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
            {rfq?.description && (
              <div className="mt-5">
                <p className={`text-sm leading-7 text-secondary ${!showFullDescription && descriptionLong ? "line-clamp-3" : ""}`}>
                  {rfq.description}
                </p>
                {descriptionLong && (
                  <button
                    type="button"
                    onClick={() => setShowFullDescription((current) => !current)}
                    className="mt-2 text-sm font-semibold text-accent transition hover:text-accent-strong"
                  >
                    {showFullDescription ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel" ref={errors.lineItems ? firstErrorRef : null}>
            <h2 className="text-lg font-semibold text-heading">Line items & pricing</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-panel text-[0.65rem] uppercase tracking-[0.2em] text-secondary">
                    <th className="py-3 text-left">Item</th>
                    <th className="py-3 text-right">Qty</th>
                    <th className="py-3 text-right">Unit price R</th>
                    <th className="py-3 text-right">Total R</th>
                    <th className="py-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel">
                  {lineItems.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-3 pr-4">
                        <input
                          value={item.description}
                          onChange={(event) => updateLineItem(item.id, "description", event.target.value)}
                          placeholder="Item description"
                          className="w-full rounded-md border border-panel bg-panel px-3 py-2 text-heading outline-none focus:border-accent"
                        />
                        <input
                          value={item.spec}
                          onChange={(event) => updateLineItem(item.id, "spec", event.target.value)}
                          placeholder="Spec"
                          className="mt-2 w-full rounded-md border border-panel bg-panel px-3 py-2 text-xs text-secondary outline-none focus:border-accent"
                        />
                      </td>
                      <td className="py-3 pl-3">
                        <input
                          type="number"
                          min="0"
                          value={item.qty}
                          onChange={(event) => updateLineItem(item.id, "qty", cleanAmount(event.target.value))}
                          className="ml-auto w-24 rounded-md border border-panel bg-panel px-3 py-2 text-right text-heading outline-none focus:border-accent"
                        />
                      </td>
                      <td className="py-3 pl-3">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(event) => updateLineItem(item.id, "unitPrice", cleanAmount(event.target.value))}
                          className="ml-auto w-32 rounded-md border border-panel bg-panel px-3 py-2 text-right text-heading outline-none focus:border-accent"
                        />
                      </td>
                      <td className="py-3 pl-3 text-right font-semibold text-heading">
                        {formatCurrency(numeric(item.qty) * numeric(item.unitPrice))}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {!item.locked && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="opacity-70 text-sm font-semibold text-rose-700 transition hover:opacity-100"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.lineItems && <p className="mt-3 text-sm font-semibold text-rose-700">{errors.lineItems}</p>}
            <button type="button" onClick={addLineItem} className="mt-4 text-sm font-semibold text-accent transition hover:text-accent-strong">
              + Add line item
            </button>
            <div className="mt-5 ml-auto max-w-sm rounded-md border border-panel bg-panel p-4">
              <div className="flex justify-between text-sm text-secondary"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {vatRegistered && <div className="mt-2 flex justify-between text-sm text-secondary"><span>VAT (15%)</span><span>{formatCurrency(vat)}</span></div>}
              <div className="mt-3 flex justify-between border-t border-panel pt-3 text-base font-bold text-heading"><span>Total quote value</span><span>{formatCurrency(total)}</span></div>
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <h2 className="text-lg font-semibold text-heading">Quote details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div ref={errors.validity ? firstErrorRef : null}>
                <label className="text-sm font-medium text-secondary">Quote validity period</label>
                <select value={validity} onChange={(event) => { setValidity(event.target.value); setErrors((current) => ({ ...current, validity: undefined })) }} className="mt-2 w-full rounded-md border border-panel bg-panel px-3 py-3 text-heading outline-none focus:border-accent">
                  {validityOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
                {errors.validity && <p className="mt-2 text-xs font-semibold text-rose-700">{errors.validity}</p>}
              </div>
              <div ref={errors.deliveryLeadTime ? firstErrorRef : null}>
                <label className="text-sm font-medium text-secondary">Delivery lead time</label>
                <select value={deliveryLeadTime} onChange={(event) => { setDeliveryLeadTime(event.target.value); setErrors((current) => ({ ...current, deliveryLeadTime: undefined })) }} className="mt-2 w-full rounded-md border border-panel bg-panel px-3 py-3 text-heading outline-none focus:border-accent">
                  <option value="">Select lead time</option>
                  {deliveryOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
                {errors.deliveryLeadTime && <p className="mt-2 text-xs font-semibold text-rose-700">{errors.deliveryLeadTime}</p>}
              </div>
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium text-secondary">Cover note <span className="text-muted">(optional but recommended)</span></label>
              <textarea
                rows={5}
                value={coverNote}
                onChange={(event) => setCoverNote(event.target.value)}
                placeholder="Briefly explain why your business is well-positioned to fulfil this RFQ. Mention relevant experience, certifications, or capacity."
                className="mt-2 w-full rounded-md border border-panel bg-panel px-3 py-3 text-heading outline-none focus:border-accent"
              />
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
                <span>A good cover note increases your shortlist chances. Keep it under 200 words.</span>
                <span>{coverWords} words</span>
              </div>
            </div>
            <div className="mt-5" ref={errors.paymentTerms ? firstErrorRef : null}>
              <label className="text-sm font-medium text-secondary">Payment terms</label>
              <select value={paymentTerms} onChange={(event) => { setPaymentTerms(event.target.value); setErrors((current) => ({ ...current, paymentTerms: undefined })) }} className="mt-2 w-full rounded-md border border-panel bg-panel px-3 py-3 text-heading outline-none focus:border-accent">
                <option value="">Select payment terms</option>
                {paymentOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              {errors.paymentTerms && <p className="mt-2 text-xs font-semibold text-rose-700">{errors.paymentTerms}</p>}
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <h2 className="text-lg font-semibold text-heading">Supporting documents</h2>
            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-panel bg-panel px-6 py-10 text-center transition hover:border-accent">
              <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFiles} />
              <span className="text-sm font-semibold text-heading">Drag and drop files here, or click to browse</span>
              <span className="mt-1 text-xs text-muted">PDF, DOCX, XLSX — max 10MB per file</span>
            </label>
            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {documents.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-md border border-panel bg-panel px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-heading">
                      <FileIcon />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button type="button" onClick={() => setDocuments((current) => current.filter((item) => item !== file))} className="text-xs font-bold text-rose-700">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm leading-6 text-secondary">
              Recommended: company profile, detailed pricing breakdown, proof of BBBEE, tax clearance certificate.
            </p>
          </section>

          <div className="flex flex-col gap-3 rounded-md border border-panel bg-card p-5 shadow-panel sm:flex-row">
            <button type="button" onClick={saveDraft} className="inline-flex flex-1 items-center justify-center rounded-md border border-panel bg-panel px-5 py-3 text-sm font-semibold text-secondary transition hover:bg-surface">
              Save draft
            </button>
            <button type="submit" disabled={submitting || isClosed} className="inline-flex flex-1 items-center justify-center rounded-md border border-accent bg-accent px-5 py-3 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
              {isClosed ? "Submissions closed" : submitting ? "Submitting quote..." : "Submit quote →"}
            </button>
          </div>
        </main>

        <aside className="space-y-6">
          <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-heading">Before you submit</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: "All line items priced", state: lineItemsPriced ? "success" : "warning" },
                { label: "CSD profile active", state: csdActive ? "success" : "warning" },
                { label: "BBBEE level qualifies", state: bbeeQualifies ? "success" : "warning" },
                { label: "Cover note not added", state: coverWords >= 20 ? "success" : "warning" },
                { label: "Tax clearance not uploaded", state: hasTaxDocument ? "success" : "warning" },
                { label: "Quote validity set", state: validity ? "success" : "muted" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm font-semibold text-secondary">
                  <ChecklistIcon state={item.state as "success" | "warning" | "muted"} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-5 text-center shadow-panel">
            <h2 className="text-lg font-semibold text-heading">Your SmartScore</h2>
            <div className="mx-auto mt-5 flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-accent bg-panel">
              <span className="text-2xl font-bold text-heading">{smartScore.score}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-secondary">
              {checklistComplete
                ? "Your quote looks complete. You're well positioned for shortlisting."
                : "Adding a cover note and tax clearance could push you to 85+ and improve shortlist chances."}
            </p>
          </section>

          <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-heading">About the buyer</h2>
            <p className="mt-4 text-sm font-bold text-heading">{buyerName(rfq, buyer)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-secondary">{buyer?.organisation_type || buyer?.organization_type || "State-owned entity"}</span>
              <span className="rounded-md border border-success/30 bg-success-soft px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-success">
                Verified buyer
              </span>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-secondary">Province(s)</dt><dd className="font-semibold text-heading">{buyer?.province || rfqProvince(rfq)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-secondary">RFQs posted</dt><dd className="font-semibold text-heading">{buyerRFQCount ?? "Not available"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-secondary">Average award time</dt><dd className="font-semibold text-heading">Not available</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </form>
  )
}

"use client"

import { useRouter } from "next/navigation"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { logActivity } from "@/lib/activity"
import { logAuditAction } from "@/lib/audit"
import { notifyNewRFQ, notifyRecommendedSuppliers } from "@/lib/automationRules"
import { getCurrentProfile, getCurrentUser, hasAdminOrBuyerAccess } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type Step = 1 | 2 | 3

type LineItem = {
  id: string
  description: string
  unit: string
  qty: string
  notes: string
}

type UploadedDocument = {
  id: string
  file: File
}

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
  bbbee_level: string | null
  csd_number: string | null
  tax_status: string | null
}

type BuyerProfile = {
  id: string
  business_name: string | null
  full_name?: string | null
  email: string | null
  role: string | null
}

type FormState = {
  title: string
  buyerOrganisation: string
  category: string
  contactPerson: string
  contactEmail: string
  shortDescription: string
  scope: string
  closingDate: string
  awardDate: string
  startDate: string
  bbbeeRequirement: string
  requireCsd: boolean
  requireTax: boolean
  requireVat: boolean
  provinces: string[]
  deliveryLocation: string
  minimumSmartScore: string
  certifications: string[]
  otherCertification: string
  lineItems: LineItem[]
  valueMin: string
  valueMax: string
  notifyMatchedSuppliers: boolean
  allowAmendments: boolean
  requireCoverNote: boolean
  listPublicly: boolean
}

type Errors = Partial<Record<keyof FormState | "lineItems", string>>

type StoredDraft = {
  draftId: string
  savedAt: string
  form: FormState
}

const SA_PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Mpumalanga",
  "Limpopo",
  "Eastern Cape",
  "Free State",
  "North West",
  "Northern Cape",
]

const CATEGORIES = [
  "Mining & Resources",
  "Construction & Infrastructure",
  "IT & Technology",
  "Facilities & Cleaning",
  "Logistics & Transport",
  "Professional Services",
  "Manufacturing",
  "Other",
]

const BBBEE_OPTIONS = [
  "Level 1 only",
  "Level 1-2",
  "Level 1-4",
  "Level 1-6",
  "Any level",
  "Not specified",
]

const SMART_SCORE_OPTIONS = ["Any", "50+", "70+", "80+", "90+"]
const CERTIFICATIONS = ["ISO 9001", "ISO 14001", "OHSAS 18001", "CIDB registered", "Other"]
const DRAFT_KEY = "monate-admin-rfq-drafts-v1"

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelClass =
  "mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"

const hintClass = "mt-2 text-xs leading-5 text-muted"

function createLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    unit: "",
    qty: "1",
    notes: "",
  }
}

function initialForm(): FormState {
  return {
    title: "",
    buyerOrganisation: "",
    category: "",
    contactPerson: "",
    contactEmail: "",
    shortDescription: "",
    scope: "",
    closingDate: "",
    awardDate: "",
    startDate: "",
    bbbeeRequirement: "",
    requireCsd: true,
    requireTax: true,
    requireVat: false,
    provinces: [],
    deliveryLocation: "",
    minimumSmartScore: "Any",
    certifications: [],
    otherCertification: "",
    lineItems: [createLineItem()],
    valueMin: "",
    valueMax: "",
    notifyMatchedSuppliers: true,
    allowAmendments: true,
    requireCoverNote: false,
    listPublicly: true,
  }
}

function cleanAmountInput(value: string): string {
  return value.replace(/[^\d]/g, "")
}

function cleanFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
}

function formatStorageUploadError(error: { message?: string; statusCode?: string } | null): string {
  const message = error?.message ?? ""

  if (
    error?.statusCode === "404" ||
    message.toLowerCase().includes("bucket") ||
    message.toLowerCase().includes("not found")
  ) {
    return "Manual setup required: create the rfq-documents bucket in Supabase Storage, then try the upload again."
  }

  return message || "RFQ attachment upload failed. Please try again."
}

function businessDaysFromToday(targetDate: string): number {
  if (!targetDate) return 0
  const target = new Date(`${targetDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return 0

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  let days = 0

  while (cursor < target) {
    cursor.setDate(cursor.getDate() + 1)
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) days += 1
  }

  return days
}

function calendarDaysFromToday(targetDate: string): number | null {
  if (!targetDate) return null
  const target = new Date(`${targetDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function formatDraftDate(value: string): string {
  return new Date(value).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function parseBBBEELevel(value: string | null): number | null {
  if (!value) return null
  if (value.toLowerCase().includes("non")) return 9
  const match = value.match(/(\d)/)
  return match ? Number(match[1]) : null
}

function requiredBBBEELevel(value: string): number | null {
  if (value === "Level 1 only") return 1
  if (value === "Level 1-2") return 2
  if (value === "Level 1-4") return 4
  if (value === "Level 1-6") return 6
  return null
}

function supplierSmartScore(supplier: SupplierProfile): number {
  let score = 50
  if (supplier.verification_status?.toLowerCase().includes("verified")) score += 20
  if (supplier.csd_number) score += 10
  if (supplier.tax_status) score += 10
  if (supplier.bbbee_level) score += 10
  return Math.min(score, 100)
}

function matchesIndustry(supplier: SupplierProfile, category: string): boolean {
  if (!category) return true
  const supplierIndustry = (supplier.industry ?? "").toLowerCase()
  const rfqCategory = category.toLowerCase()

  return supplierIndustry.includes(rfqCategory) || rfqCategory.includes(supplierIndustry)
}

function matchesProvince(supplier: SupplierProfile, provinces: string[]): boolean {
  if (provinces.length === 0) return true
  const supplierProvince = (supplier.province ?? "").toLowerCase()

  return provinces.some((province) => supplierProvince.includes(province.toLowerCase()))
}

function matchesBBBEE(supplier: SupplierProfile, requirement: string): boolean {
  const required = requiredBBBEELevel(requirement)
  if (!required) return true
  const supplierLevel = parseBBBEELevel(supplier.bbbee_level)

  return supplierLevel != null && supplierLevel <= required
}

function matchesMinimumSmartScore(supplier: SupplierProfile, minimum: string): boolean {
  if (minimum === "Any") return true
  return supplierSmartScore(supplier) >= Number(minimum.replace("+", ""))
}

function formatCurrencyRange(min: string, max: string): string {
  const cleanMin = cleanAmountInput(min)
  const cleanMax = cleanAmountInput(max)
  if (!cleanMin && !cleanMax) return "Not disclosed"
  if (cleanMin && cleanMax) {
    return `R ${Number(cleanMin).toLocaleString("en-ZA")} - R ${Number(cleanMax).toLocaleString("en-ZA")}`
  }
  return `R ${Number(cleanMin || cleanMax).toLocaleString("en-ZA")}`
}

function composeDescription(form: FormState): string {
  const compliance = [
    form.bbbeeRequirement ? `BBBEE requirement: ${form.bbbeeRequirement}` : null,
    form.requireCsd ? "CSD registration required" : "CSD registration not mandatory",
    form.requireTax ? "Valid tax clearance required" : "Tax clearance not mandatory",
    form.requireVat ? "VAT registration required" : "VAT registration not mandatory",
    form.minimumSmartScore !== "Any" ? `Minimum SmartScore: ${form.minimumSmartScore}` : null,
    form.certifications.length > 0
      ? `Preferred certifications: ${[
          ...form.certifications.filter((item) => item !== "Other"),
          form.otherCertification,
        ]
          .filter(Boolean)
          .join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")

  const lineItems = form.lineItems
    .filter((item) => item.description.trim())
    .map((item, index) => {
      return `${index + 1}. ${item.description.trim()} | Unit: ${item.unit || "-"} | Qty: ${item.qty || "-"}${
        item.notes ? ` | Notes: ${item.notes}` : ""
      }`
    })
    .join("\n")

  return [
    form.shortDescription.trim(),
    "",
    "Full scope of work",
    form.scope.trim(),
    "",
    "Buyer and contact",
    `Buyer organisation: ${form.buyerOrganisation}`,
    `Contact person: ${form.contactPerson}`,
    `Contact email: ${form.contactEmail}`,
    "",
    "Targeting and compliance",
    `Province(s): ${form.provinces.join(", ") || "National"}`,
    form.deliveryLocation ? `Delivery location: ${form.deliveryLocation}` : null,
    compliance,
    "",
    "Line items",
    lineItems || "Line items to be confirmed.",
    "",
    "Estimated value range",
    formatCurrencyRange(form.valueMin, form.valueMax),
    "",
    "Publish settings",
    `Notify matched suppliers: ${form.notifyMatchedSuppliers ? "Yes" : "No"}`,
    `Allow quote amendments: ${form.allowAmendments ? "Yes" : "No"}`,
    `Require cover note: ${form.requireCoverNote ? "Yes" : "No"}`,
    `List publicly: ${form.listPublicly ? "Yes" : "No"}`,
    form.awardDate ? `Expected award date: ${form.awardDate}` : null,
    form.startDate ? `Expected delivery/start date: ${form.startDate}` : null,
  ]
    .filter((section) => section != null)
    .join("\n")
}

function readStoredDrafts(): StoredDraft[] {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as StoredDraft[]) : []
  } catch {
    return []
  }
}

function writeStoredDraft(draft: StoredDraft) {
  const current = readStoredDrafts().filter((item) => item.draftId !== draft.draftId)
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify([draft, ...current].slice(0, 8)))
}

function removeStoredDraft(draftId: string) {
  window.localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify(readStoredDrafts().filter((item) => item.draftId !== draftId)),
  )
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border text-[0.6rem] ${
          done ? "border-success bg-success text-button" : "border-panel bg-panel text-muted"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <span className={done ? "text-heading" : "text-muted"}>{label}</span>
    </div>
  )
}

export default function NewRFQPage() {
  const router = useRouter()
  const firstErrorRef = useRef<HTMLDivElement | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>(() => initialForm())
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([])
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [draftId, setDraftId] = useState(() => crypto.randomUUID())
  const [pendingDraft, setPendingDraft] = useState<StoredDraft | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const profile = await getCurrentProfile()

      if (!hasAdminOrBuyerAccess(profile)) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase is not configured. Check environment variables.")
        setCheckingAccess(false)
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const [profileResult, supplierResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, business_name, full_name, email, role")
          .eq("id", profile?.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, business_name, province, industry, verification_status, bbbee_level, csd_number, tax_status")
          .eq("role", "supplier"),
      ])

      if (cancelled) return

      const buyer = (profileResult.data as BuyerProfile | null) ?? null
      setBuyerProfile(buyer)
      setSuppliers((supplierResult.data ?? []) as SupplierProfile[])
      setForm((current) => ({
        ...current,
        buyerOrganisation: current.buyerOrganisation || buyer?.business_name || "",
        contactPerson: current.contactPerson || buyer?.full_name || buyer?.business_name || "",
        contactEmail: current.contactEmail || buyer?.email || authData.user?.email || "",
      }))

      const drafts = readStoredDrafts()
      if (drafts.length > 0) setPendingDraft(drafts[0])

      setCheckingAccess(false)
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (checkingAccess) return

    const timeout = window.setTimeout(() => {
      writeStoredDraft({
        draftId,
        savedAt: new Date().toISOString(),
        form,
      })
    }, 2500)

    return () => window.clearTimeout(timeout)
  }, [checkingAccess, draftId, form])

  const validation = useMemo(() => {
    const completeLineItems = form.lineItems.filter(
      (item) => item.description.trim() && Number(item.qty) > 0,
    )

    return {
      title: Boolean(form.title.trim()),
      buyerOrganisation: Boolean(form.buyerOrganisation.trim()),
      category: Boolean(form.category),
      contactPerson: Boolean(form.contactPerson.trim()),
      contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()),
      shortDescription: Boolean(form.shortDescription.trim()),
      shortLength: form.shortDescription.length <= 300,
      scope: Boolean(form.scope.trim()),
      closingDate: Boolean(form.closingDate) && businessDaysFromToday(form.closingDate) >= 5,
      provinces: form.provinces.length > 0,
      bbbeeRequirement: Boolean(form.bbbeeRequirement),
      lineItems: completeLineItems.length > 0,
      valueRange: Boolean(cleanAmountInput(form.valueMin) || cleanAmountInput(form.valueMax)),
      documents: documents.length > 0,
    }
  }, [documents.length, form])

  const matchedSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      return (
        supplier.verification_status?.toLowerCase().includes("verified") &&
        matchesIndustry(supplier, form.category) &&
        matchesProvince(supplier, form.provinces) &&
        matchesBBBEE(supplier, form.bbbeeRequirement) &&
        matchesMinimumSmartScore(supplier, form.minimumSmartScore)
      )
    })
  }, [form.bbbeeRequirement, form.category, form.minimumSmartScore, form.provinces, suppliers])

  const matchBreakdown = useMemo(() => {
    return {
      industry: suppliers.filter((supplier) => matchesIndustry(supplier, form.category)).length,
      province: suppliers.filter((supplier) => matchesProvince(supplier, form.provinces)).length,
      bbbee: suppliers.filter((supplier) => matchesBBBEE(supplier, form.bbbeeRequirement)).length,
    }
  }, [form.bbbeeRequirement, form.category, form.provinces, suppliers])

  const stepComplete = {
    1:
      validation.title &&
      validation.buyerOrganisation &&
      validation.category &&
      validation.contactPerson &&
      validation.contactEmail &&
      validation.shortDescription &&
      validation.shortLength &&
      validation.scope &&
      validation.closingDate,
    2: validation.provinces && validation.bbbeeRequirement,
    3: validation.lineItems,
  }

  const canPublish = stepComplete[1] && stepComplete[2] && stepComplete[3]
  const shortTurnaround = form.closingDate ? (calendarDaysFromToday(form.closingDate) ?? 99) < 7 : false

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function toggleProvince(province: string) {
    const next = form.provinces.includes(province)
      ? form.provinces.filter((item) => item !== province)
      : [...form.provinces, province]
    updateField("provinces", next)
  }

  function toggleCertification(certification: string) {
    const next = form.certifications.includes(certification)
      ? form.certifications.filter((item) => item !== certification)
      : [...form.certifications, certification]
    updateField("certifications", next)
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string) {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }))
    setErrors((current) => ({ ...current, lineItems: undefined }))
  }

  function addLineItem() {
    setForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, createLineItem()],
    }))
  }

  function removeLineItem(id: string) {
    setForm((current) => ({
      ...current,
      lineItems:
        current.lineItems.length === 1
          ? current.lineItems
          : current.lineItems.filter((item) => item.id !== id),
    }))
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    const acceptedFiles = Array.from(files).filter((file) => file.size <= 20 * 1024 * 1024)
    setDocuments((current) => [
      ...current,
      ...acceptedFiles.map((file) => ({ id: crypto.randomUUID(), file })),
    ])
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id))
  }

  function validateStep(targetStep: Step): boolean {
    const nextErrors: Errors = {}

    if (targetStep === 1) {
      if (!form.title.trim()) nextErrors.title = "RFQ title is required."
      if (!form.buyerOrganisation.trim()) nextErrors.buyerOrganisation = "Buyer organisation is required."
      if (!form.category) nextErrors.category = "Industry / category is required."
      if (!form.contactPerson.trim()) nextErrors.contactPerson = "Contact person is required."
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
        nextErrors.contactEmail = "Enter a valid contact email."
      }
      if (!form.shortDescription.trim()) nextErrors.shortDescription = "Short description is required."
      if (form.shortDescription.length > 300) nextErrors.shortDescription = "Keep the short description under 300 characters."
      if (!form.scope.trim()) nextErrors.scope = "Full scope of work is required."
      if (!form.closingDate) nextErrors.closingDate = "Closing date is required."
      else if (businessDaysFromToday(form.closingDate) < 5) {
        nextErrors.closingDate = "Closing date must be at least 5 business days from today."
      }
    }

    if (targetStep === 2) {
      if (!form.bbbeeRequirement) nextErrors.bbbeeRequirement = "Select a BBBEE requirement."
      if (form.provinces.length === 0) nextErrors.provinces = "Select at least one province."
    }

    if (targetStep === 3) {
      if (!validation.lineItems) {
        nextErrors.lineItems = "Add at least one complete line item with description and quantity."
      }
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      window.setTimeout(() => firstErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
      return false
    }

    return true
  }

  function goNext() {
    if (!validateStep(step)) return
    setStep((current) => (current === 1 ? 2 : 3))
  }

  function restoreDraft() {
    if (!pendingDraft) return
    setForm(pendingDraft.form)
    setDraftId(pendingDraft.draftId)
    setPendingDraft(null)
  }

  function discardDraft() {
    if (!pendingDraft) return
    removeStoredDraft(pendingDraft.draftId)
    setPendingDraft(null)
  }

  async function uploadFirstDocument(): Promise<string | null> {
    if (!supabase || documents.length === 0) return null

    const firstDocument = documents[0].file
    const filePath = `rfqs/${Date.now()}-${cleanFileName(firstDocument.name)}`
    const { error: uploadError } = await supabase.storage
      .from("rfq-documents")
      .upload(filePath, firstDocument, { upsert: false })

    if (uploadError) throw new Error(formatStorageUploadError(uploadError))

    const { data: publicUrlData } = supabase.storage.from("rfq-documents").getPublicUrl(filePath)

    await logActivity({
      action: "document.uploaded",
      entity_type: "rfq_document",
      entity_id: filePath,
      metadata: {
        bucket: "rfq-documents",
        file_name: firstDocument.name,
        file_path: filePath,
        document_url: publicUrlData.publicUrl,
      },
    })

    return publicUrlData.publicUrl
  }

  async function createRFQ(status: "Draft" | "Open") {
    setErrorMessage("")
    setSuccessMessage("")

    if (status === "Open" && !canPublish) {
      validateStep(1)
      validateStep(2)
      validateStep(3)
      return
    }

    if (!supabase) {
      setErrorMessage("Supabase is not configured. Check environment variables.")
      return
    }

    const user = await getCurrentUser()
    const creatorId = buyerProfile?.id || user?.id || null
    if (!creatorId) {
      setErrorMessage("Could not confirm the logged-in admin or buyer account.")
      return
    }

    setSubmitting(true)

    try {
      const attachmentUrl = await uploadFirstDocument()
      const minValue = cleanAmountInput(form.valueMin)
      const maxValue = cleanAmountInput(form.valueMax)
      const budget = maxValue || minValue
      const description = composeDescription(form)

      const payload = {
        title: form.title.trim() || "Untitled RFQ draft",
        description,
        province: form.provinces.join(", "),
        category: form.category,
        budget,
        deadline: form.closingDate || null,
        status,
        attachment_url: attachmentUrl,
        created_by: creatorId,
      }

      const { data: rfqData, error: insertError } = await supabase
        .from("rfqs")
        .insert([payload])
        .select("id")
        .single()

      if (insertError) {
        const message = insertError.message
        const isMissingCreatedBy =
          message.includes("created_by") &&
          (message.includes("schema cache") || message.includes("column"))
        const isRlsFailure = message.toLowerCase().includes("row-level security")

        throw new Error(
          isMissingCreatedBy
            ? "RFQ creation needs a created_by column for ownership-based RLS. Run the SQL noted in the stabilization output, then try again."
            : isRlsFailure
              ? "RFQ creation was blocked by Supabase RLS. Confirm your profile role is admin or buyer and that the RFQ insert policy allows created_by = auth.uid()."
              : message,
        )
      }

      try {
        await logAuditAction({
          action: status === "Draft" ? "rfq.draft_created" : "rfq.created",
          entity_type: "rfq",
          entity_id: rfqData?.id ?? null,
          old_values: null,
          new_values: payload,
          metadata: {
            has_attachment: Boolean(attachmentUrl),
            line_items: form.lineItems.length,
            notify_matched_suppliers: form.notifyMatchedSuppliers,
          },
        })
        await logActivity({
          action: status === "Draft" ? "rfq.draft_created" : "rfq.created",
          entity_type: "rfq",
          entity_id: rfqData?.id ?? null,
          metadata: {
            title: payload.title,
            province: payload.province,
            category: payload.category,
            deadline: payload.deadline,
            status,
            created_by: creatorId,
          },
        })
      } catch (activityError) {
        console.warn("RFQ creation audit/activity logging failed:", activityError)
      }

      if (status === "Open") {
        await notifyNewRFQ({
          id: rfqData?.id ?? null,
          title: payload.title,
          description,
          province: payload.province,
          category: payload.category,
          budget,
          deadline: payload.deadline,
          status,
        })

        if (form.notifyMatchedSuppliers) {
          await notifyRecommendedSuppliers({
            id: rfqData?.id ?? null,
            title: payload.title,
            description,
            province: payload.province,
            category: payload.category,
            budget,
            deadline: payload.deadline,
            status,
          })
        }
      }

      removeStoredDraft(draftId)
      setSuccessMessage(
        status === "Open" ? "RFQ published successfully." : "RFQ draft saved successfully.",
      )
      const isBuyer = buyerProfile?.role?.trim().toLowerCase() === "buyer"
      router.push(isBuyer ? "/dashboard/buyer/rfqs" : `/dashboard/admin/rfqs/${rfqData?.id}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "RFQ creation failed.")
    } finally {
      setSubmitting(false)
    }
  }

  function saveLocalDraft() {
    const draft = {
      draftId,
      savedAt: new Date().toISOString(),
      form,
    }
    writeStoredDraft(draft)
    setSuccessMessage("Draft saved locally. You can continue editing from this browser.")
  }

  function ErrorText({ field }: { field: keyof Errors }) {
    if (!errors[field]) return null
    return (
      <p ref={firstErrorRef} className="mt-2 text-xs font-semibold text-rose-700">
        {errors[field]}
      </p>
    )
  }

  if (checkingAccess) {
    return (
      <div className="rounded-md border border-panel bg-card p-8 text-sm text-secondary shadow-panel">
        Checking procurement access...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement &gt; RFQs &gt; New RFQ
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Create new RFQ</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Define your procurement requirements and publish to verified suppliers.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { id: 1 as Step, label: "RFQ details" },
            { id: 2 as Step, label: "Compliance & targeting" },
            { id: 3 as Step, label: "Line items & publish" },
          ].map((item) => {
            const complete = stepComplete[item.id]
            const current = step === item.id
            const clickable = complete || item.id < step

            return (
              <button
                key={item.id}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setStep(item.id)}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  current
                    ? "border-accent bg-surface text-heading shadow-panel"
                    : complete
                      ? "border-success bg-success-soft text-success"
                      : "border-panel bg-card text-secondary"
                } ${clickable ? "hover:border-accent" : "cursor-default"}`}
              >
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em]">
                  Step {item.id}
                </span>
                <span className="mt-1 flex items-center justify-between gap-3 text-sm font-semibold">
                  {item.label}
                  {complete && <span aria-hidden="true">✓</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {pendingDraft && (
        <div className="mb-6 rounded-md border border-accent bg-surface p-5 shadow-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">
                You have an unfinished RFQ draft from {formatDraftDate(pendingDraft.savedAt)}.
              </p>
              <p className="mt-1 text-xs text-muted">Continue editing or discard it and start fresh.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={restoreDraft}
                className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">RFQ creation failed</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <form onSubmit={(event: FormEvent) => event.preventDefault()}>
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {step === 1 && (
              <>
                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                      Basic information
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">RFQ details</h2>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label htmlFor="title" className={labelClass}>RFQ title</label>
                      <input
                        id="title"
                        value={form.title}
                        onChange={(event) => updateField("title", event.target.value)}
                        placeholder="e.g. Supply of maintenance equipment - Duvha"
                        className={inputClass}
                      />
                      <ErrorText field="title" />
                    </div>
                    <div>
                      <label htmlFor="buyerOrganisation" className={labelClass}>
                        Buyer organisation
                      </label>
                      <input
                        id="buyerOrganisation"
                        value={form.buyerOrganisation}
                        onChange={(event) => updateField("buyerOrganisation", event.target.value)}
                        className={inputClass}
                      />
                      <ErrorText field="buyerOrganisation" />
                    </div>
                    <div>
                      <label htmlFor="category" className={labelClass}>Industry / category</label>
                      <select
                        id="category"
                        value={form.category}
                        onChange={(event) => updateField("category", event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select industry</option>
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <ErrorText field="category" />
                    </div>
                    <div>
                      <label htmlFor="contactPerson" className={labelClass}>Contact person</label>
                      <input
                        id="contactPerson"
                        value={form.contactPerson}
                        onChange={(event) => updateField("contactPerson", event.target.value)}
                        className={inputClass}
                      />
                      <ErrorText field="contactPerson" />
                    </div>
                    <div>
                      <label htmlFor="contactEmail" className={labelClass}>Contact email</label>
                      <input
                        id="contactEmail"
                        type="email"
                        value={form.contactEmail}
                        onChange={(event) => updateField("contactEmail", event.target.value)}
                        className={inputClass}
                      />
                      <ErrorText field="contactEmail" />
                    </div>
                  </div>
                </section>

                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Scope</p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Supplier-facing scope</h2>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label htmlFor="shortDescription" className={labelClass}>Short description</label>
                      <textarea
                        id="shortDescription"
                        rows={3}
                        maxLength={300}
                        value={form.shortDescription}
                        onChange={(event) => updateField("shortDescription", event.target.value)}
                        className={`${inputClass} resize-y`}
                      />
                      <div className="mt-2 flex justify-between gap-3 text-xs text-muted">
                        <span>Shown on the RFQ card in search results. 1-2 sentences.</span>
                        <span>{form.shortDescription.length}/300</span>
                      </div>
                      <ErrorText field="shortDescription" />
                    </div>
                    <div>
                      <label htmlFor="scope" className={labelClass}>Full scope of work</label>
                      <textarea
                        id="scope"
                        rows={6}
                        value={form.scope}
                        onChange={(event) => updateField("scope", event.target.value)}
                        className={`${inputClass} min-h-[120px] resize-y`}
                      />
                      <p className={hintClass}>
                        Detailed requirements visible to registered suppliers after they click into the RFQ.
                      </p>
                      <ErrorText field="scope" />
                    </div>
                  </div>
                </section>

                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Timeline</p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Procurement dates</h2>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-3">
                    <div>
                      <label htmlFor="closingDate" className={labelClass}>Closing date</label>
                      <input
                        id="closingDate"
                        type="date"
                        value={form.closingDate}
                        onChange={(event) => updateField("closingDate", event.target.value)}
                        className={inputClass}
                      />
                      <ErrorText field="closingDate" />
                    </div>
                    <div>
                      <label htmlFor="awardDate" className={labelClass}>Expected award date</label>
                      <input
                        id="awardDate"
                        type="date"
                        value={form.awardDate}
                        onChange={(event) => updateField("awardDate", event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="startDate" className={labelClass}>Expected delivery / start date</label>
                      <input
                        id="startDate"
                        type="date"
                        value={form.startDate}
                        onChange={(event) => updateField("startDate", event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {shortTurnaround && (
                    <p className="mt-4 rounded-md border border-warning bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
                      Short turnaround - suppliers may need more time to prepare competitive quotes.
                    </p>
                  )}
                </section>
              </>
            )}

            {step === 2 && (
              <>
                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                      BBBEE & compliance requirements
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Supplier eligibility</h2>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label htmlFor="bbbeeRequirement" className={labelClass}>BBBEE level required</label>
                      <select
                        id="bbbeeRequirement"
                        value={form.bbbeeRequirement}
                        onChange={(event) => updateField("bbbeeRequirement", event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select requirement</option>
                        {BBBEE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <ErrorText field="bbbeeRequirement" />
                    </div>
                    {[
                      ["requireCsd", "Require CSD registration", "Only CSD-registered suppliers can submit quotes"],
                      ["requireTax", "Require valid tax clearance", ""],
                      ["requireVat", "Require VAT registration", ""],
                    ].map(([field, label, sub]) => (
                      <label key={field} className="flex items-start justify-between gap-4 rounded-md border border-panel bg-panel p-4">
                        <span>
                          <span className="block text-sm font-semibold text-heading">{label}</span>
                          {sub && <span className="mt-1 block text-xs text-muted">{sub}</span>}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(form[field as keyof FormState])}
                          onChange={(event) =>
                            updateField(field as "requireCsd" | "requireTax" | "requireVat", event.target.checked)
                          }
                          className="mt-1 h-4 w-4 accent-current"
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                      Geographic targeting
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Supplier reach</h2>
                  </div>

                  <div className="mt-6">
                    <p className={labelClass}>Province(s)</p>
                    <div className="flex flex-wrap gap-2">
                      {SA_PROVINCES.map((province) => {
                        const selected = form.provinces.includes(province)
                        return (
                          <button
                            key={province}
                            type="button"
                            onClick={() => toggleProvince(province)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                              selected
                                ? "border-accent bg-accent text-button"
                                : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent"
                            }`}
                          >
                            {province}
                          </button>
                        )
                      })}
                    </div>
                    <p className={hintClass}>
                      Select all provinces from which you will accept suppliers. Leave all selected for national.
                    </p>
                    <ErrorText field="provinces" />

                    <div className="mt-5">
                      <label htmlFor="deliveryLocation" className={labelClass}>Delivery location</label>
                      <input
                        id="deliveryLocation"
                        value={form.deliveryLocation}
                        onChange={(event) => updateField("deliveryLocation", event.target.value)}
                        placeholder="e.g. Duvha Power Station, eMalahleni"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                      Supplier preferences
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Optional targeting</h2>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label htmlFor="minimumSmartScore" className={labelClass}>Minimum SmartScore</label>
                      <select
                        id="minimumSmartScore"
                        value={form.minimumSmartScore}
                        onChange={(event) => updateField("minimumSmartScore", event.target.value)}
                        className={inputClass}
                      >
                        {SMART_SCORE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <p className={hintClass}>
                        Filters which suppliers can view and respond to this RFQ. Use 80+ for critical procurements.
                      </p>
                    </div>

                    <div>
                      <p className={labelClass}>Preferred certifications</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {CERTIFICATIONS.map((certification) => (
                          <label key={certification} className="flex items-center gap-2 rounded-md border border-panel bg-panel px-3 py-2 text-sm text-secondary">
                            <input
                              type="checkbox"
                              checked={form.certifications.includes(certification)}
                              onChange={() => toggleCertification(certification)}
                              className="h-4 w-4 accent-current"
                            />
                            {certification}
                          </label>
                        ))}
                      </div>
                      {form.certifications.includes("Other") && (
                        <input
                          value={form.otherCertification}
                          onChange={(event) => updateField("otherCertification", event.target.value)}
                          placeholder="Specify other certification"
                          className={`${inputClass} mt-3`}
                        />
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {step === 3 && (
              <>
                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Line items</p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Items and services</h2>
                    <p className={hintClass}>
                      Add the specific items or services you need quoted. Suppliers will price each line item individually.
                    </p>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[840px] text-sm">
                      <thead>
                        <tr className="border-b border-panel text-left text-[0.65rem] uppercase tracking-[0.2em] text-secondary">
                          <th className="pb-3 pr-3">Item / service description</th>
                          <th className="pb-3 pr-3">Unit</th>
                          <th className="pb-3 pr-3">Qty</th>
                          <th className="pb-3 pr-3">Spec / notes</th>
                          <th className="pb-3">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-panel">
                        {form.lineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3 pr-3">
                              <input
                                value={item.description}
                                onChange={(event) => updateLineItem(item.id, "description", event.target.value)}
                                className={inputClass}
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <input
                                value={item.unit}
                                onChange={(event) => updateLineItem(item.id, "unit", event.target.value)}
                                placeholder="Each"
                                className={inputClass}
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(event) => updateLineItem(item.id, "qty", event.target.value)}
                                className={inputClass}
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <input
                                value={item.notes}
                                onChange={(event) => updateLineItem(item.id, "notes", event.target.value)}
                                className={inputClass}
                              />
                            </td>
                            <td className="py-3">
                              {form.lineItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLineItem(item.id)}
                                  className="rounded-md border border-panel bg-panel px-3 py-2 text-sm font-bold text-secondary transition hover:border-rose-500/40 hover:text-rose-700"
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ErrorText field="lineItems" />

                  <button
                    type="button"
                    onClick={addLineItem}
                    className="mt-4 text-sm font-semibold text-accent transition hover:text-accent-strong"
                  >
                    + Add line item
                  </button>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="valueMin" className={labelClass}>Estimated value range - Min (R)</label>
                      <input
                        id="valueMin"
                        inputMode="numeric"
                        value={form.valueMin}
                        onChange={(event) => updateField("valueMin", cleanAmountInput(event.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="valueMax" className={labelClass}>Estimated value range - Max (R)</label>
                      <input
                        id="valueMax"
                        inputMode="numeric"
                        value={form.valueMax}
                        onChange={(event) => updateField("valueMax", cleanAmountInput(event.target.value))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <p className={hintClass}>
                    Shown to suppliers to help them qualify. Does not bind the award value.
                  </p>
                </section>

                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">RFQ documents</p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Supporting documents</h2>
                  </div>

                  <label
                    htmlFor="documents"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      handleFiles(event.dataTransfer.files)
                    }}
                    className="mt-6 block cursor-pointer rounded-md border border-dashed border-panel bg-panel p-8 text-center transition hover:border-accent"
                  >
                    <input
                      id="documents"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-heading">
                      Drag and drop or click to upload spec sheets, drawings, or scope documents
                    </span>
                    <span className="mt-2 block text-xs text-muted">PDF, DOCX, XLSX - max 20MB per file</span>
                  </label>

                  {documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between gap-3 rounded-md border border-panel bg-panel px-3 py-2 text-sm">
                          <span className="truncate text-secondary">{document.file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(document.id)}
                            className="text-xs font-semibold text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="border-b border-panel pb-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Publish settings</p>
                    <h2 className="mt-2 text-lg font-semibold text-heading">Supplier visibility</h2>
                  </div>
                  <div className="mt-6 space-y-3">
                    {[
                      ["notifyMatchedSuppliers", "Notify matched suppliers", "Send email alerts to suppliers whose profile matches this RFQ"],
                      ["allowAmendments", "Allow quote amendments", "Suppliers can update their quote before the deadline"],
                      ["requireCoverNote", "Require cover note", "Suppliers must include a cover note with their quote"],
                      ["listPublicly", "List publicly on opportunities page", "Show this RFQ on the public /opportunities page"],
                    ].map(([field, label, sub]) => (
                      <label key={field} className="flex items-start justify-between gap-4 rounded-md border border-panel bg-panel p-4">
                        <span>
                          <span className="block text-sm font-semibold text-heading">{label}</span>
                          <span className="mt-1 block text-xs text-muted">{sub}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(form[field as keyof FormState])}
                          onChange={(event) =>
                            updateField(
                              field as "notifyMatchedSuppliers" | "allowAmendments" | "requireCoverNote" | "listPublicly",
                              event.target.checked,
                            )
                          }
                          className="mt-1 h-4 w-4 accent-current"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            {step === 1 && (
              <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Step 1 of 3</p>
                <h2 className="mt-2 text-lg font-semibold text-heading">RFQ details checklist</h2>
                <div className="mt-5 space-y-3">
                  <ChecklistRow done={validation.title} label="RFQ title added" />
                  <ChecklistRow done={validation.buyerOrganisation} label="Buyer organisation added" />
                  <ChecklistRow done={validation.category} label="Industry selected" />
                  <ChecklistRow done={validation.contactPerson} label="Contact person added" />
                  <ChecklistRow done={validation.contactEmail} label="Contact email valid" />
                  <ChecklistRow done={validation.shortDescription && validation.shortLength} label="Short description written" />
                  <ChecklistRow done={validation.scope} label="Full scope added" />
                  <ChecklistRow done={validation.closingDate} label="Valid closing date set" />
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Supplier match preview</p>
                <h2 className="mt-2 text-lg font-semibold text-heading">
                  {matchedSuppliers.length} verified suppliers match your current criteria and will be notified.
                </h2>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">Industry count</p>
                    <p className="mt-1 text-xl font-bold text-heading">{matchBreakdown.industry}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">Province count</p>
                    <p className="mt-1 text-xl font-bold text-heading">{matchBreakdown.province}</p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">BBBEE count</p>
                    <p className="mt-1 text-xl font-bold text-heading">{matchBreakdown.bbbee}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="mt-4 text-sm font-semibold text-accent transition hover:text-accent-strong"
                >
                  Preview matched suppliers
                </button>
              </section>
            )}

            {step === 3 && (
              <>
                <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
                  <p className="text-xs uppercase tracking-[0.24em] text-secondary">Pre-publish checklist</p>
                  <div className="mt-5 space-y-3">
                    <ChecklistRow done={validation.title} label="RFQ title added" />
                    <ChecklistRow done={validation.shortDescription} label="Scope description written" />
                    <ChecklistRow done={validation.closingDate} label="Closing date set" />
                    <ChecklistRow done={validation.category} label="Industry selected" />
                    <ChecklistRow done={validation.provinces} label="Province(s) selected" />
                    <ChecklistRow done={validation.bbbeeRequirement} label="BBBEE requirement set" />
                    <ChecklistRow done={validation.lineItems} label="Line items added" />
                    <ChecklistRow done={validation.valueRange} label="Value range set (optional)" />
                    <ChecklistRow done={validation.documents} label="Spec document uploaded (optional)" />
                  </div>
                </section>

                <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
                  <p className="text-xs uppercase tracking-[0.24em] text-secondary">RFQ summary preview</p>
                  <h2 className="mt-2 text-lg font-semibold text-heading">{form.title || "Untitled RFQ"}</h2>
                  <div className="mt-4 space-y-2 text-sm text-secondary">
                    <p>{form.buyerOrganisation || "Organisation pending"}</p>
                    <p>{form.provinces.join(", ") || "Province pending"}</p>
                    <p>{form.category || "Industry pending"}</p>
                    <p>{form.bbbeeRequirement || "BBBEE pending"}</p>
                    <p>Closing: {form.closingDate || "Pending"}</p>
                    <p>{form.lineItems.length} line item{form.lineItems.length !== 1 ? "s" : ""}</p>
                    <p>{formatCurrencyRange(form.valueMin, form.valueMax)}</p>
                  </div>
                </section>
              </>
            )}
          </aside>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-md border border-panel bg-card p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted">
            Drafts are autosaved locally while you work. Publish only becomes available once required checks pass.
          </div>
          <div className="flex flex-wrap gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={step === 3 ? () => createRFQ("Draft") : saveLocalDraft}
              disabled={submitting}
              className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Save as draft
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => createRFQ("Open")}
                disabled={!canPublish || submitting}
                className="rounded-md border border-success bg-success px-4 py-2 text-sm font-semibold text-button transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Publishing..." : "Publish RFQ"}
              </button>
            )}
          </div>
        </div>
      </form>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4">
          <div className="ml-auto h-full w-full max-w-md overflow-y-auto rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="flex items-center justify-between gap-4 border-b border-panel pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Matched suppliers</p>
                <h2 className="mt-1 text-lg font-semibold text-heading">{matchedSuppliers.length} suppliers</h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md border border-panel bg-panel px-3 py-2 text-sm font-semibold text-secondary"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {matchedSuppliers.length === 0 ? (
                <p className="text-sm text-muted">No suppliers match these criteria yet.</p>
              ) : (
                matchedSuppliers.slice(0, 25).map((supplier) => (
                  <article key={supplier.id} className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-sm font-semibold text-heading">{supplier.business_name ?? "Unnamed supplier"}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-secondary">
                      <p>{supplier.bbbee_level ?? "BBBEE pending"}</p>
                      <p>SmartScore {supplierSmartScore(supplier)}</p>
                      <p>{supplier.province ?? "Province pending"}</p>
                      <p>{supplier.industry ?? "Industry pending"}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

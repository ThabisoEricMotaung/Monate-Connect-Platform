"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAutosave } from "@/hooks/useAutosave"
import { logActivity } from "@/lib/activity"
import { logAuditAction } from "@/lib/audit"
import { notifyNewRFQ, notifyRecommendedSuppliers } from "@/lib/automationRules"
import {
  getCurrentProfile,
  getCurrentUser,
  hasAdminOrBuyerAccess,
  type AuthProfile,
} from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { TEMPLATE_APPLY_KEY } from "@/lib/rfqTemplateKeys"

// ─── Constants ────────────────────────────────────────────────────────────────

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
]

const CATEGORIES = [
  "Construction & Infrastructure",
  "Electrical & Engineering",
  "IT & Technology",
  "Mining & Resources",
  "Municipal Services",
  "Professional Services",
  "Supply & Logistics",
  "Water & Sanitation",
  "Other",
]

const STATUS_OPTIONS = ["Open", "Closing Soon", "Closed", "Awarded"]

const ACCEPTED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

const ACCEPTED_ATTACHMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"]

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  title: string
  description: string
  province: string
  category: string
  budget: string
  deadline: string
  status: string
}

type RFQDraft = {
  title: string
  description: string
  category: string
  suggestedProvince: string | null
  supplierRequirements: string[]
  complianceChecklist: string[]
  evaluationCriteria: string[]
  deadlineReminder: string
}

type PendingTemplate = {
  id: number
  template_name: string | null
  category: string | null
  province: string | null
  title: string | null
  description: string | null
  compliance_requirements: string | null
  evaluation_criteria: string | null
  default_deadline_days: number | null
}

// ─── Form constants ───────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  province: "",
  category: "",
  budget: "",
  deadline: "",
  status: "Open",
}

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelClass =
  "mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanAmountInput(value: string): string {
  return value.replace(/[^\d]/g, "")
}

function cleanFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
}

function isAcceptedAttachment(file: File): boolean {
  const lowerName = file.name.toLowerCase()
  return (
    ACCEPTED_ATTACHMENT_TYPES.includes(file.type) ||
    ACCEPTED_ATTACHMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

// ─── RFQ Drafting Assistant logic ─────────────────────────────────────────────

const PROVINCE_ALIASES: Record<string, string> = {
  "eastern cape": "Eastern Cape",
  "free state": "Free State",
  gauteng: "Gauteng",
  kwazulu: "KwaZulu-Natal",
  "kwazulu-natal": "KwaZulu-Natal",
  kzn: "KwaZulu-Natal",
  limpopo: "Limpopo",
  mpumalanga: "Mpumalanga",
  "north west": "North West",
  "northern cape": "Northern Cape",
  "western cape": "Western Cape",
  "cape town": "Western Cape",
  durban: "KwaZulu-Natal",
  johannesburg: "Gauteng",
  joburg: "Gauteng",
  jozi: "Gauteng",
  pretoria: "Gauteng",
  tshwane: "Gauteng",
  nelspruit: "Mpumalanga",
  polokwane: "Limpopo",
  bloemfontein: "Free State",
  kimberley: "Northern Cape",
  rustenburg: "North West",
  mahikeng: "North West",
}

const CATEGORY_SIGNALS: [string, string[]][] = [
  [
    "Construction & Infrastructure",
    [
      "construct", "build", "road", "bridge", "civil", "fencing", "paving",
      "roofing", "renovation", "demolish", "borehole", "concrete", "rebar",
      "earthwork", "grading", "structure", "facility", "building",
    ],
  ],
  [
    "Electrical & Engineering",
    [
      "electric", "power", "generator", "wiring", "cable", "solar", "substation",
      "panel", "transformer", "lighting", "hvac", "mechanical", "switchgear",
      "inverter", "battery", "ups", "motor", "pump",
    ],
  ],
  [
    "IT & Technology",
    [
      "software", "hardware", "network", "server", "cloud", "system",
      "application", "website", "data", " it ", "cyber", "database", "ict",
      "laptop", "computer", "printer", "router", "cctv", "fibre", "wifi",
      "platform", "app ", "digital", "licence",
    ],
  ],
  [
    "Mining & Resources",
    [
      "mining", "mineral", "drill", "blast", "excavat", "ore", "coal",
      "gold", "platinum", "quarry", "tailings", "geology", "prospect",
    ],
  ],
  [
    "Municipal Services",
    [
      "municipal", "refuse", "meter", "utility", "rates", "cleaning",
      "rubbish", "street", "park", "grass", "verge", "cemetery",
    ],
  ],
  [
    "Professional Services",
    [
      "consult", "audit", "legal", "accounting", "training", "facilitat",
      "research", "survey", "assess", "review", "advisory", "coaching",
      "mentoring", "feasibility", "design", "architect",
    ],
  ],
  [
    "Supply & Logistics",
    [
      "supply", "deliver", "transport", "logistic", "freight", "warehouse",
      "storage", "fuel", "material", "goods", "equipment", "fleet",
      "uniform", "stationery", "furniture", "vehicle", "truck",
    ],
  ],
  [
    "Water & Sanitation",
    [
      "water", "sanitation", "sewer", "pipeline", "tank", "treatment",
      "plumb", "reticulation", "borehole", "irrigation", "effluent",
      "wastewater",
    ],
  ],
]

const CATEGORY_COMPLIANCE: Record<string, string[]> = {
  "Construction & Infrastructure": [
    "CIDB registration (grading appropriate to contract value)",
    "Professional Indemnity Insurance",
    "NHBRC enrolment (where applicable)",
    "OHS Act compliance certificate",
  ],
  "Electrical & Engineering": [
    "ECSA-registered professional (where design work is included)",
    "COC certificate issuing capability",
    "Professional Indemnity Insurance",
    "OHS Act compliance",
  ],
  "IT & Technology": [
    "ISO 27001 or equivalent information security certification (preferred)",
    "Software licensing compliance declaration",
    "Data protection and POPIA compliance declaration",
    "Professional Indemnity Insurance",
  ],
  "Mining & Resources": [
    "MHSA compliance certificate",
    "DMR permits (where applicable)",
    "Environmental authorisation (where applicable)",
    "Professional Indemnity Insurance",
  ],
  "Professional Services": [
    "Relevant professional body registration (e.g., SAICA, SAICA, LSSA, SACPCMP)",
    "Professional Indemnity Insurance",
    "Fidelity guarantee (where applicable)",
  ],
  "Water & Sanitation": [
    "DWS registration and authorisation (where applicable)",
    "Blue Drop / Green Drop compliance (where applicable)",
    "OHS Act compliance",
    "Professional Indemnity Insurance",
  ],
}

const CATEGORY_SUPPLIER_REQS: Record<string, string[]> = {
  "Construction & Infrastructure": [
    "Minimum CIDB grading 3CE or higher (confirm against contract value)",
    "Minimum 3 years verifiable construction experience",
    "Demonstrated capacity to execute projects of similar scope and value",
    "Own or subcontracted plant, equipment, and skilled labour",
  ],
  "Electrical & Engineering": [
    "Registered electrical contracting business with DoL",
    "Minimum 3 years engineering project experience",
    "Qualified artisans and engineers on staff or under contract",
    "Demonstrated commissioning and testing experience",
  ],
  "IT & Technology": [
    "Minimum 3 years experience in IT procurement and deployment",
    "OEM authorised reseller or integrator status (where applicable)",
    "Demonstrated post-delivery support capability",
    "Reference sites for similar-scale deployments",
  ],
  "Supply & Logistics": [
    "Confirmed supply chain and warehousing capacity",
    "Ability to meet delivery schedule and minimum order quantities",
    "Compliance with product specifications and quality standards",
    "Vehicle fleet or confirmed courier partnerships",
  ],
  "Professional Services": [
    "Registered professionals with relevant accreditation",
    "Minimum 3 years verifiable experience in the specific service domain",
    "CVs for all proposed project team members",
    "References from at least 2 similar-value engagements in the last 3 years",
  ],
}

function detectProvince(lower: string): string | null {
  for (const [alias, canonical] of Object.entries(PROVINCE_ALIASES)) {
    if (lower.includes(alias)) return canonical
  }
  return null
}

function detectCategory(lower: string): string | null {
  for (const [category, signals] of CATEGORY_SIGNALS) {
    if (signals.some((s) => lower.includes(s))) return category
  }
  return null
}

function buildRFQDraft(
  notes: string
): { draft: RFQDraft; warnings: string[] } {
  const warnings: string[] = []
  const lower = notes.toLowerCase()
  const trimmed = notes.trim()

  // ── Warnings ────────────────────────────────────────────────────────────────
  if (trimmed.length < 50) {
    warnings.push(
      `Your notes are too brief (${trimmed.length} characters). Describe what you are procuring, the province, budget range, and any compliance or deadline requirements.`
    )
  }
  if (!detectProvince(lower)) {
    warnings.push("No province detected — specify where the goods or services are needed for better supplier targeting.")
  }
  if (!/r\s?[\d,]+|\d{4,}|budget|rand|million|thousand|k\b/.test(lower)) {
    warnings.push("No budget range detected — include an indicative amount so suppliers can assess eligibility.")
  }
  if (!/(deadline|by |due |submit|close|end of|quarter|week|month|\d{4}-\d{2}|\d+\s*day)/.test(lower)) {
    warnings.push("No deadline mentioned — set a clear submission cutoff (14–21 days from publication is standard).")
  }
  if (!detectCategory(lower)) {
    warnings.push("Category could not be determined from your notes — you may need to select it manually after applying the draft.")
  }
  if (!/(bbbee|b-bbee|csd|tax|cidb|compli|registr|certif)/.test(lower)) {
    warnings.push("No compliance requirements detected — consider adding B-BBEE, CSD registration, or tax clearance requirements.")
  }

  // ── Detect signals ──────────────────────────────────────────────────────────
  const suggestedProvince = detectProvince(lower)
  const detectedCategory = detectCategory(lower)
  const currentYear = new Date().getFullYear()

  // Budget hint
  const budgetMatch = notes.match(
    /R?\s?[\d\s,]+(?:\.\d{2})?\s*(?:million|m\b|thousand|k\b)?/i
  )
  const budgetHint = budgetMatch ? budgetMatch[0].trim() : null

  // Deadline hint
  const deadlineWords = [
    "end of quarter", "end of month", "by end", "before", "by ", "due ",
  ]
  const hasDeadlineHint = deadlineWords.some((w) => lower.includes(w))
  const explicitDate = notes.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/)

  // ── Title ───────────────────────────────────────────────────────────────────
  const provinceLabel = suggestedProvince ?? "South Africa"
  const categoryShort = detectedCategory
    ? detectedCategory.split(" & ")[0].split(" ")[0]
    : "Procurement"

  let title: string
  if (lower.includes("supply") || lower.includes("procurement")) {
    title = `Supply of ${categoryShort} Services – ${provinceLabel} – ${currentYear}`
  } else if (lower.includes("install")) {
    title = `Installation of ${categoryShort} Systems – ${provinceLabel} – ${currentYear}`
  } else if (lower.includes("mainten")) {
    title = `Maintenance of ${categoryShort} Assets – ${provinceLabel} – ${currentYear}`
  } else if (lower.includes("develop") || lower.includes("design")) {
    title = `Development and Design of ${categoryShort} Solution – ${provinceLabel} – ${currentYear}`
  } else if (lower.includes("consult") || lower.includes("advisory")) {
    title = `${categoryShort} Advisory and Consulting Services – ${provinceLabel} – ${currentYear}`
  } else {
    title = `${categoryShort} Procurement Request – ${provinceLabel} – ${currentYear}`
  }

  // ── Description ─────────────────────────────────────────────────────────────
  const detectedVerb = lower.includes("supply") || lower.includes("procurement")
    ? "Supply"
    : lower.includes("install")
      ? "Installation"
      : lower.includes("mainten")
        ? "Maintenance"
        : lower.includes("develop") || lower.includes("design")
          ? "Development"
          : lower.includes("consult") || lower.includes("advisory")
            ? "Consulting"
            : "Procurement"

  const scopeExtract =
    trimmed.length > 30
      ? `${trimmed.slice(0, 220).replace(/\n/g, " ").trim()}${trimmed.length > 220 ? "…" : ""}`
      : `${detectedVerb} of ${categoryShort.toLowerCase()} goods or services`

  const description = [
    `This Request for Quotation (RFQ) is issued for the ${scopeExtract}. The procuring organisation invites suitably qualified and experienced suppliers to submit competitive quotations in accordance with the requirements set out herein.`,
    "",
    budgetHint
      ? `An indicative budget of approximately ${budgetHint} has been allocated for this procurement. Quoted amounts must be inclusive of all costs (delivery, installation, commissioning, and VAT where applicable) unless expressly noted otherwise.`
      : "The budget for this procurement has not been publicly disclosed. Suppliers must quote competitively with full cost transparency including delivery, VAT, and any associated fees.",
    "",
    `Supplier responses must demonstrate full understanding of the scope, confirmed compliance status, and the ability to deliver within the specified timeframe. ${suggestedProvince ? `This procurement is targeted at suppliers operating in or capable of delivering to ${suggestedProvince}.` : "This procurement is open to suppliers across South Africa."}`,
  ].join("\n")

  // ── Category ─────────────────────────────────────────────────────────────────
  const category = detectedCategory ?? ""

  // ── Supplier requirements ─────────────────────────────────────────────────
  const baseRequirements = [
    "Active CSD (Central Supplier Database) registration",
    "Valid SARS tax clearance certificate",
    "B-BBEE compliance certificate (Level 4 or better preferred)",
    "CIPC company registration certificate",
    "Minimum 3 years verifiable experience in the relevant procurement category",
    "Demonstrated capacity and resources to fulfil the full scope within the required timeframe",
    "Declaration of interest and no conflict of interest",
  ]
  const categoryRequirements = category
    ? (CATEGORY_SUPPLIER_REQS[category] ?? [])
    : []
  const supplierRequirements = [
    ...baseRequirements,
    ...categoryRequirements.filter((r) => !baseRequirements.some((b) => b.toLowerCase().includes(r.toLowerCase().split(" ")[0]))),
  ]

  // ── Compliance checklist ──────────────────────────────────────────────────
  const baseCompliance = [
    "Valid CSD registration certificate",
    "B-BBEE compliance certificate (original or certified copy)",
    "SARS Tax Clearance Certificate (valid and current)",
    "CIPC Certificate of Incorporation",
    "Company letterhead and banking details (original bank confirmation letter)",
  ]
  const categoryCompliance = category ? (CATEGORY_COMPLIANCE[category] ?? []) : []
  const complianceChecklist = [...baseCompliance, ...categoryCompliance]

  // ── Evaluation criteria ───────────────────────────────────────────────────
  // Determine weights based on detected emphasis
  const techHeavy =
    lower.includes("technical") ||
    lower.includes("specialist") ||
    lower.includes("complex") ||
    lower.includes("engineer")
  const bbbeeHeavy =
    lower.includes("bbbee") ||
    lower.includes("b-bbee") ||
    lower.includes("level") ||
    lower.includes("transformation")

  let evaluationCriteria: string[]
  if (techHeavy) {
    evaluationCriteria = [
      "Technical compliance and methodology (35%)",
      "Price / cost competitiveness (30%)",
      "B-BBEE status and transformation contribution (20%)",
      "Relevant experience and reference projects (10%)",
      "Proposed implementation timeline (5%)",
    ]
  } else if (bbbeeHeavy) {
    evaluationCriteria = [
      "Price / cost competitiveness (35%)",
      "B-BBEE status and transformation contribution (30%)",
      "Technical compliance and scope understanding (20%)",
      "Relevant experience and reference projects (10%)",
      "Proposed delivery timeline (5%)",
    ]
  } else {
    evaluationCriteria = [
      "Price / cost competitiveness (40%)",
      "B-BBEE status and transformation contribution (20%)",
      "Technical compliance and scope understanding (25%)",
      "Relevant experience and reference projects (10%)",
      "Proposed delivery timeline (5%)",
    ]
  }

  // ── Deadline reminder ─────────────────────────────────────────────────────
  let deadlineReminder: string
  if (explicitDate) {
    deadlineReminder = `An explicit date (${explicitDate[0]}) was detected in your notes. Confirm this as your RFQ submission deadline and allow at least 14 working days from publication for supplier preparation.`
  } else if (hasDeadlineHint) {
    deadlineReminder = `A timeline reference was detected in your notes. Convert this to a specific calendar date in the deadline field. Standard practice is 14–21 calendar days from RFQ publication for straightforward procurement, and 21–30 days for technical or high-value requests.`
  } else {
    deadlineReminder = `No deadline was detected in your notes. Set a firm submission deadline in the form — allow 14–21 calendar days for standard procurement or 21–30 days for technical or high-value requests. A clear deadline protects evaluation fairness and gives suppliers adequate preparation time.`
  }

  return {
    draft: {
      title,
      description,
      category,
      suggestedProvince,
      supplierRequirements,
      complianceChecklist,
      evaluationCriteria,
      deadlineReminder,
    },
    warnings,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type DraftSectionKey =
  | "title"
  | "description"
  | "category"
  | "supplierRequirements"
  | "complianceChecklist"
  | "evaluationCriteria"
  | "deadlineReminder"

export default function NewRFQPage() {
  const router = useRouter()

  // Form state (existing)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [authorizedProfile, setAuthorizedProfile] = useState<AuthProfile | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drafting assistant state
  const [draftNotes, setDraftNotes] = useState("")
  const [rfqDraft, setRfqDraft] = useState<RFQDraft | null>(null)
  const [draftWarnings, setDraftWarnings] = useState<string[]>([])
  const [draftBuilt, setDraftBuilt] = useState(false)
  const [expandedSection, setExpandedSection] = useState<DraftSectionKey | null>(null)
  const draftOutputRef = useRef<HTMLDivElement>(null)

  // Template handoff state
  const [pendingTemplate, setPendingTemplate] = useState<PendingTemplate | null>(null)

  const autosave = useAutosave<FormState>({
    key: "monate-draft-rfq-create",
    value: form,
    enabled: !checkingAccess && !success,
    onRestore: setForm,
  })

  useEffect(() => {
    async function checkAccess() {
      const profile = await getCurrentProfile()
      if (!profile) {
        setAccessDeniedMessage(
          "We could not confirm your dashboard profile. Please sign in again or ask an administrator to check your account setup."
        )
        setCheckingAccess(false)
        return
      }
      if (!hasAdminOrBuyerAccess(profile)) {
        setAccessDeniedMessage(
          profile.role
            ? `Your current role is "${profile.role}". Only admin and buyer users can create RFQs.`
            : "Your profile does not have a role assigned yet. Ask an administrator to assign the admin or buyer role before creating RFQs."
        )
        setCheckingAccess(false)
        return
      }
      setAuthorizedProfile(profile)
      setCheckingAccess(false)
    }
    checkAccess()
  }, [router])

  // Check for a template handoff from the templates page
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEMPLATE_APPLY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PendingTemplate
        setPendingTemplate(parsed)
      }
    } catch { /* invalid JSON — ignore */ }
  }, [])

  // ─── Handlers: template ───────────────────────────────────────────────────────

  function handleApplyTemplate() {
    if (!pendingTemplate) return

    const deadlineDate =
      pendingTemplate.default_deadline_days && pendingTemplate.default_deadline_days > 0
        ? (() => {
            const d = new Date()
            d.setDate(d.getDate() + pendingTemplate.default_deadline_days!)
            return d.toISOString().split("T")[0]
          })()
        : ""

    const parts: string[] = []
    if (pendingTemplate.description?.trim()) parts.push(pendingTemplate.description.trim())
    if (pendingTemplate.compliance_requirements?.trim()) {
      parts.push("── COMPLIANCE REQUIREMENTS ──\n" + pendingTemplate.compliance_requirements.trim())
    }
    if (pendingTemplate.evaluation_criteria?.trim()) {
      parts.push("── EVALUATION CRITERIA ──\n" + pendingTemplate.evaluation_criteria.trim())
    }

    setForm((prev) => ({
      ...prev,
      title: pendingTemplate.title?.trim() || prev.title,
      description: parts.join("\n\n") || prev.description,
      category:
        pendingTemplate.category && CATEGORIES.includes(pendingTemplate.category)
          ? pendingTemplate.category
          : prev.category,
      province:
        pendingTemplate.province && SA_PROVINCES.includes(pendingTemplate.province)
          ? pendingTemplate.province
          : prev.province,
      deadline: deadlineDate || prev.deadline,
    }))

    localStorage.removeItem(TEMPLATE_APPLY_KEY)
    setPendingTemplate(null)
    setSuccess(false)
    setError(null)
  }

  function handleDismissTemplate() {
    localStorage.removeItem(TEMPLATE_APPLY_KEY)
    setPendingTemplate(null)
  }

  // ─── Handlers: form ──────────────────────────────────────────────────────────

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const value =
      e.target.name === "budget"
        ? cleanAmountInput(e.target.value)
        : e.target.value
    setForm((prev) => ({ ...prev, [e.target.name]: value }))
    setSuccess(false)
    setError(null)
  }

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSuccess(false)
    setError(null)
    if (!file) { setAttachment(null); return }
    if (!isAcceptedAttachment(file)) {
      setAttachment(null)
      e.target.value = ""
      setError("RFQ attachment must be a PDF, DOC, DOCX, XLS, or XLSX file.")
      return
    }
    setAttachment(file)
  }

  // ─── Handlers: drafting assistant ────────────────────────────────────────────

  function handleBuildDraft() {
    const { draft, warnings } = buildRFQDraft(draftNotes)
    setRfqDraft(draft)
    setDraftWarnings(warnings)
    setDraftBuilt(true)
    setExpandedSection("title")
    setTimeout(() => {
      draftOutputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  function handleUseDraft() {
    if (!rfqDraft) return

    // Build rich description from all generated sections
    const fullDescription = [
      rfqDraft.description,
      "",
      "── SUPPLIER REQUIREMENTS ──",
      rfqDraft.supplierRequirements.map((r) => `• ${r}`).join("\n"),
      "",
      "── COMPLIANCE CHECKLIST ──",
      rfqDraft.complianceChecklist.map((r) => `• ${r}`).join("\n"),
      "",
      "── EVALUATION CRITERIA ──",
      rfqDraft.evaluationCriteria.map((r) => `• ${r}`).join("\n"),
    ].join("\n")

    setForm((prev) => ({
      ...prev,
      title: rfqDraft.title || prev.title,
      description: fullDescription,
      category:
        rfqDraft.category && CATEGORIES.includes(rfqDraft.category)
          ? rfqDraft.category
          : prev.category,
      province:
        rfqDraft.suggestedProvince &&
        SA_PROVINCES.includes(rfqDraft.suggestedProvince)
          ? rfqDraft.suggestedProvince
          : prev.province,
    }))
    setSuccess(false)
    setError(null)
  }

  // ─── Submit (existing) ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (checkingAccess) { setError("Access is still being verified. Please try again."); return }
    if (!form.title.trim()) { setError("Title is required."); return }
    if (!supabase) { setError("Supabase is not configured. Check environment variables."); return }

    const user = await getCurrentUser()
    const creatorId = authorizedProfile?.id || user?.id || null
    if (!creatorId) { setError("Could not confirm the logged-in admin or buyer account."); return }

    setLoading(true)
    let attachmentUrl: string | null = null

    if (attachment) {
      const filePath = `rfqs/${Date.now()}-${cleanFileName(attachment.name)}`
      const { error: uploadError } = await supabase.storage
        .from("rfq-documents")
        .upload(filePath, attachment, { upsert: false })

      if (uploadError) { setLoading(false); setError(uploadError.message); return }

      const { data: publicUrlData } = supabase.storage
        .from("rfq-documents")
        .getPublicUrl(filePath)
      attachmentUrl = publicUrlData.publicUrl

      try {
        await logActivity({
          action: "document.uploaded",
          entity_type: "rfq_document",
          entity_id: filePath,
          metadata: {
            bucket: "rfq-documents",
            file_name: attachment.name,
            file_path: filePath,
            document_url: attachmentUrl,
          },
        })
      } catch (activityError) { console.error(activityError) }
    }

    const { data: rfqData, error: insertError } = await supabase
      .from("rfqs")
      .insert([{
        title: form.title.trim(),
        description: form.description.trim(),
        province: form.province,
        category: form.category,
        budget: cleanAmountInput(form.budget),
        deadline: form.deadline || null,
        status: form.status,
        attachment_url: attachmentUrl,
        created_by: creatorId,
      }])
      .select("id")
      .single()

    setLoading(false)

    if (insertError) {
      const message = insertError.message
      const isMissingCreatedBy =
        message.includes("created_by") &&
        (message.includes("schema cache") || message.includes("column"))
      const isRlsFailure = message.toLowerCase().includes("row-level security")
      setError(
        isMissingCreatedBy
          ? "RFQ creation needs a created_by column for ownership-based RLS. Run the SQL noted in the stabilization output, then try again."
          : isRlsFailure
            ? "RFQ creation was blocked by Supabase RLS. Confirm your profile role is admin or buyer and that the RFQ insert policy allows created_by = auth.uid()."
            : message
      )
      return
    }

    try {
      await logAuditAction({
        action: "rfq.created",
        entity_type: "rfq",
        entity_id: rfqData?.id ?? null,
        old_values: null,
        new_values: {
          title: form.title.trim(),
          description: form.description.trim(),
          province: form.province,
          category: form.category,
          budget: cleanAmountInput(form.budget),
          deadline: form.deadline || null,
          status: form.status,
          attachment_url: attachmentUrl,
          created_by: creatorId,
        },
        metadata: {
          has_attachment: Boolean(attachmentUrl),
        },
      })
      await logActivity({
        action: "rfq.created",
        entity_type: "rfq",
        entity_id: rfqData?.id ?? null,
        metadata: {
          title: form.title.trim(),
          province: form.province,
          category: form.category,
          deadline: form.deadline || null,
          status: form.status,
          has_attachment: Boolean(attachmentUrl),
          created_by: creatorId,
        },
      })
    } catch (activityError) { console.warn("RFQ creation audit/activity logging failed:", activityError) }

    await notifyNewRFQ({
      id: rfqData?.id ?? null,
      title: form.title.trim(),
      description: form.description.trim(),
      province: form.province,
      category: form.category,
      budget: cleanAmountInput(form.budget),
      deadline: form.deadline || null,
      status: form.status,
    })
    await notifyRecommendedSuppliers({
      id: rfqData?.id ?? null,
      title: form.title.trim(),
      description: form.description.trim(),
      province: form.province,
      category: form.category,
      budget: cleanAmountInput(form.budget),
      deadline: form.deadline || null,
      status: form.status,
    })

    setSuccess(true)
    autosave.clearDraft()
    setForm(EMPTY_FORM)
    setAttachment(null)
    setDraftNotes("")
    setRfqDraft(null)
    setDraftWarnings([])
    setDraftBuilt(false)
  }

  // ─── Draft section config ─────────────────────────────────────────────────────

  const DRAFT_SECTIONS: Array<{
    key: DraftSectionKey
    title: string
    destination: string
  }> = [
    { key: "title", title: "Suggested RFQ Title", destination: "Title field" },
    { key: "description", title: "Description & Scope", destination: "Description field" },
    { key: "category", title: "Recommended Category", destination: "Category selector" },
    { key: "supplierRequirements", title: "Supplier Requirements", destination: "Description field" },
    { key: "complianceChecklist", title: "Compliance Checklist", destination: "Description field" },
    { key: "evaluationCriteria", title: "Evaluation Criteria", destination: "Description field" },
    { key: "deadlineReminder", title: "Deadline Guidance", destination: "Set in Deadline field" },
  ]

  function renderSectionContent(key: DraftSectionKey) {
    if (!rfqDraft) return null
    if (key === "title") {
      return <p className="mt-2 text-sm font-semibold text-heading">{rfqDraft.title}</p>
    }
    if (key === "description") {
      return (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-secondary">
          {rfqDraft.description}
        </p>
      )
    }
    if (key === "category") {
      return rfqDraft.category ? (
        <p className="mt-2 text-sm font-semibold text-heading">{rfqDraft.category}</p>
      ) : (
        <p className="mt-2 text-sm text-muted italic">
          Category could not be determined — select manually from the dropdown.
        </p>
      )
    }
    if (key === "supplierRequirements") {
      return (
        <ul className="mt-2 space-y-1.5">
          {rfqDraft.supplierRequirements.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-secondary">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      )
    }
    if (key === "complianceChecklist") {
      return (
        <ul className="mt-2 space-y-1.5">
          {rfqDraft.complianceChecklist.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-secondary">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      )
    }
    if (key === "evaluationCriteria") {
      return (
        <ul className="mt-2 space-y-1.5">
          {rfqDraft.evaluationCriteria.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-secondary">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      )
    }
    if (key === "deadlineReminder") {
      return (
        <p className="mt-2 text-sm leading-6 text-secondary">{rfqDraft.deadlineReminder}</p>
      )
    }
    return null
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Create new RFQ</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Define procurement requirements, set operational parameters, and publish
          a request for quotation for registered suppliers to respond to.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-success">RFQ created successfully</p>
            <p className="mt-0.5 text-xs text-success/80">
              The procurement request is now live and visible to registered suppliers.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-rose-200">Submission failed</p>
            <p className="mt-0.5 text-xs text-rose-200/70">{error}</p>
          </div>
        </div>
      )}

      {checkingAccess ? (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">Verifying procurement access...</p>
          <p className="mt-2 text-xs text-muted">
            Admin and buyer permissions are required to create RFQs.
          </p>
        </div>
      ) : accessDeniedMessage ? (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-8 shadow-panel">
          <p className="text-sm font-semibold text-rose-700">Create RFQ access denied</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-700">{accessDeniedMessage}</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-5 inline-flex rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Back to dashboard
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Draft recovery */}
          {autosave.showRecoveryDialog && (
            <div className="mb-5 rounded-md border border-accent bg-surface p-5 shadow-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-heading">Restore previous draft?</p>
                  <p className="mt-1 text-xs leading-5 text-secondary">
                    We found saved RFQ progress from your last session.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={autosave.restoreDraft}
                    className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
                  >
                    Restore Draft
                  </button>
                  <button
                    type="button"
                    onClick={autosave.discardDraft}
                    className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
                  >
                    Discard Draft
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Autosave indicator */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-panel bg-card px-5 py-3 shadow-sm">
            <p className="text-xs font-semibold text-success">
              {autosave.status === "saved" ? "✓ Draft saved" : "Draft autosaves every 5 seconds"}
            </p>
            <button
              type="button"
              onClick={autosave.discardDraft}
              className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface"
            >
              Discard Draft
            </button>
          </div>

          {/* ────────────────────────────────────────────────────────────────────
              LOAD RFQ TEMPLATE
          ──────────────────────────────────────────────────────────────────── */}
          {pendingTemplate ? (
            <div className="mb-5 rounded-md border border-success/35 bg-success/8 p-5 shadow-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success text-button">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-heading">
                      Template ready to apply
                    </p>
                    <p className="mt-0.5 text-xs text-secondary">
                      <span className="font-semibold">{pendingTemplate.template_name ?? "Unnamed Template"}</span>
                      {pendingTemplate.category && (
                        <span className="ml-2 rounded-full border border-panel bg-surface px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted">
                          {pendingTemplate.category}
                        </span>
                      )}
                      {pendingTemplate.province && (
                        <span className="ml-1.5 text-muted">· {pendingTemplate.province}</span>
                      )}
                      {pendingTemplate.default_deadline_days && (
                        <span className="ml-1.5 text-muted">· {pendingTemplate.default_deadline_days} day deadline</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Click &quot;Apply Template&quot; to pre-fill the form below. You can edit any field after applying.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    className="inline-flex items-center gap-1.5 rounded-md border border-success bg-success px-4 py-2 text-sm font-semibold text-button transition hover:bg-success/90"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Apply Template
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissTemplate}
                    className="inline-flex items-center gap-1.5 rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-md border border-panel bg-surface px-5 py-3">
              <p className="text-xs text-secondary">
                Have a saved template? Apply it to pre-fill this form.
              </p>
              <Link
                href="/dashboard/admin/rfq-templates"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition hover:text-accent-strong"
              >
                Browse Templates
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────
              RFQ DRAFTING ASSISTANT
          ──────────────────────────────────────────────────────────────────── */}
          <section className="mb-5 rounded-md border border-panel bg-card p-6 shadow-panel">
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-accent">
                  RFQ Drafting Assistant
                </p>
                <h2 className="mt-2 text-lg font-bold text-heading">
                  Build My RFQ Draft
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                  Describe what you need in plain language and the assistant will
                  generate a structured RFQ title, scope, supplier requirements,
                  compliance checklist, and evaluation criteria. No external AI
                  service — everything runs locally.
                </p>
              </div>
              <span className="hidden w-fit shrink-0 self-start rounded-md border border-panel bg-panel px-3 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-muted lg:inline-flex">
                Local engine
              </span>
            </div>

            {/* Textarea */}
            <div className="mt-5">
              <label
                htmlFor="draft-notes"
                className="mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.24em] text-secondary"
              >
                Describe what you need
              </label>
              <textarea
                id="draft-notes"
                rows={5}
                placeholder={
                  "Write freely, e.g.\n" +
                  "We need to supply and install 200 solar panels on a community centre in Limpopo. " +
                  "Budget around R1.2 million. Must be completed within 3 months. " +
                  "Suppliers must have CIDB grading, valid tax clearance, and B-BBEE Level 4 or better. " +
                  "Deadline for submissions should be in 3 weeks."
                }
                className={`${inputClass} resize-y`}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                aria-describedby="draft-notes-hint"
              />
              <p
                id="draft-notes-hint"
                className="mt-1.5 text-xs text-muted"
              >
                Include: what you are procuring, province, budget range, required timeline,
                compliance expectations, and any specialist requirements.
              </p>
            </div>

            {/* Char count + Build button */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p
                className={`text-xs font-semibold transition ${
                  draftNotes.length > 0 && draftNotes.length < 50
                    ? "text-warning"
                    : draftNotes.length >= 50
                      ? "text-success"
                      : "text-muted"
                }`}
              >
                {draftNotes.length > 0 && (
                  <>
                    {draftNotes.length} character{draftNotes.length !== 1 ? "s" : ""}
                    {draftNotes.length < 50
                      ? " — add more detail for best results"
                      : " — ready to generate"}
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={handleBuildDraft}
                disabled={draftNotes.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Build RFQ Draft
              </button>
            </div>

            {/* Generated output */}
            {draftBuilt && rfqDraft && (
              <div ref={draftOutputRef} className="mt-6 space-y-4">

                {/* Warnings */}
                {draftWarnings.length > 0 && (
                  <div className="rounded-md border border-warning bg-warning-soft p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <div>
                        <p className="text-sm font-bold text-warning">
                          {draftWarnings.length} note{draftWarnings.length > 1 ? "s" : ""} — review before finalising your RFQ
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {draftWarnings.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-warning">
                              <span aria-hidden="true" className="mt-0.5 shrink-0">–</span>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success header */}
                <div className="flex flex-col gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-success">
                    ✓ RFQ draft generated — 7 sections ready for review
                  </p>
                  <span className="w-fit rounded-md border border-panel bg-surface px-3 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Local template engine · No API call
                  </span>
                </div>

                {/* Sections accordion */}
                <div className="space-y-2">
                  {DRAFT_SECTIONS.map((section) => {
                    const isOpen = expandedSection === section.key
                    return (
                      <div
                        key={section.key}
                        className="overflow-hidden rounded-md border border-panel bg-surface"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSection(isOpen ? null : section.key)
                          }
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-panel"
                          aria-expanded={isOpen}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[0.55rem] font-extrabold text-button">
                              {DRAFT_SECTIONS.indexOf(section) + 1}
                            </span>
                            <span className="text-sm font-bold text-heading">
                              {section.title}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden text-[0.63rem] text-muted sm:inline">
                              → {section.destination}
                            </span>
                            <svg
                              className={`h-4 w-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-panel px-4 pb-4 pt-3">
                            {renderSectionContent(section.key)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Field mapping legend */}
                <div className="rounded-md border border-panel bg-panel px-4 py-3">
                  <p className="text-[0.67rem] font-bold uppercase tracking-[0.2em] text-secondary">
                    How the draft maps to your form
                  </p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {[
                      { dot: "bg-accent", label: "Title → Title field" },
                      { dot: "bg-accent", label: "Category → Category selector" },
                      { dot: "bg-accent", label: "Province (if detected) → Province selector" },
                      { dot: "bg-success", label: "Description + Requirements + Compliance + Criteria → Description field" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-xs text-secondary">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} aria-hidden="true" />
                        {item.label}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Budget and deadline are not auto-filled — enter them manually below.
                  </p>
                </div>

                {/* Use This Draft CTA */}
                <div className="flex flex-col gap-3 rounded-md border border-accent bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-heading">
                      Ready to apply this draft to your RFQ?
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Populates title, description, category, and province. Budget and deadline must be set manually.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseDraft}
                    className="inline-flex shrink-0 items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Use This Draft
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ────────────────────────────────────────────────────────────────────
              MAIN DETAILS CARD (existing)
          ──────────────────────────────────────────────────────────────────── */}
          <section className="rounded-md border border-panel bg-panel p-6">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Procurement details
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading">
                Request information
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="title" className={labelClass}>
                  RFQ Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="e.g. Supply of Electrical Equipment - Limpopo Region"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={7}
                  placeholder="Describe the procurement scope, operational requirements, and supplier expectations..."
                  value={form.description}
                  onChange={handleChange}
                  className={`${inputClass} resize-y`}
                />
              </div>
            </div>
          </section>

          {/* Classification card (existing) */}
          <section className="mt-5 rounded-md border border-panel bg-panel p-6">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Classification
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading">
                Regional & category parameters
              </h2>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="province" className={labelClass}>Province</label>
                <select
                  id="province"
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select province</option>
                  {SA_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className={labelClass}>Category</label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Financial & scheduling card (existing) */}
          <section className="mt-5 rounded-md border border-panel bg-panel p-6">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Financial & scheduling
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading">Budget and deadline</h2>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="budget" className={labelClass}>Budget (ZAR)</label>
                <div className="flex overflow-hidden rounded-md border border-panel bg-panel transition focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
                  <span className="flex items-center border-r border-panel bg-muted px-3 text-sm font-semibold text-secondary">
                    R
                  </span>
                  <input
                    id="budget"
                    name="budget"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="500000"
                    value={form.budget}
                    onChange={handleChange}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-heading outline-none placeholder:text-muted"
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Enter numbers only. Currency is applied automatically.
                </p>
              </div>

              <div>
                <label htmlFor="deadline" className={labelClass}>Submission deadline</label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Status card (existing) */}
          <section className="mt-5 rounded-md border border-panel bg-panel p-6">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Procurement status
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading">Publication state</h2>
            </div>

            <div className="mt-6 max-w-sm">
              <label htmlFor="status" className={labelClass}>Status</label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted">
                Select the current procurement publication state for supplier visibility and tracking.
              </p>
            </div>
          </section>

          {/* Attachment card (existing) */}
          <section className="mt-5 rounded-md border border-panel bg-panel p-6">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                RFQ documentation
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading">Attachment</h2>
            </div>

            <div className="mt-6 max-w-2xl">
              <label htmlFor="attachment" className={labelClass}>RFQ Attachment</label>
              <input
                id="attachment"
                name="attachment"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleAttachmentChange}
                className="block w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-button hover:file:bg-accent-strong"
              />
              <p className="mt-2 text-xs text-muted">
                Accepted formats: PDF, DOC, DOCX, XLS, XLSX.
              </p>
              {attachment && (
                <p className="mt-2 text-xs font-semibold text-accent">
                  Selected file: {attachment.name}
                </p>
              )}
            </div>
          </section>

          {/* Submit action (existing) */}
          <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-4">
            <p className="text-xs text-muted">
              All fields marked as required must be completed before the RFQ can be submitted.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {loading ? "Creating RFQ..." : "Create RFQ"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  title: string | null
  description: string | null
  region: string | null
  province: string | null
  category: string | null
  budget: string | null
  deadline: string | null
  status: string | null
  attachment_url: string | null
}

type PackNotes = {
  additionalInstructions: string
  evaluationNotes: string
  siteBriefingNotes: string
  specialConditions: string
}

const EMPTY_NOTES: PackNotes = {
  additionalInstructions: "",
  evaluationNotes: "",
  siteBriefingNotes: "",
  specialConditions: "",
}

const NOTE_FIELDS: Array<{
  key: keyof PackNotes
  label: string
  placeholder: string
}> = [
  {
    key: "additionalInstructions",
    label: "Additional instructions",
    placeholder:
      "Add delivery instructions, response formatting requirements, or buyer contact protocols...",
  },
  {
    key: "evaluationNotes",
    label: "Evaluation notes",
    placeholder:
      "Add internal evaluation guidance, weighting notes, or clarification rules...",
  },
  {
    key: "siteBriefingNotes",
    label: "Site briefing notes",
    placeholder:
      "Add site briefing date, venue, attendance requirements, or mark as not applicable...",
  },
  {
    key: "specialConditions",
    label: "Special conditions",
    placeholder:
      "Add contract-specific conditions, delivery constraints, or mandatory declarations...",
  },
]

const COMPLIANCE_REQUIREMENTS = [
  "Valid Central Supplier Database (CSD) registration report",
  "SARS tax compliance status PIN or valid tax clearance evidence",
  "B-BBEE certificate or sworn affidavit, where applicable",
  "Company registration documentation and authorised signatory details",
  "Proof of relevant licences, certifications, or professional registrations",
  "Declaration of interests and confirmation of procurement eligibility",
]

const SUBMISSION_CHECKLIST = [
  "Completed quotation with itemised pricing and VAT clearly indicated",
  "Technical response addressing the full scope of work",
  "Delivery, implementation, or mobilisation timeline",
  "All mandatory compliance documents attached",
  "Assumptions, exclusions, warranties, and support terms disclosed",
  "Submission reviewed and signed by an authorised representative",
]

const EVALUATION_CRITERIA = [
  "Administrative responsiveness and completeness of submission",
  "Compliance with mandatory supplier and procurement requirements",
  "Technical alignment with the requested scope and specifications",
  "Price competitiveness, transparency, and overall value for money",
  "Delivery capability, relevant experience, and operational readiness",
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatAmount(amount: string | null): string {
  if (!amount) return "-"

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  })}`
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-panel bg-panel p-4 print:border-slate-300 print:bg-white">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary print:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-heading print:text-slate-900">
        {value}
      </p>
    </div>
  )
}

function ListSection({
  title,
  eyebrow,
  items,
}: {
  title: string
  eyebrow: string
  items: string[]
}) {
  return (
    <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-slate-300 print:bg-white print:shadow-none">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-accent print:text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-heading print:text-slate-950">
        {title}
      </h2>
      <ol className="mt-4 space-y-2 text-sm leading-6 text-secondary print:text-slate-700">
        {items.map((item, index) => (
          <li key={item} className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-accent print:text-slate-500">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function TenderDocumentPackPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rfqId = Number(params.id)
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [notes, setNotes] = useState<PackNotes>(EMPTY_NOTES)
  const [loading, setLoading] = useState(true)
  const [previewGenerated, setPreviewGenerated] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadRFQ() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      if (!Number.isFinite(rfqId)) {
        setErrorMessage("Invalid RFQ reference.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("rfqs")
        .select(
          "id, title, description, region, province, category, budget, deadline, status, attachment_url"
        )
        .eq("id", rfqId)
        .single()

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setRfq(data as RFQ)
      setLoading(false)
    }

    loadRFQ()
  }, [rfqId, router])

  function updateNote(key: keyof PackNotes, value: string) {
    setNotes((currentNotes) => ({ ...currentNotes, [key]: value }))
    setPreviewGenerated(false)
  }

  function generatePreview() {
    setPreviewGenerated(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function printPack() {
    setPreviewGenerated(true)
    window.setTimeout(() => window.print(), 0)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
        <div className="h-64 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
        <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
      </div>
    )
  }

  if (errorMessage || !rfq) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">
          Tender document pack failed to load
        </p>
        <p className="mt-1 text-xs text-rose-700">
          {errorMessage || "The requested RFQ could not be found."}
        </p>
      </div>
    )
  }

  const displayStatus = getRFQDisplayStatus(rfq.status, rfq.deadline)
  const location = rfq.region || rfq.province || "-"

  return (
    <div className="mx-auto max-w-6xl print:max-w-none">
      <div className="mb-6 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Admin / Procurement Documentation
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            Tender Document Pack Generator
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Prepare a structured RFQ pack, add buyer notes, review the generated
            preview, and print a formal supplier-ready document.
          </p>
        </div>
        <Link
          href={`/dashboard/admin/rfqs/${rfq.id}/quotes`}
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-panel"
        >
          Back to Quote Comparison
        </Link>
      </div>

      {previewGenerated && (
        <div className="mb-5 rounded-md border border-success bg-success-soft px-5 py-4 print:hidden">
          <p className="text-sm font-semibold text-success">
            Pack preview generated. Review the document below or print it as a PDF.
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel print:border-0 print:bg-white print:shadow-none">
        <div className="border-b border-panel bg-panel px-6 py-6 sm:px-8 print:border-slate-300 print:bg-white">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-accent print:text-slate-600">
                MonateConnect Procurement Services
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-secondary print:text-slate-500">
                Structured Tender / RFQ Document Pack
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-mono text-sm font-semibold text-accent print:text-slate-900">
                RFQ-{rfq.id}
              </p>
              <p className="mt-1 text-xs text-muted print:text-slate-500">
                Generated {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>

          <h2 className="mt-7 max-w-4xl text-3xl font-semibold leading-tight text-heading print:text-slate-950">
            {rfq.title || "Untitled RFQ"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-md border border-accent/35 bg-accent-soft px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-heading print:border-slate-300 print:bg-white print:text-slate-700">
              {displayStatus}
            </span>
            <span className="inline-flex rounded-md border border-panel bg-card px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-secondary print:border-slate-300 print:bg-white print:text-slate-700">
              Supplier Response Pack
            </span>
          </div>
        </div>

        <div className="space-y-5 p-6 sm:p-8 print:p-0 print:pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailCard label="RFQ Number" value={`RFQ-${rfq.id}`} />
            <DetailCard label="Province / Region" value={location} />
            <DetailCard label="Category" value={rfq.category || "-"} />
            <DetailCard label="Budget" value={formatAmount(rfq.budget)} />
            <DetailCard label="Submission Deadline" value={formatDate(rfq.deadline)} />
            <DetailCard label="Status" value={displayStatus} />
          </div>

          <section className="rounded-md border border-panel bg-card p-6 print:border-slate-300 print:bg-white">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-accent print:text-slate-500">
              Section 01
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading print:text-slate-950">
              Description and scope
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-secondary print:text-slate-700">
              {rfq.description ||
                "Review the procurement summary and provide a complete quotation for the requested goods or services."}
            </p>
          </section>

          <div className="grid gap-5 lg:grid-cols-2 print:grid-cols-2">
            <ListSection
              eyebrow="Section 02"
              title="Compliance requirements"
              items={COMPLIANCE_REQUIREMENTS}
            />
            <ListSection
              eyebrow="Section 03"
              title="Supplier submission checklist"
              items={SUBMISSION_CHECKLIST}
            />
          </div>

          <ListSection
            eyebrow="Section 04"
            title="Evaluation criteria"
            items={EVALUATION_CRITERIA}
          />

          {rfq.attachment_url && (
            <section className="rounded-md border border-panel bg-card p-6 print:border-slate-300 print:bg-white">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-accent print:text-slate-500">
                Supporting documentation
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading print:text-slate-950">
                RFQ attachment
              </h2>
              <p className="mt-3 text-sm leading-6 text-secondary print:text-slate-700">
                The supporting procurement attachment forms part of this RFQ pack
                and must be reviewed before submission.
              </p>
              <a
                href={rfq.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex break-all text-sm font-semibold text-accent underline decoration-accent/40 underline-offset-4 print:text-slate-700"
              >
                {rfq.attachment_url}
              </a>
            </section>
          )}

          <section className="rounded-md border border-panel bg-card p-6 print:border-slate-300 print:bg-white">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-accent print:text-slate-500">
              Section 05
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading print:text-slate-950">
              Buyer instructions and conditions
            </h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-2 print:grid-cols-2">
              {NOTE_FIELDS.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={field.key}
                    className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary print:text-slate-500"
                  >
                    {field.label}
                  </label>
                  {previewGenerated ? (
                    <p className="min-h-16 whitespace-pre-wrap rounded-md border border-panel bg-panel px-3 py-2.5 text-sm leading-6 text-secondary print:border-0 print:bg-white print:px-0 print:py-0 print:text-slate-700">
                      {notes[field.key].trim() || "Not specified."}
                    </p>
                  ) : (
                    <>
                      <textarea
                        id={field.key}
                        rows={5}
                        value={notes[field.key]}
                        onChange={(event) => updateNote(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm leading-6 text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 print:hidden"
                      />
                      <p className="hidden min-h-16 whitespace-pre-wrap text-sm leading-6 text-slate-700 print:block">
                        {notes[field.key].trim() || "Not specified."}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel sm:flex-row sm:items-center sm:justify-between print:hidden">
        <p className="text-xs leading-5 text-muted">
          Preview changes are generated locally for this pack. No RFQ data or
          schema changes are written back to Supabase.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              previewGenerated ? setPreviewGenerated(false) : generatePreview()
            }
            className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
          >
            {previewGenerated ? "Edit Pack Notes" : "Generate Pack Preview"}
          </button>
          <button
            type="button"
            onClick={printPack}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { useAutosave } from "@/hooks/useAutosave"
import { logActivity } from "@/lib/activity"
import { getComplianceStatus } from "@/lib/complianceStatus"
import { createNotification } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"
import ComplianceChecklist from "@/components/compliance/ComplianceChecklist"

type VerificationForm = {
  csd_number: string
  bbbee_level: string
  tax_status: string
  company_registration: string
  cidb_grade: string
  verification_notes: string
  tax_expiry_date: string
  bbbee_expiry_date: string
  csd_expiry_date: string
  cidb_expiry_date: string
}

type DocumentField =
  | "csd_document_url"
  | "bbbee_document_url"
  | "tax_document_url"
  | "company_registration_url"
  | "cidb_document_url"
  | "capability_statement_url"

type DocumentConfig = {
  label: string
  description: string
  documentType: string
  field: DocumentField
}

type DocumentUrls = Record<DocumentField, string>

type VerificationDraft = {
  documentUrls: DocumentUrls
  form: VerificationForm
}

const EMPTY_FORM: VerificationForm = {
  csd_number: "",
  bbbee_level: "",
  tax_status: "",
  company_registration: "",
  cidb_grade: "",
  verification_notes: "",
  tax_expiry_date: "",
  bbbee_expiry_date: "",
  csd_expiry_date: "",
  cidb_expiry_date: "",
}

const EMPTY_DOCUMENT_URLS: DocumentUrls = {
  csd_document_url: "",
  bbbee_document_url: "",
  tax_document_url: "",
  company_registration_url: "",
  cidb_document_url: "",
  capability_statement_url: "",
}

const DOCUMENTS: DocumentConfig[] = [
  {
    label: "CSD Document",
    description: "Upload the supplier CSD registration or summary document.",
    documentType: "csd-document",
    field: "csd_document_url",
  },
  {
    label: "B-BBEE Certificate",
    description: "Upload the latest B-BBEE certificate or affidavit.",
    documentType: "bbbee-certificate",
    field: "bbbee_document_url",
  },
  {
    label: "Tax Clearance Document",
    description: "Upload SARS tax clearance or tax compliance status proof.",
    documentType: "tax-clearance-document",
    field: "tax_document_url",
  },
  {
    label: "Company Registration Document",
    description: "Upload CIPC registration or company registration proof.",
    documentType: "company-registration-document",
    field: "company_registration_url",
  },
  {
    label: "CIDB Certificate",
    description: "Upload CIDB grading certificate where applicable.",
    documentType: "cidb-certificate",
    field: "cidb_document_url",
  },
  {
    label: "Capability Statement",
    description: "Upload your company profile or capability statement.",
    documentType: "capability-statement",
    field: "capability_statement_url",
  },
]

const inputClass =
  "w-full rounded-2xl border border-panel bg-panel px-5 py-4 text-heading outline-none transition placeholder:text-muted focus:border-accent"

const labelClass =
  "mb-2 block text-sm font-medium text-secondary"

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
    return "Manual setup required: create the supplier-documents bucket in Supabase Storage, then try the upload again."
  }

  return message || "Document upload failed. Please try again."
}

export default function VerificationPage() {
  const [userId, setUserId] = useState("")
  const [supplierIndustry, setSupplierIndustry] = useState<string | null>(null)
  const [supplierProvince, setSupplierProvince] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState("Pending Review")
  const [form, setForm] = useState<VerificationForm>(EMPTY_FORM)
  const [documentUrls, setDocumentUrls] =
    useState<DocumentUrls>(EMPTY_DOCUMENT_URLS)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false)
  const verificationDraft = useMemo<VerificationDraft>(
    () => ({
      documentUrls,
      form,
    }),
    [documentUrls, form]
  )
  const autosave = useAutosave<VerificationDraft>({
    key: "monate-draft-supplier-verification",
    value: verificationDraft,
    enabled: !loading && !submitting && !submittedSuccessfully,
    onRestore: (draft) => {
      setForm(draft.form)
      setDocumentUrls(draft.documentUrls)
    },
  })

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        setErrorMessage(userError.message)
        setLoading(false)
        return
      }

      if (!userData.user) {
        setErrorMessage("You must be logged in to submit verification details.")
        setLoading(false)
        return
      }

      setUserId(userData.user.id)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "verification_status, industry, province, csd_number, bbbee_level, tax_status, company_registration, cidb_grade, verification_notes, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url, tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date"
        )
        .eq("id", userData.user.id)
        .maybeSingle()

      if (profileError) {
        setErrorMessage(profileError.message)
        setLoading(false)
        return
      }

      if (profile) {
        setVerificationStatus(profile.verification_status || "Pending Review")
        setSupplierIndustry(profile.industry || null)
        setSupplierProvince(profile.province || null)
        setForm({
          csd_number: profile.csd_number || "",
          bbbee_level: profile.bbbee_level || "",
          tax_status: profile.tax_status || "",
          company_registration: profile.company_registration || "",
          cidb_grade: profile.cidb_grade || "",
          verification_notes: profile.verification_notes || "",
          tax_expiry_date: profile.tax_expiry_date || "",
          bbbee_expiry_date: profile.bbbee_expiry_date || "",
          csd_expiry_date: profile.csd_expiry_date || "",
          cidb_expiry_date: profile.cidb_expiry_date || "",
        })
        setDocumentUrls({
          csd_document_url: profile.csd_document_url || "",
          bbbee_document_url: profile.bbbee_document_url || "",
          tax_document_url: profile.tax_document_url || "",
          company_registration_url: profile.company_registration_url || "",
          cidb_document_url: profile.cidb_document_url || "",
          capability_statement_url: profile.capability_statement_url || "",
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }))
    setSuccessMessage("")
    setErrorMessage("")
    setSubmittedSuccessfully(false)
  }

  async function handleDocumentUpload(
    event: ChangeEvent<HTMLInputElement>,
    documentConfig: DocumentConfig
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    setSuccessMessage("")
    setErrorMessage("")
    setSubmittedSuccessfully(false)

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    if (!userId) {
      setErrorMessage("You must be logged in before uploading documents.")
      return
    }

    setUploadingField(documentConfig.field)

    const fileName = cleanFileName(file.name)
    const filePath = `${userId}/${documentConfig.documentType}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("supplier-documents")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setErrorMessage(formatStorageUploadError(uploadError))
      setUploadingField(null)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from("supplier-documents")
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [documentConfig.field]: publicUrl })
      .eq("id", userId)

    setUploadingField(null)

    if (updateError) {
      setErrorMessage(updateError.message)
      return
    }

    setDocumentUrls((prev) => ({
      ...prev,
      [documentConfig.field]: publicUrl,
    }))

    try {
      await logActivity({
        action: "document.uploaded",
        entity_type: "supplier_document",
        entity_id: userId,
        metadata: {
          document_label: documentConfig.label,
          document_type: documentConfig.documentType,
          profile_field: documentConfig.field,
          file_name: file.name,
          bucket: "supplier-documents",
          file_path: filePath,
        },
      })
    } catch (activityError) {
      console.error(activityError)
    }

    setSuccessMessage(`${documentConfig.label} uploaded successfully.`)
    event.target.value = ""
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setSuccessMessage("")
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      setSubmitting(false)
      return
    }

    if (!userId) {
      setErrorMessage("You must be logged in to submit verification details.")
      setSubmitting(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        csd_number: form.csd_number.trim(),
        bbbee_level: form.bbbee_level,
        tax_status: form.tax_status,
        company_registration: form.company_registration.trim(),
        cidb_grade: form.cidb_grade.trim(),
        verification_notes: form.verification_notes.trim(),
        csd_document_url: documentUrls.csd_document_url || null,
        bbbee_document_url: documentUrls.bbbee_document_url || null,
        tax_document_url: documentUrls.tax_document_url || null,
        company_registration_url:
          documentUrls.company_registration_url || null,
        cidb_document_url: documentUrls.cidb_document_url || null,
        capability_statement_url:
          documentUrls.capability_statement_url || null,
        verification_status: "Under Review",
        tax_expiry_date: form.tax_expiry_date || null,
        bbbee_expiry_date: form.bbbee_expiry_date || null,
        csd_expiry_date: form.csd_expiry_date || null,
        cidb_expiry_date: form.cidb_expiry_date || null,
      })
      .eq("id", userId)

    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    try {
      await logActivity({
        action: "supplier.verification_submitted",
        entity_type: "supplier_profile",
        entity_id: userId,
        metadata: {
          previous_status: verificationStatus,
          new_status: "Under Review",
          csd_number: form.csd_number.trim(),
          bbbee_level: form.bbbee_level,
          tax_status: form.tax_status,
          company_registration: form.company_registration.trim(),
          cidb_grade: form.cidb_grade.trim(),
        },
      })
    } catch (activityError) {
      console.error(activityError)
    }

    // Notify supplier if any compliance document is expiring or expired
    const complianceChecks = [
      { label: "Tax Clearance Certificate", date: form.tax_expiry_date },
      { label: "B-BBEE Certificate", date: form.bbbee_expiry_date },
      { label: "CSD Registration", date: form.csd_expiry_date },
      { label: "CIDB Certificate", date: form.cidb_expiry_date },
    ]

    for (const check of complianceChecks) {
      const { status } = getComplianceStatus(check.date)
      if (status === "expired" || status === "expiring_soon") {
        try {
          await createNotification({
            recipientId: userId,
            type: "Compliance Expiry Warning",
            title: status === "expired" ? `${check.label} has expired` : `${check.label} expiring soon`,
            message:
              status === "expired"
                ? `Your ${check.label} has expired. Please renew it as soon as possible to avoid procurement delays.`
                : `Your ${check.label} is expiring within 30 days. Renew it promptly to stay procurement-ready.`,
            link: "/dashboard/verification",
            metadata: { document: check.label, expiry_date: check.date },
          })
        } catch (notifyError) {
          console.error(notifyError)
        }
      }
    }

    setVerificationStatus("Under Review")
    autosave.clearDraft()
    setSubmittedSuccessfully(true)
    setSuccessMessage(
      "Verification details submitted successfully. Your profile is now under review."
    )
  }

  const expiryFields = [
    { key: "tax_expiry_date" as const, label: "Tax Clearance Expiry Date" },
    { key: "bbbee_expiry_date" as const, label: "B-BBEE Certificate Expiry Date" },
    { key: "csd_expiry_date" as const, label: "CSD Expiry Date" },
    { key: "cidb_expiry_date" as const, label: "CIDB Certificate Expiry Date" },
  ]

  return (
    <>
      <div className="mb-10">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-accent">
          Compliance Review
        </p>
        <h1 className="text-5xl font-bold text-heading">Supplier Verification</h1>
        <p className="mt-4 max-w-3xl text-secondary">
          Submit statutory and procurement compliance details for supplier verification.
        </p>
      </div>

      <div className="rounded-3xl border border-panel bg-card p-8 shadow-panel">
        <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-secondary">
              Current verification status
            </p>
            <p className="mt-2 text-2xl font-bold text-accent">
              {loading ? "Loading..." : verificationStatus}
            </p>
          </div>
          <span className="inline-flex rounded-2xl border border-accent-soft bg-accent-soft px-4 py-2 text-sm font-semibold text-heading">
            Supplier Compliance
          </span>
        </div>

        {!loading && (
          <div className="mb-6">
            <ComplianceChecklist
              industry={supplierIndustry}
              province={supplierProvince}
              title="Documents Required for Verification"
              description="Prepare and upload all Required items below. Recommended items strengthen your profile score and improve your chances in competitive evaluations."
              collapsible
            />
          </div>
        )}

        {autosave.showRecoveryDialog && (
          <div className="mb-6 rounded-2xl border border-accent bg-surface px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-heading">
                  Restore previous draft?
                </p>
                <p className="mt-1 text-xs leading-5 text-secondary">
                  We found saved verification progress from your last session.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={autosave.restoreDraft}
                  className="rounded-2xl border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
                >
                  Restore Draft
                </button>
                <button
                  type="button"
                  onClick={autosave.discardDraft}
                  className="rounded-2xl border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
                >
                  Discard Draft
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-panel bg-surface px-5 py-3">
          <p className="text-xs font-semibold text-success">
            {autosave.status === "saved" ? "✓ Draft saved" : "Draft autosaves every 5 seconds"}
          </p>
          <button
            type="button"
            onClick={autosave.discardDraft}
            className="rounded-xl border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-surface"
          >
            Discard Draft
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
            <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-success bg-success-soft px-5 py-4">
            <p className="text-sm font-semibold text-success">{successMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-2xl bg-panel" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="csd_number" className={labelClass}>
                    CSD Number
                  </label>
                  <input
                    id="csd_number"
                    name="csd_number"
                    type="text"
                    placeholder="MAAA0000000"
                    value={form.csd_number}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="bbbee_level" className={labelClass}>
                    B-BBEE Level
                  </label>
                  <select
                    id="bbbee_level"
                    name="bbbee_level"
                    value={form.bbbee_level}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select level</option>
                    <option value="Level 1">Level 1</option>
                    <option value="Level 2">Level 2</option>
                    <option value="Level 3">Level 3</option>
                    <option value="Level 4">Level 4</option>
                    <option value="Level 5">Level 5</option>
                    <option value="Level 6">Level 6</option>
                    <option value="Level 7">Level 7</option>
                    <option value="Level 8">Level 8</option>
                    <option value="Non-compliant">Non-compliant</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tax_status" className={labelClass}>
                    Tax Status
                  </label>
                  <select
                    id="tax_status"
                    name="tax_status"
                    value={form.tax_status}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select status</option>
                    <option value="Compliant">Compliant</option>
                    <option value="Pending">Pending</option>
                    <option value="Non-compliant">Non-compliant</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="company_registration" className={labelClass}>
                    Company Registration
                  </label>
                  <input
                    id="company_registration"
                    name="company_registration"
                    type="text"
                    placeholder="2024/000000/07"
                    value={form.company_registration}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="cidb_grade" className={labelClass}>
                    CIDB Grade
                  </label>
                  <input
                    id="cidb_grade"
                    name="cidb_grade"
                    type="text"
                    placeholder="e.g. 3GB, 5CE"
                    value={form.cidb_grade}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="verification_notes" className={labelClass}>
                  Verification Notes
                </label>
                <textarea
                  id="verification_notes"
                  name="verification_notes"
                  rows={5}
                  placeholder="Add notes about compliance documents, pending renewals, or verification context..."
                  value={form.verification_notes}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-panel bg-panel p-6">
              <div className="mb-6 border-b border-panel pb-4">
                <p className="text-xs uppercase tracking-[0.26em] text-accent">
                  Document Expiry Dates
                </p>
                <h2 className="mt-2 text-xl font-semibold text-heading">
                  Compliance validity tracking
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                  Enter expiry dates so the system can warn you before documents
                  lapse and affect procurement eligibility.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {expiryFields.map(({ key, label }) => {
                  const status = getComplianceStatus(form[key])
                  return (
                    <div key={key}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor={key} className="block text-sm font-medium text-secondary">
                          {label}
                        </label>
                        {form[key] && (
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        )}
                      </div>
                      <input
                        id={key}
                        name={key}
                        type="date"
                        value={form[key]}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-panel bg-panel p-6">
              <div className="mb-6 border-b border-panel pb-4">
                <p className="text-xs uppercase tracking-[0.26em] text-accent">
                  Compliance Documents
                </p>
                <h2 className="mt-2 text-xl font-semibold text-heading">
                  Upload verification evidence
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                  Documents are stored in the supplier-documents bucket and linked
                  to your supplier profile for procurement review.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {DOCUMENTS.map((documentConfig) => {
                  const documentUrl = documentUrls[documentConfig.field]
                  const isUploading = uploadingField === documentConfig.field

                  return (
                    <div
                      key={documentConfig.field}
                      className="rounded-2xl border border-panel bg-card p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <label
                            htmlFor={documentConfig.field}
                            className="block text-sm font-semibold text-heading"
                          >
                            {documentConfig.label}
                          </label>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {documentConfig.description}
                          </p>
                        </div>
                        {documentUrl && (
                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-fit rounded-xl border border-success bg-success-soft px-3 py-1.5 text-xs font-semibold text-success transition hover:border-success/70"
                          >
                            View uploaded
                          </a>
                        )}
                      </div>

                      <input
                        id={documentConfig.field}
                        type="file"
                        onChange={(event) =>
                          handleDocumentUpload(event, documentConfig)
                        }
                        disabled={isUploading || submitting}
                        className="mt-4 block w-full rounded-2xl border border-panel bg-panel px-4 py-3 text-sm text-secondary file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-button hover:file:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                      />

                      <p className="mt-3 text-xs text-muted">
                        {isUploading
                          ? "Uploading document..."
                          : documentUrl
                            ? "Document URL saved to your supplier profile."
                            : "No document uploaded yet."}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>

            <button
              type="submit"
              disabled={submitting || Boolean(uploadingField)}
              className="rounded-2xl bg-accent px-8 py-4 font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting verification..." : "Submit Verification"}
            </button>
          </form>
        )}
      </div>
    </>
  )
}

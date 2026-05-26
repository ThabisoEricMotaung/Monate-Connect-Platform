"use client"

import { useState } from "react"

interface RFQIntelligenceProps {
  title: string
  description: string | null
  category: string | null
  province: string | null
  budget: string | null
  deadline: string | null
  attachment_url: string | null
}

interface DeadlineRisk {
  level: "LOW" | "MEDIUM" | "HIGH" | "CLOSED"
  label: string
  detail: string
}

interface IntelligenceSummary {
  keyOpportunity: string
  requiredFocusArea: string
  deadlineRisk: DeadlineRisk
  complianceDocuments: string[]
  preparationChecklist: string[]
}

function analyseRFQ(rfq: RFQIntelligenceProps): IntelligenceSummary {
  const combined = [rfq.title, rfq.description, rfq.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const budgetNum = rfq.budget ? Number(rfq.budget.replace(/[^\d]/g, "")) : 0

  let keyOpportunity =
    budgetNum >= 10_000_000
      ? "Major government contract — high-value strategic opportunity above R10M."
      : budgetNum >= 5_000_000
        ? "Large enterprise procurement — competitive advantage for established suppliers."
        : budgetNum >= 1_000_000
          ? "Mid-tier procurement contract — accessible for SMEs with a proven track record."
          : budgetNum > 0
            ? "Entry-level procurement opportunity — ideal for emerging suppliers and SMMEs."
            : "General procurement opportunity."

  if (/construction|infrastructure|civil|building|renovation/.test(combined))
    keyOpportunity += " Infrastructure sector — CIDB-graded contractors are preferred."
  else if (/\bit\b|software|technology|digital|system|ict/.test(combined))
    keyOpportunity += " Technology sector — innovation and cybersecurity capabilities are valued."
  else if (/health|medical|pharmaceutical|clinic/.test(combined))
    keyOpportunity += " Health sector — SAHPRA compliance and quality assurance are critical."
  else if (/cleaning|hygiene|facility|facilities/.test(combined))
    keyOpportunity += " Facility services — reliability, ISO certification, and staff capacity matter."
  else if (/security|guard|surveillance/.test(combined))
    keyOpportunity += " Security services — PSIRA registration and staff vetting are mandatory."

  let requiredFocusArea =
    "Demonstrate capability, relevant experience, and pricing competitiveness."

  if (/construction|building|civil|infrastructure/.test(combined))
    requiredFocusArea = "CIDB grading, OSH Act compliance, and a track record of similar projects are the critical focus areas."
  else if (/\bit\b|software|digital|ict|system/.test(combined))
    requiredFocusArea = "Technical capability, POPIA compliance, and implementation methodology are the key focus areas."
  else if (/consulting|advisory|audit|assessment/.test(combined))
    requiredFocusArea = "Professional accreditation, team qualifications, and methodological approach are paramount."
  else if (/supply|goods|equipment|hardware|material/.test(combined))
    requiredFocusArea = "Product specifications, delivery terms, warranty, and after-sales support must be clearly stated."
  else if (/security|guard/.test(combined))
    requiredFocusArea = "PSIRA registration, staff-to-site ratio, and vetting procedures must be comprehensively addressed."
  else if (/catering|food|meals/.test(combined))
    requiredFocusArea = "Health and safety compliance, food handling certifications, and menu pricing are the key requirements."

  let deadlineRisk: DeadlineRisk = {
    level: "LOW",
    label: "Low Risk",
    detail: "Sufficient time to prepare a complete and competitive submission.",
  }

  if (rfq.deadline) {
    const today = new Date()
    const dl = new Date(rfq.deadline)
    const days = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (days < 0)
      deadlineRisk = { level: "CLOSED", label: "Deadline Passed", detail: "This RFQ deadline has already passed." }
    else if (days <= 3)
      deadlineRisk = { level: "HIGH", label: "Critical — Urgent", detail: `Only ${days} day(s) remaining. Prioritise immediate submission.` }
    else if (days <= 7)
      deadlineRisk = { level: "HIGH", label: "High Risk", detail: `${days} days remaining. Begin preparation immediately.` }
    else if (days <= 14)
      deadlineRisk = { level: "MEDIUM", label: "Moderate Risk", detail: `${days} days remaining. Allocate dedicated preparation time now.` }
    else
      deadlineRisk = { level: "LOW", label: "Low Risk", detail: `${days} days remaining. Adequate time available.` }
  }

  const complianceDocuments: string[] = [
    "Valid Tax Clearance Certificate (SARS PIN)",
    "CIPC Company Registration Certificate",
    "BBBEE Verification Certificate",
    "Central Supplier Database (CSD) Registration",
  ]

  if (/construction|building|civil|infrastructure/.test(combined)) {
    complianceDocuments.push(
      "CIDB Registration Certificate (appropriate grading)",
      "OSH Act Compliance Declaration",
      "Professional Indemnity Insurance",
    )
  }
  if (/\bit\b|software|technology|digital|ict|system/.test(combined)) {
    complianceDocuments.push(
      "POPIA Compliance Declaration",
      "ISO 27001 or equivalent security certification (if applicable)",
    )
  }
  if (/security|guard/.test(combined))
    complianceDocuments.push("PSIRA Registration Certificate", "Staff Vetting and Screening Policy")
  if (/health|medical|pharmaceutical/.test(combined))
    complianceDocuments.push("SAHPRA Registration (if applicable)", "ISO 9001 Quality Management Certificate")
  if (/catering|food|hygiene/.test(combined))
    complianceDocuments.push("Certificate of Acceptability — Food Premises", "Food Handler Health Certificates")

  complianceDocuments.push(
    "Proof of Banking Details (cancelled cheque or bank letter)",
    "Certified copies of Company Directors' IDs",
  )

  const preparationChecklist: string[] = []

  if (rfq.attachment_url)
    preparationChecklist.push("Download and carefully review the RFQ attachment before submitting")

  preparationChecklist.push(
    "Read the full RFQ description and scope of work thoroughly",
    "Confirm your business meets all eligibility and compliance criteria",
    "Prepare an itemised pricing schedule with clearly stated assumptions",
    "Draft a scope response that directly addresses the RFQ requirements",
    "Gather all required compliance and supporting documents",
    "Verify your CSD registration is active and up to date",
    "Confirm your company banking details match those registered on CSD",
  )

  if (rfq.province)
    preparationChecklist.push(`Check any province-specific procurement requirements for ${rfq.province}`)

  return { keyOpportunity, requiredFocusArea, deadlineRisk, complianceDocuments, preparationChecklist }
}

const riskBadge: Record<DeadlineRisk["level"], string> = {
  LOW: "border-success/30 bg-success-soft text-success",
  MEDIUM: "border-warning/30 bg-warning-soft text-warning",
  HIGH: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  CLOSED: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

export default function RFQIntelligence(props: RFQIntelligenceProps) {
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null)

  return (
    <div className="mt-8 rounded-md border border-panel bg-card p-6 shadow-panel">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            Document Intelligence
          </p>
          <h2 className="mt-1 text-xl font-semibold text-heading">
            RFQ Intelligence Summary
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-secondary">
            Rule-based analysis to help you understand requirements and prepare
            a competitive submission.
          </p>
        </div>

        {!summary && (
          <button
            onClick={() => setSummary(analyseRFQ(props))}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
          >
            Analyse RFQ
          </button>
        )}

      </div>

      {props.attachment_url && !summary && (
        <div className="mt-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-3">
          <p className="text-sm font-medium text-warning">
            RFQ attachment available. Review before submitting.
          </p>
        </div>
      )}

      {summary && (
        <div className="mt-6 space-y-4">

          <div className="rounded-md border border-panel bg-panel p-5">
            <p className="text-[0.67rem] uppercase tracking-[0.22em] text-secondary">
              Key Opportunity
            </p>
            <p className="mt-2 text-sm leading-6 text-heading">
              {summary.keyOpportunity}
            </p>
          </div>

          <div className="rounded-md border border-panel bg-panel p-5">
            <p className="text-[0.67rem] uppercase tracking-[0.22em] text-secondary">
              Required Focus Area
            </p>
            <p className="mt-2 text-sm leading-6 text-heading">
              {summary.requiredFocusArea}
            </p>
          </div>

          <div className="rounded-md border border-panel bg-panel p-5">
            <p className="text-[0.67rem] uppercase tracking-[0.22em] text-secondary">
              Deadline Risk
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${riskBadge[summary.deadlineRisk.level]}`}
              >
                {summary.deadlineRisk.label}
              </span>
              <span className="text-sm text-secondary">
                {summary.deadlineRisk.detail}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-panel bg-panel p-5">
            <p className="text-[0.67rem] uppercase tracking-[0.22em] text-secondary">
              Suggested Compliance Documents
            </p>
            <ul className="mt-3 space-y-2">
              {summary.complianceDocuments.map((doc, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-heading">
                  <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-[0.58rem] font-bold text-accent">
                    {i + 1}
                  </span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-panel bg-panel p-5">
            <p className="text-[0.67rem] uppercase tracking-[0.22em] text-secondary">
              Supplier Preparation Checklist
            </p>
            <ul className="mt-3 space-y-2">
              {summary.preparationChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-heading">
                  <span className="mt-0.5 shrink-0 text-success">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {props.attachment_url && (
            <div className="rounded-md border border-warning/30 bg-warning-soft px-4 py-3">
              <p className="text-sm font-medium text-warning">
                RFQ attachment available. Review before submitting.
              </p>
            </div>
          )}

          <div className="pt-1">
            <button
              onClick={() => setSummary(null)}
              className="text-xs text-secondary underline hover:text-heading"
            >
              Reset analysis
            </button>
          </div>

        </div>
      )}

    </div>
  )
}

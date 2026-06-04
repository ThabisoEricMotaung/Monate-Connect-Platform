// ─── Types ────────────────────────────────────────────────────────────────────

export type ComplianceIssueSeverity = "error" | "warning" | "info"

export type ComplianceIssue = {
  severity: ComplianceIssueSeverity
  code: string
  message: string
  field?: string
}

export type ComplianceResult = {
  status: "Compliant" | "Warning" | "Blocked"
  issues: ComplianceIssue[]
  recommendations: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (!value) return 0
  const n = Number(String(value).replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function daysFromNow(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── generateComplianceResult ─────────────────────────────────────────────────

export function generateComplianceResult(
  issues: ComplianceIssue[],
  recommendations: string[]
): ComplianceResult {
  const hasErrors   = issues.some((i) => i.severity === "error")
  const hasWarnings = issues.some((i) => i.severity === "warning")
  const status: ComplianceResult["status"] =
    hasErrors ? "Blocked" : hasWarnings ? "Warning" : "Compliant"
  return { status, issues, recommendations }
}

// ─── checkRFQCompliance ───────────────────────────────────────────────────────

export type RFQComplianceInput = {
  title?: string | null
  description?: string | null
  budget?: string | null
  deadline?: string | null
  category?: string | null
  province?: string | null
  attachment_url?: string | null
  status?: string | null
}

export function checkRFQCompliance(rfq: RFQComplianceInput): ComplianceResult {
  const issues: ComplianceIssue[] = []
  const recommendations: string[] = []

  if (!rfq.title?.trim()) {
    issues.push({
      severity: "error",
      code: "rfq_no_title",
      field: "title",
      message: "RFQ title is required before suppliers can respond.",
    })
  }

  if (!rfq.description?.trim()) {
    issues.push({
      severity: "warning",
      code: "rfq_no_description",
      field: "description",
      message: "No description provided — suppliers may submit inaccurate quotes.",
    })
    recommendations.push("Add a detailed scope description and delivery expectations.")
  }

  const budgetAmt = parseAmount(rfq.budget)
  if (!rfq.budget?.trim() || budgetAmt === 0) {
    issues.push({
      severity: "warning",
      code: "rfq_no_budget",
      field: "budget",
      message: "Budget not specified — may attract poorly-scoped quotes.",
    })
    recommendations.push("Set an indicative budget to help suppliers assess eligibility.")
  }

  if (!rfq.deadline?.trim()) {
    issues.push({
      severity: "error",
      code: "rfq_no_deadline",
      field: "deadline",
      message: "Submission deadline is required for procurement fairness.",
    })
  } else {
    const daysLeft = daysFromNow(rfq.deadline)
    if (daysLeft !== null && daysLeft < 0) {
      issues.push({
        severity: "error",
        code: "rfq_deadline_passed",
        field: "deadline",
        message: `Submission deadline passed ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} ago.`,
      })
    } else if (daysLeft !== null && daysLeft < 7) {
      issues.push({
        severity: "warning",
        code: "rfq_deadline_soon",
        field: "deadline",
        message: `Submission deadline is in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} — suppliers may have insufficient time.`,
      })
      recommendations.push("Consider extending the deadline to allow adequate supplier response time.")
    }
  }

  if (!rfq.category?.trim()) {
    issues.push({
      severity: "warning",
      code: "rfq_no_category",
      field: "category",
      message: "Category not selected — affects supplier matching and compliance checklist generation.",
    })
    recommendations.push("Select a procurement category to enable targeted supplier matching.")
  }

  if (!rfq.province?.trim()) {
    issues.push({
      severity: "warning",
      code: "rfq_no_province",
      field: "province",
      message: "Province not specified — regional supplier targeting will be limited.",
    })
  }

  if (!rfq.attachment_url?.trim()) {
    issues.push({
      severity: "info",
      code: "rfq_no_attachment",
      field: "attachment_url",
      message: "No RFQ specification document attached.",
    })
    recommendations.push("Upload a terms of reference or specification document to improve response quality.")
  }

  if (budgetAmt > 1_000_000) {
    issues.push({
      severity: "warning",
      code: "rfq_high_value",
      message: `RFQ budget of R${budgetAmt.toLocaleString("en-ZA")} exceeds R1,000,000 — may require Decision Board approval before award.`,
    })
    recommendations.push("Ensure a Decision Board approval item is raised for this high-value procurement.")
  }

  return generateComplianceResult(issues, recommendations)
}

// ─── checkAwardCompliance ─────────────────────────────────────────────────────

export type AwardQuoteInput = {
  amount?: string | number | null
  status?: string | null
  supplier_id?: string | null
  supplier_name?: string | null
}

export type AwardSupplierInput = {
  verification_status?: string | null
  risk_level?: string | null
  banking_status?: string | null
  bbbee_level?: string | null
  csd_number?: string | null
}

export type AwardRFQInput = {
  status?: string | null
  budget?: string | null
  deadline?: string | null
  title?: string | null
}

export function checkAwardCompliance(
  rfq: AwardRFQInput,
  quote: AwardQuoteInput,
  supplier: AwardSupplierInput | null
): ComplianceResult {
  const issues: ComplianceIssue[] = []
  const recommendations: string[] = []

  // RFQ state checks
  if (rfq.status === "Awarded") {
    issues.push({
      severity: "error",
      code: "rfq_already_awarded",
      message: "This RFQ has already been awarded to another supplier.",
    })
  }

  const rfqDeadlineDays = daysFromNow(rfq.deadline)
  if (rfqDeadlineDays !== null && rfqDeadlineDays < 0) {
    issues.push({
      severity: "warning",
      code: "rfq_deadline_passed_award",
      message: "The RFQ submission deadline has passed — confirm all submissions were received.",
    })
  }

  // Quote amount vs budget
  const quoteAmt = parseAmount(quote.amount)
  const budgetAmt = parseAmount(rfq.budget)
  if (quoteAmt > 0 && budgetAmt > 0 && quoteAmt > budgetAmt) {
    issues.push({
      severity: "warning",
      code: "quote_exceeds_budget",
      message: `Quoted amount (R${quoteAmt.toLocaleString("en-ZA")}) exceeds RFQ budget (R${budgetAmt.toLocaleString("en-ZA")}).`,
    })
    recommendations.push("Obtain internal approval before awarding above budget.")
  }

  // Quote status
  const awardableStatuses = ["Pending", "Under Review", "Shortlisted"]
  if (quote.status && !awardableStatuses.includes(quote.status) && quote.status !== "Awarded") {
    issues.push({
      severity: "warning",
      code: "quote_bad_status",
      message: `Quote status "${quote.status}" — confirm the quote is still valid before awarding.`,
    })
  }

  // Supplier compliance
  if (!supplier) {
    issues.push({
      severity: "warning",
      code: "supplier_profile_missing",
      message: "Supplier profile could not be verified — proceed with manual compliance check.",
    })
    recommendations.push("Manually verify supplier registration, B-BBEE, and tax clearance before award.")
  } else {
    if (supplier.verification_status !== "Verified") {
      issues.push({
        severity: "error",
        code: "supplier_not_verified",
        message: `Supplier is "${supplier.verification_status ?? "unverified"}" — must be Verified before award.`,
      })
      recommendations.push("Complete supplier verification before awarding.")
    }

    if (supplier.risk_level === "Critical") {
      issues.push({
        severity: "error",
        code: "supplier_critical_risk",
        message: "Supplier has Critical risk rating — award is blocked. Resolve outstanding risk issues.",
      })
      recommendations.push("Address all critical risk factors before proceeding with award.")
    } else if (supplier.risk_level === "High") {
      issues.push({
        severity: "warning",
        code: "supplier_high_risk",
        message: "Supplier has High risk rating — proceed with enhanced due diligence.",
      })
      recommendations.push("Request updated compliance documents and obtain Decision Board approval.")
    }

    if (!supplier.csd_number?.trim()) {
      issues.push({
        severity: "warning",
        code: "supplier_no_csd",
        message: "Supplier CSD registration number is not on record.",
      })
      recommendations.push("Confirm CSD registration before award.")
    }
  }

  return generateComplianceResult(issues, recommendations)
}

// ─── checkInvoiceCompliance ───────────────────────────────────────────────────

export type InvoiceComplianceInput = {
  amount?: string | number | null
  total?: string | null
  status?: string | null
  contract_id?: number | null
  purchase_order_id?: number | null
  supplier_id?: string | null
  due_date?: string | null
  created_at?: string | null
}

export type POForCompliance = {
  amount?: string | null
  status?: string | null
} | null

export type ContractForCompliance = {
  contract_value?: string | null
  status?: string | null
  end_date?: string | null
} | null

export function checkInvoiceCompliance(
  invoice: InvoiceComplianceInput,
  po: POForCompliance,
  contract: ContractForCompliance
): ComplianceResult {
  const issues: ComplianceIssue[] = []
  const recommendations: string[] = []

  // PO reference
  if (!invoice.purchase_order_id) {
    issues.push({
      severity: "warning",
      code: "invoice_no_po",
      message: "No Purchase Order linked to this invoice.",
    })
    recommendations.push("Ensure all invoices reference a valid purchase order.")
  } else if (po) {
    const invoiceAmt = parseAmount(invoice.amount)
    const poAmt     = parseAmount(po.amount)
    if (invoiceAmt > 0 && poAmt > 0 && invoiceAmt > poAmt * 1.05) {
      issues.push({
        severity: "error",
        code: "invoice_exceeds_po",
        message: `Invoice amount (R${invoiceAmt.toLocaleString("en-ZA")}) exceeds PO amount (R${poAmt.toLocaleString("en-ZA")}) by more than 5%.`,
      })
      recommendations.push("Obtain variation order or revised PO before approving.")
    }
  }

  // Contract reference
  if (!invoice.contract_id) {
    issues.push({
      severity: "warning",
      code: "invoice_no_contract",
      message: "No contract linked to this invoice.",
    })
    recommendations.push("Link the invoice to an active contract before approval.")
  } else if (contract) {
    if (contract.status === "Terminated") {
      issues.push({
        severity: "error",
        code: "invoice_terminated_contract",
        message: "The linked contract has been terminated — invoice cannot be approved.",
      })
    }
    const contractDays = daysFromNow(contract.end_date)
    if (contractDays !== null && contractDays < 0) {
      issues.push({
        severity: "warning",
        code: "invoice_expired_contract",
        message: "The linked contract has expired — confirm delivery occurred within the contract period.",
      })
      recommendations.push("Obtain confirmation that services were delivered before contract expiry.")
    }
  }

  // Invoice status
  if (invoice.status === "Paid") {
    issues.push({
      severity: "warning",
      code: "invoice_already_paid",
      message: "This invoice is already marked as Paid — check for potential duplicate payment.",
    })
  }

  if (invoice.status === "Rejected") {
    issues.push({
      severity: "error",
      code: "invoice_rejected",
      message: "This invoice was previously rejected — it requires correction before approval.",
    })
    recommendations.push("Contact the supplier to resubmit a corrected invoice.")
  }

  // Due date
  const dueDays = daysFromNow(invoice.due_date)
  if (dueDays !== null && dueDays < 0) {
    issues.push({
      severity: "warning",
      code: "invoice_overdue",
      message: `Invoice due date passed ${Math.abs(dueDays)} day${Math.abs(dueDays) !== 1 ? "s" : ""} ago — process urgently.`,
    })
    recommendations.push("Prioritise approval to avoid payment delays and penalty interest.")
  }

  return generateComplianceResult(issues, recommendations)
}

// ─── checkPaymentCompliance ───────────────────────────────────────────────────

export type PaymentComplianceInput = {
  amount?: string | number | null
  status?: string | null
}

export type InvoiceForPayment = {
  status?: string | null
  total?: string | null
  amount?: string | number | null
} | null

export type BankingForPayment = {
  verification_status?: string | null
} | null

export function checkPaymentCompliance(
  payment: PaymentComplianceInput,
  invoice: InvoiceForPayment,
  banking: BankingForPayment
): ComplianceResult {
  const issues: ComplianceIssue[] = []
  const recommendations: string[] = []

  // Invoice approval gate
  if (!invoice) {
    issues.push({
      severity: "error",
      code: "payment_no_invoice",
      message: "No invoice linked to this payment — cannot verify approval status.",
    })
    recommendations.push("Ensure the payment is linked to an approved invoice.")
  } else {
    if (invoice.status !== "Approved" && invoice.status !== "Paid") {
      issues.push({
        severity: "error",
        code: "payment_invoice_not_approved",
        message: `Invoice status is "${invoice.status ?? "unknown"}" — must be Approved before payment release.`,
      })
      recommendations.push("Complete the invoice approval workflow before processing payment.")
    }
    if (invoice.status === "Paid") {
      issues.push({
        severity: "warning",
        code: "payment_invoice_already_paid",
        message: "Invoice is already marked as Paid — verify this is not a duplicate payment.",
      })
    }

    // Amount match
    const payAmt  = parseAmount(payment.amount)
    const invAmt  = parseAmount(invoice.total ?? invoice.amount)
    if (payAmt > 0 && invAmt > 0 && Math.abs(payAmt - invAmt) > 1) {
      issues.push({
        severity: "warning",
        code: "payment_amount_mismatch",
        message: `Payment amount (R${payAmt.toLocaleString("en-ZA")}) differs from invoice total (R${invAmt.toLocaleString("en-ZA")}).`,
      })
      recommendations.push("Confirm the payment amount matches the approved invoice total.")
    }
  }

  // Banking verification
  if (!banking || !banking.verification_status) {
    issues.push({
      severity: "error",
      code: "payment_no_banking",
      message: "Supplier banking details have not been submitted — payment cannot be processed.",
    })
    recommendations.push("Request the supplier to submit banking details via the supplier portal.")
  } else if (banking.verification_status !== "Verified") {
    issues.push({
      severity: "error",
      code: "payment_banking_unverified",
      message: `Supplier banking status is "${banking.verification_status}" — must be Verified before payment.`,
    })
    recommendations.push("Verify banking details in the Banking Review section before releasing payment.")
  }

  return generateComplianceResult(issues, recommendations)
}

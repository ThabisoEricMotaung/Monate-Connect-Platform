// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistItemStatus = "Required" | "Recommended" | "Not Applicable"

export type ChecklistGroup =
  | "identity"
  | "financial"
  | "labour"
  | "insurance"
  | "industry"
  | "safety"
  | "provincial"

export type ChecklistItem = {
  id: string
  label: string
  status: ChecklistItemStatus
  helpText: string
  group: ChecklistGroup
}

export type ComplianceChecklistInput = {
  category?: string | null
  province?: string | null
  industry?: string | null
}

// ─── Group labels ─────────────────────────────────────────────────────────────

export const GROUP_LABELS: Record<ChecklistGroup, string> = {
  identity: "Identity & Registration",
  financial: "Financial & Tax",
  labour: "Labour & Employment",
  insurance: "Insurance",
  industry: "Industry-Specific",
  safety: "Health, Safety & Environment",
  provincial: "Provincial Requirements",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lower(s: string | null | undefined): string {
  return (s ?? "").toLowerCase()
}

function isConstruction(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /construct|civil|infrastructure|road|bridge|building|fencing|paving|roofing|renovation|earthwork/i.test(combined)
}

function isElectrical(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /electri|engineer|power|generator|cable|solar|substation|panel|transformer|lighting|mechanical|hvac/i.test(combined)
}

function isMining(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /mining|mineral|drill|blast|excavat|quarry|coal|gold|platinum|tailings/i.test(combined)
}

function isIT(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /\bit\b|software|hardware|network|server|cloud|system|application|cyber|database|ict|tech|laptop|digital/i.test(combined)
}

function isProfessional(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /professional|consult|audit|legal|accounting|training|facilitat|advisory|research|survey|assess/i.test(combined)
}

function isWater(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /water|sanitation|sewer|pipeline|pump|tank|borehole|treatment|plumb|reticulation|irrigation|effluent/i.test(combined)
}

function isMunicipal(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /municipal|refuse|meter|utility|rates|cleaning|rubbish|street|park|grass|verge|cemetery/i.test(combined)
}

function isSiteWork(category: string, industry: string): boolean {
  return isConstruction(category, industry) ||
    isElectrical(category, industry) ||
    isMining(category, industry) ||
    isWater(category, industry) ||
    isMunicipal(category, industry)
}

function isPPERelevant(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /ppe|personal protect|safety wear|hard hat|glove|goggle|high.?vis|workwear|uniform/i.test(combined)
}

function isLabourIntensive(category: string, industry: string): boolean {
  const combined = `${category} ${industry}`
  return /labour|worker|employee|workforce|staff|crew|team|personnel|technician|artisan|operator/i.test(combined) ||
    isSiteWork(category, industry)
}

// ─── generateComplianceChecklist ─────────────────────────────────────────────

export function generateComplianceChecklist(
  input: ComplianceChecklistInput
): ChecklistItem[] {
  const cat = lower(input.category)
  const prov = lower(input.province)
  const ind = lower(input.industry)

  const items: ChecklistItem[] = []

  // ── Identity & Registration ────────────────────────────────────────────────

  items.push({
    id: "csd",
    label: "CSD Registration Report",
    status: "Required",
    helpText:
      "A current Central Supplier Database (CSD) registration summary report confirms the supplier is registered on the government's supplier database. It must be valid and match the trading name on the quotation.",
    group: "identity",
  })

  items.push({
    id: "cipc",
    label: "Company Registration Certificate (CIPC)",
    status: "Required",
    helpText:
      "The CIPC certificate of incorporation (COR14.3 or CoR14.9) confirms legal entity status. Close corporations submit their founding statement. It must reflect the current trading name and registered address.",
    group: "identity",
  })

  items.push({
    id: "bbbee",
    label: "B-BBEE Compliance Certificate or Sworn Affidavit",
    status: "Required",
    helpText:
      "A valid B-BBEE certificate issued by an accredited verification agency, or a sworn affidavit from an entity with an annual turnover below the EME threshold. Must not be older than 12 months.",
    group: "identity",
  })

  items.push({
    id: "capability",
    label: "Capability Statement / Company Profile",
    status: "Recommended",
    helpText:
      "A one-to-three page company profile summarising your services, key clients, team composition, and relevant past projects. Strengthens the technical evaluation of your submission.",
    group: "identity",
  })

  // ── Financial & Tax ────────────────────────────────────────────────────────

  items.push({
    id: "tax",
    label: "SARS Tax Clearance Certificate or Compliance Status PIN",
    status: "Required",
    helpText:
      "A valid SARS Tax Compliance Status (TCS) PIN or printed tax clearance certificate. Buyers verify compliance online using the PIN. The status must be 'Compliant' at the time of evaluation.",
    group: "financial",
  })

  items.push({
    id: "banking",
    label: "Proof of Banking Details (Original Bank Letter)",
    status: "Required",
    helpText:
      "An original bank-stamped confirmation letter on the bank's letterhead confirming the account name, number, branch code, and account type. Must match the registered entity name. Not a statement.",
    group: "financial",
  })

  items.push({
    id: "vat",
    label: "VAT Registration Certificate",
    status: isConstruction(cat, ind) || isMining(cat, ind) ? "Required" : "Recommended",
    helpText:
      "VAT registration certificate from SARS (VAT103 or VAT103T). Required for entities with turnover above the compulsory registration threshold (R1 million). Quotations must clearly state whether pricing is VAT inclusive or exclusive.",
    group: "financial",
  })

  // ── Labour & Employment ────────────────────────────────────────────────────

  if (isLabourIntensive(cat, ind)) {
    items.push({
      id: "coida",
      label: "COIDA Registration Letter of Good Standing",
      status: isSiteWork(cat, ind) ? "Required" : "Recommended",
      helpText:
        "Compensation for Occupational Injuries and Diseases Act (COIDA) registration and letter of good standing from the Compensation Fund. Required for any business deploying employees at a worksite or on-site service engagement.",
      group: "labour",
    })

    items.push({
      id: "uif",
      label: "UIF Registration Confirmation",
      status: "Recommended",
      helpText:
        "Proof that the supplier is registered for Unemployment Insurance Fund (UIF) contributions. Typically reflected in the CSD registration, but may be requested separately for large labour-intensive contracts.",
      group: "labour",
    })
  } else {
    items.push({
      id: "coida",
      label: "COIDA Registration Letter of Good Standing",
      status: "Recommended",
      helpText:
        "COIDA letter of good standing from the Compensation Fund. Required if any employees are deployed at a worksite. Strongly recommended as a general compliance document for any company with employees.",
      group: "labour",
    })
  }

  // ── Insurance ─────────────────────────────────────────────────────────────

  if (isSiteWork(cat, ind)) {
    items.push({
      id: "public-liability",
      label: "Public Liability Insurance",
      status: "Required",
      helpText:
        "Public liability insurance policy with a minimum indemnity limit appropriate to the contract value (typically R2 million or higher for site-based work). Must cover the full contract period. Buyer may be named as additional insured.",
      group: "insurance",
    })
  } else {
    items.push({
      id: "public-liability",
      label: "Public Liability Insurance",
      status: "Recommended",
      helpText:
        "Public liability insurance provides cover for third-party claims arising from business operations. Recommended for all supplier engagements, and required if any site access, delivery, or installation is involved.",
      group: "insurance",
    })
  }

  if (isProfessional(cat, ind) || isIT(cat, ind)) {
    items.push({
      id: "pi-insurance",
      label: "Professional Indemnity Insurance",
      status: "Required",
      helpText:
        "Professional indemnity (PI) insurance covers claims arising from professional advice, design, or service errors. Mandatory for professional services, consulting, IT development, and engineering design work. Minimum cover typically R1–5 million.",
      group: "insurance",
    })
  } else if (isConstruction(cat, ind) || isElectrical(cat, ind)) {
    items.push({
      id: "pi-insurance",
      label: "Professional Indemnity Insurance",
      status: "Recommended",
      helpText:
        "Professional indemnity insurance is recommended for engineering, design, and project management roles within construction or electrical contracts, particularly where the supplier employs registered professionals.",
      group: "insurance",
    })
  }

  if (isConstruction(cat, ind) || isMining(cat, ind)) {
    items.push({
      id: "contractors-all-risk",
      label: "Contractors All-Risk (CAR) Insurance",
      status: "Recommended",
      helpText:
        "CAR insurance covers physical loss or damage to the works, materials, and plant on-site. Typically required by the principal contractor and recommended for all subcontractors and suppliers engaged in construction or mining projects.",
      group: "insurance",
    })
  }

  // ── Industry-Specific ─────────────────────────────────────────────────────

  if (isConstruction(cat, ind) || isElectrical(cat, ind)) {
    items.push({
      id: "cidb",
      label: "CIDB Grading Certificate",
      status: "Required",
      helpText:
        "Construction Industry Development Board (CIDB) grading certificate confirms the supplier's registration in the cidb Register of Contractors. The grading must be appropriate to the contract value and works class (e.g., 3GB for general building ≤R1M, 5CE for civil engineering ≤R6.5M).",
      group: "industry",
    })
  } else if (isWater(cat, ind) || isMunicipal(cat, ind)) {
    items.push({
      id: "cidb",
      label: "CIDB Grading Certificate",
      status: "Recommended",
      helpText:
        "CIDB registration may be required for water infrastructure, pipeline installation, or civil engineering components of municipal contracts. Confirm the applicable works class and grading for the specific contract.",
      group: "industry",
    })
  }

  if (isMining(cat, ind)) {
    items.push({
      id: "mhsa",
      label: "MHSA Compliance Certificate / Section 54 Readiness",
      status: "Required",
      helpText:
        "Mine Health and Safety Act (MHSA) compliance documentation confirms the supplier has a health and safety management system appropriate for mine site access. Required for all contractors and service providers entering a mine or quarry.",
      group: "industry",
    })

    items.push({
      id: "dws-mining",
      label: "Environmental Authorisation or Approval",
      status: "Recommended",
      helpText:
        "Applicable where procurement involves environmental impact or resource extraction activities under the National Environmental Management Act (NEMA) or the Mineral and Petroleum Resources Development Act (MPRDA).",
      group: "industry",
    })
  }

  if (isIT(cat, ind)) {
    items.push({
      id: "popia",
      label: "POPIA Compliance Declaration",
      status: "Required",
      helpText:
        "A signed declaration confirming compliance with the Protection of Personal Information Act (POPIA), specifically the conditions for lawful processing of personal information. Required for IT systems, data management, and cloud service procurement.",
      group: "industry",
    })

    items.push({
      id: "iso27001",
      label: "ISO 27001 or Equivalent Information Security Certification",
      status: "Recommended",
      helpText:
        "ISO 27001 certification demonstrates a formal information security management system. Strongly recommended for IT infrastructure, cybersecurity, cloud hosting, and data processing contracts. Buyers may require it for sensitive public-sector data.",
      group: "industry",
    })
  }

  if (isProfessional(cat, ind)) {
    items.push({
      id: "professional-body",
      label: "Professional Body Registration Certificate",
      status: "Required",
      helpText:
        "Proof of registration with the relevant professional body (e.g., SAICA for accountants, LSSA for attorneys, ECSA for engineers, SACPCMP for project managers, SACSSP for social workers). Key professionals must be listed by name and registration number.",
      group: "industry",
    })

    items.push({
      id: "fidelity-guarantee",
      label: "Fidelity Guarantee / Fidelity Insurance",
      status: "Recommended",
      helpText:
        "Fidelity guarantee insurance covers losses arising from dishonest acts by employees. Recommended for financial, accounting, auditing, and cash-handling service contracts.",
      group: "industry",
    })
  }

  if (isWater(cat, ind)) {
    items.push({
      id: "dws",
      label: "DWS Registration or Water Use Authorisation",
      status: "Required",
      helpText:
        "Relevant Department of Water and Sanitation (DWS) registration, licence, or general authorisation for activities involving water infrastructure installation, abstraction, storage, or treatment.",
      group: "industry",
    })
  }

  if (isPPERelevant(cat, ind)) {
    items.push({
      id: "ppe-compliance",
      label: "SABS / SANS PPE Compliance Documentation",
      status: "Required",
      helpText:
        "Proof that PPE goods meet the applicable South African National Standards (SANS/SABS). Must include product test reports or certificates of conformity for each PPE item. Required for all public-sector PPE procurement.",
      group: "industry",
    })
  }

  // ── Health, Safety & Environment ──────────────────────────────────────────

  if (isSiteWork(cat, ind)) {
    items.push({
      id: "safety-file",
      label: "Health and Safety File",
      status: "Required",
      helpText:
        "A site-specific health and safety file compiled in accordance with the Occupational Health and Safety Act (OHSA) and the Construction Regulations 2014. Must include a risk assessment, method statements, safe work procedures, and the appointment of a competent safety officer.",
      group: "safety",
    })

    items.push({
      id: "ohs-plan",
      label: "OHS Management Plan",
      status: "Required",
      helpText:
        "A written Occupational Health and Safety (OHS) management plan addressing hazard identification, incident reporting procedures, emergency response, and subcontractor compliance oversight. Required before site access can be granted.",
      group: "safety",
    })
  } else if (isLabourIntensive(cat, ind)) {
    items.push({
      id: "ohs-plan",
      label: "OHS Management Plan",
      status: "Recommended",
      helpText:
        "A written OHS management plan demonstrating the supplier's approach to worker health, safety, and incident management. Required for any contract involving physical labour, equipment operation, or delivery logistics.",
      group: "safety",
    })
  }

  if (isMining(cat, ind)) {
    items.push({
      id: "risk-assessment",
      label: "Mine-Specific Risk Assessment and Baseline Assessment",
      status: "Required",
      helpText:
        "A mine-specific risk assessment and baseline risk assessment in accordance with the Mine Health and Safety Act. Must be updated for each new site and made available to mine management before work commences.",
      group: "safety",
    })
  }

  // ── Provincial ────────────────────────────────────────────────────────────

  if (prov === "western cape") {
    items.push({
      id: "prov-wc",
      label: "Western Cape Supplier Portal Registration",
      status: "Recommended",
      helpText:
        "Registration on the Western Cape Government Supplier Database is recommended for provincial government contracts. Managed through the Western Cape Supplier Portal at suppliers.westerncape.gov.za.",
      group: "provincial",
    })
  }

  if (prov === "gauteng") {
    items.push({
      id: "prov-gp",
      label: "Gauteng Enterprise Propeller (GEP) Registration",
      status: "Recommended",
      helpText:
        "Gauteng-based SMEs may register with GEP for access to provincial enterprise development programmes and procurement opportunities. Registration is free and supports B-BBEE compliance tracking.",
      group: "provincial",
    })
  }

  if (prov === "kwazulu-natal") {
    items.push({
      id: "prov-kzn",
      label: "KZN Treasury Supplier Registration",
      status: "Recommended",
      helpText:
        "Suppliers pursuing KwaZulu-Natal provincial government contracts are advised to register with the KZN Treasury supplier database in addition to the national CSD registration.",
      group: "provincial",
    })
  }

  return items
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function groupChecklist(
  items: ChecklistItem[]
): Array<{ group: ChecklistGroup; label: string; items: ChecklistItem[] }> {
  const map = new Map<ChecklistGroup, ChecklistItem[]>()
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, [])
    map.get(item.group)!.push(item)
  }
  const order: ChecklistGroup[] = [
    "identity",
    "financial",
    "labour",
    "insurance",
    "industry",
    "safety",
    "provincial",
  ]
  return order
    .filter((g) => map.has(g))
    .map((g) => ({
      group: g,
      label: GROUP_LABELS[g],
      items: map.get(g)!,
    }))
}

export function countByStatus(items: ChecklistItem[]) {
  return {
    required: items.filter((i) => i.status === "Required").length,
    recommended: items.filter((i) => i.status === "Recommended").length,
    notApplicable: items.filter((i) => i.status === "Not Applicable").length,
  }
}

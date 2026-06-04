import { supabase } from "./supabase"

export type DemoStoryType = "mining" | "municipality" | "supplier-onboarding"

export type DemoStoryResult = {
  table: string
  action: "insert" | "delete"
  count: number
  success: boolean
  message: string
}

type StoryConfig = {
  type: DemoStoryType
  name: string
  rfqId: number
  quoteIds: number[]
  province: string
  category: string
  buyerEmail: string
  rfqTitle: string
  rfqDescription: string
  budget: string
  awardSupplierId: string
  awardSupplierName: string
  poNumber: string
  contractNumber: string
  invoiceNumber: string
  paymentNumber: string
  alertType: string
}

export const DEMO_STORY_SQL = `
alter table profiles add column if not exists is_demo boolean default false;
alter table rfqs add column if not exists is_demo boolean default false;
alter table quotes add column if not exists is_demo boolean default false;
alter table purchase_orders add column if not exists is_demo boolean default false;
alter table contracts add column if not exists is_demo boolean default false;
alter table invoices add column if not exists is_demo boolean default false;
alter table payments add column if not exists is_demo boolean default false;
alter table audit_logs add column if not exists is_demo boolean default false;
alter table notifications add column if not exists is_demo boolean default false;
alter table whatsapp_alerts add column if not exists is_demo boolean default false;
alter table supplier_score_history add column if not exists is_demo boolean default false;
`

const DEMO_STORY_TABLES = [
  "payments",
  "invoices",
  "contracts",
  "purchase_orders",
  "quotes",
  "whatsapp_alerts",
  "notifications",
  "audit_logs",
  "supplier_score_history",
  "rfqs",
  "profiles",
]

const suppliers = [
  {
    id: "20000000-0000-4000-8000-000000000101",
    business_name: "Imbokodo Electrical Maintenance",
    industry: "Electrical",
    province: "Mpumalanga",
    email: "tenders@imbokodoelectrical.co.za",
    phone: "+27 13 555 0101",
    verification_status: "Verified",
    smart_score: 812,
    readiness_score: 91,
  },
  {
    id: "20000000-0000-4000-8000-000000000102",
    business_name: "Sisonke Industrial PPE",
    industry: "PPE",
    province: "Mpumalanga",
    email: "quotes@sisonkeindustrial.co.za",
    phone: "+27 13 555 0102",
    verification_status: "Verified",
    smart_score: 738,
    readiness_score: 84,
  },
  {
    id: "20000000-0000-4000-8000-000000000103",
    business_name: "Lowveld Freight Logistics",
    industry: "Logistics",
    province: "Mpumalanga",
    email: "operations@lowveldfreight.co.za",
    phone: "+27 13 555 0103",
    verification_status: "Verified",
    smart_score: 702,
    readiness_score: 80,
  },
]

const storyConfigs: Record<DemoStoryType, StoryConfig> = {
  mining: {
    type: "mining",
    name: "Mining Maintenance Demo Story",
    rfqId: 970001,
    quoteIds: [970101, 970102, 970103],
    province: "Mpumalanga",
    category: "Mining Maintenance",
    buyerEmail: "procurement@mpumalanga-mine.example",
    rfqTitle: "Mpumalanga Mine Conveyor and Electrical Maintenance",
    rfqDescription:
      "Preventative maintenance, emergency electrical repairs, PPE supply support and delivery logistics for a mining maintenance shutdown window in Mpumalanga.",
    budget: "R14 850 000",
    awardSupplierId: suppliers[0].id,
    awardSupplierName: suppliers[0].business_name,
    poNumber: "PO-2026-MINE-0001",
    contractNumber: "CNT-2026-MINE-0001",
    invoiceNumber: "INV-2026-MINE-0001",
    paymentNumber: "PAY-2026-MINE-0001",
    alertType: "PO Issued",
  },
  municipality: {
    type: "municipality",
    name: "Municipality Demo Story",
    rfqId: 970002,
    quoteIds: [970201, 970202, 970203],
    province: "Mpumalanga",
    category: "Municipal Infrastructure",
    buyerEmail: "supplychain@lowveld-municipality.example",
    rfqTitle: "Municipal Substation Safety Upgrade",
    rfqDescription:
      "Electrical upgrade, PPE provision and local logistics for a municipal substation maintenance programme.",
    budget: "R9 400 000",
    awardSupplierId: suppliers[0].id,
    awardSupplierName: suppliers[0].business_name,
    poNumber: "PO-2026-MUNI-0001",
    contractNumber: "CNT-2026-MUNI-0001",
    invoiceNumber: "INV-2026-MUNI-0001",
    paymentNumber: "PAY-2026-MUNI-0001",
    alertType: "Award Notice",
  },
  "supplier-onboarding": {
    type: "supplier-onboarding",
    name: "Supplier Onboarding Demo Story",
    rfqId: 970003,
    quoteIds: [970301, 970302, 970303],
    province: "Mpumalanga",
    category: "Supplier Development",
    buyerEmail: "supplierdevelopment@monate.example",
    rfqTitle: "Verified Supplier Onboarding and RFQ Readiness Pilot",
    rfqDescription:
      "Pilot onboarding story showing verified electrical, PPE and logistics suppliers moving from profile readiness to quote participation.",
    budget: "R2 750 000",
    awardSupplierId: suppliers[1].id,
    awardSupplierName: suppliers[1].business_name,
    poNumber: "PO-2026-SUP-0001",
    contractNumber: "CNT-2026-SUP-0001",
    invoiceNumber: "INV-2026-SUP-0001",
    paymentNumber: "PAY-2026-SUP-0001",
    alertType: "Compliance Reminder",
  },
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function storyResult(
  table: string,
  action: DemoStoryResult["action"],
  success: boolean,
  count: number,
  message: string
): DemoStoryResult {
  return { table, action, success, count, message }
}

function formatError(error: { message?: string; code?: string; details?: string | null; hint?: string | null }): string {
  return [
    error.message,
    error.code ? `Code: ${error.code}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ]
    .filter(Boolean)
    .join(" | ")
}

async function safeInsert(table: string, rows: Record<string, unknown>[]): Promise<DemoStoryResult> {
  if (!supabase) return storyResult(table, "insert", false, 0, "Supabase is not configured.")
  if (rows.length === 0) return storyResult(table, "insert", true, 0, "No rows to insert.")

  const { error } = await supabase.from(table).insert(rows)
  if (error) return storyResult(table, "insert", false, 0, formatError(error))

  return storyResult(table, "insert", true, rows.length, `Inserted ${rows.length} demo story record${rows.length === 1 ? "" : "s"}.`)
}

async function safeDelete(table: string): Promise<DemoStoryResult> {
  if (!supabase) return storyResult(table, "delete", false, 0, "Supabase is not configured.")

  const { count, error } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("is_demo", true)

  if (error) return storyResult(table, "delete", false, 0, formatError(error))

  return storyResult(table, "delete", true, count ?? 0, `Deleted ${count ?? 0} demo story record${count === 1 ? "" : "s"}.`)
}

function buildRows(config: StoryConfig): Record<string, Record<string, unknown>[]> {
  const awardedQuoteId = config.quoteIds[0]
  const purchaseOrderId = config.rfqId + 5000
  const contractId = config.rfqId + 6000
  const invoiceId = config.rfqId + 7000
  const paymentId = config.rfqId + 8000
  const totalAmount =
    config.type === "mining" ? 13875000 : config.type === "municipality" ? 8620000 : 1850000

  return {
    profiles: suppliers.map((supplier, index) => ({
      ...supplier,
      role: "supplier",
      csd_number: `MAAA-STORY-${String(index + 1).padStart(3, "0")}`,
      bbbee_level: index === 0 ? "Level 1" : index === 1 ? "Level 2" : "Level 4",
      tax_status: "Compliant",
      banking_verified: true,
      profile_complete: true,
      created_at: daysFromNow(-90 + index * 4),
      updated_at: daysFromNow(-3 + index),
      is_demo: true,
    })),
    rfqs: [
      {
        id: config.rfqId,
        title: config.rfqTitle,
        description: config.rfqDescription,
        category: config.category,
        province: config.province,
        budget: config.budget,
        deadline: daysFromNow(14),
        status: "Awarded",
        created_by: null,
        created_at: daysFromNow(-28),
        is_demo: true,
      },
    ],
    quotes: suppliers.map((supplier, index) => ({
      id: config.quoteIds[index],
      rfq_id: config.rfqId,
      supplier_id: supplier.id,
      supplier_name: supplier.business_name,
      amount:
        index === 0
          ? totalAmount
          : index === 1
            ? Math.round(totalAmount * 0.93)
            : Math.round(totalAmount * 1.08),
      timeline: index === 0 ? "45 days" : index === 1 ? "30 days" : "60 days",
      status: index === 0 ? "Awarded" : "Submitted",
      scope:
        index === 0
          ? "Electrical maintenance lead package with coordinated PPE and logistics support."
          : `${supplier.industry} support package for the demo story.`,
      supporting_notes: "Demo story quote submission for guided stakeholder presentation.",
      created_at: daysFromNow(-21 + index),
      is_demo: true,
    })),
    purchase_orders: [
      {
        id: purchaseOrderId,
        po_number: config.poNumber,
        rfq_id: config.rfqId,
        quote_id: awardedQuoteId,
        supplier_id: config.awardSupplierId,
        supplier_name: config.awardSupplierName,
        amount: totalAmount,
        title: config.rfqTitle,
        timeline: "45 days",
        status: "Accepted",
        issue_date: daysFromNow(-15),
        delivery_date: daysFromNow(30),
        generated_at: daysFromNow(-15),
        notes: "Demo story purchase order generated from awarded RFQ quote.",
        is_demo: true,
      },
    ],
    contracts: [
      {
        id: contractId,
        contract_number: config.contractNumber,
        supplier_id: config.awardSupplierId,
        supplier_name: config.awardSupplierName,
        rfq_id: config.rfqId,
        purchase_order_id: purchaseOrderId,
        contract_value: totalAmount,
        start_date: daysFromNow(-12),
        end_date: daysFromNow(180),
        renewal_date: daysFromNow(150),
        status: "Active",
        notes: "Demo story contract for procurement-to-payment walkthrough.",
        is_demo: true,
      },
    ],
    invoices: [
      {
        id: invoiceId,
        invoice_number: config.invoiceNumber,
        supplier_id: config.awardSupplierId,
        supplier_name: config.awardSupplierName,
        contract_id: contractId,
        purchase_order_id: purchaseOrderId,
        rfq_id: config.rfqId,
        amount: totalAmount,
        vat_amount: 0,
        total_amount: totalAmount,
        due_date: daysFromNow(14),
        status: "Approved",
        notes: "Demo story invoice approved for payment tracking.",
        is_demo: true,
      },
    ],
    payments: [
      {
        id: paymentId,
        payment_number: config.paymentNumber,
        invoice_id: invoiceId,
        supplier_id: config.awardSupplierId,
        supplier_name: config.awardSupplierName,
        amount: totalAmount,
        payment_method: "EFT",
        reference_number: `DEMO-${config.type.toUpperCase()}-EFT-001`,
        payment_date: daysFromNow(5),
        status: "Processing",
        notes: "Demo story payment record linked to approved invoice.",
        is_demo: true,
      },
    ],
    audit_logs: [
      {
        user_id: null,
        user_email: config.buyerEmail,
        action: "rfq.created",
        entity_type: "rfq",
        entity_id: String(config.rfqId),
        old_values: null,
        new_values: { title: config.rfqTitle, status: "Open" },
        metadata: { story: config.name, province: config.province },
        created_at: daysFromNow(-28),
        is_demo: true,
      },
      {
        user_id: null,
        user_email: config.buyerEmail,
        action: "quote.awarded",
        entity_type: "quote",
        entity_id: String(awardedQuoteId),
        old_values: { status: "Submitted" },
        new_values: { status: "Awarded", supplier_name: config.awardSupplierName },
        metadata: { story: config.name, recommendation: "Best verified supplier fit" },
        created_at: daysFromNow(-16),
        is_demo: true,
      },
      {
        user_id: null,
        user_email: "finance@monate.example",
        action: "payment.generated",
        entity_type: "payment",
        entity_id: String(paymentId),
        old_values: null,
        new_values: { status: "Processing", amount: totalAmount },
        metadata: { story: config.name, invoice_number: config.invoiceNumber },
        created_at: daysFromNow(-2),
        is_demo: true,
      },
    ],
    notifications: [
      {
        user_id: config.awardSupplierId,
        title: `${config.name}: purchase order issued`,
        message: `${config.poNumber} has been issued to ${config.awardSupplierName}.`,
        type: "procurement",
        status: "unread",
        created_at: daysFromNow(-14),
        is_demo: true,
      },
      {
        user_id: null,
        title: `${config.name}: award recommendation ready`,
        message: `${config.awardSupplierName} is recommended for award on ${config.rfqTitle}.`,
        type: "award",
        status: "unread",
        created_at: daysFromNow(-17),
        is_demo: true,
      },
    ],
    whatsapp_alerts: [
      {
        supplier_id: config.awardSupplierId,
        supplier_name: config.awardSupplierName,
        phone: suppliers.find((supplier) => supplier.id === config.awardSupplierId)?.phone ?? null,
        alert_type: config.alertType,
        message: `Demo alert: ${config.poNumber} is ready for ${config.awardSupplierName}. Please review the procurement record in Monate Connect.`,
        whatsapp_link: `https://wa.me/27135550101?text=${encodeURIComponent(`Demo alert: ${config.poNumber} is ready for review.`)}`,
        status: "Draft",
        created_at: daysFromNow(-14),
        metadata: { story: config.name, rfq_id: config.rfqId },
        is_demo: true,
      },
    ],
    supplier_score_history: [
      {
        supplier_id: config.awardSupplierId,
        score: 835,
        smart_score: 835,
        previous_score: 792,
        level: "Trusted Supplier",
        risk_level: "Low",
        trend: "+43 this month",
        reason: "Awarded quote, accepted purchase order, active contract and approved invoice improved procurement reputation.",
        created_at: daysFromNow(-1),
        is_demo: true,
      },
    ],
  }
}

export async function clearDemoStoryData(): Promise<DemoStoryResult[]> {
  const results: DemoStoryResult[] = []
  for (const table of DEMO_STORY_TABLES) {
    results.push(await safeDelete(table))
  }
  return results
}

export async function loadDemoStory(type: DemoStoryType): Promise<DemoStoryResult[]> {
  const config = storyConfigs[type]
  const rowsByTable = buildRows(config)
  const results: DemoStoryResult[] = []

  const cleared = await clearDemoStoryData()
  results.push(...cleared)

  for (const table of [
    "profiles",
    "rfqs",
    "quotes",
    "purchase_orders",
    "contracts",
    "invoices",
    "payments",
    "audit_logs",
    "notifications",
    "whatsapp_alerts",
    "supplier_score_history",
  ]) {
    results.push(await safeInsert(table, rowsByTable[table] ?? []))
  }

  return results
}

export function getDemoStorySummary(results: DemoStoryResult[]) {
  return {
    inserted: results.filter((item) => item.action === "insert" && item.success).reduce((sum, item) => sum + item.count, 0),
    deleted: results.filter((item) => item.action === "delete" && item.success).reduce((sum, item) => sum + item.count, 0),
    failures: results.filter((item) => !item.success).length,
  }
}

export function getDemoStoryConfig(type: DemoStoryType): StoryConfig {
  return storyConfigs[type]
}

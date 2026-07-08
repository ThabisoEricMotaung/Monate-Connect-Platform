import { supabase } from "./supabase"

export type DemoSeedResult = {
  table: string
  action: "insert" | "delete"
  count: number
  success: boolean
  message: string
}

type DemoSupplier = {
  id: string
  business_name: string
  industry: string
  province: string
  email: string
  phone: string
  verification_status: string
}

type DemoRfq = {
  id: number
  title: string
  category: string
  province: string
  budget: string
  status: string
}

type DemoQuote = {
  id: number
  rfq_id: number
  supplier_id: string
  supplier_name: string
  amount: string
  status: string
}

export const DEMO_MODE_SQL = `
alter table profiles add column if not exists is_demo boolean default false;
alter table rfqs add column if not exists is_demo boolean default false;
alter table quotes add column if not exists is_demo boolean default false;
alter table purchase_orders add column if not exists is_demo boolean default false;
alter table contracts add column if not exists is_demo boolean default false;
alter table invoices add column if not exists is_demo boolean default false;
alter table payments add column if not exists is_demo boolean default false;
alter table messages add column if not exists is_demo boolean default false;
alter table rfq_questions add column if not exists is_demo boolean default false;
alter table supplier_bank_details add column if not exists is_demo boolean default false;
alter table audit_logs add column if not exists is_demo boolean default false;
alter table supplier_score_history add column if not exists is_demo boolean default false;
`

const DEMO_TABLES = [
  "payments",
  "invoices",
  "contracts",
  "purchase_orders",
  "quotes",
  "rfq_questions",
  "messages",
  "supplier_bank_details",
  "supplier_score_history",
  "audit_logs",
  "rfqs",
  "profiles",
]

const provinces = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
]

const suppliers: DemoSupplier[] = [
  {
    id: "10000000-0000-4000-8000-000000000101",
    business_name: "Kgosi Mining Services",
    industry: "Mining Services",
    province: "North West",
    email: "tenders@kgosimining.co.za",
    phone: "+27 14 555 0181",
    verification_status: "Verified",
  },
  {
    id: "10000000-0000-4000-8000-000000000102",
    business_name: "Metsi Electrical Works",
    industry: "Electrical",
    province: "Gauteng",
    email: "biddesk@metsielectrical.co.za",
    phone: "+27 11 555 0142",
    verification_status: "Under Review",
  },
  {
    id: "10000000-0000-4000-8000-000000000103",
    business_name: "Ubuntu Civils & Construction",
    industry: "Construction",
    province: "KwaZulu-Natal",
    email: "rfq@ubuntucivils.co.za",
    phone: "+27 31 555 0120",
    verification_status: "Verified",
  },
  {
    id: "10000000-0000-4000-8000-000000000104",
    business_name: "Cape Freight Logistics",
    industry: "Logistics",
    province: "Western Cape",
    email: "operations@capefreight.co.za",
    phone: "+27 21 555 0188",
    verification_status: "Pending Review",
  },
  {
    id: "10000000-0000-4000-8000-000000000105",
    business_name: "Sisonke PPE Supplies",
    industry: "PPE",
    province: "Eastern Cape",
    email: "hello@aiformprocure.co.za",
    phone: "+27 43 555 0157",
    verification_status: "Verified",
  },
  {
    id: "10000000-0000-4000-8000-000000000106",
    business_name: "Thari Cleaning Group",
    industry: "Cleaning",
    province: "Free State",
    email: "admin@tharicleaning.co.za",
    phone: "+27 51 555 0163",
    verification_status: "Rejected",
  },
  {
    id: "10000000-0000-4000-8000-000000000107",
    business_name: "AgriLink Cooperative",
    industry: "Agriculture",
    province: "Limpopo",
    email: "supply@agrilink.co.za",
    phone: "+27 15 555 0109",
    verification_status: "Verified",
  },
  {
    id: "10000000-0000-4000-8000-000000000108",
    business_name: "Jozi Cloud ICT",
    industry: "ICT",
    province: "Gauteng",
    email: "projects@jozicloud.co.za",
    phone: "+27 10 555 0133",
    verification_status: "Under Review",
  },
  {
    id: "10000000-0000-4000-8000-000000000109",
    business_name: "AquaSure Water Services",
    industry: "Water Services",
    province: "Mpumalanga",
    email: "bids@aquasure.co.za",
    phone: "+27 13 555 0114",
    verification_status: "Verified",
  },
]

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function result(
  table: string,
  action: DemoSeedResult["action"],
  success: boolean,
  count: number,
  message: string
): DemoSeedResult {
  return { table, action, success, count, message }
}

function errorMessage(error: { message?: string; code?: string; details?: string | null; hint?: string | null }): string {
  return [
    error.message,
    error.code ? `Code: ${error.code}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ].filter(Boolean).join(" | ")
}

async function insertRows(table: string, rows: Record<string, unknown>[]): Promise<DemoSeedResult> {
  if (!supabase) return result(table, "insert", false, 0, "Supabase is not configured.")
  if (rows.length === 0) return result(table, "insert", true, 0, "No rows to insert.")

  const { error } = await supabase.from(table).insert(rows)
  if (error) return result(table, "insert", false, 0, errorMessage(error))

  return result(table, "insert", true, rows.length, `Inserted ${rows.length} demo record${rows.length === 1 ? "" : "s"}.`)
}

async function deleteDemoRows(table: string): Promise<DemoSeedResult> {
  if (!supabase) return result(table, "delete", false, 0, "Supabase is not configured.")

  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("is_demo", true)

  if (error) return result(table, "delete", false, 0, errorMessage(error))

  return result(table, "delete", true, count ?? 0, `Deleted ${count ?? 0} demo record${count === 1 ? "" : "s"}.`)
}

function buildRfqs(): DemoRfq[] {
  return [
    { id: 910001, title: "Underground Mining Safety Support Services", category: "Mining Services", province: "North West", budget: "R8 500 000", status: "open" },
    { id: 910002, title: "Municipal Substation Refurbishment", category: "Electrical", province: "Gauteng", budget: "R12 000 000", status: "open" },
    { id: 910003, title: "Clinic Extension and Civil Works", category: "Construction", province: "KwaZulu-Natal", budget: "R18 750 000", status: "awarded" },
    { id: 910004, title: "Provincial PPE Supply Framework", category: "PPE", province: "Eastern Cape", budget: "R4 200 000", status: "awarded" },
    { id: 910005, title: "Water Treatment Plant Maintenance", category: "Water Services", province: "Mpumalanga", budget: "R9 800 000", status: "open" },
    { id: 910006, title: "Cloud Migration and End User Support", category: "ICT", province: "Gauteng", budget: "R6 600 000", status: "closed" },
  ]
}

function buildQuotes(rfqs: DemoRfq[]): DemoQuote[] {
  return [
    { id: 920001, rfq_id: rfqs[0].id, supplier_id: suppliers[0].id, supplier_name: suppliers[0].business_name, amount: "R8 125 000", status: "Submitted" },
    { id: 920002, rfq_id: rfqs[0].id, supplier_id: suppliers[2].id, supplier_name: suppliers[2].business_name, amount: "R8 940 000", status: "Under Review" },
    { id: 920003, rfq_id: rfqs[1].id, supplier_id: suppliers[1].id, supplier_name: suppliers[1].business_name, amount: "R11 860 000", status: "Submitted" },
    { id: 920004, rfq_id: rfqs[1].id, supplier_id: suppliers[7].id, supplier_name: suppliers[7].business_name, amount: "R12 420 000", status: "Submitted" },
    { id: 920005, rfq_id: rfqs[2].id, supplier_id: suppliers[2].id, supplier_name: suppliers[2].business_name, amount: "R18 100 000", status: "Awarded" },
    { id: 920006, rfq_id: rfqs[2].id, supplier_id: suppliers[3].id, supplier_name: suppliers[3].business_name, amount: "R19 300 000", status: "Not Awarded" },
    { id: 920007, rfq_id: rfqs[3].id, supplier_id: suppliers[4].id, supplier_name: suppliers[4].business_name, amount: "R4 050 000", status: "Awarded" },
    { id: 920008, rfq_id: rfqs[3].id, supplier_id: suppliers[5].id, supplier_name: suppliers[5].business_name, amount: "R3 980 000", status: "Rejected" },
    { id: 920009, rfq_id: rfqs[4].id, supplier_id: suppliers[8].id, supplier_name: suppliers[8].business_name, amount: "R9 550 000", status: "Submitted" },
    { id: 920010, rfq_id: rfqs[5].id, supplier_id: suppliers[7].id, supplier_name: suppliers[7].business_name, amount: "R6 250 000", status: "Awarded" },
  ]
}

export async function clearDemoData(): Promise<DemoSeedResult[]> {
  const results: DemoSeedResult[] = []
  for (const table of DEMO_TABLES) {
    results.push(await deleteDemoRows(table))
  }
  return results
}

export async function generateDemoData(): Promise<DemoSeedResult[]> {
  const rfqs = buildRfqs()
  const quotes = buildQuotes(rfqs)
  const awardedQuotes = quotes.filter((quote) => quote.status === "Awarded")

  const purchaseOrders = awardedQuotes.map((quote, index) => ({
    po_number: `PO-${new Date().getFullYear()}-D${String(index + 1).padStart(3, "0")}`,
    rfq_id: quote.rfq_id,
    quote_id: quote.id,
    supplier_id: quote.supplier_id,
    supplier_name: quote.supplier_name,
    amount: quote.amount,
    timeline: index === 0 ? "90 days" : "45 days",
    title: rfqs.find((rfq) => rfq.id === quote.rfq_id)?.title ?? "Demo procurement award",
    status: index === 0 ? "Completed" : "Accepted",
    generated_at: addDays(-30 + index * 8),
    notes: "Demo purchase order generated for presentation environment.",
    is_demo: true,
  }))

  const contracts = purchaseOrders.map((po, index) => ({
    contract_number: `CNT-${new Date().getFullYear()}-D${String(index + 1).padStart(3, "0")}`,
    supplier_id: po.supplier_id,
    supplier_name: po.supplier_name,
    rfq_id: po.rfq_id,
    purchase_order_id: null,
    contract_value: po.amount,
    start_date: addDays(-20 + index * 4),
    end_date: addDays(180 + index * 30),
    renewal_date: addDays(150 + index * 30),
    status: index === 0 ? "Completed" : "Active",
    notes: "Demo contract record for executive reporting.",
    is_demo: true,
  }))

  const invoices = contracts.map((contract, index) => ({
    invoice_number: `INV-${new Date().getFullYear()}-D${String(index + 1).padStart(3, "0")}`,
    supplier_id: contract.supplier_id,
    supplier_name: contract.supplier_name,
    contract_id: null,
    purchase_order_id: null,
    rfq_id: contract.rfq_id,
    amount: index === 0 ? 18100000 : index === 1 ? 4050000 : 6250000,
    vat_amount: 0,
    total_amount: index === 0 ? 18100000 : index === 1 ? 4050000 : 6250000,
    due_date: addDays(14 + index * 7),
    status: index === 0 ? "Paid" : index === 1 ? "Approved" : "Under Review",
    notes: "Demo supplier invoice.",
    is_demo: true,
  }))

  const payments = invoices.filter((invoice) => invoice.status === "Paid" || invoice.status === "Approved").map((invoice, index) => ({
    payment_number: `PAY-${new Date().getFullYear()}-D${String(index + 1).padStart(3, "0")}`,
    invoice_id: null,
    supplier_id: invoice.supplier_id,
    supplier_name: invoice.supplier_name,
    amount: invoice.total_amount,
    payment_method: "EFT",
    reference_number: `MND-DEMO-${String(index + 1).padStart(4, "0")}`,
    payment_date: index === 0 ? addDays(-2) : addDays(10),
    status: index === 0 ? "Paid" : "Processing",
    notes: "Demo payment tracking record.",
    is_demo: true,
  }))

  const rowsByTable: Record<string, Record<string, unknown>[]> = {
    profiles: suppliers.map((supplier, index) => ({
      ...supplier,
      role: "supplier",
      csd_number: `MAAA${String(100000 + index)}`,
      bbbee_level: index % 3 === 0 ? "Level 1" : index % 3 === 1 ? "Level 2" : "Level 4",
      tax_status: supplier.verification_status === "Rejected" ? "Non-compliant" : "Compliant",
      created_at: addDays(-120 + index * 6),
      updated_at: addDays(-10 + index),
      is_demo: true,
    })),
    rfqs: rfqs.map((rfq, index) => {
      const closingDate = addDays(10 + index * 4)
      return {
        ...rfq,
        description: `Demo RFQ for ${rfq.category.toLowerCase()} procurement in ${rfq.province}.`,
        deadline: closingDate,
        closing_date: closingDate,
        created_at: addDays(-45 + index * 5),
        is_demo: true,
      }
    }),
    quotes: quotes.map((quote, index) => ({
      ...quote,
      timeline: index % 2 === 0 ? "45 days" : "60 days",
      scope: "Demo quote scope aligned to the RFQ specification.",
      supporting_notes: "Generated for AiForm Procure demo mode.",
      created_at: addDays(-35 + index * 3),
      is_demo: true,
    })),
    purchase_orders: purchaseOrders,
    contracts,
    invoices,
    payments,
    messages: suppliers.slice(0, 5).map((supplier, index) => ({
      sender_id: supplier.id,
      receiver_id: suppliers[(index + 1) % suppliers.length].id,
      rfq_id: rfqs[index % rfqs.length].id,
      quote_id: quotes[index % quotes.length].id,
      subject: "Demo procurement follow-up",
      message: `Demo message regarding ${rfqs[index % rfqs.length].title}.`,
      is_read: index % 2 === 0,
      created_at: addDays(-8 + index),
      is_demo: true,
    })),
    rfq_questions: rfqs.slice(0, 5).map((rfq, index) => ({
      rfq_id: rfq.id,
      supplier_id: suppliers[index].id,
      supplier_name: suppliers[index].business_name,
      question: `Please confirm site briefing requirements for ${rfq.title}.`,
      response: index % 2 === 0 ? "Site briefing details will be shared through the RFQ notice." : null,
      status: index % 2 === 0 ? "Answered" : "Pending Review",
      created_at: addDays(-12 + index),
      is_demo: true,
    })),
    supplier_bank_details: suppliers.filter((supplier) => supplier.verification_status !== "Rejected").map((supplier, index) => ({
      supplier_id: supplier.id,
      bank_name: ["Absa", "Standard Bank", "FNB", "Nedbank", "Capitec"][index % 5],
      account_holder: supplier.business_name,
      account_number: `62${String(10000000 + index * 731)}`,
      branch_code: ["632005", "051001", "250655", "198765", "470010"][index % 5],
      verification_status: index % 4 === 0 ? "Under Review" : "Verified",
      created_at: addDays(-80 + index * 5),
      is_demo: true,
    })),
    audit_logs: [
      { action: "rfq.created", entity_type: "rfq", entity_id: rfqs[0].id, user_email: "demo.admin@monate.local", metadata: { demo: true }, created_at: addDays(-45), is_demo: true },
      { action: "quote.awarded", entity_type: "quote", entity_id: awardedQuotes[0]?.id, user_email: "demo.buyer@monate.local", metadata: { demo: true }, created_at: addDays(-21), is_demo: true },
      { action: "payment.status_updated", entity_type: "payment", entity_id: "demo-payment", user_email: "demo.finance@monate.local", metadata: { status: "Paid", demo: true }, created_at: addDays(-2), is_demo: true },
    ],
    supplier_score_history: suppliers.map((supplier, index) => ({
      supplier_id: supplier.id,
      score: 520 + index * 47,
      smart_score: 520 + index * 47,
      level: index > 6 ? "Elite Supplier" : index > 3 ? "Trusted Supplier" : "Reliable Supplier",
      risk_level: index === 5 ? "High" : index < 3 ? "Low" : "Medium",
      created_at: addDays(-20 + index),
      is_demo: true,
    })),
  }

  const results: DemoSeedResult[] = []
  for (const table of [
    "profiles",
    "rfqs",
    "quotes",
    "purchase_orders",
    "contracts",
    "invoices",
    "payments",
    "messages",
    "rfq_questions",
    "supplier_bank_details",
    "audit_logs",
    "supplier_score_history",
  ]) {
    results.push(await insertRows(table, rowsByTable[table] ?? []))
  }

  return results
}

export async function resetDemoEnvironment(): Promise<DemoSeedResult[]> {
  const cleared = await clearDemoData()
  const generated = await generateDemoData()
  return [...cleared, ...generated]
}

export function getDemoSeedSummary(results: DemoSeedResult[]): {
  inserted: number
  deleted: number
  failures: number
} {
  return {
    inserted: results.filter((item) => item.action === "insert" && item.success).reduce((sum, item) => sum + item.count, 0),
    deleted: results.filter((item) => item.action === "delete" && item.success).reduce((sum, item) => sum + item.count, 0),
    failures: results.filter((item) => !item.success).length,
  }
}

export { provinces as SOUTH_AFRICAN_PROVINCES }

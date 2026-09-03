import { supabase } from "@/lib/supabase"
import { generateComplianceChecklist, type ChecklistItem } from "@/lib/complianceChecklist"

export interface RfqContext {
  id: number
  title: string
  description: string | null
  buyerOrg: string | null
  category: string | null
  province: string | null
  status: string | null
  closingDate: string | null
  publishedDate: string | null
  estimatedBudget: number | null
  budgetMin: number | null
  budgetMax: number | null
  complianceChecklist: ChecklistItem[]
}

interface RfqRow {
  id: number
  title: string | null
  description: string | null
  buyer_org: string | null
  category: string | null
  province: string | null
  status: string | null
  closing_date: string | null
  published_date: string | null
  estimated_budget: number | null
  estimated_value_min: number | null
  estimated_value_max: number | null
}

const RFQ_CONTEXT_COLUMNS =
  "id, title, description, buyer_org, category, province, status, closing_date, published_date, estimated_budget, estimated_value_min, estimated_value_max"

export async function fetchRfqContext(rfqId: number): Promise<RfqContext | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from("rfqs")
    .select(RFQ_CONTEXT_COLUMNS)
    .eq("id", rfqId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.warn("Failed to load RFQ context:", error.message)
    return null
  }

  const row = data as unknown as RfqRow

  return {
    id: row.id,
    title: row.title || `RFQ #${row.id}`,
    description: row.description,
    buyerOrg: row.buyer_org,
    category: row.category,
    province: row.province,
    status: row.status,
    closingDate: row.closing_date,
    publishedDate: row.published_date,
    estimatedBudget: row.estimated_budget,
    budgetMin: row.estimated_value_min,
    budgetMax: row.estimated_value_max,
    complianceChecklist: generateComplianceChecklist({ category: row.category, province: row.province }),
  }
}

export function formatBudget(context: Pick<RfqContext, "estimatedBudget" | "budgetMin" | "budgetMax">): string {
  const fmt = (value: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value)

  // Source data uses 0 as a "not captured" sentinel alongside real nulls, so
  // treat both the same way rather than reporting a misleading "R0" budget.
  const { estimatedBudget, budgetMin, budgetMax } = context
  if (estimatedBudget) return fmt(estimatedBudget)
  if (budgetMin && budgetMax) return `${fmt(budgetMin)} – ${fmt(budgetMax)}`
  if (budgetMax) return `Up to ${fmt(budgetMax)}`
  return "Not specified by the buyer"
}

export function formatClosingDate(closingDate: string | null): string {
  if (!closingDate) return "No deadline set"
  const date = new Date(closingDate)
  if (Number.isNaN(date.getTime())) return "No deadline set"
  return date.toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })
}

/**
 * Renders the RFQ into a text block for the AI system prompt, so answers are
 * grounded in this specific RFQ instead of generic procurement advice.
 */
export function buildRfqSystemPromptContext(context: RfqContext): string {
  const required = context.complianceChecklist.filter((item) => item.status === "Required").map((item) => item.label)
  const recommended = context.complianceChecklist.filter((item) => item.status === "Recommended").map((item) => item.label)

  return [
    "Answer using ONLY the RFQ facts below — never invent a budget, deadline, or requirement that isn't listed here. If something isn't covered, say the buyer hasn't specified it.",
    "",
    `RFQ #${context.id}: ${context.title}`,
    context.buyerOrg ? `Buyer: ${context.buyerOrg}` : null,
    context.category ? `Category: ${context.category}` : null,
    context.province ? `Province: ${context.province}` : null,
    `Status: ${context.status || "unknown"}`,
    `Closing date: ${formatClosingDate(context.closingDate)}`,
    `Budget: ${formatBudget(context)}`,
    context.description ? `Scope / description: ${context.description}` : null,
    required.length ? `Required compliance documents: ${required.join(", ")}` : null,
    recommended.length ? `Recommended compliance documents: ${recommended.join(", ")}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
}

export interface RfqSearchSection {
  id: string
  heading: string
  content: string
}

/** Builds the searchable index behind the workspace's "Search RFQ requirements, docs, FAQs" box. */
export function buildRfqSearchIndex(context: RfqContext): RfqSearchSection[] {
  const sections: RfqSearchSection[] = [
    {
      id: "scope",
      heading: "RFQ scope",
      content: context.description || "No scope description has been provided by the buyer yet.",
    },
    {
      id: "budget",
      heading: "Budget",
      content: `Estimated budget: ${formatBudget(context)}.`,
    },
    {
      id: "deadline",
      heading: "Closing date",
      content: `Quotes close on ${formatClosingDate(context.closingDate)}.`,
    },
    {
      id: "category",
      heading: "Category & province",
      content: `Category: ${context.category || "Not specified"}. Province: ${context.province || "Not specified"}.`,
    },
  ]

  for (const item of context.complianceChecklist) {
    sections.push({
      id: `compliance-${item.id}`,
      heading: `Compliance: ${item.label}`,
      content: `${item.status}. ${item.helpText}`,
    })
  }

  return sections
}

export function searchRfqSections(sections: RfqSearchSection[], query: string): RfqSearchSection[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return sections.filter(
    (section) => section.heading.toLowerCase().includes(normalized) || section.content.toLowerCase().includes(normalized),
  )
}

import { generateComplianceChecklist } from "@/lib/complianceChecklist"
import { isDateOnlyDeadline, SOUTH_AFRICA_TIME_ZONE } from "@/lib/southAfricaTime"
import { resolveTenderDisplayTitle } from "@/lib/tenderDisplayTitle"
import { rfqAccessReason, type RfqAccessReason, type RfqAccessRow, type ThusoViewer } from "./access"

/** The only context a browser may ask for: a record ID, never its contents. */
export type ThusoContextRequest = { type: "rfq"; id: number }

export type ThusoRfqContext = {
  id: number
  title: string
  access: RfqAccessReason
  facts: Array<[label: string, value: string]>
  scope: string | null
  requiredDocuments: string[]
  recommendedDocuments: string[]
}

export type ContextLoadResult =
  | { status: "ok"; context: ThusoRfqContext }
  | { status: "unavailable" }
  | { status: "error" }

type RfqRow = RfqAccessRow & {
  id: number
  title?: string | null
  description?: string | null
  buyer_org?: string | null
  buyer_name?: string | null
  category?: string | null
  industry?: string | null
  province?: string | null
  status?: string | null
  closing_date?: string | null
  estimated_budget?: number | null
  estimated_value_min?: number | null
  estimated_value_max?: number | null
  external_reference?: string | null
  reference_number?: string | null
  source_name?: string | null
  original_source_url?: string | null
}

/** The one query this module runs; a Supabase client satisfies it. */
export type RfqReader = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>
      }
    }
  }
}

const MAX_SCOPE_CHARS = 3000

export function parseContextRequest(value: unknown): ThusoContextRequest | null | "invalid" {
  if (value === undefined || value === null) return null
  if (typeof value !== "object") return "invalid"
  const { type, id } = value as { type?: unknown; id?: unknown }
  if (type !== "rfq") return "invalid"
  const numericId = typeof id === "string" && /^\d+$/.test(id) ? Number(id) : id
  if (typeof numericId !== "number" || !Number.isSafeInteger(numericId) || numericId <= 0) return "invalid"
  return { type: "rfq", id: numericId }
}

/**
 * Loads one RFQ for the viewer. Records that do not exist and records the
 * viewer may not see both return "unavailable", so an ID cannot be probed.
 * `select("*")` keeps optional ownership columns (buyer_user_id) from
 * breaking the query on databases that lack them.
 */
export async function loadRfqContext(client: RfqReader, viewer: ThusoViewer, id: number): Promise<ContextLoadResult> {
  const { data, error } = await client.from("rfqs").select("*").eq("id", id).maybeSingle()
  if (error) {
    console.error("[thuso] RFQ context lookup failed", { id, error })
    return { status: "error" }
  }
  if (!data) return { status: "unavailable" }

  const row = data as RfqRow
  const access = rfqAccessReason(viewer, row)
  if (!access) return { status: "unavailable" }

  return { status: "ok", context: toContext(row, access) }
}

export function formatClosing(value: string | null | undefined): string {
  if (!value) return "Not provided by the source"
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return "Not provided by the source"
  const options: Intl.DateTimeFormatOptions = { timeZone: SOUTH_AFRICA_TIME_ZONE, day: "numeric", month: "long", year: "numeric" }
  const date = instant.toLocaleDateString("en-ZA", options)
  if (isDateOnlyDeadline(instant)) return `${date} (closing time not provided)`
  const time = instant.toLocaleTimeString("en-ZA", { timeZone: SOUTH_AFRICA_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false })
  return `${date}, ${time} SAST`
}

// The source data uses 0 as a "not captured" sentinel alongside nulls.
export function formatBudget(row: Pick<RfqRow, "estimated_budget" | "estimated_value_min" | "estimated_value_max">): string {
  const fmt = (value: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value)
  const { estimated_budget: budget, estimated_value_min: min, estimated_value_max: max } = row
  if (budget) return fmt(budget)
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (max) return `Up to ${fmt(max)}`
  return "Not specified"
}

function toContext(row: RfqRow, access: RfqAccessReason): ThusoRfqContext {
  const reference = row.external_reference || row.reference_number || null
  const { displayTitle, scope } = resolveTenderDisplayTitle({
    title: row.title,
    description: row.description,
    reference,
    sourceName: row.source_name,
  })
  const title = displayTitle || row.title?.trim() || (reference ? `Tender ${reference}` : `RFQ #${row.id}`)
  const checklist = generateComplianceChecklist({ category: row.category, province: row.province, industry: row.industry })

  const facts: Array<[string, string]> = []
  const add = (label: string, value: string | null | undefined) => {
    if (value && value.trim()) facts.push([label, value.trim()])
  }
  add("Reference", reference)
  add("Issuing organisation", row.buyer_org || row.buyer_name)
  add("Category", row.category || row.industry)
  add("Province", row.province)
  add("Status", row.status)
  add("Closing date", formatClosing(row.closing_date))
  add("Budget", formatBudget(row))
  add("Source", row.source_name)
  add("Source link", row.original_source_url)

  const scopeText = (scope ?? row.description ?? "").trim()
  return {
    id: row.id,
    title,
    access,
    facts,
    scope: scopeText ? scopeText.slice(0, MAX_SCOPE_CHARS) : null,
    requiredDocuments: checklist.filter((item) => item.status === "Required").map((item) => item.label),
    recommendedDocuments: checklist.filter((item) => item.status === "Recommended").map((item) => item.label),
  }
}

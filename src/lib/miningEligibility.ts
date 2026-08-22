import type { SupabaseClient } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import type {
  Json,
  MiningComplianceDocument,
  MiningEligibilityGap,
  MiningEligibilityRules,
  MiningEligibilityResult,
  MiningHostCommunityLink,
  MiningOpportunity,
  MiningQualificationStatus,
  MiningSupplierProfile,
} from "@/types/mining"

type EligibilityInputs = {
  rules: MiningEligibilityRules
  mineOperationId: string | null
  profile: MiningSupplierProfile | null
  documents: MiningComplianceDocument[]
  hostCommunityLinks: MiningHostCommunityLink[]
  now?: Date
}

type EligibilityEvaluation = Pick<
  MiningEligibilityResult,
  "match_percentage" | "qualification_status" | "gaps"
>

const KNOWN_RULES = new Set([
  "province",
  "requires_host_community",
  "min_black_ownership_pct",
  "min_bbee_level",
  "required_documents",
  "min_cidb_grade",
  "required_certifications",
  "min_mining_references",
])

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function numeric(value: unknown): number | null {
  const result = typeof value === "number" ? value : Number(value)
  return Number.isFinite(result) ? result : null
}

function qualificationStatus(matchPercentage: number): MiningQualificationStatus {
  if (matchPercentage >= 80) return "qualified"
  if (matchPercentage >= 60) return "potentially_qualified"
  return "not_qualified"
}

function parseCidbGrade(value: string | null | undefined): { level: number; className: string } | null {
  const match = String(value ?? "").toUpperCase().match(/\b([1-9])\s*([A-Z]{2})\b/)
  if (!match) return null
  return { level: Number(match[1]), className: match[2] }
}

function documentMatches(document: MiningComplianceDocument, requirement: string): boolean {
  const wanted = normalize(requirement)
  return normalize(document.document_type) === wanted || normalize(document.document_label).includes(wanted)
}

export function evaluateMiningEligibility({
  rules,
  mineOperationId,
  profile,
  documents,
  hostCommunityLinks,
  now = new Date(),
}: EligibilityInputs): EligibilityEvaluation {
  const gaps: MiningEligibilityGap[] = []
  let passed = 0
  let evaluated = 0

  function check(requirement: string, required: Json, actual: Json, matches: boolean) {
    evaluated += 1
    if (matches) passed += 1
    else gaps.push({ requirement, required, actual, severity: "hard" })
  }

  if (Array.isArray(rules.province) && rules.province.length > 0) {
    const actual = profile?.province ?? null
    check("province", rules.province, actual, rules.province.some((province) => normalize(province) === normalize(actual)))
  }

  if (rules.requires_host_community === true) {
    const link = hostCommunityLinks.find((candidate) => candidate.mine_operation_id === mineOperationId)
    const actual = Boolean(link?.is_host_community && link?.verified)
    check("requires_host_community", true, actual, actual)
  }

  if (numeric(rules.min_black_ownership_pct) != null) {
    const required = numeric(rules.min_black_ownership_pct)!
    const actual = profile?.black_ownership_pct ?? null
    check("min_black_ownership_pct", required, actual, actual != null && actual >= required)
  }

  if (numeric(rules.min_bbee_level) != null) {
    const required = numeric(rules.min_bbee_level)!
    const actual = profile?.bbee_level ?? null
    check("min_bbee_level", required, actual, actual != null && actual <= required)
  }

  for (const requiredDocument of rules.required_documents ?? []) {
    const document = documents.find((candidate) => documentMatches(candidate, requiredDocument))
    check(`required_documents:${requiredDocument}`, requiredDocument, document?.document_type ?? null, Boolean(document))
  }

  for (const certification of rules.required_certifications ?? []) {
    const document = documents.find((candidate) => documentMatches(candidate, certification))
    check(`required_certifications:${certification}`, certification, document?.document_type ?? null, Boolean(document))
  }

  if (rules.min_cidb_grade) {
    const required = parseCidbGrade(rules.min_cidb_grade)
    const cidbDocument = documents.find((document) => document.document_type === "CIDB Grading")
    const actualLabel = cidbDocument?.document_label ?? null
    const actual = parseCidbGrade(actualLabel)
    const matches = Boolean(
      required && actual && required.className === actual.className && actual.level >= required.level,
    )
    check("min_cidb_grade", rules.min_cidb_grade, actualLabel, matches)
  }

  if (numeric(rules.min_mining_references) != null) {
    // The supplied schema has no mining-reference table or count field. Reporting
    // zero is deliberately conservative until that data source is added.
    check("min_mining_references", numeric(rules.min_mining_references)!, 0, false)
  }

  for (const [key, required] of Object.entries(rules)) {
    if (!KNOWN_RULES.has(key)) {
      check(key, (required ?? null) as Json, "Unsupported rule", false)
    }
  }

  const warningCutoff = new Date(now)
  warningCutoff.setUTCDate(warningCutoff.getUTCDate() + 30)
  for (const document of documents) {
    if (!document.expiry_date) continue
    const expiry = new Date(`${document.expiry_date}T00:00:00Z`)
    if (!Number.isNaN(expiry.getTime()) && expiry >= now && expiry <= warningCutoff) {
      gaps.push({
        requirement: `document_expiry:${document.document_type}`,
        required: "Valid beyond 30 days",
        actual: document.expiry_date,
        severity: "soft",
      })
    }
  }

  const matchPercentage = evaluated === 0 ? 100 : Math.round((passed / evaluated) * 10_000) / 100
  return {
    match_percentage: matchPercentage,
    qualification_status: qualificationStatus(matchPercentage),
    gaps,
  }
}

function requireAdminClient(client?: SupabaseClient): SupabaseClient {
  const resolved = client ?? supabaseAdmin
  if (!resolved) throw new Error("Supabase service client is not configured.")
  return resolved
}

export async function computeMiningEligibility(
  supplierId: string,
  opportunityId: string,
  client?: SupabaseClient,
): Promise<MiningEligibilityResult> {
  const db = requireAdminClient(client)
  const [opportunityResult, profileResult, documentsResult, linksResult] = await Promise.all([
    db.from("mining_opportunities").select("*").eq("id", opportunityId).maybeSingle(),
    db.from("mining_supplier_profiles").select("*").eq("supplier_id", supplierId).maybeSingle(),
    db.from("mining_compliance_documents").select("*").eq("supplier_id", supplierId).eq("status", "verified"),
    db.from("mining_host_community_links").select("*").eq("supplier_id", supplierId),
  ])

  if (opportunityResult.error) throw new Error(opportunityResult.error.message)
  if (!opportunityResult.data) throw new Error("Mining opportunity not found.")
  if (profileResult.error) throw new Error(profileResult.error.message)
  if (documentsResult.error) throw new Error(documentsResult.error.message)
  if (linksResult.error) throw new Error(linksResult.error.message)

  const opportunity = opportunityResult.data as MiningOpportunity
  const evaluation = evaluateMiningEligibility({
    rules: opportunity.eligibility_rules ?? {},
    mineOperationId: opportunity.mine_operation_id,
    profile: profileResult.data as MiningSupplierProfile | null,
    documents: (documentsResult.data ?? []) as MiningComplianceDocument[],
    hostCommunityLinks: (linksResult.data ?? []) as MiningHostCommunityLink[],
  })

  const { data, error } = await db
    .from("mining_eligibility_results")
    .upsert(
      {
        supplier_id: supplierId,
        opportunity_id: opportunityId,
        ...evaluation,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "supplier_id,opportunity_id" },
    )
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as MiningEligibilityResult
}

export async function recomputeSupplierMiningEligibility(supplierId: string, client?: SupabaseClient) {
  const db = requireAdminClient(client)
  const { data, error } = await db.from("mining_opportunities").select("id").eq("status", "open")
  if (error) throw new Error(error.message)
  return Promise.all((data ?? []).map((opportunity) => computeMiningEligibility(supplierId, opportunity.id, db)))
}

export async function recomputeOpportunityMiningEligibility(opportunityId: string, client?: SupabaseClient) {
  const db = requireAdminClient(client)
  const pageSize = 500
  let from = 0
  let computed = 0

  while (true) {
    const { data, error } = await db
      .from("mining_supplier_profiles")
      .select("supplier_id")
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const suppliers = data ?? []
    await Promise.all(suppliers.map((supplier) => computeMiningEligibility(supplier.supplier_id, opportunityId, db)))
    computed += suppliers.length
    if (suppliers.length < pageSize) break
    from += pageSize
  }

  return computed
}

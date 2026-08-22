import type { SupabaseClient } from "@supabase/supabase-js"
import { computeMiningEligibility } from "@/lib/miningEligibility"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export type MiningRecomputeReason =
  | "profile_updated"
  | "document_verified"
  | "reference_verified"
  | "opportunity_created"

type MiningRecomputeJob = {
  id: string
  supplier_id: string
  opportunity_id: string
  reason: MiningRecomputeReason
  status: "pending" | "processing" | "done" | "failed"
  attempts: number
  last_error: string | null
  created_at: string
  processed_at: string | null
}

function requireAdminClient(client?: SupabaseClient): SupabaseClient {
  const resolved = client ?? supabaseAdmin
  if (!resolved) throw new Error("Supabase service client is not configured.")
  return resolved
}

async function insertPendingJobs(
  jobs: Array<{ supplier_id: string; opportunity_id: string; reason: MiningRecomputeReason }>,
  client?: SupabaseClient,
): Promise<number> {
  if (jobs.length === 0) return 0
  const db = requireAdminClient(client)

  // With no conflict target, ignoreDuplicates maps to PostgreSQL's targetless
  // ON CONFLICT DO NOTHING, which can use the queue's partial pending-job index.
  const { error } = await db
    .from("mining_recompute_queue")
    .upsert(
      jobs.map((job) => ({ ...job, status: "pending" })),
      { ignoreDuplicates: true },
    )

  if (error) throw new Error(error.message)
  return jobs.length
}

export async function enqueueSupplierMiningRecomputes(
  supplierId: string,
  reason: Exclude<MiningRecomputeReason, "opportunity_created">,
  client?: SupabaseClient,
): Promise<number> {
  const db = requireAdminClient(client)
  const { data, error } = await db.from("mining_opportunities").select("id").eq("status", "open")
  if (error) throw new Error(error.message)

  return insertPendingJobs(
    (data ?? []).map((opportunity) => ({
      supplier_id: supplierId,
      opportunity_id: opportunity.id,
      reason,
    })),
    db,
  )
}

export async function enqueueOpportunityMiningRecomputes(
  opportunityId: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = requireAdminClient(client)
  const pageSize = 1000
  let from = 0
  let enqueued = 0

  while (true) {
    const { data, error } = await db
      .from("mining_supplier_profiles")
      .select("supplier_id")
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)

    const suppliers = data ?? []
    enqueued += await insertPendingJobs(
      suppliers.map((supplier) => ({
        supplier_id: supplier.supplier_id,
        opportunity_id: opportunityId,
        reason: "opportunity_created",
      })),
      db,
    )

    if (suppliers.length < pageSize) break
    from += pageSize
  }

  return enqueued
}

export async function processMiningRecomputeQueue(client?: SupabaseClient, limit = 20) {
  const db = requireAdminClient(client)
  const { data, error } = await db
    .from("mining_recompute_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)

  const summary = { selected: (data ?? []).length, claimed: 0, done: 0, retried: 0, failed: 0 }

  for (const candidate of (data ?? []) as MiningRecomputeJob[]) {
    const { data: claimed, error: claimError } = await db
      .from("mining_recompute_queue")
      .update({ status: "processing" })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle()
    if (claimError) throw new Error(claimError.message)
    if (!claimed) continue
    summary.claimed += 1

    try {
      await computeMiningEligibility(candidate.supplier_id, candidate.opportunity_id, db)
      const { error: completeError } = await db
        .from("mining_recompute_queue")
        .update({ status: "done", processed_at: new Date().toISOString(), last_error: null })
        .eq("id", candidate.id)
        .eq("status", "processing")
      if (completeError) throw new Error(completeError.message)
      summary.done += 1
    } catch (jobError) {
      const attempts = (candidate.attempts ?? 0) + 1
      const terminal = attempts >= 3
      const message = jobError instanceof Error ? jobError.message : "Eligibility recompute failed."
      const { error: failureError } = await db
        .from("mining_recompute_queue")
        .update({
          status: terminal ? "failed" : "pending",
          attempts,
          last_error: message.slice(0, 2000),
          processed_at: terminal ? new Date().toISOString() : null,
        })
        .eq("id", candidate.id)
        .eq("status", "processing")
      if (failureError) throw new Error(failureError.message)
      if (terminal) summary.failed += 1
      else summary.retried += 1
    }
  }

  return summary
}

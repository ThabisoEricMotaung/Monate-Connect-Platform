import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type PurgeCandidate = {
  id: number
  sender_id: string
  receiver_id: string
  subject: string | null
  deleted_by_sender: boolean | null
  deleted_by_receiver: boolean | null
  deleted_by_sender_at: string | null
  deleted_by_receiver_at: string | null
}

const RETENTION_DAYS = 30
const MAX_PURGE_PER_RUN = 1000

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")
  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function retentionCutoff(now = new Date()): string {
  return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

async function findPurgeCandidates(cutoff: string): Promise<PurgeCandidate[]> {
  if (!supabaseAdmin) return []

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select(
      "id, sender_id, receiver_id, subject, deleted_by_sender, deleted_by_receiver, deleted_by_sender_at, deleted_by_receiver_at",
    )
    .eq("deleted_by_sender", true)
    .eq("deleted_by_receiver", true)
    .not("deleted_by_sender_at", "is", null)
    .not("deleted_by_receiver_at", "is", null)
    .lte("deleted_by_sender_at", cutoff)
    .lte("deleted_by_receiver_at", cutoff)
    .order("deleted_by_receiver_at", { ascending: true })
    .limit(MAX_PURGE_PER_RUN)

  if (error) throw new Error(error.message)

  return (data ?? []) as PurgeCandidate[]
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role client is not configured." },
      { status: 500 },
    )
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dryRun") === "1"
  const cutoff = retentionCutoff()

  try {
    const candidates = await findPurgeCandidates(cutoff)
    const candidateIds = candidates.map((candidate) => candidate.id)

    if (dryRun || candidateIds.length === 0) {
      console.log("Message retention purge dry run", {
        cutoff,
        candidates: candidateIds.length,
      })
      return NextResponse.json({
        ok: true,
        dryRun,
        cutoff,
        candidates: candidateIds.length,
        purged: 0,
        candidateIds,
      })
    }

    const { error } = await supabaseAdmin.from("messages").delete().in("id", candidateIds)
    if (error) throw new Error(error.message)

    console.log("Message retention purge run", {
      cutoff,
      purged: candidateIds.length,
    })
    return NextResponse.json({
      ok: true,
      dryRun: false,
      cutoff,
      candidates: candidateIds.length,
      purged: candidateIds.length,
      candidateIds,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Message retention purge failed."
    console.error("Message retention purge failed:", error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

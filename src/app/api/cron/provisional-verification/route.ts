import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { missingRequiredSupplierDocuments, type SupplierDocument } from "@/lib/supplierDocuments"

// Daily job that keeps the "Provisionally Approved" overlay on supplier
// profiles (see database/migrations/provisional_supplier_verification_fields.sql
// and provisional_verification_grace_tracking.sql) in sync automatically,
// instead of relying on an admin to type the missing document + deadline in
// by hand.
//
// Rules:
// - A supplier who is still under review (not yet "Verified" or "Rejected")
//   and is missing exactly one of the required documents is automatically
//   flagged as provisionally approved with a 14-day deadline to upload it.
// - If they upload the document, or a second required document goes missing
//   too, the provisional flag is cleared on the next run.
// - If the 14-day deadline passes and the document is still missing, the
//   provisional flag is cleared (their status falls back to plain
//   "Pending Review" everywhere it's displayed) and that document type is
//   recorded in provisional_grace_used_for so they are not immediately
//   re-flagged the next day for the same missing document — they only get
//   a fresh grace period once that document is uploaded or a different
//   document becomes the sole gap.
//
// This never changes profiles.verification_status itself — "Provisionally
// Approved" is (and always was) a display-only label computed from
// verification_status === "Pending Review" plus provisional_missing_document
// being set. See src/app/suppliers/SupplierDirectory.tsx and
// src/app/suppliers/[id]/page.tsx.

const GRACE_PERIOD_DAYS = 14
const MAX_PROFILES_PER_RUN = 2000

type SupplierProfile = {
  id: string
  verification_status: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_clearance_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  provisional_missing_document: string | null
  provisional_deadline: string | null
  provisional_grace_used_for: string | null
}

type SupplierDocumentRow = Pick<SupplierDocument, "profile_id" | "document_type" | "file_url" | "status">

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")

  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

// Suppliers who have been explicitly verified or rejected are outside the
// scope of this job — only the "still under review" queue is eligible for
// provisional approval. Mirrors the normalization in src/lib/supplierStatus.ts.
function isEligibleForProvisionalCheck(status: string | null): boolean {
  const normalized = (status ?? "").trim().toLowerCase()
  if (!normalized) return true
  if (normalized.includes("verified") && !normalized.includes("unverified")) return false
  if (normalized.includes("reject")) return false
  return true
}

function documentsByProfile(documents: SupplierDocumentRow[]): Map<string, SupplierDocumentRow[]> {
  const grouped = new Map<string, SupplierDocumentRow[]>()
  for (const document of documents) {
    grouped.set(document.profile_id, [...(grouped.get(document.profile_id) ?? []), document])
  }
  return grouped
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function addDaysIso(now: Date, days: number): string {
  const result = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return result.toISOString().slice(0, 10)
}

function isPastDeadline(deadline: string | null, now: Date): boolean {
  if (!deadline) return false
  const deadlineDate = new Date(`${deadline}T00:00:00`)
  if (Number.isNaN(deadlineDate.getTime())) return false
  return deadlineDate.getTime() < new Date(`${todayIso(now)}T00:00:00`).getTime()
}

type ProfileUpdate = {
  provisional_missing_document: string | null
  provisional_deadline: string | null
  provisional_grace_used_for?: string | null
}

function decideUpdate(profile: SupplierProfile, missingCount: number, missingType: string | null, missingLabel: string | null, now: Date):
  | { action: "none" }
  | { action: "flag" | "revert" | "clear"; update: ProfileUpdate } {
  const trackedLabel = profile.provisional_missing_document?.trim() || null
  const graceUsedFor = profile.provisional_grace_used_for?.trim() || null

  if (missingCount === 1 && missingType && missingLabel) {
    const isSameAsTracked = trackedLabel === missingLabel

    if (isSameAsTracked) {
      if (isPastDeadline(profile.provisional_deadline, now)) {
        return {
          action: "revert",
          update: {
            provisional_missing_document: null,
            provisional_deadline: null,
            provisional_grace_used_for: missingType,
          },
        }
      }
      return { action: "none" }
    }

    if (graceUsedFor === missingType) {
      // Already used and lost their grace period for this exact document —
      // don't auto-grant another one. Just make sure nothing stale lingers.
      if (trackedLabel) {
        return {
          action: "clear",
          update: { provisional_missing_document: null, provisional_deadline: null },
        }
      }
      return { action: "none" }
    }

    return {
      action: "flag",
      update: {
        provisional_missing_document: missingLabel,
        provisional_deadline: addDaysIso(now, GRACE_PERIOD_DAYS),
        provisional_grace_used_for: null,
      },
    }
  }

  // 0 or 2+ documents missing — not eligible for the provisional overlay.
  if (trackedLabel) {
    return {
      action: "clear",
      update: {
        provisional_missing_document: null,
        provisional_deadline: null,
        ...(missingCount === 0 ? { provisional_grace_used_for: null } : {}),
      },
    }
  }

  return { action: "none" }
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const now = new Date()

  let { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, verification_status, csd_document_url, bbbee_document_url, tax_clearance_url, tax_document_url, company_registration_url, provisional_missing_document, provisional_deadline, provisional_grace_used_for",
    )
    .eq("role", "supplier")
    .not("email", "is", null)
    .not("email", "ilike", "%@deleted.local")
    .limit(MAX_PROFILES_PER_RUN)

  // Belt-and-suspenders for environments where the provisional columns
  // haven't been migrated yet — same fallback pattern as document-reminders.
  if (profilesError?.code === "42703") {
    const retry = await supabaseAdmin
      .from("profiles")
      .select("id, verification_status, csd_document_url, bbbee_document_url, tax_clearance_url, tax_document_url, company_registration_url")
      .eq("role", "supplier")
      .not("email", "is", null)
      .not("email", "ilike", "%@deleted.local")
      .limit(MAX_PROFILES_PER_RUN)

    profilesData = (retry.data?.map((profile) => ({
      ...(profile as unknown as Record<string, unknown>),
      provisional_missing_document: null,
      provisional_deadline: null,
      provisional_grace_used_for: null,
    })) ?? null) as typeof profilesData
    profilesError = retry.error
  }

  if (profilesError) {
    console.error("Provisional verification profile query failed:", profilesError)
    return NextResponse.json({ ok: false, error: profilesError.message }, { status: 500 })
  }

  const allProfiles = (profilesData ?? []) as SupplierProfile[]
  const profiles = allProfiles.filter((profile) => isEligibleForProvisionalCheck(profile.verification_status))
  const profileIds = profiles.map((profile) => profile.id)

  if (profileIds.length === 0) {
    console.log("Provisional verification run", { checked: 0 })
    return NextResponse.json({ ok: true, checked: 0, flagged: 0, reverted: 0, cleared: 0, errors: 0 })
  }

  const documentsResult = await supabaseAdmin
    .from("supplier_documents")
    .select("profile_id, document_type, file_url, status")
    .in("profile_id", profileIds)

  if (documentsResult.error) {
    console.error("Provisional verification supplier_documents query failed:", documentsResult.error)
    return NextResponse.json({ ok: false, error: documentsResult.error.message }, { status: 500 })
  }

  const documentsMap = documentsByProfile((documentsResult.data ?? []) as SupplierDocumentRow[])

  let flagged = 0
  let reverted = 0
  let cleared = 0
  let errors = 0

  for (const profile of profiles) {
    const documents = documentsMap.get(profile.id) ?? []
    const missing = missingRequiredSupplierDocuments(
      profile as unknown as Record<string, unknown>,
      documents as unknown as SupplierDocument[],
    )

    const decision = decideUpdate(
      profile,
      missing.length,
      missing.length === 1 ? missing[0].type : null,
      missing.length === 1 ? missing[0].label : null,
      now,
    )

    if (decision.action === "none") continue

    const { error } = await supabaseAdmin.from("profiles").update(decision.update).eq("id", profile.id)

    if (error) {
      errors += 1
      console.error("Provisional verification update failed:", { profileId: profile.id, error: error.message })
      continue
    }

    if (decision.action === "flag") flagged += 1
    if (decision.action === "revert") reverted += 1
    if (decision.action === "clear") cleared += 1
  }

  const summary = { checked: profiles.length, flagged, reverted, cleared, errors }
  console.log("Provisional verification run", summary)

  return NextResponse.json({ ok: errors === 0, ...summary })
}

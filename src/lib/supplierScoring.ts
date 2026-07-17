import { buildSupplierActivityById } from "./intelligence"
import {
  SUPPLIER_SMART_SCORE_PROFILE_SELECT,
  type SmartScoreResult,
  type SupplierSmartScoreActivity,
  type SupplierSmartScoreProfile,
} from "./smartScore"
import {
  mergeSupplierScoreInputs,
  scoreCanonicalSupplierInput,
  type CanonicalSupplierScoreInput,
  type SupplierBankScoreRecord,
} from "./supplierScoreAssembly"
import { supabase as defaultSupabase } from "./supabase"
import type { SupplierDocument } from "./supplierDocuments"

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: string; head?: boolean }) => unknown
  }
}

type QueryBuilder = {
  eq?: (column: string, value: unknown) => QueryBuilder
  in?: (column: string, values: unknown[]) => QueryBuilder
  order?: (column: string, options?: { ascending?: boolean }) => QueryBuilder
  maybeSingle?: () => Promise<{ data: unknown; error: { message?: string } | null }>
  then?: PromiseLike<{ data: unknown; error: { message?: string } | null }>["then"]
}

export type CanonicalSupplierScoreRecord = {
  supplierId: string
  input: CanonicalSupplierScoreInput
  activity: SupplierSmartScoreActivity
  result: SmartScoreResult
}

function query<T = { data: unknown; error: { message?: string } | null }>(builder: unknown): Promise<T> {
  return builder as Promise<T>
}

function withIds(builder: unknown): QueryBuilder {
  return builder as QueryBuilder
}

function supplierOnly<T extends SupplierSmartScoreProfile & { id: string }>(profiles: T[]): T[] {
  return profiles.filter((profile) => String(profile.role ?? "").trim().toLowerCase() === "supplier")
}

export async function getCanonicalSupplierSmartScoreBatch({
  supplierIds,
  client = defaultSupabase,
  profiles,
  banks,
}: {
  supplierIds: string[]
  client?: SupabaseLike | null
  profiles?: Array<SupplierSmartScoreProfile & { id: string }>
  banks?: SupplierBankScoreRecord[]
}): Promise<Record<string, CanonicalSupplierScoreRecord>> {
  const ids = Array.from(new Set(supplierIds.filter(Boolean)))
  if (ids.length === 0) return {}
  if (!client) throw new Error("Supabase is not configured.")

  const profilePromise = profiles
    ? Promise.resolve({ data: supplierOnly(profiles).filter((profile) => ids.includes(profile.id)), error: null })
    : query<{ data: unknown; error: { message?: string } | null }>(
        withIds(client.from("profiles").select(SUPPLIER_SMART_SCORE_PROFILE_SELECT))
          .in?.("id", ids)
          ?.eq?.("role", "supplier")
      )
  const bankPromise = banks
    ? Promise.resolve({ data: banks, error: null })
    : query<{ data: unknown; error: { message?: string } | null }>(
        withIds(client.from("supplier_bank_details").select("supplier_id, bank_name, account_number, verification_status"))
          .in?.("supplier_id", ids)
          ?.order?.("created_at", { ascending: false })
      )

  const [profileRes, documentRes, bankRes, quoteRes, contractRes, invoiceRes, paymentRes] = await Promise.all([
    profilePromise,
    query<{ data: unknown; error: { message?: string } | null }>(
      withIds(client.from("supplier_documents").select("id, profile_id, document_type, file_url, storage_path, original_filename, content_type, file_size, uploaded_at, status, reviewed_at, reviewed_by, review_notes")).in?.("profile_id", ids)
    ),
    bankPromise,
    query<{ data: unknown; error: { message?: string } | null }>(
      withIds(client.from("quotes").select("id, supplier_id, status")).in?.("supplier_id", ids)
    ),
    query<{ data: unknown; error: { message?: string } | null }>(
      withIds(client.from("contracts").select("id, supplier_id, status")).in?.("supplier_id", ids)
    ),
    query<{ data: unknown; error: { message?: string } | null }>(
      withIds(client.from("invoices").select("id, supplier_id, status")).in?.("supplier_id", ids)
    ),
    query<{ data: unknown; error: { message?: string } | null }>(
      withIds(client.from("payments").select("id, supplier_id, status")).in?.("supplier_id", ids)
    ),
  ])

  const firstError = [
    profileRes.error,
    documentRes.error,
    bankRes.error,
    quoteRes.error,
    contractRes.error,
    invoiceRes.error,
    paymentRes.error,
  ].find(Boolean)
  if (firstError) throw new Error(firstError.message ?? "Canonical SmartScore data failed to load")

  const profileRows = (profileRes.data ?? []) as Array<SupplierSmartScoreProfile & { id: string }>
  const documentRows = (documentRes.data ?? []) as SupplierDocument[]
  const bankRows = (bankRes.data ?? []) as SupplierBankScoreRecord[]
  const activityBySupplier = buildSupplierActivityById({
    supplierIds: ids,
    quotes: (quoteRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    contracts: (contractRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    invoices: (invoiceRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    payments: (paymentRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
  })

  return Object.fromEntries(
    profileRows.map((profile) => {
      const input = mergeSupplierScoreInputs({
        profile,
        documents: documentRows.filter((document) => document.profile_id === profile.id),
        banks: bankRows.filter((bank) => bank.supplier_id === profile.id),
      })
      const activity = activityBySupplier[profile.id] ?? {}
      return [
        profile.id,
        {
          supplierId: profile.id,
          input,
          activity,
          result: scoreCanonicalSupplierInput(input, activity),
        },
      ]
    })
  )
}

export async function getCanonicalSupplierSmartScore(
  supplierId: string,
  client: SupabaseLike | null = defaultSupabase
): Promise<CanonicalSupplierScoreRecord | null> {
  const scores = await getCanonicalSupplierSmartScoreBatch({ supplierIds: [supplierId], client })
  return scores[supplierId] ?? null
}

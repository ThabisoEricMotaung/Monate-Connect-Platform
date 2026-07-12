import { NextResponse } from "next/server"
import {
  calculateSupplierMatch,
  type RFQForMatching,
  type SupplierForMatching,
  type SupplierStats,
} from "@/lib/supplierMatching"
import { groupBySupplierId, mergeSupplierScoreInputs, type SupplierBankScoreRecord } from "@/lib/supplierScoreAssembly"
import type { SupplierDocument } from "@/lib/supplierDocuments"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type RouteContext = {
  params: Promise<{ id: string }>
}

type QuoteRow = {
  supplier_id: string | null
  status: string | null
  rfq_id: number | null
}

type ContractRow = {
  supplier_id: string | null
  status: string | null
}

const MATCH_LOAD_ERROR =
  "Couldn't load the supplier list to match against. This is a system issue, not a sign there are no matching suppliers. Try refreshing, and let the team know if it keeps happening."

function logMatchLoadError(message: string, details: unknown) {
  console.error(`[rfq-matches] ${message}`, details)
}

function documentsByProfile(documents: SupplierDocument[]): Record<string, SupplierDocument[]> {
  return documents.reduce<Record<string, SupplierDocument[]>>((grouped, document) => {
    grouped[document.profile_id] = [...(grouped[document.profile_id] ?? []), document]
    return grouped
  }, {})
}

export async function GET(_request: Request, context: RouteContext) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const { id } = await context.params
  const rfqId = Number(id)
  if (!Number.isFinite(rfqId)) {
    return NextResponse.json({ error: "Invalid RFQ reference." }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  const { data: actorProfile, error: actorProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (actorProfileError) {
    logMatchLoadError("Actor profile lookup failed", { userId: user.id, error: actorProfileError })
    return NextResponse.json({ error: MATCH_LOAD_ERROR }, { status: 500 })
  }

  const role = String(actorProfile?.role ?? "").trim().toLowerCase()
  if (role !== "admin" && role !== "buyer") {
    return NextResponse.json({ error: "Admin or buyer access required." }, { status: 403 })
  }

  const [rfqRes, profileRes, quoteRes, contractRes, bankRes] = await Promise.all([
    supabaseAdmin
      .from("rfqs")
      .select("id, title, category, province, budget, deadline, status")
      .eq("id", rfqId)
      .single(),
    supabaseAdmin
      .from("profiles")
      .select(
        `id, business_name, province, industry, verification_status, phone, email,
         bbbee_level, csd_number, tax_status, company_registration,
         csd_verified, bbbee_verified, tax_verified, bank_verified, banking_verified, director_verified,
         csd_document_url, bbbee_document_url, tax_document_url,
         company_registration_url, cidb_document_url, capability_statement_url,
         tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date`,
      )
      .eq("role", "supplier"),
    supabaseAdmin.from("quotes").select("supplier_id, status, rfq_id"),
    supabaseAdmin.from("contracts").select("supplier_id, status"),
    supabaseAdmin.from("supplier_bank_details").select("supplier_id, verification_status"),
  ])

  if (rfqRes.error || !rfqRes.data) {
    logMatchLoadError("RFQ lookup failed", { rfqId, error: rfqRes.error })
    return NextResponse.json({ error: rfqRes.error?.message ?? "RFQ not found." }, { status: 404 })
  }

  if (profileRes.error) {
    logMatchLoadError("Supplier profile query failed", { rfqId, error: profileRes.error })
    return NextResponse.json({ error: MATCH_LOAD_ERROR }, { status: 500 })
  }

  if (quoteRes.error || contractRes.error || bankRes.error) {
    logMatchLoadError("Supplier matching support query failed", {
      rfqId,
      quoteError: quoteRes.error,
      contractError: contractRes.error,
      bankError: bankRes.error,
    })
    return NextResponse.json({ error: MATCH_LOAD_ERROR }, { status: 500 })
  }

  const supplierRows = (profileRes.data ?? []) as SupplierForMatching[]
  const supplierIds = supplierRows.map((supplier) => supplier.id)
  const documentRes =
    supplierIds.length > 0
      ? await supabaseAdmin
          .from("supplier_documents")
          .select(
            "id, profile_id, document_type, file_url, storage_path, original_filename, content_type, file_size, uploaded_at, status, reviewed_at, reviewed_by, review_notes",
          )
          .in("profile_id", supplierIds)
          .order("uploaded_at", { ascending: false })
      : { data: [], error: null }

  if (documentRes.error) {
    logMatchLoadError("Supplier document query failed", { rfqId, error: documentRes.error })
    return NextResponse.json({ error: MATCH_LOAD_ERROR }, { status: 500 })
  }

  const rfq = rfqRes.data as RFQForMatching
  const documents = documentsByProfile((documentRes.data ?? []) as SupplierDocument[])
  const banksBySupplier = groupBySupplierId((bankRes.data ?? []) as SupplierBankScoreRecord[])
  const suppliers = supplierRows.map((supplier) =>
    mergeSupplierScoreInputs({
      profile: supplier,
      documents: documents[supplier.id] ?? [],
      banks: banksBySupplier[supplier.id] ?? [],
    }),
  )
  const allQuotes = (quoteRes.data ?? []) as QuoteRow[]
  const allContracts = (contractRes.data ?? []) as ContractRow[]

  const results = suppliers.map((supplier) => {
    const supplierQuotes = allQuotes.filter((quote) => quote.supplier_id === supplier.id)
    const supplierContracts = allContracts.filter((contract) => contract.supplier_id === supplier.id)
    const stats: SupplierStats = {
      totalQuotes: supplierQuotes.length,
      awardedQuotes: supplierQuotes.filter(
        (quote) => quote.status === "Awarded" || quote.status === "Approved",
      ).length,
      completedContracts: supplierContracts.filter((contract) => contract.status === "Completed").length,
      totalContracts: supplierContracts.length,
      hasQuotedThisRFQ: supplierQuotes.some((quote) => quote.rfq_id === rfqId),
    }

    return calculateSupplierMatch(rfq, supplier, stats)
  })

  results.sort((a, b) => b.score - a.score)

  return NextResponse.json({ rfq, results })
}

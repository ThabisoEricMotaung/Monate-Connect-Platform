import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { buildSupplierActivityById } from "@/lib/intelligence"
import { calculateSupplierSmartScore } from "@/lib/smartScore"

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const authHeader = request.headers.get("authorization")

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response("Supabase is not configured", { status: 500 })
  }

  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""))

  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const [profileRes, bankRes, quoteRes, contractRes, invoiceRes, paymentRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("supplier_bank_details")
      .select("bank_name, account_number, verification_status")
      .eq("supplier_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("quotes").select("id, supplier_id, status").eq("supplier_id", user.id),
    supabase.from("contracts").select("id, supplier_id, status").eq("supplier_id", user.id),
    supabase.from("invoices").select("id, supplier_id, status").eq("supplier_id", user.id),
    supabase.from("payments").select("id, supplier_id, status").eq("supplier_id", user.id),
  ])

  if (profileRes.error) {
    return new Response(profileRes.error.message, { status: 500 })
  }

  if (!profileRes.data) {
    return new Response("Not found", { status: 404 })
  }

  const activityBySupplier = buildSupplierActivityById({
    supplierIds: [user.id],
    quotes: (quoteRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    contracts: (contractRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    invoices: (invoiceRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
    payments: (paymentRes.data ?? []) as Array<{ supplier_id: string | null; status: string | null }>,
  })
  const score = calculateSupplierSmartScore(
    {
      ...profileRes.data,
      bank_name: bankRes.data?.bank_name ?? null,
      bank_account_number: bankRes.data?.account_number ?? null,
      bank_verification_status: bankRes.data?.verification_status ?? null,
    },
    activityBySupplier[user.id] ?? {},
  ).score

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ smart_score: score, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    return new Response(updateError.message, { status: 500 })
  }

  return NextResponse.json({ score })
}

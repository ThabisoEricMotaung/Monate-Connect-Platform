import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { getCanonicalSupplierSmartScore } from "@/lib/supplierScoring"

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

  const canonicalScore = await getCanonicalSupplierSmartScore(user.id, supabase)

  if (!canonicalScore) {
    return new Response("Not found", { status: 404 })
  }

  const score = canonicalScore.result.score

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ smart_score: score, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    return new Response(updateError.message, { status: 500 })
  }

  return NextResponse.json({ score })
}

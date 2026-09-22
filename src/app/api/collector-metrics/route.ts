import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "1"
    const order = searchParams.get("order") || "run_date.desc"

    let query = supabase
      .from("collector_metrics")
      .select("*")
      .limit(Number(limit))

    // Parse order param (e.g., "run_date.desc" or "run_date.asc")
    const [orderField, orderDir] = order.split(".")
    if (orderField) {
      query = query.order(orderField, { ascending: orderDir === "asc" })
    }

    const { data, error } = await query

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: { "Cache-Control": "public, max-age=300" }, // Cache for 5 minutes
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch collector metrics" },
      { status: 500 }
    )
  }
}

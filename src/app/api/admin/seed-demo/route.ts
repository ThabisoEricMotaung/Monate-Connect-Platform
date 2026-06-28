import { generateDemoData } from "@/lib/demoSeed"
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST() {
  // Auth check
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 })
  }

  // Admin role check
  const { data: profile } = await supabaseAdmin
    ?.from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle() ?? { data: null }

  if (profile?.role !== "admin") {
    return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 })
  }

  try {
    await generateDemoData()
    return NextResponse.json({ success: true, message: "Demo data seeded successfully" })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
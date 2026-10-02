import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { sendSupplierWelcomeEmail } from "@/lib/automationRules"

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Your session expired. Please sign in again." }, { status: 401 })
  if (!supabaseAdmin || !user.email) return NextResponse.json({ error: "Registration service is unavailable." }, { status: 503 })

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Registration details are required." }, { status: 400 })

  const { data, error } = await supabaseAdmin.rpc("complete_role_registration", {
    p_user_id: user.id,
    p_email: user.email,
    p_payload: payload,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 400 })

  // Send welcome email to new suppliers (non-blocking)
  if (data === "supplier") {
    sendSupplierWelcomeEmail(
      { id: user.id, email: user.email, role: "supplier" },
      supabase
    ).catch((err) => {
      console.error("Failed to send welcome email:", err)
    })
  }

  return NextResponse.json({ ok: true, role: data })
}

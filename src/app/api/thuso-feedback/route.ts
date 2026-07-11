import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type ThusoFeedbackBody = {
  rating?: unknown
  detail?: unknown
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role client is not configured." },
      { status: 500 },
    )
  }

  let body: ThusoFeedbackBody
  try {
    body = (await request.json()) as ThusoFeedbackBody
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 })
  }

  const rating = body.rating === "helpful" || body.rating === "not_helpful" ? body.rating : null
  if (!rating) {
    return NextResponse.json({ ok: false, error: "Invalid feedback rating." }, { status: 400 })
  }

  const detail =
    rating === "not_helpful" && typeof body.detail === "string"
      ? body.detail.trim().slice(0, 1000) || null
      : null

  const { error } = await supabaseAdmin.from("thuso_feedback").insert({
    rating,
    detail,
  })

  if (error) {
    console.error("Thuso feedback insert failed:", error)
    return NextResponse.json({ ok: false, error: "Unable to save feedback." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

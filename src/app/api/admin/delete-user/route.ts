import { NextResponse } from "next/server"
import { deleteAccount } from "@/lib/deleteAccount"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type DeleteUserRequest = {
  userId?: string
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization")
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: "Supabase service role client is not configured." },
      { status: 500 }
    )
  }

  const token = bearerToken(request)
  if (!token) {
    return NextResponse.json({ success: false, error: "Missing authorization token." }, { status: 401 })
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ success: false, error: "Invalid authorization token." }, { status: 401 })
  }

  let body: DeleteUserRequest
  try {
    body = (await request.json()) as DeleteUserRequest
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 })
  }

  const targetUserId = body.userId
  if (!targetUserId) {
    return NextResponse.json({ success: false, error: "Missing userId." }, { status: 400 })
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (callerProfileError) {
    return NextResponse.json({ success: false, error: callerProfileError.message }, { status: 500 })
  }

  const callerRole = String(callerProfile?.role ?? "").trim().toLowerCase()
  const canDelete = targetUserId === user.id || callerRole === "admin"

  if (!canDelete) {
    return NextResponse.json({ success: false, error: "You are not allowed to delete this account." }, { status: 403 })
  }

  const result = await deleteAccount(targetUserId, supabaseAdmin)
  if (!result.success) {
    return NextResponse.json(result, { status: 500 })
  }

  return NextResponse.json(result)
}

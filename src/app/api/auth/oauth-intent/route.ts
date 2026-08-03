import { NextResponse } from "next/server"

import { createOAuthIntent, OAUTH_INTENT_COOKIE, oauthIntentCookieOptions } from "@/lib/oauthIntent"
import { normalizedRegistrationRole } from "@/lib/registration"

const providers = new Set(["email", "google", "azure", "linkedin_oidc"])

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { provider?: string; intendedRole?: string } | null
  const role = normalizedRegistrationRole(body?.intendedRole)
  if (!role || !body?.provider || !providers.has(body.provider)) {
    return NextResponse.json({ error: "Invalid OAuth registration intent." }, { status: 400 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(OAUTH_INTENT_COOKIE, createOAuthIntent(role), oauthIntentCookieOptions)
  return response
}

import { createHmac, timingSafeEqual } from "node:crypto"

import type { RegistrationRole } from "@/lib/registration"

export const OAUTH_INTENT_COOKIE = "aiform_oauth_intent"
const MAX_AGE_SECONDS = 10 * 60

function secret() {
  const value = process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error("OAuth intent signing secret is not configured.")
  return value
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

export function createOAuthIntent(role: RegistrationRole) {
  const payload = Buffer.from(JSON.stringify({ role, issuedAt: Date.now() })).toString("base64url")
  return `${payload}.${signature(payload)}`
}

export function readOAuthIntent(value?: string): RegistrationRole | null {
  if (!value) return null
  const [payload, supplied] = value.split(".")
  if (!payload || !supplied) return null
  const expected = signature(payload)
  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expected)
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string; issuedAt?: number }
    if (!parsed.issuedAt || Date.now() - parsed.issuedAt > MAX_AGE_SECONDS * 1000) return null
    return parsed.role === "buyer" || parsed.role === "supplier" ? parsed.role : null
  } catch {
    return null
  }
}

export const oauthIntentCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
}

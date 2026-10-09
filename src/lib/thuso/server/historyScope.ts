import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Authenticates browser-held conversation history.
 *
 * After each reply the server returns the exact history window it will accept
 * next (prior accepted turns + this message + this reply, capped) and an HMAC
 * over viewer key, context key and every turn's role and content in order.
 * A later request's history reaches the model only when that HMAC matches
 * what was sent, so it must be the same account and role, the same record,
 * and byte-for-byte the same turns in the same order. Any edit, reorder,
 * insertion, removal or role swap invalidates it and the history is dropped.
 */

export type SignedTurn = { role: "user" | "assistant"; content: string }

const LABEL = "thuso-history-v2"

function secret(): string | null {
  const dedicated = process.env.THUSO_HISTORY_SECRET
  if (dedicated && dedicated.length >= 32) return dedicated
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Derived, so the service key itself never signs anything visible.
  return serviceKey ? createHmac("sha256", serviceKey).update(LABEL).digest("hex") : null
}

export function contextKey(context: { type: "rfq"; id: number } | null): string {
  return context ? `rfq:${context.id}` : "general"
}

/** JSON keeps every boundary explicit, so no two different histories encode alike. */
function canonical(viewerKey: string, context: string, turns: SignedTurn[]): string {
  return JSON.stringify([LABEL, viewerKey, context, turns.map(({ role, content }) => [role, content])])
}

export function signHistory(viewerKey: string, context: string, turns: SignedTurn[]): string | null {
  const key = secret()
  if (!key) return null
  return createHmac("sha256", key).update(canonical(viewerKey, context, turns)).digest("base64url")
}

export function historySignatureMatches(token: unknown, viewerKey: string, context: string, turns: SignedTurn[]): boolean {
  if (typeof token !== "string" || token.length === 0 || token.length > 128) return false
  const expected = signHistory(viewerKey, context, turns)
  if (!expected) return false
  const given = Buffer.from(token)
  const wanted = Buffer.from(expected)
  return given.length === wanted.length && timingSafeEqual(given, wanted)
}

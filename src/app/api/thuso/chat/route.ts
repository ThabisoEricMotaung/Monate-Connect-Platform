import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { roleFromProfile, viewerKey, viewerLabel, type ThusoViewer } from "@/lib/thuso/server/access"
import { contextKey, historySignatureMatches, signHistory } from "@/lib/thuso/server/historyScope"
import { loadRfqContext, parseContextRequest, type RfqReader, type ThusoRfqContext } from "@/lib/thuso/server/context"
import { buildThusoSystemPrompt } from "@/lib/thuso/server/prompt"
import { clientIp, createRateLimiter } from "@/lib/thuso/server/rateLimit"

// Thuso is read-only in this phase: it answers questions and never writes.
// Identity, role and record context are all resolved here from the session;
// any role, user ID or context text in the request body is ignored.
//
// Usage limits below are per server instance (in memory). They bound bursts;
// they are not a deployment-wide budget, which is why anonymous AI use is off
// unless THUSO_ANONYMOUS_AI=enabled.

const LIMITS = {
  anonymous: { history: 6, maxTokens: 400 },
  user: { history: 12, maxTokens: 600 },
} as const
const MAX_MESSAGE_CHARS = 2000

const anonymousLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 })
const userLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 30 })

const BREATHER = "Thuso is taking a breather. Please try again."
const UNAVAILABLE = "That tender or RFQ isn't available to you, so Thuso can't discuss it."

interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

// Replies can run longer than a user message (max_tokens 600), and come back
// as history, so assistant turns get a larger bound.
const MAX_REPLY_CHARS = 8000

/** Shape check only; whether the turns are trusted is decided by the signature. */
function parseHistory(value: unknown): ChatTurn[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > 40) return null
  const turns: ChatTurn[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const { role, content } = item as { role?: unknown; content?: unknown }
    if (role !== "user" && role !== "assistant") return null
    const max = role === "user" ? MAX_MESSAGE_CHARS : MAX_REPLY_CHARS
    if (typeof content !== "string" || content.length > max) return null
    turns.push({ role, content })
  }
  return turns
}

async function resolveViewer(): Promise<ThusoViewer> {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  try {
    supabase = await createSupabaseServerClient()
  } catch (error) {
    console.error("[thuso] session client unavailable", error)
    return { kind: "anonymous" }
  }

  const { data, error } = await supabase.auth.getUser()
  const user = data?.user
  if (error || !user) return { kind: "anonymous" }

  // No verified role, no account context: a failed or empty profile lookup
  // gives public help only.
  try {
    const profiles = (supabaseAdmin ?? supabase).from("profiles")
    const { data: profile, error: profileError } = await profiles.select("role").eq("id", user.id).maybeSingle()
    if (profileError || !profile) {
      console.error("[thuso] profile role unavailable; restricting to public help", { userId: user.id, failed: Boolean(profileError) })
      return { kind: "unverified", userId: user.id }
    }
    return { kind: "user", userId: user.id, role: roleFromProfile(profile.role) }
  } catch (error) {
    console.error("[thuso] profile role lookup threw; restricting to public help", { userId: user.id, error })
    return { kind: "unverified", userId: user.id }
  }
}

/** Anonymous AI use stays off until a durable budget exists (see report). */
function anonymousAiEnabled(): boolean {
  return process.env.THUSO_ANONYMOUS_AI === "enabled"
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid request body." }, 400)
  }
  const { message, history: rawHistory, historyScope, context: rawContext } = (body ?? {}) as Record<string, unknown>

  if (typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_CHARS) {
    return json({ error: `Message is required (max ${MAX_MESSAGE_CHARS} characters).` }, 400)
  }
  const contextRequest = parseContextRequest(rawContext)
  if (contextRequest === "invalid") return json({ error: "Invalid context reference." }, 400)

  const viewer = await resolveViewer()
  if (viewer.kind === "anonymous" && !anonymousAiEnabled()) {
    return json({ error: "Sign in to chat with Thuso.", code: "sign_in_required" }, 401)
  }
  const limits = viewer.kind === "anonymous" ? LIMITS.anonymous : LIMITS.user
  const limited = viewer.kind === "anonymous" ? anonymousLimiter(`ip:${clientIp(request.headers)}`) : userLimiter(`user:${viewer.userId}`)
  if (limited) {
    return json({ error: viewer.kind === "anonymous"
      ? "Thuso needs a quick pause. Sign in for a higher limit, or try again in a few minutes."
      : "Thuso needs a quick pause. Please try again in a few minutes." }, 429)
  }

  const history = parseHistory(rawHistory)
  if (!history) return json({ error: "Conversation history is invalid." }, 400)

  let context: ThusoRfqContext | null = null
  if (contextRequest) {
    let client = supabaseAdmin
    if (!client) {
      try {
        client = await createSupabaseServerClient()
      } catch {
        client = null
      }
    }
    if (!client) return json({ error: BREATHER }, 503)
    // Cast: checking the full Supabase client type against RfqReader exceeds tsc's depth limit.
    const result = await loadRfqContext(client as unknown as RfqReader, viewer, contextRequest.id)
    if (result.status === "error") return json({ error: BREATHER }, 502)
    if (result.status === "unavailable") return json({ error: UNAVAILABLE, code: "context_unavailable" }, 404)
    context = result.context
  }

  // Browser-held history is untrusted. It only reaches the model when it is
  // exactly the window this server signed for this viewer (account and role)
  // and this record: same turns, same order, same content.
  const scopeViewer = viewerKey(viewer)
  const scopeContext = contextKey(contextRequest)
  const historyAccepted =
    history.length > 0 && history.length <= limits.history && historySignatureMatches(historyScope, scopeViewer, scopeContext, history)
  const modelHistory = historyAccepted ? history : []

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[thuso] OPENAI_API_KEY missing")
    return json({ error: BREATHER }, 502)
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: limits.maxTokens,
        messages: [
          { role: "system", content: buildThusoSystemPrompt(viewer, context) },
          ...modelHistory,
          { role: "user", content: message },
        ],
      }),
      signal: request.signal,
    })

    if (!response.ok) {
      console.error("[thuso] OpenAI error", response.status)
      return json({ error: BREATHER }, 502)
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
    const reply = (data.choices?.[0]?.message?.content?.trim() || "I couldn't put together an answer just now. Could you try rephrasing that?").slice(0, MAX_REPLY_CHARS)
    // The only history the next request may send back, and its signature.
    const nextHistory: ChatTurn[] = [...modelHistory, { role: "user" as const, content: message }, { role: "assistant" as const, content: reply }].slice(-limits.history)
    const historyScope = signHistory(scopeViewer, scopeContext, nextHistory)
    return json({
      message: reply,
      context: context ? { type: "rfq", id: context.id, title: context.title } : null,
      viewer: viewerLabel(viewer),
      history: historyScope ? nextHistory : [],
      historyScope,
      historyUsed: historyAccepted,
    })
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") return json({ error: "Request cancelled." }, 499)
    console.error("[thuso] chat request failed", error)
    return json({ error: BREATHER }, 502)
  }
}

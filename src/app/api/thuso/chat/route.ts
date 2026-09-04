import { NextRequest, NextResponse } from "next/server"

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 20
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown"

  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown"
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const current = rateLimits.get(ip)

  if (!current || current.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return true

  current.count += 1
  return false
}

interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

function validateHistory(value: unknown): ChatTurn[] | null {
  if (!Array.isArray(value)) return null
  if (value.length > 20) return null

  const turns: ChatTurn[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const { role, content } = item as { role?: unknown; content?: unknown }
    if (role !== "user" && role !== "assistant") return null
    if (typeof content !== "string" || content.length > 4000) return null
    turns.push({ role, content })
  }
  return turns
}

const PLACEHOLDER_WARNING =
  "Never answer with a bracketed placeholder like [insert deadline date] or [budget amount] — always state the actual value from the RFQ facts below, or say plainly that the buyer hasn't specified it."

const BASE_PROMPTS: Record<"supplier" | "buyer", string> = {
  supplier: `You are Thuso, an AI assistant inside AiForm Procure's supplier RFQ response workspace. Help the supplier understand and respond to the specific RFQ described below — compliance documents, budget, deadline, scope, and next steps. Be concise, warm, and action-oriented. Write in plain text only, no markdown formatting. ${PLACEHOLDER_WARNING}`,
  buyer: `You are Thuso, an AI assistant inside AiForm Procure's buyer workspace. Help the buyer evaluate supplier responses and manage the specific RFQ described below. Be analytical and concise. Write in plain text only, no markdown formatting. ${PLACEHOLDER_WARNING}`,
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Thuso needs a quick pause. Please try again in a few minutes." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { message, conversationHistory, rfqContext, userRole } = (body ?? {}) as {
    message?: unknown
    conversationHistory?: unknown
    rfqContext?: unknown
    userRole?: unknown
  }

  if (typeof message !== "string" || !message.trim() || message.length > 2000) {
    return NextResponse.json({ error: "Message is required (max 2000 characters)." }, { status: 400 })
  }

  const history = validateHistory(conversationHistory ?? [])
  if (!history) {
    return NextResponse.json({ error: "Send up to 20 prior messages, each under 4000 characters." }, { status: 400 })
  }

  const role = userRole === "buyer" ? "buyer" : "supplier"
  const contextBlock = typeof rfqContext === "string" ? rfqContext.slice(0, 6000) : ""
  const systemPrompt = contextBlock ? `${BASE_PROMPTS[role]}\n\n${contextBlock}` : BASE_PROMPTS[role]

  const apiKey = process.env.ANTHROPIC_API_KEY
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID

  console.log("Thuso chat: API key present:", !!apiKey, "Workspace ID present:", !!workspaceId, "Workspace ID value:", workspaceId?.slice(0, 8))

  if (!apiKey || !workspaceId) {
    console.error("Thuso workspace chat: missing API key or workspace ID")
    return NextResponse.json({ error: "Thuso workspace: configuration incomplete. Please contact support." }, { status: 502 })
  }

  try {
    console.log("Sending request to Anthropic with workspace ID:", workspaceId)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-workspace-id": workspaceId,
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 500,
        system: systemPrompt,
        messages: [...history, { role: "user", content: message }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Anthropic error", response.status, errorText)
      return NextResponse.json({ error: `Anthropic API error (${response.status}): ${errorText.slice(0, 100)}` }, { status: 502 })
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
    }
    const reply = data.content?.[0]?.text?.trim()

    return NextResponse.json({
      message: reply || "I couldn't put together an answer just now — could you try rephrasing that?",
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("Thuso chat error:", errorMsg)
    return NextResponse.json({ error: `Thuso error: ${errorMsg.slice(0, 100)}` }, { status: 502 })
  }
}

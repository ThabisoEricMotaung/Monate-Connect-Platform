import { NextRequest, NextResponse } from "next/server"
import { THUSO_SYSTEM_PROMPT } from "@/lib/thuso/prompt"

type AssistantMessage = {
  role: "user" | "assistant"
  content: string
}

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
}

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 15
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown"

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  )
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

function validateMessages(value: unknown): AssistantMessage[] | null {
  if (!Array.isArray(value) || value.length > 20) return null

  const messages: AssistantMessage[] = []

  for (const message of value) {
    if (
      !message ||
      typeof message !== "object" ||
      !("role" in message) ||
      !("content" in message)
    ) {
      return null
    }

    const role = message.role
    const content = message.content

    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      content.length > 1000
    ) {
      return null
    }

    messages.push({ role, content })
  }

  return messages
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Thuso needs a quick pause. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const messages = validateMessages(
    body && typeof body === "object" && "messages" in body
      ? body.messages
      : undefined
  )

  if (!messages) {
    return NextResponse.json(
      { error: "Send up to 20 messages, each under 1000 characters." },
      { status: 400 }
    )
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || !THUSO_SYSTEM_PROMPT.trim()) {
    console.error(
      "Thuso config missing: key=",
      !!apiKey,
      "prompt=",
      THUSO_SYSTEM_PROMPT.length
    )

    return NextResponse.json(
      { error: "Thuso is taking a breather — please try again." },
      { status: 502 }
    )
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          { role: "system", content: THUSO_SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    })

    if (!response.ok) {
      console.error("OpenAI error", response.status, await response.text())

      return NextResponse.json(
        { error: "Thuso is taking a breather — please try again." },
        { status: 502 }
      )
    }

    const data = (await response.json()) as OpenAIChatCompletionResponse

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content ?? "",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Thuso is taking a breather — please try again." },
      { status: 502 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { THUSO_SYSTEM_PROMPT } from "@/lib/thuso/prompt"

type TextPart = { type: "text"; text: string }
type ImagePart = { type: "image_url"; image_url: { url: string } }
type ContentPart = TextPart | ImagePart

type AssistantMessage = {
  role: "user" | "assistant"
  content: string | ContentPart[]
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

function validateContent(value: unknown): string | ContentPart[] | null {
  if (typeof value === "string") {
    return value.length <= 2000 ? value : null
  }

  if (!Array.isArray(value) || value.length === 0 || value.length > 2) return null

  const parts: ContentPart[] = []

  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const part = item as Record<string, unknown>

    if (typeof part.type !== "string") return null

    if (part.type === "text") {
      if (typeof part.text !== "string" || part.text.length > 2000) return null
      parts.push({ type: "text", text: part.text })
    } else if (part.type === "image_url") {
      if (!part.image_url || typeof part.image_url !== "object") return null
      const imgObj = part.image_url as Record<string, unknown>
      if (typeof imgObj.url !== "string") return null
      const url = imgObj.url
      if (!url.startsWith("data:image/")) return null
      // ~10 MB base64 string ≈ 7.5 MB binary — enforces the 5 MB file-size limit
      if (url.length > 10_000_000) return null
      parts.push({ type: "image_url", image_url: { url } })
    } else {
      return null
    }
  }

  return parts
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

    const msg = message as { role: unknown; content: unknown }
    const { role, content } = msg

    if (role !== "user" && role !== "assistant") return null

    const validContent = validateContent(content)
    if (validContent === null) return null

    messages.push({ role: role as "user" | "assistant", content: validContent })
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
      ? (body as { messages: unknown }).messages
      : undefined
  )

  if (!messages) {
    return NextResponse.json(
      { error: "Send up to 20 messages, each under 2000 characters." },
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

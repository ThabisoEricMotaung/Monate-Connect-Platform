import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"
import { createServer } from "node:http"

nextEnv.loadEnvConfig(process.cwd())

const restoreUrl = process.env.RESTORE_TARGET_SUPABASE_URL
const restoreServiceRoleKey = process.env.RESTORE_TARGET_SUPABASE_SERVICE_ROLE_KEY

if (!restoreUrl || !restoreServiceRoleKey) {
  throw new Error(
    "RESTORE_TARGET_SUPABASE_URL and RESTORE_TARGET_SUPABASE_SERVICE_ROLE_KEY are required"
  )
}

const testPassphrase = "restore-test-idempotency-passphrase"
process.env.NEXT_PUBLIC_SUPABASE_URL = restoreUrl
process.env.SUPABASE_SERVICE_ROLE_KEY = restoreServiceRoleKey
process.env.PAYFAST_PASSPHRASE = testPassphrase
process.env.PAYFAST_VALID_IPS = "127.0.0.1"

const admin = createClient(restoreUrl, restoreServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { generatePayFastSignature, PAYFAST_VALIDATE_URL } = await import(
  "../src/lib/payfast-server"
)

const originalFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  if (url === PAYFAST_VALIDATE_URL) {
    return new Response("VALID", { status: 200 })
  }
  return originalFetch(input, init)
}

const { POST } = await import("../src/app/api/payfast/notify/route")

const runId = `codex-itn-${Date.now()}`
const sequentialPaymentId = `${runId}-sequential`
const concurrentPaymentId = `${runId}-concurrent`

async function createTestUser(label: string) {
  const email = `${runId}-${label}@restore-test.local`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `Restore-${Date.now()}-Test!`,
  })
  if (error || !data.user) {
    throw new Error(`Could not create ${label} test user: ${error?.message ?? "no user returned"}`)
  }
  return data.user
}

function buildPayload(userId: string, paymentId: string) {
  const fields: Record<string, string> = {
    m_payment_id: `merchant-${paymentId}`,
    pf_payment_id: paymentId,
    payment_status: "COMPLETE",
    amount_gross: "299.00",
    amount_fee: "-7.00",
    amount_net: "292.00",
    custom_str1: userId,
    custom_str2: "supplier",
    custom_str3: "monthly",
    token: `token-${paymentId}`,
    billing_date: "2026-08-28",
  }
  return {
    ...fields,
    signature: generatePayFastSignature(fields, testPassphrase, true),
  }
}

async function stateFor(paymentId: string, userId: string) {
  const [logsResult, subscriptionResult, mutationsResult] = await Promise.all([
    admin
      .from("payfast_itn_logs")
      .select("id,validation_status,validation_errors,created_at")
      .eq("payfast_payment_id", paymentId)
      .order("created_at", { ascending: true }),
    admin
      .from("subscriptions")
      .select("user_id,status,payfast_payment_id,merchant_payment_id,updated_at")
      .eq("user_id", userId),
    admin
      .from("payfast_test_subscription_mutations")
      .select("id,operation,user_id,payfast_payment_id,occurred_at")
      .eq("payfast_payment_id", paymentId)
      .order("id", { ascending: true }),
  ])

  for (const [label, result] of [
    ["logs", logsResult],
    ["subscription", subscriptionResult],
    ["mutations", mutationsResult],
  ] as const) {
    if (result.error) {
      throw new Error(`Could not read ${label} state: ${result.error.message}`)
    }
  }

  return {
    logs: logsResult.data,
    subscription: subscriptionResult.data,
    mutations: mutationsResult.data,
  }
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = []
    for await (const chunk of incoming) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }

    const headers = new Headers()
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item))
      else if (value !== undefined) headers.set(name, value)
    }

    const request = new Request(`http://127.0.0.1${incoming.url ?? "/notify"}`, {
      method: incoming.method ?? "POST",
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    })
    const response = await POST(request)
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()))
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "text/plain" })
    outgoing.end(error instanceof Error ? error.message : "Unknown harness error")
  }
})

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const address = server.address()
if (!address || typeof address === "string") throw new Error("Test server did not expose a port")
const endpoint = `http://127.0.0.1:${address.port}/api/payfast/notify`

async function sendPayload(payload: Record<string, string>) {
  const startedAt = performance.now()
  const response = await originalFetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": "127.0.0.1",
    },
    body: new URLSearchParams(payload),
  })
  return {
    status: response.status,
    body: await response.text(),
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
  }
}

const sequentialUser = await createTestUser("sequential")
const concurrentUser = await createTestUser("concurrent")
const sequentialPayload = buildPayload(sequentialUser.id, sequentialPaymentId)
const concurrentPayload = buildPayload(concurrentUser.id, concurrentPaymentId)

console.log(JSON.stringify({
  runId,
  endpoint,
  before: {
    sequential: await stateFor(sequentialPaymentId, sequentialUser.id),
    concurrent: await stateFor(concurrentPaymentId, concurrentUser.id),
  },
}, null, 2))

const sequentialResponses = [
  await sendPayload(sequentialPayload),
  await sendPayload(sequentialPayload),
]

console.log(JSON.stringify({
  sequential: {
    paymentId: sequentialPaymentId,
    responses: sequentialResponses,
    after: await stateFor(sequentialPaymentId, sequentialUser.id),
  },
}, null, 2))

const concurrentResponses = await Promise.all([
  sendPayload(concurrentPayload),
  sendPayload(concurrentPayload),
])

console.log(JSON.stringify({
  concurrent: {
    paymentId: concurrentPaymentId,
    responses: concurrentResponses,
    after: await stateFor(concurrentPaymentId, concurrentUser.id),
  },
}, null, 2))

server.close()
globalThis.fetch = originalFetch

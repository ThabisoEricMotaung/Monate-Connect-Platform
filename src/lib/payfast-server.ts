import crypto from "node:crypto"
import dns from "node:dns/promises"
import { payfastPlans, type PayFastPlan, type PayFastTier } from "@/lib/payfast-plans"

export const PAYFAST_PROCESS_URL = "https://www.payfast.co.za/eng/process"
export const PAYFAST_VALIDATE_URL = "https://www.payfast.co.za/eng/query/validate"

const PAYFAST_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
]

const DEFAULT_PAYFAST_IP_RANGES = [
  "197.97.145.144/28",
  "41.74.179.192/27",
  "102.216.36.0/28",
  "102.216.36.128/28",
  "144.126.193.139",
]

export type PayFastFields = Record<string, string>

const PAYFAST_SIGNATURE_FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "payment_method",
  "subscription_type",
  "billing_date",
  "recurring_amount",
  "frequency",
  "cycles",
  "token",
  "payment_status",
  "pf_payment_id",
  "amount_gross",
  "amount_fee",
  "amount_net",
  "type",
  "next_run",
] as const

function encodePayFastValue(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, "+")
}

export function toPayFastParamString(fields: PayFastFields, includeSignature = false): string {
  const orderedKeys = [
    ...PAYFAST_SIGNATURE_FIELD_ORDER.filter((key) => key in fields),
    ...Object.keys(fields).filter((key) => !PAYFAST_SIGNATURE_FIELD_ORDER.includes(key as (typeof PAYFAST_SIGNATURE_FIELD_ORDER)[number])),
  ]

  return orderedKeys
    .filter((key) => fields[key] !== "" && (includeSignature || key !== "signature"))
    .map((key) => `${key}=${encodePayFastValue(fields[key])}`)
    .join("&")
}

export function generatePayFastSignature(fields: PayFastFields, passphrase: string): string {
  const paramString = toPayFastParamString(fields)
  const signedString = passphrase
    ? `${paramString}&passphrase=${encodePayFastValue(passphrase)}`
    : paramString

  return crypto.createHash("md5").update(signedString).digest("hex")
}

function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getRequiredPayFastEnv() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  const passphrase = process.env.PAYFAST_PASSPHRASE
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  const missing = [
    ["PAYFAST_MERCHANT_ID", merchantId],
    ["PAYFAST_MERCHANT_KEY", merchantKey],
    ["PAYFAST_PASSPHRASE", passphrase],
    ["NEXT_PUBLIC_APP_URL or APP_URL", appUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    return { ok: false as const, missing }
  }

  return {
    ok: true as const,
    merchantId: merchantId!,
    merchantKey: merchantKey!,
    passphrase: passphrase!,
    appUrl: appUrl!.replace(/\/$/, ""),
  }
}

export function buildPayFastSubscriptionFields(input: {
  plan: PayFastPlan
  userId: string
  email?: string | null
  appUrl: string
  merchantId: string
  merchantKey: string
  passphrase: string
}): PayFastFields {
  const billingDate = new Date()
  billingDate.setUTCDate(billingDate.getUTCDate() + 1)

  const merchantPaymentId = `sub-${Date.now()}-${input.userId.slice(0, 8)}`
  const fields: PayFastFields = {
    merchant_id: input.merchantId,
    merchant_key: input.merchantKey,
    return_url: `${input.appUrl}/billing/return`,
    cancel_url: `${input.appUrl}/billing/cancel`,
    notify_url: `${input.appUrl}/api/payfast/notify`,
    email_address: input.email ?? "",
    m_payment_id: merchantPaymentId,
    amount: formatAmount(input.plan.amount),
    item_name: input.plan.itemName,
    item_description: input.plan.itemDescription,
    custom_str1: input.userId,
    custom_str2: input.plan.tier,
    custom_str3: input.plan.billingFrequency,
    subscription_type: "1",
    billing_date: formatDate(billingDate),
    recurring_amount: formatAmount(input.plan.amount),
    frequency: input.plan.payfastFrequency,
    cycles: "0",
  }

  return {
    ...fields,
    signature: generatePayFastSignature(fields, input.passphrase),
  }
}

export function parsePayFastBody(body: string): PayFastFields {
  const params = new URLSearchParams(body)
  const fields: PayFastFields = {}

  params.forEach((value, key) => {
    fields[key] = value
  })

  return fields
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? ""

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("fastly-client-ip") ??
    ""
  )
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null
  }

  return parts.reduce((acc, part) => (acc << 8) + part, 0) >>> 0
}

function matchesCidr(ip: string, range: string): boolean {
  if (!range.includes("/")) return ip === range

  const [baseIp, prefixText] = range.split("/")
  const prefix = Number(prefixText)
  const ipNum = ipv4ToNumber(ip)
  const baseNum = ipv4ToNumber(baseIp)

  if (ipNum === null || baseNum === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipNum & mask) === (baseNum & mask)
}

export function getAllowedPayFastIpRanges(): string[] {
  const configuredRanges = process.env.PAYFAST_VALID_IPS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return configuredRanges?.length ? configuredRanges : DEFAULT_PAYFAST_IP_RANGES
}

export async function isAllowedPayFastIp(ip: string, ranges = getAllowedPayFastIpRanges()): Promise<boolean> {
  if (!ip) return false

  const ipSet = new Set(ranges)

  try {
    const hostResults = await Promise.all(
      PAYFAST_HOSTS.map(async (host) => {
        try {
          const addresses = await dns.lookup(host, { all: true })
          return addresses.map((entry) => entry.address)
        } catch {
          return [] as string[]
        }
      })
    )

    hostResults.flat().forEach((hostIp) => ipSet.add(hostIp))
  } catch {
    // Fall back to the configured ranges when DNS lookup is unavailable.
  }

  return [...ipSet].some((range) => matchesCidr(ip, range))
}

export async function validatePayFastServerConfirmation(paramString: string): Promise<boolean> {
  const response = await fetch(PAYFAST_VALIDATE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: paramString,
  })

  const text = (await response.text()).trim()
  return text === "VALID"
}

export function statusFromPayFast(paymentStatus?: string, webhookType?: string) {
  const normalizedStatus = paymentStatus?.toUpperCase()
  const normalizedType = webhookType?.toLowerCase()

  if (normalizedStatus === "COMPLETE") return "active"
  if (normalizedStatus === "CANCELLED" || normalizedType === "subscription.cancelled") return "cancelled"
  if (normalizedStatus === "FAILED") return "past_due"

  return "pending"
}

export function nextBillingDateFromPayload(fields: PayFastFields, tier: PayFastTier): string | null {
  if (fields.next_run) return fields.next_run
  if (fields.billing_date) return fields.billing_date

  const plan = payfastPlans[tier]
  const nextDate = new Date()
  if (plan.billingFrequency === "annual") {
    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1)
  } else {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1)
  }

  return formatDate(nextDate)
}

import { createHash, randomInt } from "crypto"

export const OTP_EXPIRY_MINUTES = 10
export const OTP_COOLDOWN_SECONDS = 60
export const OTP_MAX_ATTEMPTS = 5

export function normalizeSAPhone(value: unknown) {
  if (typeof value !== "string") return null

  const compact = value.replace(/[\s\-()]/g, "")
  const digits = compact.replace(/\D/g, "")

  if (compact.startsWith("+27") && /^\+27\d{9}$/.test(compact)) return compact
  if (digits.startsWith("0") && digits.length === 10) return `+27${digits.slice(1)}`
  if (digits.startsWith("27") && digits.length === 11) return `+${digits}`

  return null
}

export function normalizeOtpCode(value: unknown) {
  if (typeof value !== "string") return null
  const code = value.trim()
  return /^\d{6}$/.test(code) ? code : null
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex")
}

export function otpExpiryDate(now = new Date()) {
  return new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000)
}

export function otpSentAtFromExpiry(expiresAt: string | null | undefined) {
  if (!expiresAt) return null
  const expiresTime = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiresTime)) return null
  return new Date(expiresTime - OTP_EXPIRY_MINUTES * 60 * 1000)
}

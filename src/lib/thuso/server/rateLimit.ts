/**
 * Fixed-window limiter held in memory. It bounds bursts per server instance;
 * it is not a global quota (serverless instances do not share it).
 */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const windows = new Map<string, { count: number; resetAt: number }>()

  return function isLimited(key: string, now = Date.now()): boolean {
    const current = windows.get(key)
    if (!current || current.resetAt <= now) {
      if (windows.size > 5000) {
        for (const [entryKey, entry] of windows) if (entry.resetAt <= now) windows.delete(entryKey)
      }
      windows.set(key, { count: 1, resetAt: now + windowMs })
      return false
    }
    if (current.count >= max) return true
    current.count += 1
    return false
  }
}

export function clientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown"
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown"
}

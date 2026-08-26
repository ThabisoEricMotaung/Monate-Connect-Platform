import { createClient } from "@supabase/supabase-js"

/**
 * Collector lock to prevent overlapping runs
 * Uses Supabase as distributed lock store
 */
export class CollectorLock {
  private supabase: ReturnType<typeof createClient>
  private lockKey = "collector_lock"
  private lockDurationMs = 15 * 60 * 1000 // 15 minute TTL

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error("Missing Supabase credentials for lock")
    }

    this.supabase = createClient(url, key)
  }

  /**
   * Acquire lock (returns true if acquired, false if already locked)
   */
  async acquire(): Promise<boolean> {
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + this.lockDurationMs)

      // Try to insert lock record
      const { error } = await this.supabase.from("collector_locks").insert({
        lock_key: this.lockKey,
        acquired_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })

      if (error) {
        // Lock already exists
        console.log("[CollectorLock] Lock already held")
        return false
      }

      console.log("[CollectorLock] Lock acquired")
      return true
    } catch (error) {
      console.error("[CollectorLock] Failed to acquire:", error)
      // Fail open - allow collection to proceed
      return true
    }
  }

  /**
   * Release lock
   */
  async release(): Promise<void> {
    try {
      await this.supabase.from("collector_locks").delete().eq("lock_key", this.lockKey)
      console.log("[CollectorLock] Lock released")
    } catch (error) {
      console.error("[CollectorLock] Failed to release:", error)
    }
  }

  /**
   * Check if lock is held and not expired
   */
  async isLocked(): Promise<boolean> {
    try {
      const now = new Date().toISOString()
      const { data } = await this.supabase
        .from("collector_locks")
        .select("expires_at")
        .eq("lock_key", this.lockKey)
        .gt("expires_at", now)
        .single()

      return !!data
    } catch {
      return false
    }
  }
}

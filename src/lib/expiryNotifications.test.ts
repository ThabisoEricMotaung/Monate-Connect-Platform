import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const { createNotificationMock } = vi.hoisted(() => ({
  createNotificationMock: vi.fn(),
}))

vi.mock("@/lib/notifications", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/notifications")>()
  return { ...original, createNotification: createNotificationMock }
})

import {
  createExpiryNotification,
  getExpiringDocuments,
  processExpiringDocuments,
} from "@/lib/expiryNotifications"

type DocumentRow = {
  id: string
  profile_id: string
  document_type: string
  expiry_date: string
  status: string
}

type LedgerRow = {
  profile_id: string
  record_type: string
  record_id: string
  window_days: number
  notified_for_date: string
}

class QueryBuilder implements PromiseLike<{ data: unknown; error: null }> {
  private filters = new Map<string, unknown>()
  private operation: "select" | "insert" = "select"
  private inserted: unknown = null

  constructor(
    private table: string,
    private database: FakeDatabase,
  ) {}

  select() {
    this.operation = "select" as const
    return this
  }

  insert(value: unknown) {
    this.operation = "insert"
    this.inserted = value
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.set(column, value)
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.set(`${column}:in`, value)
    return this
  }

  gt(column: string, value: unknown) {
    this.filters.set(`${column}:gt`, value)
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.set(`${column}:lte`, value)
    return this
  }

  maybeSingle() {
    return this.resolve(true)
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.resolve(false).then(onfulfilled, onrejected)
  }

  private async resolve(single: boolean) {
    if (this.operation === "insert") {
      if (this.table === "compliance_expiry_notifications") {
        this.database.ledger.push(this.inserted as LedgerRow)
      }
      return { data: null, error: null }
    }

    if (this.table === "profiles") {
      const id = this.filters.get("id") as string
      const data = this.database.profileIds.has(id) ? { id } : null
      return { data, error: null }
    }

    if (this.table === "compliance_expiry_notifications") {
      const match = this.database.ledger.find((row) =>
        row.record_type === this.filters.get("record_type") &&
        row.record_id === this.filters.get("record_id") &&
        row.window_days === this.filters.get("window_days") &&
        row.notified_for_date === this.filters.get("notified_for_date"),
      )
      return { data: match ? { id: "ledger-id" } : null, error: null }
    }

    const statuses = this.filters.get("status:in") as string[]
    const documentTypes = this.filters.get("document_type:in") as string[]
    const after = this.filters.get("expiry_date:gt") as string
    const through = this.filters.get("expiry_date:lte") as string
    const rows = this.database.documents.filter((document) =>
      statuses.includes(document.status) &&
      documentTypes.includes(document.document_type) &&
      document.expiry_date > after &&
      document.expiry_date <= through,
    )
    return { data: single ? rows[0] ?? null : rows, error: null }
  }
}

class FakeDatabase {
  documents: DocumentRow[] = []
  profileIds = new Set<string>()
  ledger: LedgerRow[] = []

  from(table: string) {
    return new QueryBuilder(table, this)
  }
}

const NOW = new Date("2026-08-14T12:00:00Z")
const dateFromNow = (days: number) => {
  const date = new Date(NOW)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function asClient(database: FakeDatabase): SupabaseClient {
  return database as unknown as SupabaseClient
}

describe("expiry notifications", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    createNotificationMock.mockReset()
    createNotificationMock.mockResolvedValue({ id: 1 })
  })

  afterEach(() => vi.useRealTimers())

  it("returns only approved or verified compliance documents in exact reminder windows", async () => {
    const database = new FakeDatabase()
    database.documents = [
      { id: "30", profile_id: "p1", document_type: "csd", expiry_date: dateFromNow(30), status: "approved" },
      { id: "14", profile_id: "p1", document_type: "bbbee", expiry_date: dateFromNow(14), status: "verified" },
      { id: "1", profile_id: "p1", document_type: "cidb", expiry_date: dateFromNow(1), status: "verified" },
      { id: "15", profile_id: "p1", document_type: "tax_clearance", expiry_date: dateFromNow(15), status: "verified" },
      { id: "expired", profile_id: "p1", document_type: "csd", expiry_date: dateFromNow(-1), status: "verified" },
      { id: "future", profile_id: "p1", document_type: "csd", expiry_date: dateFromNow(31), status: "verified" },
      { id: "wrong-status", profile_id: "p1", document_type: "csd", expiry_date: dateFromNow(30), status: "under_review" },
      { id: "wrong-type", profile_id: "p1", document_type: "cipc", expiry_date: dateFromNow(30), status: "verified" },
    ]

    const result = await getExpiringDocuments(30, NOW, asClient(database))

    expect(result.map(({ id, window_days }) => [id, window_days])).toEqual([
      ["30", 30],
      ["14", 14],
      ["1", 1],
    ])
  })

  it("creates the expected compliance notification", async () => {
    const database = new FakeDatabase()
    database.profileIds.add("profile-1")

    await createExpiryNotification(
      "profile-1",
      "csd",
      "CSD",
      "2026-09-13",
      30,
      asClient(database),
    )

    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "profile-1",
        type: "Compliance Expiry Warning",
        title: "CSD expires in 30 days",
        message: "Your CSD registration will expire on 2026-09-13",
        link: "/dashboard/profile?tab=documents",
      }),
      asClient(database),
    )
  })

  it("gracefully skips a document whose profile no longer exists", async () => {
    const database = new FakeDatabase()
    const result = await createExpiryNotification(
      "missing-profile",
      "csd",
      "CSD",
      dateFromNow(30),
      30,
      asClient(database),
    )

    expect(result).toBeNull()
    expect(createNotificationMock).not.toHaveBeenCalled()
  })

  it("records a successful notification and skips it on the second run", async () => {
    const database = new FakeDatabase()
    database.profileIds.add("profile-1")
    database.documents = [
      {
        id: "document-1",
        profile_id: "profile-1",
        document_type: "tax_clearance",
        expiry_date: dateFromNow(14),
        status: "verified",
      },
    ]

    const first = await processExpiringDocuments(30, asClient(database))
    const second = await processExpiringDocuments(30, asClient(database))

    expect(first).toEqual({ notificationsCreated: 1, duplicatesSkipped: 0, errors: [] })
    expect(second).toEqual({ notificationsCreated: 0, duplicatesSkipped: 1, errors: [] })
    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    expect(database.ledger).toHaveLength(1)
  })
})

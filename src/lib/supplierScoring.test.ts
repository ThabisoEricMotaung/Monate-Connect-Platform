import { describe, expect, it } from "vitest"
import { getCanonicalSupplierSmartScoreBatch } from "./supplierScoring"

type Row = Record<string, unknown>

function queryBuilder(rows: Row[]) {
  let filtered = rows
  const builder = {
    in(column: string, values: unknown[]) {
      filtered = filtered.filter((row) => values.includes(row[column]))
      return builder
    },
    eq(column: string, value: unknown) {
      filtered = filtered.filter((row) => row[column] === value)
      return builder
    },
    order() {
      return builder
    },
    then(onFulfilled: (result: { data: Row[]; error: null }) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled)
    },
  }
  return builder
}

function fakeClient(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      return {
        select() {
          return queryBuilder(tables[table] ?? [])
        },
      }
    },
  }
}

function baseProfile(id: string) {
  return {
    id,
    role: "supplier",
    business_name: "Example Supplier",
    industry: "Professional Services",
    province: "Gauteng",
    provinces: ["Gauteng"],
    phone: "+27821234567",
    email: "supplier@example.test",
    description: "An established supplier profile.",
    bbbee_level: "Level 2",
    updated_at: "2026-01-01T00:00:00.000Z",
  }
}

function csdDocument(profileId: string, expiryDate: string | null) {
  return {
    id: `${profileId}-csd`,
    profile_id: profileId,
    document_type: "csd",
    file_url: "https://evidence.test/csd.pdf",
    status: "approved",
    uploaded_at: "2026-01-01T00:00:00.000Z",
    reviewed_at: "2026-01-01T00:00:00.000Z",
    expiry_date: expiryDate,
  }
}

describe("getCanonicalSupplierSmartScoreBatch", () => {
  it("does not treat an expired CSD document as approved", async () => {
    const client = fakeClient({
      profiles: [baseProfile("expired-supplier")],
      supplier_documents: [csdDocument("expired-supplier", "2020-01-01")],
    })

    const results = await getCanonicalSupplierSmartScoreBatch({ supplierIds: ["expired-supplier"], client })
    const record = results["expired-supplier"]

    expect(record.input.verification_state.csd.status).toBe("expired")
    expect(record.input.verification_state.csd.approved).toBe(false)
  })

  it("still treats an unexpired CSD document as approved", async () => {
    const client = fakeClient({
      profiles: [baseProfile("valid-supplier")],
      supplier_documents: [csdDocument("valid-supplier", "2099-01-01")],
    })

    const results = await getCanonicalSupplierSmartScoreBatch({ supplierIds: ["valid-supplier"], client })
    const record = results["valid-supplier"]

    expect(record.input.verification_state.csd.status).toBe("approved")
    expect(record.input.verification_state.csd.approved).toBe(true)
  })

  it("scores an expired CSD document lower than an unexpired one, all else equal", async () => {
    const client = fakeClient({
      profiles: [baseProfile("expired-supplier"), baseProfile("valid-supplier")],
      supplier_documents: [
        csdDocument("expired-supplier", "2020-01-01"),
        csdDocument("valid-supplier", "2099-01-01"),
      ],
    })

    const results = await getCanonicalSupplierSmartScoreBatch({
      supplierIds: ["expired-supplier", "valid-supplier"],
      client,
    })

    expect(results["expired-supplier"].result.score).toBeLessThan(results["valid-supplier"].result.score)
  })
})

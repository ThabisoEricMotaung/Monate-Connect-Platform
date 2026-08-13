import { beforeEach, describe, expect, it, vi } from "vitest"

const { processExpiringDocumentsMock } = vi.hoisted(() => ({
  processExpiringDocumentsMock: vi.fn(),
}))

vi.mock("@/lib/expiryNotifications", () => ({
  processExpiringDocuments: processExpiringDocumentsMock,
}))

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: { from: vi.fn() },
}))

import { GET } from "@/app/api/cron/check-document-expiry/route"

describe("check-document-expiry cron", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret")
    processExpiringDocumentsMock.mockReset()
  })

  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("https://example.test/api/cron/check-document-expiry"))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" })
    expect(processExpiringDocumentsMock).not.toHaveBeenCalled()
  })

  it("returns the expiry-processing summary", async () => {
    processExpiringDocumentsMock.mockResolvedValue({
      notificationsCreated: 2,
      duplicatesSkipped: 1,
      errors: [],
    })

    const response = await GET(
      new Request("https://example.test/api/cron/check-document-expiry", {
        headers: { authorization: "Bearer test-secret" },
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      notificationsCreated: 2,
      duplicatesSkipped: 1,
      errors: [],
    })
    expect(processExpiringDocumentsMock).toHaveBeenCalledWith(30, expect.anything())
  })

  it("returns a 500 response when processing fails", async () => {
    processExpiringDocumentsMock.mockRejectedValue(new Error("database unavailable"))

    const response = await GET(
      new Request("https://example.test/api/cron/check-document-expiry", {
        headers: { "x-cron-secret": "test-secret" },
      }),
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ ok: false, error: "database unavailable" })
  })
})

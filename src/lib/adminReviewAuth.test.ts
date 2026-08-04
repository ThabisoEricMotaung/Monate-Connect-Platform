import { describe, expect, it, vi } from "vitest"
import { authenticateReviewer } from "./adminReviewAuth"

function client(role: string | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "reviewer-1" } }, error: null }) },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }) }) }) })),
  }
}

describe("review authorization", () => {
  it("rejects unauthorized supplier access", async () => {
    const result = await authenticateReviewer(new Request("http://local", { headers: { authorization: "Bearer token" } }), client("supplier") as never)
    expect(result).toMatchObject({ ok: false, status: 403 })
  })
  it("allows explicit reviewer access", async () => {
    const result = await authenticateReviewer(new Request("http://local", { headers: { authorization: "Bearer token" } }), client("reviewer") as never)
    expect(result.ok).toBe(true)
  })
})

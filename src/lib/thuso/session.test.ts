import { describe, expect, it, vi } from "vitest"
import { rfqIdFromSearch, STORAGE_KEY, ThusoSession, type ThusoState } from "./session"

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return { promise, resolve }
}

function reply(body: Record<string, unknown>, ok = true, status = 200) {
  return { ok, status, json: async () => body }
}

/** A fetch whose responses are released by the test, honouring abort. */
function controllableFetch() {
  const calls: Array<{ body: Record<string, unknown>; signal: AbortSignal; release: (body: Record<string, unknown>) => void }> = []
  const fetch = vi.fn((_url: string, init: RequestInit) => {
    const gate = deferred<Record<string, unknown>>()
    const signal = init.signal as AbortSignal
    calls.push({ body: JSON.parse(String(init.body)), signal, release: gate.resolve })
    return new Promise<ReturnType<typeof reply>>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
      gate.promise.then((body) => resolve(reply(body)))
    })
  })
  return { fetch, calls }
}

const messages = (state: ThusoState) => state.entries.filter((entry) => entry.kind === "message").map((entry) => entry.content)

describe("ThusoSession", () => {
  it("does not send until the browser session has been checked", async () => {
    const { fetch } = controllableFetch()
    const session = new ThusoSession({ fetch, storage: memoryStorage() })
    await session.send("Hello")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends a record reference only, never record text or role", async () => {
    const { fetch, calls } = controllableFetch()
    const session = new ThusoSession({ fetch, storage: memoryStorage() })
    session.setOwner("user:a")
    session.setContext({ type: "rfq", id: 7, label: "Tender 7" })
    const sent = session.send("What is due?")
    expect(calls[0].body).toEqual({ message: "What is due?", history: [], historyScope: null, context: { type: "rfq", id: 7 } })
    calls[0].release({ message: "Answer", viewer: "supplier", context: { type: "rfq", id: 7, title: "Road signage" } })
    await sent
    expect(session.getState().context?.label).toBe("Road signage")
    expect(session.getState().viewer).toBe("supplier")
  })

  it("drops an in-flight reply when the account signs out, and aborts the request", async () => {
    const storage = memoryStorage()
    const { fetch, calls } = controllableFetch()
    const session = new ThusoSession({ fetch, storage })
    session.setOwner("user:a")
    const sent = session.send("Private question")
    session.setOwner("anon")
    expect(calls[0].signal.aborted).toBe(true)
    calls[0].release({ message: "Answer meant for user a" })
    await sent
    expect(session.getState()).toMatchObject({ owner: "anon", entries: [], pending: false, context: null })
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
  })

  it("never shows a reply in another account's session after a switch", async () => {
    const calls: Array<(value: unknown) => void> = []
    // A fetch that ignores abort, to prove the epoch check alone is enough.
    const fetch = vi.fn(() => new Promise<ReturnType<typeof reply>>((resolve) => calls.push(() => resolve(reply({ message: "For A" })))))
    const session = new ThusoSession({ fetch, storage: memoryStorage() })
    session.setOwner("user:a")
    const sent = session.send("Question from A")
    session.setOwner("user:b")
    calls[0](undefined)
    await sent
    expect(messages(session.getState())).toEqual([])
    expect(session.getState().owner).toBe("user:b")
  })

  it("restores the conversation only for the same owner", () => {
    const stored = JSON.stringify({ owner: "user:a", entries: [{ id: "1", kind: "message", role: "user", content: "Earlier" }], context: { type: "rfq", id: 3, label: "Tender 3" } })

    const same = new ThusoSession({ fetch: vi.fn(), storage: memoryStorage({ [STORAGE_KEY]: stored }) })
    same.setOwner("user:a")
    expect(messages(same.getState())).toEqual(["Earlier"])
    expect(same.getState().context?.id).toBe(3)

    const otherStorage = memoryStorage({ [STORAGE_KEY]: stored })
    const other = new ThusoSession({ fetch: vi.fn(), storage: otherStorage })
    other.setOwner("user:b")
    expect(other.getState().entries).toEqual([])
    expect(JSON.parse(otherStorage.data.get(STORAGE_KEY)!).owner).toBe("user:b")
  })

  it("keeps a record selected before the session resolved over the restored one", () => {
    const stored = JSON.stringify({ owner: "user:a", entries: [], context: { type: "rfq", id: 3, label: "Tender 3" } })
    const session = new ThusoSession({ fetch: vi.fn(), storage: memoryStorage({ [STORAGE_KEY]: stored }) })
    session.setContext({ type: "rfq", id: 9, label: "RFQ #9" })
    session.setOwner("user:a")
    expect(session.getState().context?.id).toBe(9)
    expect(session.getState().entries.at(-1)).toMatchObject({ kind: "notice", content: "Now discussing: RFQ #9" })
  })

  it("labels every context change", () => {
    const session = new ThusoSession({ fetch: vi.fn(), storage: null })
    session.setOwner("anon")
    session.setContext({ type: "rfq", id: 1, label: "Tender 1" })
    session.setContext({ type: "rfq", id: 1, label: "Tender 1" })
    session.setContext({ type: "rfq", id: 2, label: "Tender 2" })
    session.setContext(null)
    expect(session.getState().entries.map((entry) => entry.content)).toEqual([
      "Now discussing: Tender 1",
      "Now discussing: Tender 2",
      "Now giving general help (no tender selected)",
    ])
  })

  it("falls back to general help when the server refuses the record", async () => {
    const fetch = vi.fn(async () => reply({ error: "That tender or RFQ isn't available to you.", code: "context_unavailable" }, false, 404))
    const session = new ThusoSession({ fetch, storage: null })
    session.setOwner("anon")
    session.setContext({ type: "rfq", id: 202, label: "RFQ #202" })
    await session.send("Tell me about it")
    const state = session.getState()
    expect(state.context).toBeNull()
    expect(state.entries.slice(-2).map((entry) => entry.content)).toEqual([
      "That tender or RFQ isn't available to you.",
      "Now giving general help (no tender selected)",
    ])
  })

  it("sends back exactly the window the server signed, never one rebuilt from the transcript", async () => {
    const bodies: Array<Record<string, unknown>> = []
    let n = 0
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)))
      n += 1
      // The server's window deliberately differs from the visible transcript.
      return reply({ message: `Reply ${n}`, historyScope: `token-${n}`, history: [{ role: "assistant", content: `signed window ${n}` }] })
    })
    const session = new ThusoSession({ fetch, storage: memoryStorage() })
    session.setOwner("user:a")
    session.setContext({ type: "rfq", id: 202, label: "Private RFQ" })
    await session.send("Private question")
    await session.send("Follow-up")
    expect(bodies[1]).toMatchObject({ historyScope: "token-1", history: [{ role: "assistant", content: "signed window 1" }] })

    session.setContext({ type: "rfq", id: 101, label: "Public tender" })
    expect(session.getState().signed).toBeNull()
    await session.send("About this one")
    expect(bodies[2]).toMatchObject({ history: [], historyScope: null, context: { type: "rfq", id: 101 } })

    session.setContext(null)
    await session.send("General")
    expect(bodies[3]).toMatchObject({ history: [], historyScope: null, context: null })
  })

  it("keeps the signed window unchanged after a failed request", async () => {
    let call = 0
    const fetch = vi.fn(async () => {
      call += 1
      if (call === 2) return reply({ error: "Busy" }, false, 502)
      return reply({ message: "ok", historyScope: `token-${call}`, history: [{ role: "user", content: `w${call}` }] })
    })
    const session = new ThusoSession({ fetch, storage: null })
    session.setOwner("user:a")
    await session.send("one")
    await session.send("two")
    expect(session.getState().signed).toEqual({ token: "token-1", turns: [{ role: "user", content: "w1" }] })
  })

  it("does not keep a signed window if the record changed while the reply was in flight", async () => {
    const { fetch, calls } = controllableFetch()
    const session = new ThusoSession({ fetch, storage: null })
    session.setOwner("user:a")
    session.setContext({ type: "rfq", id: 1, label: "One" })
    const sent = session.send("Question")
    session.setContext({ type: "rfq", id: 2, label: "Two" })
    calls[0].release({ message: "Answer", historyScope: "token-for-1", history: [] })
    await sent
    expect(session.getState().signed).toBeNull()
  })

  it("survives navigation by persisting each change for the owner", async () => {
    const storage = memoryStorage()
    const fetch = vi.fn(async () => reply({ message: "Hi there" }))
    const first = new ThusoSession({ fetch, storage })
    first.setOwner("user:a")
    await first.send("Hello")
    const second = new ThusoSession({ fetch, storage })
    second.setOwner("user:a")
    expect(messages(second.getState())).toEqual(["Hello", "Hi there"])
  })
})

describe("rfqIdFromSearch", () => {
  it("accepts rfqId and the legacy rfq_id", () => {
    expect(rfqIdFromSearch("?rfqId=12")).toBe(12)
    expect(rfqIdFromSearch("?rfq_id=34")).toBe(34)
    expect(rfqIdFromSearch("?rfqId=12&rfq_id=34")).toBe(12)
  })

  it("rejects anything that is not a positive whole number", () => {
    for (const search of ["", "?rfqId=", "?rfqId=0", "?rfqId=-3", "?rfqId=1.5", "?rfq_id=abc", "?rfqId=1;drop"]) {
      expect(rfqIdFromSearch(search)).toBeNull()
    }
  })
})

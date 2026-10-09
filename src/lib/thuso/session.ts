/**
 * The one Thuso conversation in the browser. Framework-free so its account
 * and in-flight rules can be tested without a DOM; ThusoProvider wraps it.
 *
 * - The conversation belongs to an owner ("anon" or "user:<id>"). When the
 *   owner changes (sign-out, sign-in, account switch) everything is cleared,
 *   the stored copy is removed and any in-flight request is aborted; a reply
 *   that still arrives is dropped because its epoch no longer matches.
 * - It is kept in sessionStorage so it survives reloads in the same tab, and
 *   only restored for the same owner.
 * - Context is a record reference ({ type, id }); the server decides what the
 *   viewer may see and returns the title. Changes are shown as notices.
 */

export type ThusoContextRef = { type: "rfq"; id: number; label: string }
export type ThusoViewerLabel = "anonymous" | "unverified" | "supplier" | "buyer" | "admin"

export type ThusoEntry =
  | { id: string; kind: "message"; role: "user" | "assistant"; content: string }
  | { id: string; kind: "notice"; tone: "context" | "error"; content: string }

export type ThusoState = {
  /** null until the browser session has been checked. */
  owner: string | null
  entries: ThusoEntry[]
  context: ThusoContextRef | null
  pending: boolean
  viewer: ThusoViewerLabel | null
  /**
   * The history window the server last signed for this viewer and record,
   * sent back verbatim. Never assembled from the transcript; reset whenever
   * the record or account changes.
   */
  signed: SignedHistory | null
}

export type ChatTurn = { role: "user" | "assistant"; content: string }
export type SignedHistory = { token: string; turns: ChatTurn[] }

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">
type FetchLike = (input: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>

export const STORAGE_KEY = "thuso.conversation.v1"
const MAX_STORED_ENTRIES = 60

const INITIAL: ThusoState = { owner: null, entries: [], context: null, pending: false, viewer: null, signed: null }

export function contextNotice(context: ThusoContextRef | null): string {
  return context ? `Now discussing: ${context.label}` : "Now giving general help (no tender selected)"
}

export class ThusoSession {
  private state: ThusoState = INITIAL
  private listeners = new Set<() => void>()
  private epoch = 0
  private inFlight: AbortController | null = null
  private nextId = 0

  constructor(private readonly deps: { fetch: FetchLike; storage: StorageLike | null; endpoint?: string }) {}

  getState = (): ThusoState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Called with the signed-in account ("user:<id>") or "anon". */
  setOwner(owner: string) {
    if (owner === this.state.owner) return
    const firstResolution = this.state.owner === null
    this.cancelInFlight()

    if (firstResolution) {
      const restored = this.readStored(owner)
      if (!restored) {
        this.set({ ...this.state, owner })
        this.persist()
        return
      }
      // A page may have selected a record before the session resolved; that
      // choice wins over the restored one and is announced as a change.
      const selected = this.state.context
      this.set({ ...INITIAL, owner, entries: restored.entries, context: restored.context, signed: restored.signed })
      if (selected) this.setContext(selected)
      return
    }

    this.removeStored()
    this.set({ ...INITIAL, owner })
  }

  setContext(context: ThusoContextRef | null) {
    const current = this.state.context
    if (current?.id === context?.id && current?.type === context?.type) {
      if (context && current && context.label !== current.label) this.set({ ...this.state, context })
      return
    }
    // A new record starts with no history: earlier turns are never sent under it.
    this.set({
      ...this.state,
      context,
      signed: null,
      entries: [...this.state.entries, { id: this.id(), kind: "notice", tone: "context", content: contextNotice(context) }],
    })
    this.persist()
  }

  clear() {
    this.cancelInFlight()
    this.set({ ...this.state, entries: [], pending: false, signed: null })
    this.persist()
  }

  async send(text: string): Promise<void> {
    const message = text.trim()
    if (!message || this.state.pending || this.state.owner === null) return

    const epoch = this.epoch
    const controller = new AbortController()
    this.inFlight = controller

    const context = this.state.context
    const previous = this.state.signed
    const history = previous?.turns ?? []
    const historyScope = previous?.token ?? null

    this.set({
      ...this.state,
      pending: true,
      entries: [...this.state.entries, { id: this.id(), kind: "message", role: "user", content: message }],
    })
    this.persist()

    let reply: ThusoEntry
    let nextContext = context
    let viewer = this.state.viewer
    // A failed request leaves the signed window as it was.
    let signed: SignedHistory | null = previous
    try {
      const response = await this.deps.fetch(this.deps.endpoint ?? "/api/thuso/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message, history, historyScope, context: context ? { type: context.type, id: context.id } : null }),
        signal: controller.signal,
      })
      const data = (await response.json().catch(() => ({}))) as {
        message?: string
        error?: string
        code?: string
        viewer?: ThusoViewerLabel
        context?: { type: "rfq"; id: number; title: string } | null
        historyScope?: string | null
        history?: unknown
      }
      if (epoch !== this.epoch) return

      if (response.ok && data.message) {
        reply = { id: this.id(), kind: "message", role: "assistant", content: data.message }
        viewer = data.viewer ?? viewer
        signed = toSignedHistory(data.historyScope, data.history)
        if (context && data.context?.id === context.id && data.context.title) nextContext = { ...context, label: data.context.title }
      } else {
        reply = { id: this.id(), kind: "notice", tone: "error", content: data.error || "Thuso couldn't answer just now. Please try again." }
        if (data.code === "context_unavailable") nextContext = null
      }
    } catch {
      if (epoch !== this.epoch) return
      reply = { id: this.id(), kind: "notice", tone: "error", content: "Thuso couldn't be reached. Check your connection and try again." }
    } finally {
      if (this.inFlight === controller) this.inFlight = null
    }

    const entries = [...this.state.entries, reply]
    if (context && !nextContext) entries.push({ id: this.id(), kind: "notice", tone: "context", content: contextNotice(null) })
    // Keep the signed window only if the record did not change while the reply was in flight.
    const sameContext = this.state.context?.id === context?.id && nextContext?.id === context?.id
    this.set({ ...this.state, entries, pending: false, viewer, context: nextContext, signed: sameContext ? signed : null })
    this.persist()
  }

  private cancelInFlight() {
    this.epoch += 1
    this.inFlight?.abort()
    this.inFlight = null
  }

  private id() {
    this.nextId += 1
    return `${Date.now().toString(36)}-${this.nextId}`
  }

  private set(next: ThusoState) {
    this.state = next
    for (const listener of this.listeners) listener()
  }

  private persist() {
    const { owner, entries, context, signed } = this.state
    if (!owner || !this.deps.storage) return
    try {
      this.deps.storage.setItem(STORAGE_KEY, JSON.stringify({ owner, entries: entries.slice(-MAX_STORED_ENTRIES), context, signed }))
    } catch {
      // Storage full or blocked: the conversation still works for this page.
    }
  }

  private removeStored() {
    try {
      this.deps.storage?.removeItem(STORAGE_KEY)
    } catch {
      // Nothing stored or storage blocked.
    }
  }

  private readStored(owner: string): Pick<ThusoState, "entries" | "context" | "signed"> | null {
    try {
      const raw = this.deps.storage?.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { owner?: unknown; entries?: unknown; context?: unknown; signed?: { token?: unknown; turns?: unknown } | null }
      if (parsed.owner !== owner || !Array.isArray(parsed.entries)) {
        this.removeStored()
        return null
      }
      const entries = parsed.entries.filter(isEntry)
      const context = isContextRef(parsed.context) ? parsed.context : null
      // The server re-verifies this; an edited copy is simply not used.
      const signed = toSignedHistory(parsed.signed?.token, parsed.signed?.turns)
      return { entries, context, signed }
    } catch {
      this.removeStored()
      return null
    }
  }
}

function isEntry(value: unknown): value is ThusoEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  if (typeof entry.id !== "string" || typeof entry.content !== "string") return false
  if (entry.kind === "message") return entry.role === "user" || entry.role === "assistant"
  return entry.kind === "notice" && (entry.tone === "context" || entry.tone === "error")
}

function toSignedHistory(token: unknown, turns: unknown): SignedHistory | null {
  if (typeof token !== "string" || !token || token.length > 128 || !Array.isArray(turns)) return null
  const valid = turns.every(
    (turn) => turn && typeof turn === "object" && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string",
  )
  return valid ? { token, turns: turns.map(({ role, content }: ChatTurn) => ({ role, content })) } : null
}

function isContextRef(value: unknown): value is ThusoContextRef {
  if (!value || typeof value !== "object") return false
  const ref = value as Record<string, unknown>
  return ref.type === "rfq" && Number.isSafeInteger(ref.id) && typeof ref.label === "string"
}

/** Reads ?rfqId= or the legacy ?rfq_id= used by older links. */
export function rfqIdFromSearch(search: string | URLSearchParams): number | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search
  const raw = params.get("rfqId") ?? params.get("rfq_id")
  if (!raw || !/^\d+$/.test(raw.trim())) return null
  const id = Number(raw.trim())
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

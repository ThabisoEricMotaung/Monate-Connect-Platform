"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { IconMessageChatbot } from "@tabler/icons-react"
import { supabase } from "@/lib/supabase"
import { ThusoSession, type ThusoContextRef, type ThusoState } from "@/lib/thuso/session"
import ThusoPanel from "./ThusoPanel"

export type OpenThusoOptions = { context?: ThusoContextRef | null; prompt?: string }

type ThusoApi = {
  isOpen: boolean
  openThuso: (options?: OpenThusoOptions) => void
  closeThuso: () => void
}

const ThusoContext = createContext<ThusoApi | null>(null)

const SERVER_SNAPSHOT: ThusoState = { owner: null, entries: [], context: null, pending: false, viewer: null, signed: null }

/** Pages whose record Thuso can offer to discuss, matched by route. */
const PAGE_RECORD_ROUTES: Array<{ pattern: RegExp; noun: "tender" | "RFQ" }> = [
  { pattern: /^\/(?:tenders|opportunities)\/(\d+)\/?$/, noun: "tender" },
  { pattern: /^\/dashboard\/(?:buyer\/)?rfqs\/(\d+)\/?$/, noun: "RFQ" },
]

export type PageRecord = { id: number; noun: "tender" | "RFQ" }

export function pageRecordFor(pathname: string | null): PageRecord | null {
  if (!pathname) return null
  for (const { pattern, noun } of PAGE_RECORD_ROUTES) {
    const match = pathname.match(pattern)
    if (match) return { id: Number(match[1]), noun }
  }
  return null
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage
  } catch {
    return null
  }
}

function ownerOf(session: { user?: { id?: string } } | null | undefined): string {
  return session?.user?.id ? `user:${session.user.id}` : "anon"
}

/**
 * The single Thuso instance: one conversation, one launcher and one panel,
 * mounted once in the root layout. Anything else that wants Thuso calls
 * openThuso() (see AskThusoButton) instead of rendering its own chat.
 */
export function ThusoProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new ThusoSession({ fetch: (input, init) => window.fetch(input, init), storage: browserStorage() }))
  const state = useSyncExternalStore(session.subscribe, session.getState, () => SERVER_SNAPSHOT)
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const launcherRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const pageRecord = useMemo(() => pageRecordFor(pathname), [pathname])

  useEffect(() => {
    if (!supabase) {
      session.setOwner("anon")
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) session.setOwner(ownerOf(data.session))
    })
    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => session.setOwner(ownerOf(authSession)))
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [session])

  const openThuso = useCallback((options?: OpenThusoOptions) => {
    if (options?.context !== undefined) session.setContext(options.context)
    if (options?.prompt) setDraft(options.prompt)
    setIsOpen(true)
  }, [session])

  const closeThuso = useCallback(() => setIsOpen(false), [])

  const api = useMemo(() => ({ isOpen, openThuso, closeThuso }), [isOpen, openThuso, closeThuso])

  return (
    <ThusoContext.Provider value={api}>
      {children}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => openThuso()}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Ask Thuso, the AiForm Procure assistant"
        title="Ask Thuso"
        data-thuso-launcher=""
        className={`fixed bottom-[calc(var(--news-ticker-height,0px)+1rem)] right-4 z-[190] h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[#C8A060]/60 bg-[#1E3A2B] text-[#F4F0E7] shadow-[0_12px_32px_rgba(16,38,27,0.35)] transition-colors duration-200 hover:bg-[#294D39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A060] print:hidden sm:right-6 ${isOpen ? "hidden" : "flex"}`}
      >
        <IconMessageChatbot className="h-6 w-6" stroke={1.8} aria-hidden="true" />
      </button>
      <ThusoPanel
        open={isOpen}
        onClose={closeThuso}
        state={state}
        session={session}
        draft={draft}
        onDraftChange={setDraft}
        pageRecord={pageRecord}
        pathname={pathname}
        fallbackFocusRef={launcherRef}
      />
    </ThusoContext.Provider>
  )
}

export function useThuso(): ThusoApi {
  const api = useContext(ThusoContext)
  if (!api) throw new Error("useThuso must be used inside ThusoProvider")
  return api
}

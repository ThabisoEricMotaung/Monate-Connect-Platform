"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type AutosaveStatus = "idle" | "pending" | "saved" | "error"

type StoredDraft<T> = {
  savedAt: string
  value: T
}

type UseAutosaveOptions<T> = {
  key: string
  value: T
  onRestore: (value: T) => void
  enabled?: boolean
  debounceMs?: number
}

type UseAutosaveResult<T> = {
  clearDraft: () => void
  discardDraft: () => void
  draftSavedAt: string | null
  hasDraft: boolean
  pendingDraft: T | null
  restoreDraft: () => void
  showRecoveryDialog: boolean
  status: AutosaveStatus
}

function readDraft<T>(key: string): StoredDraft<T> | null {
  try {
    const rawDraft = window.localStorage.getItem(key)

    if (!rawDraft) return null

    const draft = JSON.parse(rawDraft) as StoredDraft<T>

    if (!draft || typeof draft !== "object" || !("value" in draft)) {
      return null
    }

    return draft
  } catch {
    return null
  }
}

export function useAutosave<T>({
  key,
  value,
  onRestore,
  enabled = true,
  debounceMs = 5000,
}: UseAutosaveOptions<T>): UseAutosaveResult<T> {
  const [status, setStatus] = useState<AutosaveStatus>("idle")
  const [pendingDraft, setPendingDraft] = useState<T | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const initializedRef = useRef(false)
  const suppressedSnapshotRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(value)

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  useEffect(() => {
    if (!enabled || initializedRef.current) return

    const draft = readDraft<T>(key)

    if (draft) {
      setPendingDraft(draft.value)
      setDraftSavedAt(draft.savedAt)
      setShowRecoveryDialog(true)
    }

    initializedRef.current = true
  }, [enabled, key])

  useEffect(() => {
    if (!enabled || !initializedRef.current || showRecoveryDialog) return

    const currentSnapshot = JSON.stringify(value)

    if (suppressedSnapshotRef.current === currentSnapshot) {
      setStatus("idle")
      return
    }

    suppressedSnapshotRef.current = null

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setStatus("pending")

    timeoutRef.current = setTimeout(() => {
      try {
        const savedAt = new Date().toISOString()
        const draft: StoredDraft<T> = {
          savedAt,
          value: latestValueRef.current,
        }

        window.localStorage.setItem(key, JSON.stringify(draft))
        setDraftSavedAt(savedAt)
        setStatus("saved")
      } catch {
        setStatus("error")
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [debounceMs, enabled, key, showRecoveryDialog, value])

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    window.localStorage.removeItem(key)
    setDraftSavedAt(null)
    setPendingDraft(null)
    setShowRecoveryDialog(false)
    setStatus("idle")
  }, [key])

  const discardDraft = useCallback(() => {
    suppressedSnapshotRef.current = JSON.stringify(latestValueRef.current)
    clearDraft()
  }, [clearDraft])

  const restoreDraft = useCallback(() => {
    if (pendingDraft === null) return

    onRestore(pendingDraft)
    setShowRecoveryDialog(false)
    setStatus("saved")
  }, [onRestore, pendingDraft])

  return {
    clearDraft,
    discardDraft,
    draftSavedAt,
    hasDraft: pendingDraft !== null || draftSavedAt !== null,
    pendingDraft,
    restoreDraft,
    showRecoveryDialog,
    status,
  }
}

"use client"

import { useEffect, useRef, type RefObject } from "react"

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

/**
 * Modal dialog focus handling: moves focus in on open, keeps Tab inside,
 * closes on Escape, locks page scroll, and returns focus on close to whatever
 * opened the dialog (or the fallback when that element has gone).
 */
export function useDialogFocus({
  open,
  dialogRef,
  initialFocusRef,
  fallbackFocusRef,
  onClose,
}: {
  open: boolean
  dialogRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  fallbackFocusRef?: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const active = document.activeElement
    returnFocusTo.current = active instanceof HTMLElement && active !== document.body ? active : null
    const fallback = fallbackFocusRef?.current ?? null

    const frame = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? dialogRef.current
      target?.focus()
    })

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab" || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const inside = dialogRef.current.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      const opener = returnFocusTo.current
      // Wait a frame so the element that opened the dialog is visible again.
      window.requestAnimationFrame(() => (opener?.isConnected ? opener : fallback)?.focus())
    }
  }, [open, dialogRef, initialFocusRef, fallbackFocusRef])
}

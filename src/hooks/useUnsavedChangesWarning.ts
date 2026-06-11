"use client"

import { useCallback, useEffect } from "react"

const UNSAVED_CHANGES_MESSAGE = "You have unsaved changes. Leave without saving?"

export function useUnsavedChangesWarning(isDirty: boolean) {
  const confirmNavigation = useCallback(() => {
    return !isDirty || window.confirm(UNSAVED_CHANGES_MESSAGE)
  }, [isDirty])

  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    function handleDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return

      const nextUrl = new URL(anchor.href, window.location.href)
      if (nextUrl.origin !== window.location.origin || nextUrl.href === window.location.href) return

      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    function handlePopState() {
      if (window.confirm(UNSAVED_CHANGES_MESSAGE)) return
      window.history.pushState(null, "", window.location.href)
    }

    window.history.pushState(null, "", window.location.href)
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopState)
    document.addEventListener("click", handleDocumentClick, true)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
      document.removeEventListener("click", handleDocumentClick, true)
    }
  }, [isDirty])

  return { confirmNavigation }
}

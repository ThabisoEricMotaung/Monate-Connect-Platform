"use client"

import { useEffect, useId, useRef, useState } from "react"
import { IconX } from "@tabler/icons-react"
import { useDialogFocus } from "@/hooks/useDialogFocus"
import {
  applyPreferences,
  FONT_SIZE_OPTIONS,
  OPEN_ACCESSIBILITY_EVENT,
  readStoredPreferences,
  storePreferences,
  type AccessibilityPreferences,
} from "@/lib/accessibilityPreferences"

/**
 * Display settings, kept separate from the Thuso assistant. Opened by any
 * "Accessibility" button that dispatches the monate:open-accessibility event
 * (public footer, dashboard sidebar).
 */
export default function AccessibilitySettingsDialog() {
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState<AccessibilityPreferences | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const titleId = useId()

  useEffect(() => {
    function handleOpen() {
      setPreferences(readStoredPreferences())
      setOpen(true)
    }
    window.addEventListener(OPEN_ACCESSIBILITY_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_ACCESSIBILITY_EVENT, handleOpen)
  }, [])

  useDialogFocus({ open, dialogRef, onClose: () => setOpen(false) })

  function update(next: Partial<AccessibilityPreferences>) {
    setPreferences((current) => {
      const merged = { ...(current ?? readStoredPreferences()), ...next }
      applyPreferences(merged)
      storePreferences(merged)
      return merged
    })
  }

  if (!open || !preferences) return null

  const toggles: Array<{ key: "reducedMotion" | "highContrast"; label: string; detail: string }> = [
    { key: "reducedMotion", label: "Reduce motion", detail: "Minimise animated movement throughout the interface." },
    { key: "highContrast", label: "High contrast", detail: "Increase contrast for text, borders and key controls." },
  ]

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center p-0 sm:items-center sm:p-4 print:hidden">
      <div className="absolute inset-0 bg-[#10261B]/30" aria-hidden="true" onClick={() => setOpen(false)} />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-2xl border border-[#DDD8CC] bg-[#FBF9F4] p-5 text-[#1E3A2B] shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A67832]">Accessibility</p>
            <h2 id={titleId} className="mt-1 text-lg font-bold">Display preferences</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close display preferences"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#53665C] hover:bg-[#F4F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
          >
            <IconX className="h-5 w-5" stroke={2} aria-hidden="true" />
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">Text size</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {FONT_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={preferences.fontSize === option.value}
                onClick={() => update({ fontSize: option.value })}
                className={`min-h-11 cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] ${preferences.fontSize === option.value ? "border-[#1E3A2B] bg-[#1E3A2B] text-white" : "border-[#DDD8CC] bg-white hover:border-[#C8A060]"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 space-y-2">
          {toggles.map(({ key, label, detail }) => (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={preferences[key]}
              onClick={() => update({ [key]: !preferences[key] })}
              className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-[#DDD8CC] bg-white px-4 py-3 text-left hover:border-[#C8A060] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]"
            >
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs text-[#53665C]">{detail}</span>
              </span>
              <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${preferences[key] ? "bg-[#1E3A2B]" : "bg-[#D8D2C5]"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${preferences[key] ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-[#7B756B]">Saved in this browser and applied across AiForm Procure.</p>
      </section>
    </div>
  )
}

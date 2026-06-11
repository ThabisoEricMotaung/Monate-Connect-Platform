"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/components/theme/ThemeProvider"

type FontSize = "normal" | "large" | "xlarge"

type AccessibilityPreferences = {
  fontSize: FontSize
  highContrast: boolean
  reducedMotion: boolean
}

const STORAGE_KEY = "monate-accessibility"

const defaultPreferences: AccessibilityPreferences = {
  fontSize: "normal",
  highContrast: false,
  reducedMotion: false,
}

const fontSizeOptions: Array<{ value: FontSize; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra Large" },
]

const displayModeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
] as const

function isFontSize(value: unknown): value is FontSize {
  return value === "normal" || value === "large" || value === "xlarge"
}

function normalizeFontSize(value: unknown): FontSize {
  if (value === "extra-large") return "xlarge"
  return isFontSize(value) ? value : "normal"
}

function readStoredPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return defaultPreferences

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPreferences

    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>

    return {
      fontSize: normalizeFontSize(parsed.fontSize),
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
    }
  } catch {
    return defaultPreferences
  }
}

function applyPreferences(preferences: AccessibilityPreferences) {
  const root = document.documentElement

  root.classList.remove("font-size-normal", "font-size-large", "font-size-xlarge", "prefers-reduced-motion", "high-contrast-mode")
  root.classList.add(`font-size-${preferences.fontSize}`)
  root.dataset.fontSize = preferences.fontSize
  root.dataset.contrast = preferences.highContrast ? "high" : "standard"
  root.dataset.motion = preferences.reducedMotion ? "reduced" : "standard"

  if (preferences.reducedMotion) root.classList.add("prefers-reduced-motion")
  if (preferences.highContrast) root.classList.add("high-contrast-mode")
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`accessibility-panel__row ${
        checked ? "accessibility-panel__row--active" : ""
      }`}
    >
      <span className="accessibility-panel__row-title">{label}</span>
      <span className="accessibility-panel__switch" aria-hidden="true">
        <span className="accessibility-panel__switch-thumb" />
      </span>
    </button>
  )
}

export default function AccessibilityPanel() {
  const { theme, toggleTheme, setThemeMode } = useTheme()
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    () => readStoredPreferences()
  )
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  const resolvedTheme =
    theme === "auto"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme

  useEffect(() => {
    applyPreferences(preferences)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    function openDrawer() { setOpen(true) }
    window.addEventListener("monate:open-accessibility", openDrawer)
    return () => window.removeEventListener("monate:open-accessibility", openDrawer)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault()
        setOpen(true)
        return
      }
      if (!open) return
      if (event.key === "Escape") { setOpen(false); return }
      if (event.key !== "Tab" || !drawerRef.current) return

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        )
      ).filter((el) => !el.hasAttribute("disabled"))

      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  return (
    <>
      <button
        type="button"
        className="mc-theme-toggle"
        aria-label={resolvedTheme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        onClick={toggleTheme}
      >
        {resolvedTheme === "light" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="#A8893B" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="4" stroke="#C9A84C" strokeWidth="1.5" />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open ? (
        <div className="accessibility-panel" role="presentation">
          <button
            type="button"
            className="accessibility-panel__backdrop"
            aria-label="Close accessibility centre"
            onClick={() => setOpen(false)}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="accessibility-centre-title"
            className="accessibility-panel__surface"
          >
            <div className="accessibility-panel__header">
              <div>
                <p className="accessibility-panel__eyebrow">Accessibility Centre</p>
                <h2 id="accessibility-centre-title" className="accessibility-panel__title">
                  Display preferences
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="accessibility-panel__close"
              >
                Close
              </button>
            </div>

            <div className="accessibility-panel__section">
              <p className="accessibility-panel__section-label">Text size</p>
              <div className="accessibility-panel__font-grid">
                {fontSizeOptions.map((option) => {
                  const selected = option.value === preferences.fontSize
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setPreferences((current) => ({ ...current, fontSize: option.value }))
                      }
                      className={`accessibility-panel__font-option ${selected ? "accessibility-panel__font-option--active" : ""}`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="accessibility-panel__section">
              <p className="accessibility-panel__section-label">Display mode</p>
              <div className="accessibility-panel__font-grid">
                {displayModeOptions.map((option) => {
                  const selected = option.value === theme
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setThemeMode(option.value)}
                      className={`accessibility-panel__font-option ${selected ? "accessibility-panel__font-option--active" : ""}`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="accessibility-panel__section accessibility-panel__toggles">
              <ToggleRow
                label="Reduce motion"
                checked={preferences.reducedMotion}
                onChange={(checked) =>
                  setPreferences((current) => ({ ...current, reducedMotion: checked }))
                }
              />
              <ToggleRow
                label="High contrast mode"
                checked={preferences.highContrast}
                onChange={(checked) =>
                  setPreferences((current) => ({ ...current, highContrast: checked }))
                }
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}

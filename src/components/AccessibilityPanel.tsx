"use client"

import { useEffect, useRef, useState } from "react"

type FontSize = "normal" | "large" | "extra-large"

type AccessibilityPreferences = {
  fontSize: FontSize
  highContrast: boolean
  reducedMotion: boolean
  readingMode: boolean
  lowData: boolean
}

const STORAGE_KEY = "monate-accessibility"

const defaultPreferences: AccessibilityPreferences = {
  fontSize: "normal",
  highContrast: false,
  reducedMotion: false,
  readingMode: false,
  lowData: false,
}

const fontSizeOptions: Array<{ value: FontSize; label: string; detail: string }> = [
  { value: "normal", label: "Normal", detail: "Standard interface scale" },
  { value: "large", label: "Large", detail: "Larger text for daily work" },
  { value: "extra-large", label: "Extra Large", detail: "Maximum readable text" },
]

function isFontSize(value: unknown): value is FontSize {
  return value === "normal" || value === "large" || value === "extra-large"
}

function readStoredPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) return defaultPreferences

    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>

    return {
      fontSize: isFontSize(parsed.fontSize)
        ? parsed.fontSize
        : defaultPreferences.fontSize,
      highContrast: Boolean(parsed.highContrast),
      reducedMotion: Boolean(parsed.reducedMotion),
      readingMode: Boolean(parsed.readingMode),
      lowData: Boolean(parsed.lowData),
    }
  } catch {
    return defaultPreferences
  }
}

function applyPreferences(preferences: AccessibilityPreferences) {
  const root = document.documentElement

  root.dataset.fontSize = preferences.fontSize
  root.dataset.contrast = preferences.highContrast ? "high" : "standard"
  root.dataset.motion = preferences.reducedMotion ? "reduced" : "standard"
  root.dataset.readingMode = preferences.readingMode ? "on" : "off"
  root.dataset.lowData = preferences.lowData ? "on" : "off"
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
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
      <span>
        <span className="accessibility-panel__row-title">{label}</span>
        <span className="accessibility-panel__row-detail">{description}</span>
      </span>
      <span className="accessibility-panel__switch" aria-hidden="true">
        <span className="accessibility-panel__switch-thumb" />
      </span>
    </button>
  )
}

export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    () => readStoredPreferences()
  )
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    applyPreferences(preferences)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)

    return () => document.removeEventListener("mousedown", handleDocumentClick)
  }, [open])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const activeFontSize = fontSizeOptions.find(
    (option) => option.value === preferences.fontSize
  )

  return (
    <div ref={panelRef} className="accessibility-panel">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open accessibility controls"
        onClick={() => setOpen((current) => !current)}
        className="accessibility-panel__trigger"
      >
        <span className="accessibility-panel__trigger-mark" aria-hidden="true">
          Aa
        </span>
        <span className="accessibility-panel__trigger-text">Access</span>
      </button>

      {open ? (
        <section
          className="accessibility-panel__surface"
          aria-label="Accessibility controls"
        >
          <div className="accessibility-panel__header">
            <p className="accessibility-panel__eyebrow">Access Console</p>
            <h2 className="accessibility-panel__title">Comfort Controls</h2>
            <p className="accessibility-panel__summary">
              Adjust the platform for clearer reading, quieter motion, and
              lighter mobile use.
            </p>
          </div>

          <div className="accessibility-panel__section">
            <p className="accessibility-panel__section-label">Font Size</p>
            <div className="accessibility-panel__font-grid">
              {fontSizeOptions.map((option) => {
                const selected = option.value === preferences.fontSize

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        fontSize: option.value,
                      }))
                    }
                    className={`accessibility-panel__font-option ${
                      selected ? "accessibility-panel__font-option--active" : ""
                    }`}
                  >
                    <span>{option.label}</span>
                    <small>{option.detail}</small>
                  </button>
                )
              })}
            </div>
            <p className="accessibility-panel__hint">
              Current scale: {activeFontSize?.label ?? "Normal"}
            </p>
          </div>

          <div className="accessibility-panel__section accessibility-panel__toggles">
            <ToggleRow
              label="High Contrast Mode"
              description="Sharper text, borders, and controls"
              checked={preferences.highContrast}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  highContrast: checked,
                }))
              }
            />
            <ToggleRow
              label="Reduced Motion"
              description="Minimise animations and moving ticker effects"
              checked={preferences.reducedMotion}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  reducedMotion: checked,
                }))
              }
            />
            <ToggleRow
              label="Reading Mode / Focus Mode"
              description="Adds breathing room around text and forms"
              checked={preferences.readingMode}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  readingMode: checked,
                }))
              }
            />
            <ToggleRow
              label="Low Data Mode"
              description="Simplifies visual effects for slower connections"
              checked={preferences.lowData}
              onChange={(checked) =>
                setPreferences((current) => ({
                  ...current,
                  lowData: checked,
                }))
              }
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}

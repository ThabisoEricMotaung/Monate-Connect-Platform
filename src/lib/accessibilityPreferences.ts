/**
 * Display preferences stored in this browser and applied to <html>. The
 * inline script in the root layout applies the same keys before hydration.
 */

export type FontSize = "normal" | "large" | "xlarge"

export type AccessibilityPreferences = {
  fontSize: FontSize
  highContrast: boolean
  reducedMotion: boolean
}

export const ACCESSIBILITY_STORAGE_KEY = "monate-accessibility"
export const OPEN_ACCESSIBILITY_EVENT = "monate:open-accessibility"

export const DEFAULT_PREFERENCES: AccessibilityPreferences = { fontSize: "normal", highContrast: false, reducedMotion: false }

export const FONT_SIZE_OPTIONS: Array<{ value: FontSize; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra large" },
]

export function normalizeFontSize(value: unknown): FontSize {
  if (value === "extra-large") return "xlarge"
  return value === "large" || value === "xlarge" ? value : "normal"
}

export function readStoredPreferences(): AccessibilityPreferences {
  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>
    return { fontSize: normalizeFontSize(parsed.fontSize), highContrast: Boolean(parsed.highContrast), reducedMotion: Boolean(parsed.reducedMotion) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

/** Saves the three settings this dialog owns and keeps any other stored keys. */
export function storePreferences(preferences: AccessibilityPreferences) {
  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({ ...existing, ...preferences }))
  } catch {
    // Storage blocked: preferences still apply for this page view.
  }
}

export function applyPreferences(preferences: AccessibilityPreferences) {
  const root = document.documentElement
  root.classList.remove("font-size-normal", "font-size-large", "font-size-xlarge", "prefers-reduced-motion", "high-contrast-mode")
  root.classList.add(`font-size-${preferences.fontSize}`)
  root.dataset.fontSize = preferences.fontSize
  root.dataset.contrast = preferences.highContrast ? "high" : "standard"
  root.dataset.motion = preferences.reducedMotion ? "reduced" : "standard"
  if (preferences.reducedMotion) root.classList.add("prefers-reduced-motion")
  if (preferences.highContrast) root.classList.add("high-contrast-mode")
}

"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/components/theme/ThemeProvider"

type ThemeMode = "dark" | "light" | "auto"

const options: Array<{ value: ThemeMode; label: string; description: string; hint: string }> = [
  { value: "light", label: "Light", description: "Paper clarity", hint: "Sunlit workspace" },
  { value: "auto", label: "Auto", description: "System adaptive", hint: "Follows your device" },
  { value: "dark", label: "Dark", description: "Deep console", hint: "Cinematic focus" },
]

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg className="appearance-core__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (mode === "dark") {
    return (
      <svg className="appearance-core__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20.4 14.1A7.7 7.7 0 019.9 3.6a8.7 8.7 0 1010.5 10.5z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg className="appearance-core__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12a8 8 0 0114.6-4.6M20 12a8 8 0 01-14.6 4.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M18.8 4.5v3.3h-3.3M5.2 19.5v-3.3h3.3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export default function AppearanceCore() {
  const { theme, setThemeMode } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)
    return () => document.removeEventListener("mousedown", handleDocumentClick)
  }, [open])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const active = options.find((option) => option.value === theme)
  const label = active?.label ?? "Auto"

  return (
    <div
      ref={containerRef}
      className="appearance-core"
      data-theme-mode={theme}
      style={{ position: "fixed", right: 18, bottom: "calc(var(--news-ticker-height) + 16px)", zIndex: 80 }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Appearance mode: ${label}. Open theme selector.`}
        onClick={() => setOpen((current) => !current)}
        className="appearance-core__button"
        style={{ width: 50, height: 50 }}
      >
        <span className="appearance-core__aura" />
        <span className="appearance-core__glass" />
        <span className="appearance-core__icon-wrap" key={theme}>
          <ThemeIcon mode={theme} />
        </span>
        <span className="appearance-core__button-label">
          <span className="appearance-core__badge">{label}</span>
          <span className="appearance-core__button-subtitle">Theme</span>
        </span>
      </button>

      {open ? (
        <div className="appearance-core__panel" role="menu">
          <div className="mb-4 border-b border-panel pb-3">
            <p className="text-[10px] uppercase tracking-[0.32em] text-secondary">
              AiForm Procure appearance
            </p>
            <p className="mt-2 text-sm font-semibold text-primary">
              {active?.hint ?? "High-fidelity workspace tone"}
            </p>
          </div>

          <div className="space-y-3">
            {options.map((option) => {
              const selected = option.value === theme
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setThemeMode(option.value)
                    setOpen(false)
                  }}
                  className={`appearance-core__option ${
                    selected ? "appearance-core__option--active" : ""
                  }`}
                  aria-current={selected ? "true" : undefined}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 text-base font-semibold">
                      <span className="appearance-core__option-icon">
                        <ThemeIcon mode={option.value} />
                      </span>
                      {option.label}
                    </span>
                    {selected ? (
                      <span className="appearance-core__option-badge">Active</span>
                    ) : null}
                  </div>
                  <span className="text-sm text-secondary">{option.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

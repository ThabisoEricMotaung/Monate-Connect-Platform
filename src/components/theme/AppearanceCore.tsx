"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/components/theme/ThemeProvider"

type ThemeMode = "dark" | "light" | "auto"

const options: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: "light", label: "Light", description: "Procurement paperwork clarity" },
  { value: "auto", label: "Auto", description: "System adaptive balance" },
  { value: "dark", label: "Dark", description: "Deep operations console" },
]

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

  const active = options.find((option) => option.value === theme)
  const label = active?.label ?? "Auto"

  return (
    <div ref={containerRef} className="appearance-core">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Open appearance ecosystem control"
        onClick={() => setOpen((current) => !current)}
        className="appearance-core__button"
      >
        <span className="appearance-core__orb" />
        <span className="appearance-core__button-label">
          <span className="appearance-core__badge">{label}</span>
          <span className="appearance-core__button-subtitle">Workstation selector</span>
        </span>
      </button>

      {open ? (
        <div className="appearance-core__panel" role="menu">
          <div className="mb-4 border-b border-panel pb-3">
            <p className="text-[10px] uppercase tracking-[0.32em] text-secondary">
              Operations control
            </p>
            <p className="mt-2 text-sm font-semibold text-primary">
              {active?.description ?? "Enterprise console appearance"}
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
                    <span className="text-base font-semibold">{option.label}</span>
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

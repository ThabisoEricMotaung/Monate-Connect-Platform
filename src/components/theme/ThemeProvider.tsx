"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"

type ThemeMode = "dark" | "light" | "auto"

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: "dark" | "light"
  setThemeMode: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "mc-theme"

const applyLightTheme = () => {
  const root = document.documentElement
  root.classList.remove("theme-light", "theme-dark")
  root.classList.add("theme-light")
  root.setAttribute("data-theme", "light")
  window.localStorage.setItem(STORAGE_KEY, "light")
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyLightTheme()
  }, [])

  const value = useMemo(
    () => ({
      theme: "light" as ThemeMode,
      resolvedTheme: "light" as const,
      setThemeMode: () => applyLightTheme(),
      toggleTheme: () => applyLightTheme(),
    }),
    [],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider")
  }
  return context
}

"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type ThemeMode = "dark" | "light" | "auto"

type ThemeContextValue = {
  theme: ThemeMode
  setThemeMode: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "mc-theme"

const getSystemTheme = (): "dark" | "light" =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

const getTimeOfDayDefault = (): "light" | "dark" => {
  const h = new Date().getHours()
  return h >= 6 && h <= 17 ? "light" : "dark"
}

const getPreferredTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark"

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === "dark" || stored === "light" || stored === "auto") return stored

  // Migrate old keys
  for (const oldKey of ["monate-theme", "mc-pricing-theme"]) {
    const old = window.localStorage.getItem(oldKey)
    if (old === "dark" || old === "light") {
      window.localStorage.setItem(STORAGE_KEY, old)
      window.localStorage.removeItem(oldKey)
      return old as ThemeMode
    }
  }

  return getTimeOfDayDefault()
}

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement
  const effectiveTheme = mode === "auto" ? getSystemTheme() : mode
  root.classList.remove("theme-light", "theme-dark")
  root.classList.add(`theme-${effectiveTheme}`)
  root.setAttribute("data-theme", effectiveTheme)
}

const setStoredTheme = (mode: ThemeMode) => {
  window.localStorage.setItem(STORAGE_KEY, mode)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const initial = getPreferredTheme()
    setTheme(initial)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    applyTheme(theme)
    setStoredTheme(theme)
  }, [theme, mounted])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemChange = () => {
      if (theme === "auto") {
        applyTheme("auto")
      }
    }

    media.addEventListener("change", handleSystemChange)
    return () => media.removeEventListener("change", handleSystemChange)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setThemeMode: (nextTheme: ThemeMode) => setTheme(nextTheme),
      toggleTheme: () => {
        const nextTheme = theme === "dark" ? "light" : "dark"
        setTheme(nextTheme)
      },
    }),
    [theme],
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

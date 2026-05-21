"use client"

import { useTheme } from "@/components/theme/ThemeProvider"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    </button>
  )
}

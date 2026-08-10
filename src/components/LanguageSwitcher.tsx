"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  ACTIVE_LANGUAGE_OPTIONS,
  type AppLocale,
  isAppLocale,
  normalizeLocale,
} from "@/i18n/config"

export default function LanguageSwitcher({ variant = "global" }: { variant?: "global" | "inline" }) {
  const activeLocale = normalizeLocale(useLocale())
  const t = useTranslations("localeSwitcher")
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const synchronized = useRef(false)

  const applyLocale = useCallback(async (locale: AppLocale, persist = true) => {
    setUpdating(true)
    try {
      const response = await fetch("/api/preferences/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, persist }),
      })
      if (!response.ok) throw new Error("Locale update failed")
      document.documentElement.lang = locale
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }, [router])

  useEffect(() => {
    if (synchronized.current) return
    synchronized.current = true

    void fetch("/api/preferences/locale", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((body: { locale?: unknown } | null) => {
        if (body && isAppLocale(body.locale) && body.locale !== activeLocale) {
          return applyLocale(body.locale, false)
        }
      })
      .catch(() => undefined)
  }, [activeLocale, applyLocale])

  const content = (
    <div className="flex flex-col gap-1.5">
      <label className="flex min-h-11 items-center gap-2" htmlFor={`locale-select-${variant}`}>
        <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#53665c]">
          {t("label")}
        </span>
        <select
          id={`locale-select-${variant}`}
          aria-describedby={activeLocale === "en" ? undefined : `locale-disclosure-${variant}`}
          value={activeLocale}
          disabled={updating}
          onChange={(event) => void applyLocale(event.target.value as AppLocale)}
          className="min-h-9 cursor-pointer rounded-md border border-[#d7c9b2] bg-white px-2.5 text-sm font-semibold text-[#1a3a2a] outline-none transition-colors hover:border-[#c8a060] focus-visible:ring-2 focus-visible:ring-[#c8a060] disabled:cursor-wait disabled:opacity-60"
        >
          {ACTIVE_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>{option.name}</option>
          ))}
        </select>
        <span className="sr-only" aria-live="polite">{updating ? t("updating") : ""}</span>
      </label>
      {activeLocale !== "en" && (
        <p id={`locale-disclosure-${variant}`} className="text-[0.62rem] font-semibold leading-tight text-[#7a5b24]">
          {t("machineTranslated")} · {t("partialCoverage")}
        </p>
      )}
    </div>
  )

  if (variant === "inline") return content

  return (
    <aside
      aria-label="Language preference"
      className="fixed bottom-4 left-4 z-40 max-w-[230px] rounded-lg border border-[#d7c9b2] bg-[#f8f4ec]/95 px-3 py-2 shadow-lg backdrop-blur-sm"
    >
      {content}
    </aside>
  )
}

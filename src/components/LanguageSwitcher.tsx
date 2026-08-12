"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { IconChevronDown, IconWorld } from "@tabler/icons-react"
import {
  ACTIVE_LANGUAGE_OPTIONS,
  type AppLocale,
  isAppLocale,
  normalizeLocale,
} from "@/i18n/config"
import { localeCoverage } from "@/i18n/review-metadata"

function SouthAfricaFlag() {
  return (
    <svg viewBox="0 0 36 24" role="img" aria-label="South Africa" className="h-4 w-6 shrink-0 overflow-hidden rounded-[2px] shadow-sm ring-1 ring-black/10">
      <rect width="36" height="12" fill="#de3831" />
      <rect y="12" width="36" height="12" fill="#002395" />
      <path d="M0 0v24l14-12z" fill="#000" />
      <path d="M0 2.8 10.8 12 0 21.2v2.8h4l12-10h20v-4H16L4 0H0z" fill="#fff" />
      <path d="M0 5.2 8 12l-8 6.8v4l12.8-9.2H36v-3.2H12.8L0 1.2z" fill="#007a4d" />
      <path d="M0 3.8 9.6 12 0 20.2v-3.1L6 12 0 6.9z" fill="#ffb612" />
    </svg>
  )
}

function LocaleMark({ locale }: { locale: AppLocale }) {
  if (locale === "en") return <SouthAfricaFlag />

  return (
    <span className="inline-flex h-5 min-w-6 items-center justify-center rounded border border-[#d7c9b2] bg-[#f8f4ec] px-1 text-[0.62rem] font-extrabold tracking-[0.08em] text-[#1a3a2a]" aria-hidden>
      {locale.toUpperCase()}
    </span>
  )
}

export default function LanguageSwitcher({ variant = "global" }: { variant?: "global" | "inline" }) {
  const activeLocale = normalizeLocale(useLocale())
  const t = useTranslations("localeSwitcher")
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const synchronized = useRef(false)
  const dropdownRef = useRef<HTMLDetailsElement>(null)

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

  const selectedOption = ACTIVE_LANGUAGE_OPTIONS.find((option) => option.code === activeLocale) ?? ACTIVE_LANGUAGE_OPTIONS[0]
  const coverage = localeCoverage(activeLocale)

  const selectLocale = (locale: AppLocale) => {
    dropdownRef.current?.removeAttribute("open")
    void applyLocale(locale)
  }

  const content = (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#53665c]">
          <IconWorld className="h-4 w-4" stroke={1.8} aria-hidden />
          {t("label")}
        </span>
        <details ref={dropdownRef} className="group relative">
          <summary
            aria-label={`${t("label")}: ${selectedOption.name}`}
            aria-describedby={activeLocale === "en" ? undefined : `locale-disclosure-${variant}`}
            className="flex min-h-10 min-w-[148px] cursor-pointer list-none items-center gap-2 rounded-lg border border-[#d7c9b2] bg-white px-3 text-sm font-semibold text-[#1a3a2a] shadow-sm transition-colors marker:content-none hover:border-[#c8a060] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a060] [&::-webkit-details-marker]:hidden"
          >
            <LocaleMark locale={activeLocale} />
            <span className="flex-1 text-left">{selectedOption.name}</span>
            <IconChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" stroke={1.8} aria-hidden />
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-full overflow-hidden rounded-lg border border-[#d7c9b2] bg-white p-1.5 shadow-xl">
            {ACTIVE_LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                disabled={updating}
                aria-current={option.code === activeLocale ? "true" : undefined}
                onClick={() => selectLocale(option.code)}
                className="flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm font-semibold text-[#1a3a2a] transition-colors hover:bg-[#f8f4ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c8a060] disabled:cursor-wait disabled:opacity-60 aria-[current=true]:bg-[#f8f4ec]"
              >
                <LocaleMark locale={option.code} />
                <span>{option.name}</span>
              </button>
            ))}
          </div>
        </details>
        <span className="sr-only" aria-live="polite">{updating ? t("updating") : ""}</span>
      </div>
      {activeLocale !== "en" && (
        <p id={`locale-disclosure-${variant}`} className="max-w-xl text-[0.62rem] font-semibold leading-tight text-[#7a5b24]">
          {coverage === "reviewed" ? t("reviewed") : `${t("machineTranslated")} · ${t("reviewPending")}`}
          <span className="ml-1 font-normal">{t("disclosure")}</span>
        </p>
      )}
    </div>
  )

  if (variant === "inline") return content

  return (
    <aside
      aria-label="Language preference"
      className="relative z-[60] w-full border-b border-[#d7c9b2] bg-[#f8f4ec] px-4 py-1.5"
    >
      <div className="mx-auto flex max-w-7xl justify-end">
        {content}
      </div>
    </aside>
  )
}

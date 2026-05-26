"use client"

import { languages, useI18n, type LanguageCode } from "@/lib/i18n"

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <label className="group inline-flex items-center gap-2 rounded-md border border-panel bg-panel px-3 py-2 text-sm font-semibold text-secondary shadow-sm">
      <span className="text-[0.62rem] uppercase tracking-[0.18em] text-muted">
        {t("language")}
      </span>
      <select
        aria-label={t("language")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
        className="cursor-pointer rounded-md border border-transparent bg-surface px-2 py-1 text-sm font-semibold text-heading outline-none transition group-hover:border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        {languages.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  )
}

# Internationalisation Phase 0 inventory and governance

## Phase 1 scope

Phase 1 activates English (`en`), isiZulu (`zu`), and Afrikaans (`af`) only. The
remaining official-language codes are roadmap targets, not current product
coverage: `nr`, `xh`, `nso`, `st`, `tn`, `ss`, `ve`, and `ts`.

The current 35-key dictionary covers only a small set of navigation and workflow
labels. Approximately 188 TSX files contain substantial hard-coded English.
Phase 1 migrates the existing translated labels and the existing trilingual Help
Centre locale selection. It does not claim full-page translation.

## Content classes

| Class | Phase 1 treatment |
| --- | --- |
| Shared navigation and the existing 35 labels | Migrated to `next-intl` |
| Existing EN/ZU/AF Help Centre content | Uses the same `next-intl` locale source |
| Other public/auth/dashboard content | English; scheduled for a later phase |
| Dates, numbers, email, digest and WhatsApp copy | English formatting/content; later phase |
| Legal, privacy, cookie, data-protection and compliance-policy pages | English only; human-review workstream |

## Translation provenance

English is the canonical source locale. Existing isiZulu and Afrikaans strings
have no recorded human-review provenance, so the product must visibly label them
as machine-translated and partial coverage. That label can be removed only when
a named reviewer and review date are recorded for the affected namespace.

Automatic translation is prohibited for legal, privacy, cookie,
data-protection, regulatory, and compliance-policy content. Missing translations
fall back to English and are treated as coverage gaps, never as completed
translations.

## Persistence and measurement

Logged-out preference is stored in the `aiform-locale` same-site cookie. Signed-in
preference is also stored privately in `user_locale_preferences`, protected by
owner-only RLS. Counts by `preferred_locale` provide an explicit usage signal
without inferring language from province, company name, or other profile data.

## Acceptance gates

- A keyboard-accessible selector is mounted globally.
- First server render uses the locale cookie; `<html lang>` matches it.
- Signed-in selection persists to the owner-only preference table.
- All active locales contain the same message keys.
- Unsupported/missing locales fall back to English in tests.
- Non-English selections show “machine-translated” and “partial coverage”.
- Existing Help Centre EN/ZU/AF selection follows the global selector.
- Legal/privacy/compliance-policy pages are not automatically translated.

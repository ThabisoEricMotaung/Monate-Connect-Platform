/**
 * Display-only handling of stored tender descriptions. Stored text is never
 * changed; it is split into parts for the detail page, and reduced to a short
 * factual scope summary for listing cards.
 *
 * Stored descriptions mix the scope of work with:
 * - attachment lists, e.g. the eTenders sync's
 *   "Tender documents:\n- Annexure 7.pdf: https://…" (sometimes stored with
 *   the line breaks collapsed: "Tender documents: - a.zip: https://… - …");
 * - the eTenders sourcing note ("Sourced from eTenders.gov.za …");
 * - administrative boilerplate (submission rules, briefings, registration).
 */

export interface TenderAttachment {
  /** Readable name: the published label without its file extension. */
  name: string
  url: string
  /** "PDF", "DOCX", "ZIP" … when the label or URL shows one. */
  fileType: string | null
}

export interface ParsedTenderDescription {
  /** The description without its attachment list and sourcing note, line breaks kept. */
  body: string
  attachments: TenderAttachment[]
  /** Sourcing notes removed from the body, as published. */
  notes: string[]
}

const SOURCING_NOTE =
  "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process."

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g
const FILE_EXTENSION = /\.(pdf|docx?|xlsx?|xlsm|csv|zip|rar|7z|pptx?|txt|rtf|odt|jpe?g|png)$/i
const ATTACHMENT_HEADING = /\b(?:tender|bid|rfq|rfp)?\s*documents?\s*:\s*/i
// "- <label>: <url>" items, on their own lines or run together on one line.
const ATTACHMENT_ITEM = /(?:^|\s)-\s+(.+?):\s+(https?:\/\/[^\s<>"']+)/g

function fileTypeOf(text: string): string | null {
  return text.match(FILE_EXTENSION)?.[1].toUpperCase() ?? null
}

function nameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const named = parsed.searchParams.get("downloadedFileName") ?? parsed.searchParams.get("filename")
    const last = named ?? decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "")
    return last || parsed.hostname
  } catch {
    return url
  }
}

function toAttachment(label: string | null, url: string): TenderAttachment {
  const published = (label?.trim() || nameFromUrl(url)).replace(/\s+/g, " ")
  return {
    name: published.replace(FILE_EXTENSION, "").trim() || published,
    url,
    fileType: fileTypeOf(published) ?? fileTypeOf(nameFromUrl(url)),
  }
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Splits a stored description into its body, attachments (as links) and sourcing notes. */
export function parseTenderDescription(description: string | null | undefined): ParsedTenderDescription {
  let text = (description ?? "").replace(/\r/g, "")
  const notes: string[] = []
  if (text.includes(SOURCING_NOTE)) {
    notes.push(SOURCING_NOTE)
    text = text.replace(SOURCING_NOTE, "")
  }

  const attachments: TenderAttachment[] = []
  const seen = new Set<string>()
  const add = (label: string | null, url: string) => {
    const clean = url.replace(/[.,;]+$/, "")
    if (seen.has(clean)) return
    seen.add(clean)
    attachments.push(toAttachment(label, clean))
  }

  // A labelled attachment list ("Tender documents: - a.pdf: https://…").
  const heading = text.match(ATTACHMENT_HEADING)
  if (heading?.index !== undefined) {
    const listStart = heading.index
    const list = text.slice(listStart + heading[0].length)
    const items = [...list.matchAll(ATTACHMENT_ITEM)]
    if (items.length) {
      for (const item of items) add(item[1], item[2])
      const listEnd = listStart + heading[0].length + (items.at(-1)!.index! + items.at(-1)![0].length)
      text = `${text.slice(0, listStart)}\n${text.slice(listEnd)}`
    }
  }

  // Any remaining bare URL is also a link, not text.
  text = text.replace(URL_PATTERN, (url) => {
    add(null, url)
    return ""
  })

  return { body: tidy(text), attachments, notes }
}

// Sentences that are administration or logistics rather than scope.
const ADMINISTRATIVE = [
  /\b(?:tender|bid|rfq|rfp)?\s*documents?\b.*\b(?:available|obtain(?:ed)?|download(?:ed)?|collect(?:ed)?|purchase[ds]?)\b/i,
  /\bdownload(?:ed|able)?\b/i,
  /\b(?:registered|register)\b.*\bcentral supplier database\b/i,
  /\btender box\b|\blate (?:tenders|bids|submissions)\b|\bsealed envelope/i,
  /\b(?:telephonic|telegraphic|telex|facsimile|e-?mailed)\b.*\b(?:tenders?|bids?)\b/i,
  /\b(?:compulsory|non-compulsory)?\s*(?:clarification|briefing)\s+(?:meeting|session)\b/i,
  /\b(?:enquiries|queries)\b.*\b(?:addressed|directed|contact)\b/i,
  /^(?:closing date|tender documents|tenderer'?s meeting|items)\b\s*:?$/i,
  /\bmicrosoft\b.*\boffice\b|\bacrobat\b/i,
  /\bwill be communicated\b|\bhandover meeting\b/i,
]

// Material eligibility requirements: who may bid. (Central Supplier Database
// registration applies to every government tender, so it counts as
// administrative above rather than as a distinguishing requirement.)
const ELIGIBILITY =
  /\b(?:cidb|contractor grading|grading designation|joint ventures?|jv partner|targeted enterprises?|emerging enterprises?|b-?bbee|level \d+ contributor|sub-?contract(?:ing)?\b.*\d+\s*%|only tenderers who|(?:are|is) eligible|must hold|accredited with)\b/i

// Sentences about the work itself rank first: what is procured or delivered.
const WORK =
  /\b(?:suppl(?:y|ies)|deliver(?:y|ies)?|provision|appointment|appoint|construct(?:ion)?|build(?:ing)?|install(?:ation)?|maintenance|maintain|repair|rehabilitat\w*|upgrad\w*|refurbish\w*|resurfac\w*|design|consult(?:ing|ancy)?|engineering|services?|works|routine|supervision)\b/i
// Then where and for how long — specific phrases only, so a background fact
// that merely mentions "the municipality" does not count.
const PLACE_OR_TIME =
  /\b(?:routes?|sections?\s+\d|km\b|located|situated|province of|(?:district|local|metropolitan) municipalit(?:y|ies)|in (?:the )?(?:ward|town|city|district|province)\b|along|duration|months?|years?|programme|completed by|commenc\w*)\b/i

// A line that is only a field label and a reference ("CONTRACT NUMBER X.003-087-2025/1").
const LABEL_ONLY = /^(?:contract|tender|bid)\s+(?:number|no\.?)\s*:?\s*\S+$/i
const LEADING_LABEL = /^(?:project description|description|scope(?: of work)?)\s*:?\s+/i
// Field labels inside a flattened table row ("CONTRACT NUMBER X.003-087-2025/1 PROJECT DESCRIPTION FOR …").
const INLINE_LABELS = /\b(?:contract\s+number\s*:?\s*[A-Z0-9][\w./-]*|project\s+description\s*:?)\s*/gi
// SANRAL contract numbers opening a contract-table row ("X.002-199-2023/1 — …",
// "CONTRACT SANRAL X.005-138-2026/1 — …").
const CONTRACT_NUMBER = String.raw`[A-Z]{1,2}\.\d{3}-\d{3}-\d{4}\/\w+`
const LEADING_CONTRACT_NUMBER = new RegExp(String.raw`^(?:contract\s+(?:sanral\s+)?:?\s*)?${CONTRACT_NUMBER}\s*[-–—]+\s*`, "i")
// Where a following contract row starts when rows run together on one line.
const NEXT_CONTRACT_ROW = new RegExp(String.raw`\s(?:${CONTRACT_NUMBER})(?:\s*&\s*${CONTRACT_NUMBER})*\s*[-–—]`)
// Contract-table rows are joined with " — " (see sanralParser); one row is enough for a card.
const TABLE_ROW = / — /

/** Letters and digits only, for comparing wording regardless of punctuation ("AD-HOC" = "adhoc"). */
function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

interface Sentence {
  text: string
  /** Taken from a contract-table row (it describes one contract, not the whole notice). */
  contractRow: boolean
}

function sentencesOf(body: string): Sentence[] {
  return body
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z(])/))
    .map((raw) => {
      const contractRow = TABLE_ROW.test(raw) || LEADING_CONTRACT_NUMBER.test(raw.replace(/^[-–•*]\s*/, "")) || /\bcontract\s+number\b/i.test(raw)
      let text = raw
        .replace(/^[-–•*]\s*/, "")
        .replace(LEADING_LABEL, "")
        .replace(INLINE_LABELS, "")
        .replace(LEADING_CONTRACT_NUMBER, "")
      // Keep only the first of several contract rows run together on one line.
      const next = text.search(NEXT_CONTRACT_ROW)
      if (next > 0) text = text.slice(0, next)
      // A pointer to a table the card does not show.
      text = text.replace(/\s*the approximate (?:construction )?period is as per the table above\.*/i, "").trim()
      return { text, contractRow: contractRow || next > 0 }
    })
    .filter((sentence) => sentence.text)
}

function repeatsTitle(sentence: string, title: string | null | undefined, reference: string | null | undefined): boolean {
  const s = compact(sentence)
  const t = compact((title ?? "").replace(/(?:\.{3}|…)$/, ""))
  const r = compact(reference ?? "")
  const withoutRef = r && s.startsWith(r) ? s.slice(r.length) : s
  if (!withoutRef) return true
  if (!t) return false
  return withoutRef === t || t.includes(withoutRef) || (withoutRef.startsWith(t) && withoutRef.length - t.length < 15)
}

type SentenceKind = "scope" | "eligibility" | "administrative" | "background"

function kindOf(sentence: string): SentenceKind {
  if (ADMINISTRATIVE.some((pattern) => pattern.test(sentence))) return "administrative"
  if (ELIGIBILITY.test(sentence)) return "eligibility"
  if (WORK.test(sentence) || PLACE_OR_TIME.test(sentence)) return "scope"
  return "background"
}

/** 2: describes the work or deliverable; 1: only where or how long. */
function scopeRank(sentence: string): number {
  return WORK.test(sentence) ? 2 : 1
}

export interface TenderScopeSummary {
  /** Verbatim sentences for the card, or null when no scope sentence exists. */
  text: string | null
  /** The text is one row of a notice covering several contracts. */
  partOfMultipleContracts: boolean
  /** The description states eligibility or submission requirements the card does not show. */
  hasFurtherRequirements: boolean
}

/**
 * A factual scope summary for listing cards, taken verbatim from the
 * description body (capitals as published: re-casing prose risks lowercasing
 * names). Attachments, URLs, sourcing notes, label-only lines and repeats of
 * the title are skipped. Sentences describing the work, deliverable, location
 * or duration come first (up to `maxSentences`); one material eligibility
 * requirement may follow a single scope sentence. Without any scope sentence
 * there is no summary — background facts or requirements alone are not shown,
 * and nothing is paraphrased or invented.
 */
export function summariseTenderScopeDetailed(
  description: string | null | undefined,
  options: { title?: string | null; reference?: string | null; maxSentences?: number } = {},
): TenderScopeSummary {
  const { body } = parseTenderDescription(description)
  const maxSentences = options.maxSentences ?? 2
  const contracts = new Set(body.match(new RegExp(CONTRACT_NUMBER, "g")) ?? [])

  const candidates = sentencesOf(body)
    .filter(({ text }) => !FILE_EXTENSION.test(text) && !/https?:|www\./i.test(text) && !LABEL_ONLY.test(text))
    .filter(({ text }) => (text.match(/[A-Za-z0-9]+/g) ?? []).length >= 3)
    .filter(({ text }) => !repeatsTitle(text, options.title, options.reference))
    .map(({ text, contractRow }) => ({ sentence: text, contractRow, kind: kindOf(text) }))

  // Work sentences before place/time sentences; ties keep source order.
  const scope = candidates
    .map((c, index) => ({ ...c, index }))
    .filter((c) => c.kind === "scope")
    .sort((a, b) => scopeRank(b.sentence) - scopeRank(a.sentence) || a.index - b.index)
  const chosen: typeof scope = []
  let tableRow = false
  for (const candidate of scope) {
    if (chosen.length >= maxSentences) break
    // A contract row stands alone: it is one contract, not a sentence of prose.
    if (candidate.contractRow) {
      if (chosen.length === 0) {
        chosen.push(candidate)
        tableRow = true
        break
      }
      continue
    }
    chosen.push(candidate)
  }
  // Shown in the order the source gives them.
  const picked = chosen.sort((a, b) => a.index - b.index).map((c) => c.sentence)
  const eligibility = candidates.filter((c) => c.kind === "eligibility").map((c) => c.sentence)
  if (picked.length === 1 && !tableRow && maxSentences > 1 && eligibility.length) picked.push(eligibility[0])

  const shown = new Set(picked)
  return {
    text: picked.length ? picked.join(" ") : null,
    partOfMultipleContracts: picked.length > 0 && tableRow && contracts.size > 1,
    hasFurtherRequirements: candidates.some((c) => (c.kind === "eligibility" || c.kind === "administrative") && !shown.has(c.sentence)),
  }
}

/** The summary text alone (see summariseTenderScopeDetailed). */
export function summariseTenderScope(
  description: string | null | undefined,
  options: { title?: string | null; reference?: string | null; maxSentences?: number } = {},
): string | null {
  return summariseTenderScopeDetailed(description, options).text
}

import { normalizeOpportunityTitleCase } from "@/lib/externalOpportunity"

/**
 * Derives a readable listing title from stored tender text without inventing
 * anything: every output is a substring of the stored title or description.
 *
 * The stored title and description are left untouched (the detail page shows
 * them as published); this only affects how listings present them.
 */

export interface DisplayTitleInput {
  title: string | null | undefined
  description: string | null | undefined
  reference: string | null | undefined
  sourceName: string | null | undefined
}

export interface DisplayTitleResult {
  /** Readable work title, or null when the stored text contains none. */
  displayTitle: string | null
  /** Stored description minus anything already used as the title. */
  scope: string | null
}

const SOURCE_BOILERPLATE =
  "Sourced from eTenders.gov.za (National Treasury Transparency Portal). This listing is provided for discovery purposes; refer to the original source for the authoritative tender documents and submission process."

// SANRAL's open-tenders listing shows a cut-off preview of each notice,
// labelled "Tender Notice:". Earlier collector runs stored that preview as the
// title and description; it never contains the title and rarely the scope.
const SANRAL_LISTING_PREVIEW = /^tender notice\b/i

// The fixed lead-in of SANRAL's invitation wording, e.g. "The South African
// National Roads Agency SOC Limited (SANRAL) invites tenders for the provision
// of Routine Road Maintenance ...".
const SANRAL_INVITATION_LEAD_IN =
  /^the south african national roads agency soc (?:limited|ltd)\.?\s*(?:\(sanral\)\s*)?invites tenders? for\s+(?:the provision of\s+)?/i
// SANRAL detail headings often continue that sentence without its subject:
// "FOR CONSULTING ENGINEERING SERVICES ...", "For the provision of Routine ...".
const SANRAL_HEADING_LEAD_IN = /^for\s+(?:the\s+provision\s+of\s+)?/i

// Earlier DBSA collector runs stored "<type> - <title><document link labels>"
// as the description (the listing cell's <br> was dropped, gluing the title to
// its first link, which is always "Tender Volume(s)") and cut the title at 200
// characters. The description therefore holds the full title.
const DBSA_STORED_DESCRIPTION = /^(?:RFP|RFR|RFI|RFQ) - (.+?)\s?Tender Volumes?(?=$|,| \(Upd\))/

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Removes `reference` from the start of `text` only when it matches exactly (case-insensitive). */
export function stripLeadingReference(text: string, reference: string | null | undefined): string {
  const ref = reference ? collapse(reference) : ""
  if (!ref) return text
  const pattern = new RegExp(`^${escapeRegExp(ref).replace(/ /g, "\\s+")}(?:\\s*[-–:]\\s*|\\s+|$)`, "i")
  return text.replace(pattern, "").trim()
}

/** Removes `reference` from the end of `text` only when it matches exactly (case-insensitive). */
export function stripTrailingReference(text: string, reference: string | null | undefined): string {
  const ref = reference ? collapse(reference) : ""
  if (!ref) return text
  const pattern = new RegExp(`(?:\\s*[-–:]\\s*|\\s+|^)${escapeRegExp(ref).replace(/ /g, "\\s+")}$`, "i")
  // Some headings end with the reference twice ("… PROVINCE NRA 2026/0758 (B) NRA 2026/0758 (B)").
  let result = text
  for (let stripped = result.replace(pattern, "").trim(); stripped !== result; stripped = result.replace(pattern, "").trim()) {
    result = stripped
  }
  return result
}

function upperFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

// Generic procurement and work vocabulary. Only these words are lowercased
// when converting to sentence case; any other capitalised word is assumed to
// be (part of) a name and keeps its capital. Words that often form part of
// names (water, national, park, centre, mining, ...) are deliberately absent.
export const GENERIC_WORDS: ReadonlySet<string> = new Set([
  "a", "about", "across", "additional", "ad", "adhoc", "after", "all", "an", "and", "appointment",
  "area", "areas", "as", "assess", "assessment", "associated", "at", "be", "between", "bid", "bids",
  "bituminous", "bulk", "by", "catering", "civil", "civils", "cleaning", "climbing", "commercialisation",
  "concession", "construction", "consultancy", "consulting", "contract", "contractor", "contracts",
  "delivery", "design", "develop", "development", "during", "electricity", "elevated", "engineering",
  "environmental", "erection", "facilities", "financial", "financing", "for", "framework", "from",
  "geotechnical", "hire", "hoc", "implementation", "improvement", "in", "information", "infrastructure",
  "installation", "investment", "key", "km", "lane", "lanes", "licences", "line", "long", "maintenance",
  "management", "markings", "month", "months", "new", "of", "offers", "on", "operation", "operations",
  "opportunity", "or", "organisation", "other", "over", "partnership", "pavement", "period", "phase",
  "prefabricated", "private", "products", "professional", "programme", "project", "projects", "proposal",
  "proposals", "provider", "providers", "provision", "public", "quotation", "quotations", "redevelopment",
  "registration", "rehabilitation", "renewable", "repair", "repairs", "request", "resurfacing",
  "reticulation", "return", "road", "roads", "route", "routine", "section", "sections", "security", "service",
  "services", "settlement", "sites", "social", "software", "submitted", "subservices", "supply",
  "support", "system", "systems", "tender", "tenders", "term", "the", "through", "to", "training",
  "units", "upgrade", "upgrading", "via", "with", "within", "works", "year", "years",
  // Further work vocabulary seen in live listings.
  "acquisition", "analysis", "analytics", "bags", "bankable", "benefit", "commissioning", "company",
  "completion", "complete", "concrete", "conference", "connections", "construct", "coordination", "cost",
  "data", "decommission", "defect", "demolition", "design", "documents", "efficient", "execute",
  "feasibility", "finance", "fittings", "hydrants", "identification", "initial", "intelligence",
  "leased", "maintain", "manufactured", "material", "materials", "modelling", "near", "operate",
  "owner", "parking", "paving", "pipeline", "pipes", "preparation", "procurement", "property",
  "provide", "recycled", "refurbishment", "refuse", "remaining", "removal", "reservoir", "rooms",
  "sanitation", "servitudes", "sewer", "space", "structural", "studies", "tool", "tower", "undertake",
  "valves", "wheeling", "advisor", "behalf", "center", "dock", "dry", "external", "facility",
  "floating", "hotel", "land", "operator", "pump", "rising", "sewage", "tie", "transaction",
  "transfer", "treatment", "wastewater", "water", "blocks", "informal", "settlements", "main", "banker",
  // Number words ("for a period of Five (5) years").
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "eighteen", "twenty", "thirty", "thirty-six", "sixty",
])

// Generic words that are part of a name when they follow one: "Northern Cape
// Province", "Hluhluwe Interchange", "Bushveld Retreat Farm".
const NAME_SUFFIXES = new Set([
  "airport", "bridge", "building", "centre", "college", "complex", "dam", "district", "division",
  "farm", "harbour", "hospital", "house", "interchange", "local", "lodge", "metropolitan", "mine",
  "municipalities", "municipality", "nature", "office", "park", "pass", "port", "province", "reserve",
  "river", "school", "station", "street", "towers", "university", "water",
])

const WORD = /[A-Za-z0-9][A-Za-z0-9'’]*(?:-[A-Za-z0-9'’]+)*/g

// Words that join phrases rather than form part of a name ("Interchange near Dohne").
const CONNECTING_WORDS = new Set([
  "a", "an", "and", "as", "at", "between", "by", "for", "from", "in", "near", "of", "on", "or", "the", "to", "via", "with", "within",
])

const PART_LABELS = new Set(["annexure", "block", "cluster", "lot", "package", "part", "phase", "region", "schedule", "section", "volume", "ward", "zone"])

/**
 * Sentence case that never lowercases a name: only words in GENERIC_WORDS are
 * lowercased, and not when they sit inside a name ("Cape Province", "Dohne
 * Agricultural Development Institute"); acronyms, codes containing digits and
 * mixed-case names are kept as written.
 */
export function toReadableSentenceCase(text: string): string {
  // In all-caps text, a short parenthesised word is an acronym: "(SNR)", "(AIS)".
  const parenthesisedAcronyms = new Set([...text.matchAll(/\(([A-Z]{2,6})\)/g)].map((match) => match[1]))
  const titled = normalizeOpportunityTitleCase(text).replace(/\(([A-Za-z]{2,6})\)/g, (match, word: string) =>
    parenthesisedAcronyms.has(word.toUpperCase()) ? `(${word.toUpperCase()})` : match,
  )

  const words = [...titled.matchAll(WORD)].map((match) => ({
    text: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))
  // Words separated only by spaces belong to the same phrase (a name can span them).
  const joined = (a: number, b: number) => a >= 0 && b < words.length && /^ +$/.test(titled.slice(words[a].end, words[b].start))

  type Kind = "keep" | "name" | "generic" | "label"
  const kinds: Kind[] = words.map(({ text: word }, i) => {
    if (/\d/.test(word)) return "keep"
    // "Work Package A", "Phase B": a single letter labelling a part is not the article "a".
    if (/^[A-Za-z]$/.test(word) && PART_LABELS.has(words[i - 1]?.text.toLowerCase() ?? "")) return "label"
    if (!/^[A-Z][a-z'’]*(?:-[A-Za-z'’]+)*$/.test(word)) return /^[A-Z]/.test(word) ? "name" : "keep"
    return word.toLowerCase().split("-").every((part) => GENERIC_WORDS.has(part)) ? "generic" : "name"
  })

  // A generic word stays capitalised when it continues a name ("Limpopo
  // Province") or sits between two name words ("Agricultural Development Institute").
  for (let i = 0; i < words.length; i += 1) {
    if (kinds[i] !== "generic" || i === 0) continue
    const lower = words[i].text.toLowerCase()
    const afterName = kinds[i - 1] === "name" && joined(i - 1, i)
    const beforeName = !CONNECTING_WORDS.has(lower) && i + 1 < words.length && kinds[i + 1] === "name" && joined(i, i + 1)
    if (afterName && (NAME_SUFFIXES.has(lower) || beforeName)) kinds[i] = "name"
  }

  let result = ""
  let cursor = 0
  words.forEach((word, i) => {
    const output = kinds[i] === "generic" ? word.text.toLowerCase() : kinds[i] === "label" ? word.text.toUpperCase() : word.text
    result += titled.slice(cursor, word.start) + (i === 0 ? upperFirst(output) : output)
    cursor = word.end
  })
  result += titled.slice(cursor)

  // "National Route 2" / "National Road" are descriptions, not names.
  return result.replace(/\bNational (route|road|roads)\b/g, "national $1")
}

/**
 * True for a short heading made only of generic work vocabulary, which says
 * what kind of work but not what or where ("Routine road maintenance -
 * construction").
 */
export function isGenericWording(title: string): boolean {
  const words = title.toLowerCase().match(/[a-z0-9]+(?:[-'’][a-z0-9]+)*/g) ?? []
  return words.length > 0 && words.length <= 5 &&
    words.every((word) => word.split(/[-'’]/).every((part) => GENERIC_WORDS.has(part)))
}

// SANRAL scopes name each route as "<route> SECTION <n>": "N2 SECTION 10",
// "NATIONAL ROUTE R63 SECTION 8", "N2X SECTION 19".
const ROUTE_IN_SCOPE = /\b([NR]\d{1,3}X?)\s+section\b/gi
// A heading that stops at "…maintenance of national route".
const DANGLING_ROUTE = /\bnational\s+(?:route|road)s?$/i

function listOf(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

/**
 * A generic or unfinished heading gains the route codes its stored scope
 * names, e.g. "Routine road maintenance - construction on N9, R61 and R63".
 * Only codes literally present in the scope are used.
 */
function withRoutesFromScope(displayTitle: string, scope: string | null): string {
  if (!scope) return displayTitle
  const dangling = DANGLING_ROUTE.test(displayTitle)
  if (!dangling && !isGenericWording(displayTitle)) return displayTitle
  const routes = [...new Set([...scope.matchAll(ROUTE_IN_SCOPE)].map((match) => match[1].toUpperCase()))]
  if (!routes.length) return displayTitle
  return dangling ? `${displayTitle} ${listOf(routes)}` : `${displayTitle} on ${listOf(routes)}`
}

/** Splits at the first full stop followed by a capitalised word ("SOUTH AFRICA. THE CURRENT ..."). */
function splitFirstSentence(paragraph: string): [string, string] {
  const match = paragraph.match(/^(.+?[.!?])\s+(?=[A-Z])(.*)$/)
  return match ? [match[1], match[2]] : [paragraph, ""]
}

function readable(text: string, isSanral: boolean): string {
  let result = collapse(text)
  if (isSanral) {
    const withoutLeadIn = result.replace(SANRAL_INVITATION_LEAD_IN, "").replace(SANRAL_HEADING_LEAD_IN, "")
    if (withoutLeadIn) result = upperFirst(withoutLeadIn)
  }
  // SANRAL headings sometimes repeat a preposition ("SUBSERVICES ON FOR THE
  // IMPROVEMENT"); the stored official text keeps it, the display drops it.
  result = result.replace(/\bon for the\b/gi, (match) => match.slice(3))
  return toReadableSentenceCase(result)
}

export function resolveTenderDisplayTitle(input: DisplayTitleInput): DisplayTitleResult {
  const isSanral = input.sourceName?.trim().toUpperCase() === "SANRAL"
  const reference = input.reference ? collapse(input.reference) : ""

  if (input.sourceName?.trim() === "DBSA") {
    const recovered = collapse(input.description ?? "").match(DBSA_STORED_DESCRIPTION)?.[1]?.trim()
    // DBSA publishes no scope text beyond the title.
    if (recovered) return { displayTitle: readable(recovered, false), scope: null }
  }

  let title = stripTrailingReference(stripLeadingReference(collapse(input.title ?? ""), reference), reference)
  if (isSanral && SANRAL_LISTING_PREVIEW.test(title)) title = ""
  if (reference && title.toLowerCase() === reference.toLowerCase()) title = ""

  const paragraphs = (input.description ?? "")
    .replace(SOURCE_BOILERPLATE, "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((paragraph) => stripLeadingReference(collapse(paragraph), reference))
    .filter(Boolean)
  if (isSanral && paragraphs[0] && SANRAL_LISTING_PREVIEW.test(paragraphs[0])) paragraphs.shift()

  if (title) {
    // A title cut at a length limit ("…") whose full text opens the stored
    // description: use the description's complete first sentence instead.
    const cut = title.match(/^(.*?)\s*(?:\.{3}|…)$/)?.[1]
    if (cut && paragraphs[0]?.toLowerCase().startsWith(cut.toLowerCase())) {
      const [firstSentence, rest] = splitFirstSentence(paragraphs[0])
      if (firstSentence.length > cut.length) {
        return {
          displayTitle: readable(firstSentence, isSanral),
          scope: [rest, ...paragraphs.slice(1)].filter(Boolean).join("\n\n") || null,
        }
      }
    }
    const scope = paragraphs.join("\n\n") || null
    return { displayTitle: withRoutesFromScope(readable(title, isSanral), scope), scope }
  }

  // The title field holds only the reference (or nothing usable): the first
  // description paragraph is the published description of the work.
  const [first, ...rest] = paragraphs
  return {
    displayTitle: first ? readable(first, isSanral) : null,
    scope: rest.join("\n\n") || null,
  }
}

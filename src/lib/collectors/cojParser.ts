/**
 * Pure parsers for the City of Johannesburg's tender pages (https://joburg.org.za).
 *
 * Current tenders are listed on a hand-edited SharePoint page, "Current Bid
 * Proposals" (in 2026: /work_/Pages/2026-Tenders/2026-Bid-Proposals.aspx),
 * linked from the "Tenders" hub page. The page holds one rich-text table with
 * the columns "Bid Proposals" | "Description" | "Closing Date":
 *   - column 0: links to the tender document, proof of advert, addenda, etc.;
 *     the tender reference ("COJ/JTC02/26-27") is the text of one of them.
 *   - column 1: the description of the work, sometimes preceded or followed by
 *     an extension notice in its own paragraph.
 *   - column 2: the closing date as "13 October 2026" (no time). Extended
 *     tenders show more than one date.
 * Rows are newest-first. A tender may appear in several rows (an addendum or
 * extension row above the original); one row occasionally holds two tenders,
 * with the descriptions and dates in matching paragraph order.
 *
 * The text is littered with zero-width spaces (U+200B), including inside
 * references ("COJ/GCSS0​2/25-26") and words ("Apr​il").
 */

import { southAfricaDateOnlyDeadline } from "@/lib/southAfricaTime"
import { decodeEntities } from "./sanralParser"

export interface CojTender {
  /** Reference as printed by the City (official "COJ/XXX/yy-yy" spelling preferred). */
  reference: string
  /** Description of the work. */
  title: string
  /** Other paragraphs in the description cell (e.g. extension notices), or null. */
  description: string | null
  /**
   * Date-only deadline (southAfricaDateOnlyDeadline): the listing gives the
   * closing date but no time of day.
   */
  closingDate: Date | null
  /** Tender document link (the link whose text is the reference), if any. */
  documentUrl: string | null
}

export interface CojParseResult {
  tenders: CojTender[]
  /** Rows that could not be split unambiguously, with the reason. */
  skipped: { row: string; reason: string }[]
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

const REFERENCE = /\b(?:COJ|JTC)[/\s-]*[A-Z]*\s?\d+[/-]\d{2,4}-\d{2}\b/gi
const OFFICIAL_REFERENCE = /^COJ\/[A-Z]+\d+\/\d{2}-\d{2}$/i
const NOTICE = /\b(?:has been extended|wishes to inform|please be advised)\b/i
const DATE = /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/g

function stripZeroWidth(value: string): string {
  return value.replace(/[​‌‍﻿]/g, "")
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function text(html: string): string {
  return collapse(stripZeroWidth(decodeEntities(html.replace(/<[^>]*>/g, " "))))
}

/** Splits a rich-text cell into paragraphs (blocks separated by an empty line). */
function paragraphs(html: string): string[] {
  const lines = stripZeroWidth(html)
    .replace(/\s+/g, " ")
    .replace(/<(?:br|\/?div|\/?p)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .map((line) => collapse(decodeEntities(line)))

  const result: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (line) {
      current.push(line)
    } else if (current.length) {
      result.push(current.join(" "))
      current = []
    }
  }
  if (current.length) result.push(current.join(" "))
  return result
}

function referenceKey(reference: string): string {
  return reference.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

/**
 * Parses "13 October 2026" (also "07 AUGUST 2026", "02 Sept 2026") as a
 * date-only deadline: the listing gives no time of day (see
 * southAfricaDateOnlyDeadline).
 */
export function parseCojDate(value: string): Date | null {
  const match = new RegExp(DATE.source).exec(stripZeroWidth(value))
  return match ? dateFromParts(match[1], match[2], match[3]) : null
}

function dateFromParts(day: string, monthName: string, year: string): Date | null {
  const name = monthName.toLowerCase()
  if (name.length < 3) return null
  const month = MONTHS.findIndex((m) => m.startsWith(name.slice(0, 3)) && m.startsWith(name.replace(/\.$/, "")))
  if (month < 0) return null
  // Returns null for impossible days ("31 June") instead of rolling them over.
  return southAfricaDateOnlyDeadline(Number(year), month + 1, Number(day))
}

function datesIn(html: string): Date[] {
  const value = stripZeroWidth(decodeEntities(html.replace(/<[^>]*>/g, " ")))
  const dates: Date[] = []
  for (const match of value.matchAll(DATE)) {
    const date = dateFromParts(match[1], match[2], match[3])
    if (date) dates.push(date)
  }
  return dates
}

/** Finds the "Current Bid Proposals" link on the Tenders hub page. */
export function findCojCurrentBidsUrl(html: string, origin: string): string | null {
  for (const match of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if (/current\s+bid\s+proposals/i.test(text(match[2]))) {
      return new URL(decodeEntities(match[1]), origin).toString()
    }
  }
  return null
}

interface RowReference {
  key: string
  spelling: string
  documentUrl: string | null
}

function rowReferences(cellHtml: string, origin: string): RowReference[] {
  const found = new Map<string, RowReference>()
  const add = (spelling: string, documentUrl: string | null) => {
    const key = referenceKey(spelling)
    const existing = found.get(key)
    if (!existing) {
      found.set(key, { key, spelling, documentUrl })
    } else {
      if (!OFFICIAL_REFERENCE.test(existing.spelling) && OFFICIAL_REFERENCE.test(spelling)) existing.spelling = spelling
      if (!existing.documentUrl && documentUrl) existing.documentUrl = documentUrl
    }
  }

  // Links first, so a link whose whole text is the reference supplies the document URL.
  for (const link of cellHtml.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = text(link[2])
    for (const ref of label.matchAll(REFERENCE)) {
      const isDocument = collapse(ref[0]) === label
      add(collapse(ref[0]), isDocument ? new URL(decodeEntities(link[1]), origin).toString() : null)
    }
  }
  for (const ref of text(cellHtml).matchAll(REFERENCE)) add(collapse(ref[0]), null)
  return Array.from(found.values())
}

function buildTender(ref: RowReference, paras: string[], closingDate: Date | null): CojTender | null {
  const title = paras.find((p) => !NOTICE.test(p))
  if (!title) return null
  const rest = paras.filter((p) => p !== title)
  return {
    reference: ref.spelling,
    title,
    description: rest.length ? rest.join("\n") : null,
    closingDate,
    documentUrl: ref.documentUrl,
  }
}

export function parseCojBidProposals(html: string, origin: string): CojParseResult {
  const tenders: CojTender[] = []
  const skipped: CojParseResult["skipped"] = []
  const seen = new Map<string, CojTender>()

  for (const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
    const [refCell, descriptionCell, dateCell] = row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? []
    if (refCell === undefined || descriptionCell === undefined || dateCell === undefined) continue

    const refs = rowReferences(refCell, origin)
    const paras = paragraphs(descriptionCell)
    const dates = datesIn(dateCell)
    const summary = text(refCell).slice(0, 80)

    if (!refs.length || !paras.length) {
      if (text(row)) skipped.push({ row: summary, reason: "no reference or description" })
      continue
    }

    const built: { key: string; tender: CojTender | null }[] = []
    if (refs.length === 1) {
      // Extensions only move a closing date later, so the latest date applies.
      const latest = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null
      built.push({ key: refs[0].key, tender: buildTender(refs[0], paras, latest) })
    } else {
      const work = paras.filter((p) => !NOTICE.test(p))
      if (work.length !== refs.length || dates.length !== refs.length) {
        skipped.push({ row: summary, reason: `${refs.length} references but ${work.length} descriptions and ${dates.length} dates` })
        continue
      }
      refs.forEach((ref, i) => built.push({ key: ref.key, tender: buildTender(ref, [work[i]], dates[i]) }))
    }

    for (const { key, tender } of built) {
      if (!tender) {
        skipped.push({ row: summary, reason: "description is only a notice" })
        continue
      }
      const earlier = seen.get(key)
      if (earlier) {
        // Rows are newest-first: keep the newer row, but adopt the official spelling.
        if (!OFFICIAL_REFERENCE.test(earlier.reference) && OFFICIAL_REFERENCE.test(tender.reference)) earlier.reference = tender.reference
        if (!earlier.documentUrl) earlier.documentUrl = tender.documentUrl
        continue
      }
      seen.set(key, tender)
      tenders.push(tender)
    }
  }
  return { tenders, skipped }
}

import { readFileSync } from "node:fs"
import path from "node:path"
import type { ReactNode } from "react"
import Link from "next/link"
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

type SchemaKind = "FAQPage" | "HowTo"

type Props = {
  title: string
  eyebrow: string
  draftPath: string
  canonicalPath: string
  schemaKind: SchemaKind
  description: string
}

type MarkdownSection = { heading: string; content: string[] }

const INTERNAL_LINKS: Array<[RegExp, string]> = [
  [/CSD Registration Guide/gi, "/guides/csd"],
  [/CSD registration/gi, "/guides/csd"],
  [/B-BBEE (?:Certificate|Guide|verification|certificate)/gi, "/guides/bbbee"],
  [/SARS Tax Compliance/gi, "/guides/tax-compliance-status"],
  [/tax compliance/gi, "/guides/tax-compliance-status"],
  [/CIDB (?:grading|Grading|Guide)/g, "/guides/cidb-grading"],
  [/COIDA (?:letter|registration|Guide)/gi, "/guides/coida-uif"],
  [/SmartScore FAQ/g, "/guides/smartscore-faq"],
  [/Verification & Compliance FAQ/g, "/guides/verification-faq"],
  [/How to Respond to Opportunities/g, "/how-to/respond-to-opportunities"],
]

function cleanDraft(markdown: string): string[] {
  const lines = markdown.replace(/\r/g, "").split("\n")
  const firstDivider = lines.findIndex((line) => line.trim() === "---")
  return lines
    .slice(firstDivider >= 0 ? firstDivider + 1 : 1)
    .filter((line) => !/^\*\*End of .+\*\*$/.test(line.trim()))
}

function inline(text: string): ReactNode[] {
  const explicitLink = /(https?:\/\/[^\s)]+)/g
  const parts = text.split(explicitLink)
  const nodes: ReactNode[] = []

  for (const [partIndex, part] of parts.entries()) {
    if (/^https?:\/\//.test(part)) {
      nodes.push(<a key={`url-${partIndex}`} href={part} className="font-semibold text-accent hover:underline" target="_blank" rel="noopener noreferrer">{part}</a>)
      continue
    }

    let cursor = 0
    const candidates = INTERNAL_LINKS.flatMap(([pattern, href]) => {
      const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
      return [...part.matchAll(new RegExp(pattern.source, flags))].map((match) => ({
        index: match.index ?? 0,
        value: match[0],
        href,
      }))
    }).sort((a, b) => a.index - b.index)

    for (const candidate of candidates) {
      if (candidate.index < cursor) continue
      nodes.push(...bold(part.slice(cursor, candidate.index), `${partIndex}-${cursor}`))
      nodes.push(<Link key={`link-${partIndex}-${candidate.index}`} href={candidate.href} className="font-semibold text-accent hover:underline">{candidate.value}</Link>)
      cursor = candidate.index + candidate.value.length
    }
    nodes.push(...bold(part.slice(cursor), `${partIndex}-${cursor}`))
  }
  return nodes
}

function bold(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
      : part,
  )
}

function sectionsFrom(lines: string[]): MarkdownSection[] {
  const sections: MarkdownSection[] = []
  let current: MarkdownSection | null = null
  for (const line of lines) {
    if (line.startsWith("## ")) {
      current = { heading: line.slice(3).trim(), content: [] }
      sections.push(current)
    } else if (current) {
      current.content.push(line)
    }
  }
  return sections
}

function plainText(lines: string[]): string {
  return lines
    .filter((line) => line.trim() && !line.startsWith("### "))
    .map((line) => line.replace(/^[-*]\s+|^\d+\.\s+/g, "").replace(/\*\*/g, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

export function buildLongFormSchema(
  schemaKind: SchemaKind,
  title: string,
  description: string,
  canonicalPath: string,
  lines: string[],
): object {
  const sections = sectionsFrom(lines)
  const url = `https://www.aiformprocure.co.za${canonicalPath}`
  if (schemaKind === "FAQPage") {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      url,
      mainEntity: sections
        .filter((section) => section.heading.endsWith("?"))
        .map((section) => ({
          "@type": "Question",
          name: section.heading,
          acceptedAnswer: { "@type": "Answer", text: plainText(section.content) },
        })),
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    url,
    step: sections
      .filter((section) => /^Step \d+:/i.test(section.heading))
      .map((section, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: section.heading.replace(/^Step \d+:\s*/i, ""),
        text: plainText(section.content),
        url: `${url}#step-${index + 1}`,
      })),
  }
}

function MarkdownContent({ lines }: { lines: string[] }) {
  const output: ReactNode[] = []
  let index = 0
  let step = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line || line === "---") { index += 1; continue }
    if (line.startsWith("## ")) {
      const heading = line.slice(3)
      if (/^Step \d+:/i.test(heading)) step += 1
      output.push(<h2 id={step && /^Step \d+:/i.test(heading) ? `step-${step}` : undefined} key={index} className="mt-12 scroll-mt-24 font-display text-3xl font-semibold text-heading">{inline(heading)}</h2>)
      index += 1
      continue
    }
    if (line.startsWith("### ")) {
      output.push(<h3 key={index} className="mt-7 text-xl font-semibold text-heading">{inline(line.slice(4))}</h3>)
      index += 1
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^[-*]\s+/, ""))
      output.push(<ul key={`ul-${index}`} className="mt-4 list-disc space-y-2 pl-6 text-secondary">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>)
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^\d+\.\s+/, ""))
      output.push(<ol key={`ol-${index}`} className="mt-4 list-decimal space-y-2 pl-6 text-secondary">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>)
      continue
    }
    if (line.startsWith("```")) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith("```")) code.push(lines[index++])
      index += 1
      output.push(<pre key={`code-${index}`} className="mt-4 overflow-x-auto rounded-md bg-[#1a3a2a] p-5 text-sm text-[#f8f4ec]"><code>{code.join("\n")}</code></pre>)
      continue
    }
    output.push(<p key={index} className="mt-4 text-base leading-8 text-secondary">{inline(line)}</p>)
    index += 1
  }
  return output
}

export default function LongFormGuidePage({ title, eyebrow, draftPath, canonicalPath, schemaKind, description }: Props) {
  const markdown = readFileSync(path.join(process.cwd(), draftPath), "utf8")
  const lines = cleanDraft(markdown)
  const schema = buildLongFormSchema(schemaKind, title, description, canonicalPath, lines)

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <section className="border-b border-panel bg-[#1a3a2a] px-6 py-14 text-[#f8f4ec]">
          <div className="mx-auto max-w-4xl">
            <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: title, href: canonicalPath }]} />
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[#5DCAA5]">{eyebrow}</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-6xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#f8f4ec]/75">{description}</p>
          </div>
        </section>
        <article className="px-6 py-12">
          <div className="mx-auto max-w-4xl"><MarkdownContent lines={lines} /></div>
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      </main>
      <PublicFooter />
    </>
  )
}

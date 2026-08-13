import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { complianceGuides, getComplianceGuide } from "@/lib/complianceGuides"

type GuidePageProps = { params: Promise<{ slug: string }> }

const guideMetadata: Record<string, { title: string; description: string; openGraphTitle: string; openGraphDescription: string }> = {
  csd: {
    title: "CSD Registration Guide | How to Register & Maintain CSD Status",
    description: "Step-by-step guide to CSD registration in South Africa. Learn requirements, verify status, maintain registration, and improve SmartScore. Updated 2026.",
    openGraphTitle: "CSD Registration Guide",
    openGraphDescription: "Complete guide to CSD registration, verification, and maintaining status.",
  },
  bbbee: {
    title: "B-BBEE Verification Guide | Levels, Requirements & SmartScore Impact",
    description: "Complete B-BBEE verification guide: understand levels (1–8), requirements, how verification affects SmartScore, and procurement opportunities.",
    openGraphTitle: "B-BBEE Verification Guide",
    openGraphDescription: "Understand B-BBEE levels, requirements, and procurement impact.",
  },
  "tax-compliance-status": {
    title: "SARS Tax Compliance Guide | Verification, TCS PIN & Procurement",
    description: "Guide to SARS tax compliance verification. Learn TCS PIN lookup, compliance status checking, and how tax clearance affects procurement eligibility.",
    openGraphTitle: "SARS Tax Compliance Guide",
    openGraphDescription: "SARS verification, TCS PIN lookup, and tax compliance for procurement.",
  },
  "cidb-grading": {
    title: "CIDB Grading Guide | Contractor Registration & Grades 1–9",
    description: "CIDB registration and grading guide for construction contractors. Understand grades, requirements, renewal, and procurement eligibility in South Africa.",
    openGraphTitle: "CIDB Grading Guide",
    openGraphDescription: "CIDB registration, grading, and contractor eligibility guide.",
  },
  "coida-uif": {
    title: "COIDA & UIF Registration Guide | Employer Compliance in South Africa",
    description: "Guide to COIDA registration, UIF compliance, and employer obligations in South Africa. Learn requirements, renewal, and verification process.",
    openGraphTitle: "COIDA & UIF Registration Guide",
    openGraphDescription: "COIDA registration, UIF compliance, and employer obligations guide.",
  },
}

export function generateStaticParams() {
  return complianceGuides.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const guide = getComplianceGuide((await params).slug)
  if (!guide) return {}
  const targeted = guideMetadata[guide.slug]
  return {
    title: targeted?.title ?? `${guide.title} | AiForm Procure`,
    description: targeted?.description ?? guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: targeted ? {
      title: targeted.openGraphTitle,
      description: targeted.openGraphDescription,
    } : undefined,
  }
}

export default async function ComplianceGuidePage({ params }: GuidePageProps) {
  const guide = getComplianceGuide((await params).slug)
  if (!guide) notFound()
  const pageHeading = guideMetadata[guide.slug]?.title.split(" | ")[0] ?? guide.title

  return (
    <>
      <PublicHeader />
      <main lang="en" className="min-h-screen bg-page text-primary">
        <section className="border-b border-panel bg-[#1a3a2a] px-6 py-14 text-[#f8f4ec]">
          <div className="mx-auto max-w-4xl">
            <Link href="/guides" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#f8f4ec]/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DCAA5]">← All compliance guides</Link>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[#5DCAA5]">{guide.eyebrow}</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-6xl">{pageHeading}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#f8f4ec]/75">{guide.summary}</p>
          </div>
        </section>

        <article className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            {guide.distinction && (
              <aside className="mb-10 rounded-md border border-[#c8a060]/40 bg-[#c8a060]/10 p-5" aria-label="Important compliance distinction">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8c6a2f]">Important distinction</p>
                <p className="mt-2 text-base font-semibold leading-7 text-heading">{guide.distinction}</p>
              </aside>
            )}

            <div className="space-y-10">
              {guide.sections.map((section) => (
                <section key={section.heading} aria-labelledby={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
                  <h2 id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="font-display text-2xl font-semibold text-heading">{section.heading}</h2>
                  {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-4 max-w-3xl text-base leading-7 text-secondary">{paragraph}</p>)}
                  {section.bullets && <ul className="mt-4 space-y-3">{section.bullets.map((item) => <li key={item} className="flex gap-3 text-base leading-7 text-secondary"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" /><span>{item}</span></li>)}</ul>}
                  {section.table && (
                    <div className="mt-5 overflow-x-auto rounded-md border border-panel">
                      <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
                        <thead className="bg-panel text-heading"><tr>{section.table.headers.map((header) => <th key={header} scope="col" className="px-5 py-3 font-bold">{header}</th>)}</tr></thead>
                        <tbody className="divide-y divide-panel bg-card">{section.table.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell} className="px-5 py-3 text-secondary">{index === 0 ? <strong className="text-heading">{cell}</strong> : cell}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </div>

            <section className="mt-12 border-t border-panel pt-8" aria-labelledby="official-sources">
              <h2 id="official-sources" className="font-display text-2xl font-semibold text-heading">Official sources</h2>
              <ul className="mt-4 space-y-3">{guide.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-strong">{source.label}<span aria-hidden="true">↗</span></a></li>)}</ul>
            </section>

            <aside className="mt-10 rounded-md border border-panel bg-panel p-5 text-sm leading-6 text-secondary">This guide provides general information, not legal, tax or procurement advice. Requirements can change and a tender may impose additional conditions. Check the tender documents and the linked official sources before submitting.</aside>
          </div>
        </article>
      </main>
      <PublicFooter />
    </>
  )
}

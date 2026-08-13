import type { Metadata } from "next"
import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { complianceGuides } from "@/lib/complianceGuides"

export const metadata: Metadata = {
  title: "Supplier Verification & Compliance Guides | CSD, B-BBEE, Tax, CIDB, COIDA",
  description: "Complete guides to South African supplier compliance: CSD registration, B-BBEE verification, tax clearance, CIDB grading, COIDA registration. Step-by-step instructions.",
  openGraph: {
    title: "Supplier Compliance Guides",
    description: "CSD, B-BBEE, Tax, CIDB, COIDA - complete step-by-step guides.",
  },
}

export default function ComplianceGuidesPage() {
  return (
    <>
      <PublicHeader />
      <main lang="en" className="min-h-screen bg-page text-primary">
        <section className="border-b border-panel bg-[#1a3a2a] px-6 py-16 text-[#f8f4ec]">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#5DCAA5]">Supplier knowledge centre</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">Supplier verification and compliance guides</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#f8f4ec]/75">Practical, source-linked introductions to the systems suppliers encounter when tendering for public-sector work.</p>
          </div>
        </section>

        <section className="px-6 py-14">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
            {complianceGuides.map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group rounded-md border border-panel bg-card p-6 shadow-panel transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-accent">{guide.eyebrow}</p>
                <h2 className="mt-3 font-display text-2xl font-semibold text-heading group-hover:text-accent">{guide.title}</h2>
                <p className="mt-3 text-sm leading-6 text-secondary">{guide.summary}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Read guide <span aria-hidden="true">→</span></span>
              </Link>
            ))}
            <section className="mt-4 border-t border-panel pt-8 md:col-span-2">
              <h2 className="font-display text-2xl font-semibold text-heading">Frequently asked questions</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Link href="/guides/smartscore-faq" className="rounded-md border border-panel bg-card p-4 font-semibold text-heading hover:border-accent hover:bg-panel">SmartScore FAQ</Link>
                <Link href="/guides/verification-faq" className="rounded-md border border-panel bg-card p-4 font-semibold text-heading hover:border-accent hover:bg-panel">Verification &amp; Compliance FAQ</Link>
              </div>
            </section>
            <section className="border-t border-panel pt-8 md:col-span-2">
              <h2 className="font-display text-2xl font-semibold text-heading">How-to guides</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Link href="/how-to/register-supplier" className="rounded-md border border-panel bg-card p-4 font-semibold text-heading hover:border-accent hover:bg-panel">How to register as a supplier</Link>
                <Link href="/how-to/post-rfq" className="rounded-md border border-panel bg-card p-4 font-semibold text-heading hover:border-accent hover:bg-panel">How to post an RFQ</Link>
                <Link href="/how-to/respond-to-opportunities" className="rounded-md border border-panel bg-card p-4 font-semibold text-heading hover:border-accent hover:bg-panel">How to respond to opportunities</Link>
              </div>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

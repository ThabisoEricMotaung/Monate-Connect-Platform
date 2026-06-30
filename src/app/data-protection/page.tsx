import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const draftNotice =
  "This document is a draft for review purposes only and does not constitute legal advice or a binding agreement. Final version pending legal review."

const protectionSections = [
  {
    title: "POPIA-Aware Approach",
    body:
      "AiForm Procure should be operated with awareness of South Africa's Protection of Personal Information Act. Production policies should define responsible parties, lawful processing grounds, retention, access handling and cross-border considerations where relevant.",
  },
  {
    title: "Data Security Principles",
    body:
      "Security principles include collecting only necessary data, protecting sensitive supplier and procurement records, limiting access by role, monitoring important activity and maintaining reliable operational controls.",
  },
  {
    title: "Access Control",
    body:
      "Access should be restricted according to user role and business need. Supplier, buyer, admin and finance workflows should only expose information needed for authorised procurement activity.",
  },
  {
    title: "Supplier Document Protection",
    body:
      "Supplier documents such as compliance evidence and banking verification support should be protected from public exposure and handled through controlled review workflows.",
  },
  {
    title: "User Rights",
    body:
      "Users may need mechanisms to request access, correction, deletion, restriction or review of personal information, subject to lawful procurement, audit and recordkeeping obligations.",
  },
  {
    title: "Contact for Data Queries",
    body:
      "Data protection questions, access requests or correction requests should be directed through the contact channel until a formal information officer or privacy contact is appointed.",
  },
  {
    title: "Audit and Accountability",
    body:
      "Audit logs, workflow records and governance reports can help demonstrate how procurement decisions, supplier changes and document reviews were handled.",
  },
  {
    title: "Professional Placeholder",
    body:
      "This data protection page is not final legal advice. It should be reviewed against the final data architecture, Supabase configuration, storage controls and operating entity obligations.",
  },
]

export default function DataProtectionPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-start gap-3 rounded-md border border-[#c8a060]/30 bg-[#c8a060]/10 px-4 py-3 text-sm font-semibold leading-6 text-[#1a3a2a] shadow-panel">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c8a060]/15 text-[#c8a060]" aria-hidden="true">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </span>
          <p>{draftNotice}</p>
        </div>
      </section>

      <section className="bg-[#1a3a2a] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4"><BackLink className="text-[#f8f4ec]/70 hover:text-[#f8f4ec]" /></div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[#c8a060]">Legal Desk &middot; Data Protection</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-[#f8f4ec] md:text-6xl">Data Protection</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#f8f4ec]/70">
            This page sets out POPIA-aware placeholder principles for protecting supplier,
            buyer, compliance and procurement workflow data inside AiForm Procure.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex items-center rounded-md bg-[#c8a060] px-5 py-2.5 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#d7b373]">
              Contact for Data Queries
            </Link>
            <Link href="/privacy" className="inline-flex items-center rounded-md border border-[#f8f4ec]/20 bg-[#f8f4ec]/10 px-5 py-2.5 text-sm font-semibold text-[#f8f4ec] transition hover:border-[#f8f4ec]/40 hover:bg-[#f8f4ec]/15">
              Privacy Policy
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Protection Principles
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Role-based access, document control and accountability
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Final controls should align with production RLS policies, storage rules, user roles,
            incident response, data retention and supplier document handling procedures.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Last updated: 4 June 2026
          </p>
        </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
        {protectionSections.map((section) => (
          <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <h2 className="text-2xl font-semibold text-heading">{section.title}</h2>
            <p className="mt-4 text-sm leading-7 text-secondary">{section.body}</p>
          </article>
        ))}
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

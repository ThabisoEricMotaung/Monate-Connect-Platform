import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const draftNotice =
  "This document is a draft for review purposes only and does not constitute legal advice or a binding agreement. Final version pending legal review."

const privacySections = [
  {
    title: "Who we are",
    body:
      "AiForm Procure is a procurement platform and a product of AiForm Studio, based in Pretoria, South Africa.",
  },
  {
    title: "What information we collect",
    body:
      "We may collect your name, email address, phone number, company details, CSD number, BBBEE certificate, tax clearance information, banking details, uploaded documents, and related account or procurement records.",
  },
  {
    title: "Why we collect it",
    body:
      "We collect this information to support supplier verification, RFQ matching, platform operation, account management, procurement workflows, and communication between suppliers and buyers.",
  },
  {
    title: "How we store it",
    body:
      "Platform data is stored using Supabase, hosted in the EU, with encryption at rest and access controls intended to protect operational and compliance information.",
  },
  {
    title: "Who we share it with",
    body:
      "We do not sell personal information to third parties. Supplier information is shared with buyers only when a supplier responds to an RFQ or where sharing is necessary to operate the platform.",
  },
  {
    title: "Your rights under POPIA",
    body:
      "Under the Protection of Personal Information Act, you may request access to your personal information, correction of inaccurate information, deletion where legally permitted, or object to certain processing.",
  },
  {
    title: "How long we retain data",
    body:
      "We retain data while an account is active and for up to 2 years after account closure, unless a longer retention period is required for audit, legal, security, or legitimate operational reasons.",
  },
  {
    title: "How to contact us",
    body:
      "For privacy questions, data access requests, or POPIA-related queries, contact us at hello@aiformprocure.co.za.",
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-md border border-warning bg-warning-soft px-5 py-4 text-sm font-semibold leading-6 text-warning shadow-panel">
            {draftNotice}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-20">
          <div className="border-b border-t border-heading py-10">
            <p className="newspaper-kicker">Legal Desk &middot; Privacy Policy</p>
            <h1 className="newspaper-headline mt-5">Privacy Policy</h1>
            <p className="mt-5 font-display text-xl text-heading">
              Effective date: Draft — not yet in effect
            </p>
            <p className="newspaper-body mt-6 max-w-3xl">
              This draft explains how AiForm Procure expects to collect, use, store, and protect
              information submitted by suppliers, buyers, and platform users.
            </p>
          </div>

          <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              AiForm Procure
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-heading">
              Product of AiForm Studio
            </h2>
            <p className="mt-4 text-sm leading-7 text-secondary">
              Built in Pretoria for South African procurement teams, suppliers, and pilot partners.
            </p>
            <Link href="/contact" className="mt-6 inline-flex text-sm font-bold text-accent transition hover:text-accent-strong">
              Contact us
            </Link>
          </aside>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
          {privacySections.map((section) => (
            <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
              <h2 className="font-display text-2xl font-semibold text-heading">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-secondary">{section.body}</p>
            </article>
          ))}
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

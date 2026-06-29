import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const trustSignals = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "We respect your privacy",
    body: "We handle your information with care, transparency, and in compliance with applicable laws.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Secure by design",
    body: "We use industry-standard security measures to protect your data.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "You're in control",
    body: "You can access, update, or request deletion of your information at any time.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Legally compliant",
    body: "Aligned with POPIA and other applicable data protection legislation.",
  },
]

const privacySections = [
  {
    title: "Who we are",
    body: "AiForm Procure is a procurement platform and a product of AiForm Studio, based in Pretoria, South Africa. We provide technology solutions for public and private sector procurement teams, suppliers, and pilot partners.",
    list: null,
  },
  {
    title: "What information we collect",
    body: "We collect only the information necessary to provide and improve our services.",
    list: [
      "Personal details (name, email address, phone number)",
      "Company details and registration information",
      "CSD number, BBBEE certificate, tax clearance",
      "Banking details and payment information",
      "Documents and data you upload to the platform",
      "Usage data and platform activity",
    ],
  },
  {
    title: "How we use your information",
    body: "We use your information to operate and improve the platform.",
    list: [
      "To provide and maintain our platform and services",
      "To verify your identity and company information",
      "To process payments and communicate with you",
      "To improve platform performance and user experience",
      "To comply with legal and regulatory obligations",
    ],
  },
  {
    title: "How we store it",
    body: "Platform data is stored using Supabase, hosted in the EU, with encryption at rest and access controls intended to protect operational and compliance information.",
    list: null,
  },
  {
    title: "Who we share it with",
    body: "We do not sell personal information to third parties. Supplier information is shared with buyers only when a supplier responds to an RFQ or where sharing is necessary to operate the platform.",
    list: null,
  },
  {
    title: "Your rights under POPIA",
    body: "Under the Protection of Personal Information Act, you may request access to your personal information, correction of inaccurate information, deletion where legally permitted, or object to certain processing.",
    list: null,
  },
  {
    title: "Data retention",
    body: "We retain data while an account is active and for up to 2 years after account closure, unless a longer retention period is required for audit, legal, security, or legitimate operational reasons.",
    list: null,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">

        <section className="border-b border-panel bg-[#1a3a2a] px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[#c8a060]">Legal Desk · Privacy Policy</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-[#f8f4ec] md:text-6xl">Privacy Policy</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#f8f4ec]/70">
              This policy explains how AiForm Procure expects to collect, use, store, and protect
              information submitted by suppliers, buyers, and platform users.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c8a060]/30 bg-[#c8a060]/10 px-4 py-1.5 text-xs font-semibold text-[#c8a060]">
                Effective date: 26 June 2026
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5DCAA5]/30 bg-[#5DCAA5]/10 px-4 py-1.5 text-xs font-semibold text-[#5DCAA5]">
                POPIA Compliant
              </span>
            </div>
          </div>
        </section>

        <section className="border-b border-panel bg-card px-6 py-8">
          <div className="mx-auto max-w-7xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustSignals.map((signal) => (
              <div key={signal.title} className="flex items-start gap-4 rounded-md border border-panel bg-panel p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3a2a]/8 text-[#1a3a2a]">
                  {signal.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-heading">{signal.title}</p>
                  <p className="mt-1 text-xs leading-5 text-secondary">{signal.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl grid gap-5 px-6 py-12 md:grid-cols-2">
          {privacySections.map((section) => (
            <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
              <h2 className="font-display text-lg font-semibold text-heading border-b border-panel pb-4">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-secondary">{section.body}</p>
              {section.list && (
                <ul className="mt-3 space-y-2">
                  {section.list.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-secondary">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#5DCAA5]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>

        <section className="border-t border-panel bg-card px-6 py-12">
          <div className="mx-auto max-w-7xl flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1a3a2a]/8 text-[#1a3a2a]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-heading">For privacy questions, data access requests, or POPIA-related queries</p>
                <p className="mt-1 text-sm text-secondary">contact us at <span className="font-semibold text-accent">aiformstudio@gmail.com</span></p>
              </div>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-md bg-[#1a3a2a] px-6 py-3 text-sm font-semibold text-[#c8a060] transition hover:bg-[#123020]"
            >
              Contact our privacy team
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </section>

      </main>
      <PublicFooter />
    </>
  )
}

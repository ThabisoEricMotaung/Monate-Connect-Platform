import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const draftNotice =
  "This document is a draft for review purposes only and does not constitute legal advice or a binding agreement. Final version pending legal review."

const cookieSections = [
  {
    title: "What cookies are",
    body:
      "Cookies are small text files stored by your browser to help websites remember information about your visit, keep sessions active, and provide a consistent user experience.",
  },
  {
    title: "What cookies we use",
    body:
      "AiForm Procure uses session cookies for authentication, localStorage for theme preference, and operational browser storage needed for platform functionality. We do not use third-party advertising cookies.",
  },
  {
    title: "How to control cookies",
    body:
      "You can control or block cookies through your browser settings. Some platform features, especially login and account access, may not work properly if required session cookies are disabled.",
  },
  {
    title: "Contact",
    body:
      "For questions about this Cookie Policy, contact hello@aiformprocure.co.za.",
  },
]

export default function CookiePolicyPage() {
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
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[#c8a060]">Legal Desk &middot; Cookie Policy</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-[#f8f4ec] md:text-6xl">Cookie Policy</h1>
            <p className="mt-5 font-display text-xl text-[#f8f4ec]">
              Effective date: Draft — not yet in effect
            </p>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-[#f8f4ec]/70">
              This draft explains how AiForm Procure uses cookies and browser storage to keep the
              platform secure, usable, and consistent.
            </p>
          </div>

          <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              No advertising cookies
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-heading">
              Functional storage only
            </h2>
            <p className="mt-4 text-sm leading-7 text-secondary">
              Current platform storage supports authentication, theme preference, accessibility
              preference, and core product operation.
            </p>
            <Link href="/privacy" className="mt-6 inline-flex text-sm font-bold text-accent transition hover:text-accent-strong">
              Read Privacy Policy
            </Link>
          </aside>
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
          {cookieSections.map((section) => (
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

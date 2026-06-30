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
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-md border border-warning bg-warning-soft px-5 py-4 text-sm font-semibold leading-6 text-warning shadow-panel">
            {draftNotice}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-20">
          <div className="border-b border-t border-heading py-10">
            <BackLink />
            <p className="mt-4 newspaper-kicker">Legal Desk &middot; Cookie Policy</p>
            <h1 className="newspaper-headline mt-5">Cookie Policy</h1>
            <p className="mt-5 font-display text-xl text-heading">
              Effective date: Draft — not yet in effect
            </p>
            <p className="newspaper-body mt-6 max-w-3xl">
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
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
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

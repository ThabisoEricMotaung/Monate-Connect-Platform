import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const cookieSections = [
  {
    title: "Essential Cookies",
    body:
      "Essential cookies and similar browser storage may be used to keep the platform secure, maintain basic navigation, preserve service reliability and support core user interface behaviour.",
  },
  {
    title: "Authentication and Session Cookies",
    body:
      "Authentication and session cookies may help identify signed-in users, maintain secure sessions, support logout and protect authenticated supplier, buyer and admin workflows.",
  },
  {
    title: "Preference Cookies",
    body:
      "Preference storage may remember theme, language, accessibility settings, high contrast mode, reduced motion, low data mode or other interface choices selected by the user.",
  },
  {
    title: "Analytics Placeholders",
    body:
      "Analytics tools may be introduced to understand usage patterns, improve onboarding, monitor errors and strengthen product decisions. Any production analytics setup should be documented before launch.",
  },
  {
    title: "Managing Cookies",
    body:
      "Users can manage cookies through browser settings. Blocking essential cookies may affect login, session management, accessibility preferences or other important platform functions.",
  },
  {
    title: "Professional Placeholder",
    body:
      "This cookie policy is placeholder language. It should be updated when final analytics, cookie consent, tracking and browser storage tools are confirmed.",
  },
]

export default function CookiePolicyPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">Legal Desk &middot; Cookie Policy</p>
          <h1 className="newspaper-headline mt-5">Cookie Policy</h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            This page explains how cookies and browser storage may be used for sessions,
            preferences, accessibility settings and future analytics in Monate Connect.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/privacy" className="masthead__btn-primary">
              Privacy Policy
            </Link>
            <Link href="/data-protection" className="masthead__btn-secondary">
              Data Protection
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Cookie Categories
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Essential, session, preference and analytics placeholders
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Final cookie notices should match the production implementation and any consent
            requirements that apply to the platform.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Last updated: 4 June 2026
          </p>
        </aside>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
        {cookieSections.map((section) => (
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

import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const privacySections = [
  {
    title: "What Data Is Collected",
    body:
      "AiForm Procure may collect account details, supplier profile data, buyer organisation details, procurement activity, compliance evidence, contact information, usage analytics and operational logs needed to run a procurement platform.",
  },
  {
    title: "Supplier Profile Data",
    body:
      "Supplier profile data may include business name, registration details, province, industry, verification status, readiness information, contact roles and information submitted to support supplier discovery and onboarding.",
  },
  {
    title: "Procurement Activity",
    body:
      "Procurement activity may include RFQs, clarification questions, quotes, award records, purchase orders, contracts, invoices, payments, workflow decisions, audit records and related lifecycle statuses.",
  },
  {
    title: "Compliance Documents",
    body:
      "Compliance documents may include uploaded records such as company registration evidence, tax clearance, BBBEE, CSD, banking verification support and other documents required for procurement readiness checks.",
  },
  {
    title: "Contact Information",
    body:
      "Contact information may include names, email addresses, phone numbers, organisation details and pilot request information used for support, onboarding, procurement communication and partnership discussions.",
  },
  {
    title: "Analytics and Logs",
    body:
      "The platform may collect technical logs, timestamps, device or browser signals, page interactions, error records and analytics placeholders to protect the service, improve reliability and understand usage trends.",
  },
  {
    title: "How Data Is Used",
    body:
      "Data is used to operate supplier onboarding, procurement workflows, verification, marketplace previews, RFQ and quote management, auditability, notifications, support, platform diagnostics and executive reporting.",
  },
  {
    title: "Professional Placeholder",
    body:
      "This privacy policy is professional placeholder language for pilot and SaaS readiness. It should be reviewed by qualified legal counsel before production use.",
  },
]

export default function PrivacyPolicyPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">Legal Desk &middot; Privacy Policy</p>
          <h1 className="newspaper-headline mt-5">Privacy Policy</h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            This page explains the types of information AiForm Procure may collect and how that
            information may be used to support procurement, supplier verification and platform
            operations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="masthead__btn-primary">
              Contact for Data Queries
            </Link>
            <Link href="/terms" className="masthead__btn-secondary">
              Terms of Use
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Legal Notice
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">Placeholder policy language</h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            This is not final legal advice. Organisations should adapt this policy to their
            operating model, contracts, data flows and applicable legal obligations.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Last updated: 4 June 2026
          </p>
        </aside>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
        {privacySections.map((section) => (
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

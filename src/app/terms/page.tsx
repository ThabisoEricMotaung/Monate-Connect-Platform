import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const termsSections = [
  {
    title: "Platform Usage Rules",
    body:
      "Users must use AiForm Procure for lawful procurement, supplier onboarding, quote management, contract tracking and related business purposes. Abuse, misrepresentation, unauthorised access or attempts to disrupt the platform are not permitted.",
  },
  {
    title: "Supplier Responsibilities",
    body:
      "Suppliers are responsible for submitting accurate business information, maintaining current compliance documents, responding honestly to RFQs and keeping account access secure.",
  },
  {
    title: "Buyer Responsibilities",
    body:
      "Buyers and procurement teams are responsible for fair RFQ publication, transparent evaluation, proper award governance, responsible document handling and compliance with their internal procurement policies.",
  },
  {
    title: "No Guarantee of Award",
    body:
      "Registration, verification, SmartScore visibility, marketplace listing or quote submission does not guarantee shortlisting, award, contract creation, payment or any commercial outcome.",
  },
  {
    title: "Accuracy of Submitted Information",
    body:
      "Users must ensure that information, quotes, documents, banking details, evaluation records and approvals submitted through the platform are complete, truthful and authorised.",
  },
  {
    title: "Account Security",
    body:
      "Users are responsible for protecting login credentials, limiting account access to authorised people and reporting suspected unauthorised access or security concerns promptly.",
  },
  {
    title: "Limitation of Liability",
    body:
      "To the extent permitted by applicable law, AiForm Procure should not be treated as a substitute for professional procurement, legal, financial, compliance or audit advice.",
  },
  {
    title: "Professional Placeholder",
    body:
      "These terms are professional placeholder language and should be reviewed by legal counsel before being relied on for production contracting or commercial use.",
  },
]

export default function TermsOfUsePage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">Legal Desk &middot; Terms of Use</p>
          <h1 className="newspaper-headline mt-5">Terms of Use</h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            These terms outline professional placeholder rules for using AiForm Procure as a
            procurement, supplier verification and procurement-to-payment workflow platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth/signup" className="masthead__btn-primary">
              Register Supplier
            </Link>
            <Link href="/privacy" className="masthead__btn-secondary">
              Privacy Policy
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Legal Notice
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">Not final legal advice</h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            These terms should be adapted for the final operating entity, commercial agreements,
            acceptable use rules and jurisdiction-specific legal requirements.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Last updated: 4 June 2026
          </p>
        </aside>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
        {termsSections.map((section) => (
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

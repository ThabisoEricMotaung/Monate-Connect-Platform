import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const termsSections = [
  {
    title: "Acceptance of terms",
    body:
      "By accessing or using AiForm Procure, users agree to follow these terms and any platform rules made available during onboarding or use.",
  },
  {
    title: "Who may use the platform",
    body:
      "Supplier accounts are intended for South African-registered entities only. Buyer accounts must be used by registered organisations and authorised representatives.",
  },
  {
    title: "Supplier obligations",
    body:
      "Suppliers must provide accurate information, maintain a valid CSD registration, and keep BBBEE and tax clearance documentation current where those documents are submitted or required.",
  },
  {
    title: "Buyer obligations",
    body:
      "Buyers must post legitimate RFQs only, must not publish spam RFQs, and must award or formally close RFQs within a reasonable procurement timeframe.",
  },
  {
    title: "Platform rules",
    body:
      "Users must not misrepresent their identity, organisation, compliance status, procurement authority, pricing, documents, or banking information. Fraudulent documents are not permitted.",
  },
  {
    title: "Intellectual property",
    body:
      "AiForm Studio owns the AiForm Procure platform, including its product design, software, interface, workflows, brand assets, and related intellectual property.",
  },
  {
    title: "Limitation of liability",
    body:
      "AiForm Procure facilitates procurement connections and workflows. It is not responsible for contract outcomes, supplier performance, buyer decisions, payment disputes, or commercial results between users.",
  },
  {
    title: "Termination",
    body:
      "AiForm Procure may suspend or terminate accounts that breach platform rules, submit fraudulent documents, misuse procurement workflows, or otherwise violate these terms.",
  },
  {
    title: "Governing law",
    body:
      "These terms are governed by the laws of the Republic of South Africa.",
  },
  {
    title: "Subscriptions, Refunds and Cancellations",
    body:
      "AiForm Procure operates on a subscription basis during the pilot period. The platform is currently free for all registered users until October 2026.\n\nCancellation: Users may cancel their account at any time by contacting support or through their account settings. Cancellation takes effect immediately.\n\nRefunds: As the platform is currently free during the pilot period, no payments are collected and no refunds are applicable. When paid subscriptions are introduced, refund terms will be clearly communicated in advance and updated in these terms.\n\nDelivery: AiForm Procure is a digital platform. No physical goods are sold or delivered through the platform. All services are delivered electronically.\n\nDisputes: Any billing disputes should be directed to hello@aiformprocure.co.za within 30 days of the charge.",
  },
  {
    title: "Contact",
    body:
      "For questions about these terms, contact hello@aiformprocure.co.za.",
  },
]

export default function TermsOfServicePage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">

        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-20">
          <div className="border-b border-t border-heading py-10">
            <p className="newspaper-kicker">Legal Desk &middot; Terms of Service</p>
            <h1 className="newspaper-headline mt-5">Terms of Service</h1>
            <p className="mt-5 font-display text-xl text-heading">
              Effective date: 26 June 2026
            </p>
            <p className="newspaper-body mt-6 max-w-3xl">
              These terms describe the expected rules for using AiForm Procure as a supplier,
              buyer, or authorised platform user.
            </p>
          </div>

          <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              Platform owner
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-heading">
              AiForm Studio
            </h2>
            <p className="mt-4 text-sm leading-7 text-secondary">
              AiForm Procure is operated as a procurement platform for verified supplier discovery,
              RFQ workflows, and buyer-supplier coordination.
            </p>
            <Link href="/privacy" className="mt-6 inline-flex text-sm font-bold text-accent transition hover:text-accent-strong">
              Read Privacy Policy
            </Link>
          </aside>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
          {termsSections.map((section) => (
            <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
              <h2 className="font-display text-2xl font-semibold text-heading">{section.title}</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-secondary">{section.body}</p>
            </article>
          ))}
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

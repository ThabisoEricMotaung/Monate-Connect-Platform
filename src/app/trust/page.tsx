import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const trustBadges = [
  "Verified Suppliers",
  "Audit-ready Workflows",
  "Compliance Controls",
  "Role-based Access",
  "Procurement-to-Payment Tracking",
]

const sections = [
  {
    title: "SmartScore™ Trust System",
    eyebrow: "Trust Indicator",
    body:
      "SmartScore is NOT a credit score. It is a procurement trust, readiness and reputation indicator that helps buyers understand supplier preparedness, verification progress, compliance signals, platform activity, awards, contracts, invoice behaviour and payment reliability.",
  },
  {
    title: "Supplier Verification",
    eyebrow: "Supplier Readiness",
    body:
      "Supplier profiles can be reviewed for business identity, location, sector, procurement readiness and verification status before deeper sourcing activity begins.",
  },
  {
    title: "Compliance Document Checks",
    eyebrow: "Evidence Controls",
    body:
      "Compliance workflows support document review for tax clearance, BBBEE, CSD, company registration, CIDB and sector-specific requirements where applicable.",
  },
  {
    title: "Banking Verification Controls",
    eyebrow: "Payment Safety",
    body:
      "Banking review workflows help procurement and finance teams separate supplier onboarding from payment release controls, reducing the risk of unverified payment details entering the payment cycle.",
  },
  {
    title: "Audit Trail",
    eyebrow: "Traceability",
    body:
      "Important procurement actions can be logged with user, entity, timestamp, previous values, new values and metadata so teams retain a governance record for internal audit and management review.",
  },
  {
    title: "Approval Matrix",
    eyebrow: "Governance Rules",
    body:
      "Approval thresholds and responsible roles can be modelled to guide award, contract, invoice, payment and override decisions according to procurement authority.",
  },
  {
    title: "Decision Board",
    eyebrow: "Committee Review",
    body:
      "High-value or sensitive procurement decisions can be surfaced to a decision board for recorded review, notes, approval, rejection or requests for more information.",
  },
  {
    title: "Procurement Overrides",
    eyebrow: "Exception Handling",
    body:
      "Override workflows help teams document why a blocked procurement action was reviewed, who approved or rejected it, and what risk rationale was recorded.",
  },
  {
    title: "Contract / Invoice / Payment Tracking",
    eyebrow: "Lifecycle Integrity",
    body:
      "The procurement lifecycle can be tracked from RFQ and quote through purchase order, contract, invoice and payment, helping teams spot gaps before they become audit findings.",
  },
  {
    title: "Accessibility & Language Inclusion",
    eyebrow: "Inclusive Access",
    body:
      "The platform includes language switching, theme controls and accessibility preferences so supplier access can be broadened without weakening procurement governance.",
  },
  {
    title: "WhatsApp Procurement Network",
    eyebrow: "Supplier Communication",
    body:
      "WhatsApp-ready procurement alerts help teams reach suppliers with RFQ, closing, compliance, award and invoice reminders while keeping formal procurement actions inside the platform.",
  },
]

export default function TrustCentrePage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">Public Trust Centre &middot; Procurement Integrity</p>
          <h1 className="newspaper-headline mt-5">How Monate Connect protects procurement trust</h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            A public overview of the controls, workflows and governance signals that support
            fairer supplier discovery, auditable procurement and safer payment readiness.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/opportunities" className="masthead__btn-primary">
              View Opportunities
            </Link>
            <Link href="/suppliers" className="masthead__btn-secondary">
              Browse Suppliers
            </Link>
            <Link href="/auth/signup" className="masthead__btn-secondary">
              Register Supplier
            </Link>
            <Link href="/auth/login" className="masthead__btn-secondary">
              Supplier Login
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Trust Badges
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Controls visible to buyers, suppliers and leadership
          </h2>
          <div className="mt-6 grid gap-3">
            {trustBadges.map((badge) => (
              <div key={badge} className="rounded-md border border-panel bg-panel p-4">
                <p className="text-sm font-bold text-heading">{badge}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="rounded-md border border-warning/35 bg-warning/10 p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-warning">
            Important distinction
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            SmartScore is not a credit score
          </h2>
          <p className="mt-3 text-sm leading-7 text-secondary">
            SmartScore does not assess consumer creditworthiness, lending eligibility or credit risk.
            It is a procurement trust, readiness and reputation indicator designed for sourcing,
            compliance and supplier development conversations.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              {section.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-heading">{section.title}</h2>
            <p className="mt-4 text-sm leading-7 text-secondary">{section.body}</p>
          </article>
        ))}
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

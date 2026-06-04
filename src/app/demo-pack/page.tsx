import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const workflowSteps = [
  "Supplier Registration",
  "Verification",
  "RFQ",
  "Quote",
  "Award",
  "PO",
  "Contract",
  "Invoice",
  "Payment",
]

const sections = [
  {
    title: "What Monate Connect Is",
    eyebrow: "Platform Overview",
    body:
      "Monate Connect is an enterprise procurement network for verified suppliers, buyers, compliance teams, and executives. It brings sourcing, supplier readiness, workflow governance, and procurement intelligence into one operating environment.",
  },
  {
    title: "Problem It Solves",
    eyebrow: "Market Need",
    body:
      "Procurement teams often manage supplier discovery, RFQs, compliance documents, awards, contracts, invoices, payments, and audit evidence across disconnected tools. Suppliers lose visibility, buyers lose traceability, and leadership loses a real-time view of risk and value.",
  },
  {
    title: "Supplier Journey",
    eyebrow: "Supplier Network",
    body:
      "Suppliers register, complete their profiles, upload compliance evidence, receive opportunities, ask clarification questions, submit quotes, accept purchase orders, manage contract obligations, and track invoice or payment status.",
  },
  {
    title: "Buyer Journey",
    eyebrow: "Procurement Teams",
    body:
      "Buyers publish RFQs, review quotes, compare suppliers, make award recommendations, generate purchase orders, create contracts, review invoices, approve payments, and retain a complete audit trail.",
  },
  {
    title: "Procurement-to-Payment Workflow",
    eyebrow: "Operating Model",
    body:
      "The platform follows the complete procurement lifecycle from supplier onboarding to verified payment tracking, with governance checkpoints at award, contract, invoice, and payment stages.",
  },
  {
    title: "Trust & SmartScore System",
    eyebrow: "Reputation Intelligence",
    body:
      "SmartScore is a procurement trust, readiness, and reputation score. It reflects supplier verification, profile completeness, compliance posture, quote activity, awards, contracts, invoice behavior, and platform engagement.",
  },
  {
    title: "Compliance & Auditability",
    eyebrow: "Governance",
    body:
      "Audit trails, compliance evidence, banking review, delegation authority, workflow rules, override records, decision boards, and board packs help teams prepare for internal review, audit committees, and enterprise governance.",
  },
  {
    title: "WhatsApp Procurement Network",
    eyebrow: "Supplier Access",
    body:
      "WhatsApp-ready alerts help procurement teams reach suppliers with RFQ notices, closing reminders, compliance prompts, award notices, purchase order updates, and invoice reminders without introducing a paid messaging API too early.",
  },
  {
    title: "Executive Command Centre",
    eyebrow: "Leadership View",
    body:
      "Executives can review procurement value, active RFQs, contracts, invoice exposure, supplier risk, provincial activity, top suppliers, audit highlights, and management actions from a single command view.",
  },
  {
    title: "Pilot Partnership Opportunities",
    eyebrow: "Partner Pathways",
    body:
      "Pilot partners can validate supplier onboarding, RFQ distribution, compliance review, SmartScore insights, WhatsApp alerts, and procurement-to-payment reporting with realistic sector and regional use cases.",
  },
]

const pilotOpportunities = [
  "Municipal supplier onboarding and RFQ readiness pilot",
  "Mining house local supplier development and compliance pilot",
  "Investor demo environment with procurement lifecycle data",
  "Supplier network programme for township and regional enterprises",
]

function SectionCard({
  title,
  eyebrow,
  body,
}: {
  title: string
  eyebrow: string
  body: string
}) {
  return (
    <article className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-heading">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-secondary">{body}</p>
    </article>
  )
}

export default function DemoPackPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">Pilot Partner Edition &middot; Executive Brief</p>
          <h1 className="newspaper-headline mt-5">
            Monate Connect pilot demo pack
          </h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            A polished procurement platform story for municipalities, mining houses,
            supplier networks, enterprise buyers, investors, and audit stakeholders.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="masthead__btn-primary">
              View Platform
            </Link>
            <Link href="/auth/signup" className="masthead__btn-secondary">
              Register Supplier
            </Link>
            <Link href="/auth/login" className="masthead__btn-secondary">
              Supplier Login
            </Link>
            <a href="mailto:pilot@monateconnect.co.za" className="masthead__btn-secondary">
              Contact for Pilot
            </a>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Boardroom Snapshot
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            From supplier access to executive assurance
          </h2>
          <div className="mt-6 grid gap-3">
            {[
              ["9", "workflow stages"],
              ["10", "executive sections"],
              ["4", "pilot audiences"],
              ["1", "procurement operating layer"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-md border border-panel bg-panel p-4">
                <p className="text-3xl font-bold text-heading">{value}</p>
                <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Workflow Diagram
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Supplier Registration to Payment
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
            {workflowSteps.map((step, index) => (
              <div key={step} className="relative rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold leading-5 text-heading">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-14 md:grid-cols-2">
        {sections.map((section) => (
          <SectionCard key={section.title} {...section} />
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 rounded-md border border-heading bg-card p-6 shadow-panel lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              Pilot Partnership Opportunities
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-heading">
              Designed for credible first deployments
            </h2>
            <p className="mt-4 text-sm leading-7 text-secondary">
              Monate Connect can be demonstrated with realistic South African procurement
              records, role-based journeys, executive reporting, and supplier readiness data.
            </p>
          </div>
          <div className="grid gap-3">
            {pilotOpportunities.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-md border border-panel bg-panel p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-button">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-heading">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

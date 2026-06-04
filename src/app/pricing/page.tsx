import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const packages = [
  {
    title: "Free Supplier Access",
    audience: "SMEs and supplier entrants",
    summary:
      "A no-cost entry path for suppliers that need visibility, RFQ access and a basic verified profile.",
    features: [
      "Create supplier profile",
      "View opportunities",
      "Submit quotes",
      "Basic verification",
    ],
  },
  {
    title: "SME Supplier Pro",
    audience: "Growth-ready suppliers",
    summary:
      "Enhanced readiness support for suppliers that want stronger reputation signals and procurement reminders.",
    features: [
      "SmartScore insights",
      "Priority visibility",
      "Compliance reminders",
      "WhatsApp RFQ alerts",
    ],
  },
  {
    title: "Buyer / Procurement Team Pilot",
    audience: "Procurement teams",
    summary:
      "Pilot workspace for buyers testing supplier discovery, RFQ management and lifecycle tracking.",
    features: [
      "RFQ creation",
      "Quote review",
      "Supplier directory",
      "PO and contract tracking",
      "Executive dashboard",
    ],
  },
  {
    title: "Enterprise Procurement Network",
    audience: "Large buyers and enterprise networks",
    summary:
      "Governance-focused procurement network for multi-team sourcing, compliance and payment traceability.",
    features: [
      "Multi-department procurement",
      "Approval matrix",
      "Audit packs",
      "Compliance risk dashboards",
      "Procurement-to-payment workflows",
    ],
  },
  {
    title: "Municipality / Mining / SOE Pilot",
    audience: "Public sector, mining and infrastructure partners",
    summary:
      "Structured pilot for supplier development, local procurement visibility and audit-ready sourcing.",
    features: [
      "Local supplier onboarding",
      "Verified opportunity marketplace",
      "SmartScore and compliance reporting",
      "WhatsApp supplier engagement",
      "Board and audit committee packs",
    ],
  },
]

function PackageCard({
  title,
  audience,
  summary,
  features,
}: {
  title: string
  audience: string
  summary: string
  features: string[]
}) {
  return (
    <article className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
        {audience}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-heading">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-secondary">{summary}</p>
      <div className="mt-5 rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-warning">
          Pilot pricing available on request
        </p>
      </div>
      <ul className="mt-5 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-secondary">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export default function PricingPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">Pricing &middot; Pilot Partnerships</p>
          <h1 className="newspaper-headline mt-5">
            Pilot packages for procurement networks
          </h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            Monate Connect is currently structured for supplier access, SME readiness,
            buyer pilots, enterprise procurement networks and public-sector or mining
            partnership pilots. Fixed commercial pricing has not been introduced yet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth/signup" className="masthead__btn-primary">
              Register Supplier
            </Link>
            <Link href="/opportunities" className="masthead__btn-secondary">
              View Opportunities
            </Link>
            <Link href="/demo-pack" className="masthead__btn-secondary">
              Request Pilot Demo
            </Link>
            <Link href="/auth/login" className="masthead__btn-secondary">
              Supplier Login
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Commercial Position
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Pilot-first, payment-free
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            This page explains package options only. It does not include real payment
            processing, billing checkout, card collection or subscription activation.
          </p>
          <div className="mt-5 rounded-md border border-panel bg-panel p-4">
            <p className="text-sm font-bold text-heading">Best next step</p>
            <p className="mt-2 text-xs leading-6 text-secondary">
              Start with a pilot demo pack, validate the workflow, then define commercial
              scope with the participating buyer or supplier network.
            </p>
          </div>
        </aside>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((item) => (
          <PackageCard key={item.title} {...item} />
        ))}
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

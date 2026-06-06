import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const packages = [
  {
    title: "Free Supplier Access",
    badge: "Entry",
    icon: "seedling",
    tone: "free",
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
    badge: "Growth",
    icon: "crown",
    tone: "growth",
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
    badge: "Buyer Pilot",
    icon: "briefcase",
    tone: "buyer",
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
    badge: "Enterprise",
    icon: "network",
    tone: "enterprise",
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
    badge: "Public Sector",
    icon: "landmark",
    tone: "public",
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
] as const

const toneStyles = {
  free: {
    card: "border-slate-300/70 bg-slate-50/70",
    icon: "border-slate-300 bg-slate-100 text-slate-700",
    badge: "border-slate-300 bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  growth: {
    card: "border-emerald-700/20 bg-emerald-50/55",
    icon: "border-amber-500/35 bg-amber-100/70 text-amber-800",
    badge: "border-emerald-700/25 bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-700",
  },
  buyer: {
    card: "border-blue-900/20 bg-blue-50/60",
    icon: "border-blue-900/25 bg-blue-100/70 text-blue-900",
    badge: "border-blue-900/25 bg-blue-100 text-blue-900",
    dot: "bg-blue-900",
  },
  enterprise: {
    card: "border-stone-950/25 bg-stone-100/80",
    icon: "border-amber-600/40 bg-stone-950 text-amber-200",
    badge: "border-amber-600/35 bg-amber-100 text-stone-950",
    dot: "bg-amber-600",
  },
  public: {
    card: "border-orange-900/25 bg-stone-100/70",
    icon: "border-orange-900/25 bg-orange-950 text-orange-200",
    badge: "border-orange-900/25 bg-orange-100 text-orange-950",
    dot: "bg-orange-800",
  },
} as const

type TierTone = keyof typeof toneStyles
type TierIcon = "seedling" | "crown" | "briefcase" | "network" | "landmark"

function TierIconGlyph({ icon }: { icon: TierIcon }) {
  const common = {
    className: "h-6 w-6",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (icon === "seedling") {
    return (
      <svg {...common}>
        <path d="M12 21V11" />
        <path d="M12 11C8 11 5.5 8.5 5 5c3.7.2 6.4 2.2 7 6Z" />
        <path d="M12 13c4 0 6.5-2.5 7-6-3.7.2-6.4 2.2-7 6Z" />
      </svg>
    )
  }

  if (icon === "crown") {
    return (
      <svg {...common}>
        <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8Z" />
        <path d="M5 18h14" />
      </svg>
    )
  }

  if (icon === "briefcase") {
    return (
      <svg {...common}>
        <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M3 12h18" />
        <path d="M9 12v2h6v-2" />
      </svg>
    )
  }

  if (icon === "network") {
    return (
      <svg {...common}>
        <circle cx="6" cy="7" r="2.5" />
        <circle cx="18" cy="7" r="2.5" />
        <circle cx="12" cy="17" r="2.5" />
        <path d="m8.2 8.8 2.5 5.3" />
        <path d="m15.8 8.8-2.5 5.3" />
        <path d="M8.5 7h7" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M4 10h16" />
      <path d="M6 10v9" />
      <path d="M10 10v9" />
      <path d="M14 10v9" />
      <path d="M18 10v9" />
      <path d="M3 21h18" />
      <path d="m12 3 8 5H4l8-5Z" />
    </svg>
  )
}

function PackageCard({
  title,
  badge,
  icon,
  tone,
  audience,
  summary,
  features,
}: {
  title: string
  badge: string
  icon: TierIcon
  tone: TierTone
  audience: string
  summary: string
  features: readonly string[]
}) {
  const styles = toneStyles[tone]

  return (
    <article className={`rounded-md border bg-card p-6 shadow-panel ${styles.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border ${styles.icon}`}>
          <TierIconGlyph icon={icon} />
        </div>
        <span className={`rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${styles.badge}`}>
          {badge}
        </span>
      </div>
      <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
        {audience}
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight text-heading">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-secondary">{summary}</p>
      <div className="mt-5 rounded-md border border-warning/30 bg-warning/10 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-warning">
          Pilot pricing available on request
        </p>
      </div>
      <ul className="mt-5 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-secondary">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
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

"use client"

import Link from "next/link"
import { useState } from "react"

const supplierPlans = [
  {
    name: "Basic",
    price: "Free",
    period: "Always free",
    sub: "No credit card required",
    badge: null,
    cta: "Register free",
    ctaHref: "/auth/signup",
    ctaStyle: "outline",
    included: [
      "Supplier profile listing",
      "CSD & BBBEE verification",
      "Browse all open RFQs",
      "Submit up to 3 quotes/month",
      "SmartScore profile",
    ],
    excluded: [
      "RFQ match notifications",
      "Quote analytics",
      "Priority placement",
    ],
  },
  {
    name: "Growth",
    price: "R299",
    period: "/month",
    sub: "Billed monthly · Cancel anytime",
    badge: "Most popular",
    cta: "Start free during pilot",
    ctaHref: "/auth/signup",
    ctaStyle: "gold",
    included: [
      "Everything in Basic",
      "Unlimited quote submissions",
      "RFQ match email alerts",
      "Quote win/loss analytics",
      "Priority placement in directory",
      "Buyer shortlist notifications",
      "Document storage (500MB)",
    ],
    excluded: ["Dedicated account manager"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    sub: "Annual contract · Volume discounts",
    badge: null,
    cta: "Contact sales",
    ctaHref: "/contact",
    ctaStyle: "outline",
    included: [
      "Everything in Growth",
      "Multiple entity profiles",
      "Team member access (5 seats)",
      "Dedicated account manager",
      "API access",
      "Unlimited document storage",
      "Custom reporting",
      "SLA & compliance support",
    ],
    excluded: [],
  },
]

const buyerPlans = [
  {
    name: "Starter",
    price: "R990",
    period: "/month",
    sub: "Up to 3 users · Billed monthly",
    badge: null,
    cta: "Start free during pilot",
    ctaHref: "/auth/signup?role=buyer",
    ctaStyle: "outline",
    included: [
      "Up to 5 active RFQs",
      "Access to supplier directory",
      "Quote comparison tools",
      "Basic spend reporting",
      "CSD-verified supplier filter",
    ],
    excluded: [
      "BBBEE scorecard reporting",
      "Contract management",
      "Audit trail export",
    ],
  },
  {
    name: "Professional",
    price: "R2,490",
    period: "/month",
    sub: "Up to 10 users · Billed monthly",
    badge: "Recommended",
    cta: "Start free during pilot",
    ctaHref: "/auth/signup?role=buyer",
    ctaStyle: "gold",
    included: [
      "Everything in Starter",
      "Unlimited active RFQs",
      "BBBEE scorecard & reporting",
      "Full contract management",
      "Audit trail & export",
      "Supplier shortlisting tools",
      "PO & invoice management",
      "Spend analytics dashboard",
    ],
    excluded: [],
  },
  {
    name: "Government & SOE",
    price: "Custom",
    period: "pricing",
    sub: "Annual · Quotation on request",
    badge: null,
    cta: "Request a quote",
    ctaHref: "/contact",
    ctaStyle: "outline",
    included: [
      "Everything in Professional",
      "Unlimited users",
      "SCM policy configuration",
      "Section 217 compliance tools",
      "National Treasury integration",
      "Dedicated onboarding",
      "Data residency options",
      "SLA with uptime guarantee",
    ],
    excluded: [],
  },
]

const faqs = [
  {
    q: "When does pilot pricing end?",
    a: "The pilot phase runs until 31 August 2026. All features across all plans are free during this period. Paid plans will activate automatically from 1 September 2026. You will receive 30 days' notice before billing begins, and you can cancel or downgrade at any time before that date.",
  },
  {
    q: "Can I stay on the free Basic plan as a supplier?",
    a: "Yes. The Basic supplier plan is permanently free. You can list your business, get verified, and submit up to 3 quotes per month at no cost. If you want unlimited quotes and match notifications, you will need the Growth plan at R299/month after the pilot period ends.",
  },
  {
    q: "Do you offer annual billing discounts?",
    a: "Yes. Annual billing saves approximately 20% compared to monthly billing. Annual pricing will be confirmed when paid plans launch after the pilot period. Contact us if you want to discuss annual pricing ahead of time.",
  },
  {
    q: "Is there a setup fee or onboarding cost?",
    a: "No setup fees for Supplier Basic, Growth, Buyer Starter, or Professional plans. Government & SOE and Enterprise plans include dedicated onboarding which may be quoted separately depending on implementation complexity.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept EFT, debit order, and major credit cards. Government and SOE customers can pay via purchase order. All pricing is in South African Rand (ZAR) and invoices are VAT-inclusive where applicable.",
  },
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="var(--gold)" fillOpacity="0.15" />
      <path d="M4.5 8l2.5 2.5 4.5-5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="var(--text-muted)" fillOpacity="0.05" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="var(--text-muted)" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PlanCard({ plan, featured }: { plan: typeof supplierPlans[0]; featured?: boolean }) {
  return (
    <div className={`plan-card ${featured ? "featured" : "not-featured"} relative flex flex-col rounded-2xl border p-8`}>
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-gold px-4 py-1 text-xs font-bold uppercase tracking-widest text-on-gold">
            {plan.badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">{plan.name}</p>
        <div className="mt-3 flex items-end gap-1">
          <span className="font-display text-5xl font-bold tabular-nums text-primary">{plan.price}</span>
          <span className="mb-1.5 text-sm use-text-secondary">{plan.period}</span>
        </div>
        <p className="mt-1.5 text-xs use-text-muted">{plan.sub}</p>
      </div>

      <div className="mb-8 flex-1 space-y-3">
        {plan.included.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-sm text-primary">{item}</span>
          </div>
        ))}
        {plan.excluded.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <CrossIcon />
            <span className="text-sm use-text-muted line-through">{item}</span>
          </div>
        ))}
      </div>

      <Link
        href={plan.ctaHref}
        className={`block rounded-lg px-6 py-3 text-center text-sm font-bold uppercase tracking-widest transition-all duration-200 ${
          plan.ctaStyle === "gold"
            ? "bg-gold text-on-gold hover:bg-gold-light shadow-sm hover:shadow-gold-sm"
            : "cta-outline"
        }`}
      >
        {plan.cta} →
      </Link>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-subtle py-5">
      <button
        onClick={() => setOpen(!open)}
        className="pricing-hover-tint flex w-full items-start justify-between gap-4 rounded-md px-2 py-1 text-left"
      >
        <span className="font-display text-lg text-primary">{q}</span>
        <span className="mt-0.5 shrink-0 text-gold text-xl leading-none transition-transform duration-200" style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
          +
        </span>
      </button>
      {open && (
        <p className="mt-4 font-serif text-sm leading-7 use-text-secondary">{a}</p>
      )}
    </div>
  )
}

export default function PricingPage() {
  const [tab, setTab] = useState<"suppliers" | "buyers">("suppliers")
  const plans = tab === "suppliers" ? supplierPlans : buyerPlans


  return (
    <div className="pricing-root">
      <style>{`
        .pricing-root { transition: background-color 0.3s ease, color 0.3s ease; }

        /* Dark theme */
        :root[data-theme="dark"] .pricing-root {
          --bg-hero: linear-gradient(160deg, #0D3030 0%, #071818 60%, #050F0F 100%);
          --bg-section: linear-gradient(180deg, #071818 0%, #050F0F 100%);
          --bg-card: rgba(255,255,255,0.04);
          --bg-card-featured: linear-gradient(145deg, rgba(15,43,43,0.95) 0%, rgba(10,30,30,0.98) 100%);
          --text-primary: #FFFFFF;
          --text-primary-rgb: 255,255,255;
          --text-secondary: rgba(255,255,255,0.60);
          --text-muted: rgba(255,255,255,0.35);
          --bg-chip: rgba(255,255,255,0.06);
          --gold: #C9A84C;
          --gold-rgb: 201,168,76;
          --gold-light: #DFC06E;
          --border-subtle: rgba(255,255,255,0.12);
          --muted-overlay: rgba(255,255,255,0.05);
          --cta-outline-border: rgba(255,255,255,0.20);
          --on-gold: #0A2020;
        }

        /* Light theme */
        :root[data-theme="light"] .pricing-root {
          --bg-hero: linear-gradient(160deg, #F5F1E8 0%, #EFE9DC 100%);
          --bg-section: #F5F1E8;
          --bg-card: #FFFFFF;
          --bg-card-featured: #FFFFFF;
          --text-primary: #0A2020;
          --text-primary-rgb: 10,32,32;
          --text-secondary: rgba(10,32,32,0.70);
          --text-muted: rgba(10,32,32,0.40);
          --bg-chip: rgba(10,32,32,0.06);
          --gold: #A8893B;
          --gold-rgb: 168,137,59;
          --gold-light: #C9A84C;
          --border-subtle: rgba(10,32,32,0.14);
          --muted-overlay: rgba(10,32,32,0.04);
          --cta-outline-border: rgba(10,32,32,0.12);
          --on-gold: #0A2020;
        }

        /* Utility mappings used by this file */
        .bg-gold { background-color: var(--gold) !important; }
        .bg-gold-light { background-color: var(--gold-light) !important; }
        .text-gold { color: var(--gold) !important; }
        .text-gold\/70 { color: rgba(var(--gold-rgb),0.7) !important; }
        .text-gold\/80 { color: rgba(var(--gold-rgb),0.8) !important; }
        .border-gold { border-color: var(--gold) !important; }
        .shadow-gold { box-shadow: 0 0 40px rgba(var(--gold-rgb),0.12), 0 0 0 1px rgba(var(--gold-rgb),0.3); }
        .shadow-gold-sm { box-shadow: 0 4px 20px rgba(var(--gold-rgb),0.25); }

        /* Semantic helpers mapped to theme variables */
        .text-primary { color: var(--text-primary) !important; }
        .text-secondary { color: var(--text-secondary) !important; }
        .text-muted { color: var(--text-muted) !important; }
        .text-on-gold { color: var(--on-gold) !important; }

        .bg-card { background: var(--bg-card) !important; }
        .bg-card-featured { background: var(--bg-card-featured) !important; }
        .bg-chip { background: var(--bg-chip) !important; }
        .border-subtle { border-color: var(--border-subtle) !important; }
        .cta-outline { border: 1px solid var(--cta-outline-border); color: var(--text-secondary); transition: background 200ms ease, border-color 200ms ease, color 200ms ease; }
        .cta-outline:hover, .cta-outline:focus-visible { background: rgba(var(--gold-rgb),0.10); border-color: rgba(var(--gold-rgb),0.45); color: var(--gold); outline: none; }
        .pricing-hover-tint { transition: background 200ms ease, color 200ms ease; }
        .pricing-hover-tint:hover, .pricing-hover-tint:focus-visible { background: rgba(var(--gold-rgb),0.10); color: var(--gold) !important; outline: none; }

        .plan-card { cursor: default; background: var(--bg-card); border-color: var(--border-subtle); transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease; }
        .plan-card.featured { background: var(--bg-card-featured); border-color: var(--gold); }
        .plan-card.not-featured:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
        .plan-card.featured:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.35), 0 0 30px rgba(var(--gold-rgb),0.08); }

        /* Light theme: soft warm shadows on hover and featured card */
        :root[data-theme="light"] .pricing-root .plan-card.not-featured:hover { box-shadow: 0 12px 30px rgba(var(--gold-rgb),0.06); }
        :root[data-theme="light"] .pricing-root .plan-card.featured { box-shadow: 0 8px 30px rgba(var(--gold-rgb),0.08); }
        :root[data-theme="light"] .pricing-root .plan-card.featured:hover { box-shadow: 0 12px 40px rgba(var(--gold-rgb),0.12); }

        /* Mappings for legacy tailwind-like utility classes used in JSX */
        .text-white { display: none; }
        .text-white\/50 { display: none; }
        .text-white\/55 { display: none; }
        .text-white\/40 { display: none; }
        .text-white\/30 { display: none; }
        .text-white\/80 { display: none; }
        .border-white\/10 { display: none; }
        .bg-white\/5 { display: none; }

        /* New utility classes to use in JSX */
        .use-text-primary { color: var(--text-primary) !important; }
        .use-text-secondary { color: var(--text-secondary) !important; }
        .use-text-muted { color: var(--text-muted) !important; }
        .use-bg-chip { background: var(--bg-chip) !important; }
        .use-border-subtle { border-color: var(--border-subtle) !important; }


        .text-gold\/60 { color: rgba(var(--gold-rgb),0.6) !important; }
        .border-gold\/30 { border-color: rgba(var(--gold-rgb),0.3) !important; }
        .bg-gold\/10 { background-color: rgba(var(--gold-rgb),0.1) !important; }
        .border-gold\/40 { border-color: rgba(var(--gold-rgb),0.4) !important; }

      `}</style>


      {/* Hero */}
      <section
        style={{
          background: 'var(--bg-hero)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
        className="px-6 py-24 text-center"
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          Pilot launch pricing
        </p>
        <h1 className="font-display mx-auto max-w-3xl text-5xl font-bold leading-tight text-primary md:text-6xl">
          Simple pricing for{" "}
          <span style={{ color: "var(--gold)" }}>SA procurement</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl font-serif text-lg use-text-secondary">
          Suppliers list for free. Buyers pay for what they need. No hidden fees, no lock-in.
        </p>

        {/* Tab toggle */}
        <div className="mt-10 inline-flex rounded-xl border use-border-subtle use-bg-chip p-1">
          {(["suppliers", "buyers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-8 py-2.5 text-sm font-semibold uppercase tracking-widest transition-all duration-200 ${
                tab === t
                  ? "bg-gold text-on-gold shadow-sm"
                  : "pricing-hover-tint use-text-secondary"
              }`}
            >
              {t === "suppliers" ? "Suppliers" : "Buyers & teams"}
            </button>
          ))}
        </div>
      </section>

      {/* Pilot banner */}
      <section
        style={{
          background: 'var(--bg-section)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
        className="px-6 py-8"
      >
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-gold/30 bg-gold/10 px-5 py-2 text-sm text-gold">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            Pilot phase active — all plans free until 31 August 2026
          </div>
          <p className="mt-4 text-sm use-text-secondary max-w-2xl mx-auto">
            AiForm Procure is in its pilot phase. All features across all plans are available at no charge until 31 August 2026. After that, paid plans activate at the prices shown below.{" "}
            <Link href="/contact" className="text-gold/80 underline underline-offset-2 hover:text-gold">
              Contact us
            </Link>{" "}
            to lock in pilot pricing beyond this date.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section
        style={{ background: 'var(--bg-section)' }}
        className="px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-gold/60">
            {tab === "suppliers" ? "For suppliers" : "For buyers & procurement teams"}
          </p>
          <h2 className="font-display mb-12 text-center text-3xl font-bold text-primary">
            {tab === "suppliers" ? "Choose the right launch plan" : "Choose the right launch plan"}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} featured={!!plan.badge} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          background: 'var(--bg-section)',
          borderTop: '1px solid var(--border-subtle)'
        }}
        className="px-6 py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-gold/60">FAQ</p>
          <h2 className="font-display mb-12 text-center text-3xl font-bold text-primary">
            Pricing questions
          </h2>
          <div>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section
        style={{
          background: 'var(--bg-section)',
          borderTop: '1px solid var(--border-subtle)'
        }}
        className="px-6 py-20 text-center"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold/60">Pilot access</p>
        <h2 className="font-display mb-4 text-3xl font-bold text-primary">
          Start during the pilot — everything is free
        </h2>
        <p className="mx-auto mb-10 max-w-md font-serif use-text-secondary">
          Get verified, browse RFQs, and submit quotes with no commitment until September 2026.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-lg border border-gold/40 px-8 py-3 text-sm font-bold uppercase tracking-widest text-gold transition hover:border-gold hover:bg-gold/10"
          >
            Contact sales
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-gold px-8 py-3 text-sm font-bold uppercase tracking-widest text-on-gold transition hover:bg-gold-light"
          >
            Register free →
          </Link>
        </div>
      </section>
    </div>
  )
}

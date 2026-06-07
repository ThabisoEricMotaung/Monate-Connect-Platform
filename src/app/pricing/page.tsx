"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

type Plan = {
  name: string
  description: string
  price: string
  note: string
  cta: string
  href: string
  featured?: string
  success?: boolean
  features: string[]
  exclusions?: string[]
}

const supplierPlans: Plan[] = [
  {
    name: "Basic",
    description: "Get listed and start browsing RFQs. No payment required.",
    price: "Free",
    note: "Always free - No credit card",
    cta: "Register free ->",
    href: "/auth/signup",
    features: [
      "Supplier profile listing",
      "CSD & BBBEE verification",
      "Browse all open RFQs",
      "Submit up to 3 quotes/month",
      "SmartScore profile",
    ],
    exclusions: ["RFQ match notifications", "Quote analytics", "Priority placement"],
  },
  {
    name: "Growth",
    description: "Unlimited quotes, match alerts, and analytics to grow your win rate.",
    price: "R299/month",
    note: "Billed monthly - Cancel anytime",
    cta: "Start free during pilot ->",
    href: "/auth/signup",
    featured: "Most popular",
    features: [
      "Everything in Basic",
      "Unlimited quote submissions",
      "RFQ match email alerts",
      "Quote win/loss analytics",
      "Priority placement in directory",
      "Buyer shortlist notifications",
      "Document storage (500MB)",
    ],
    exclusions: ["Dedicated account manager"],
  },
  {
    name: "Enterprise",
    description: "For large suppliers managing multiple divisions or subsidiaries.",
    price: "Custom pricing",
    note: "Annual contract - Volume discounts",
    cta: "Contact sales ->",
    href: "/contact",
    features: [
      "Everything in Growth",
      "Multiple entity profiles",
      "Team member access (5 seats)",
      "Dedicated account manager",
      "API access",
      "Unlimited document storage",
      "Custom reporting",
      "SLA & compliance support",
    ],
  },
]

const buyerPlans: Plan[] = [
  {
    name: "Starter",
    description: "For small teams running occasional procurement.",
    price: "R990/month",
    note: "Up to 3 users - Billed monthly",
    cta: "Start free during pilot ->",
    href: "/auth/signup?role=buyer",
    features: [
      "Up to 5 active RFQs",
      "Access to supplier directory",
      "Quote comparison tools",
      "Basic spend reporting",
      "CSD-verified supplier filter",
    ],
    exclusions: ["BBBEE scorecard reporting", "Contract management", "Audit trail export"],
  },
  {
    name: "Professional",
    description: "Full procurement workflow with compliance reporting and audit trails.",
    price: "R2,490/month",
    note: "Up to 10 users - Billed monthly",
    cta: "Start free during pilot ->",
    href: "/auth/signup?role=buyer",
    featured: "Recommended",
    features: [
      "Everything in Starter",
      "Unlimited active RFQs",
      "BBBEE scorecard & reporting",
      "Full contract management",
      "Audit trail & export",
      "Supplier shortlisting tools",
      "PO & invoice management",
      "Spend analytics dashboard",
    ],
  },
  {
    name: "Government & SOE",
    description: "For municipalities, parastatals, and government departments.",
    price: "Custom pricing",
    note: "Annual - Quotation on request",
    cta: "Request a quote ->",
    href: "/contact",
    success: true,
    features: [
      "Everything in Professional",
      "Unlimited users",
      "SCM policy configuration",
      "Section 217 compliance tools",
      "National Treasury integration",
      "Dedicated onboarding",
      "Data residency options",
      "SLA with uptime guarantee",
    ],
  },
]

const pricingQuestions = [
  {
    question: "When does pilot pricing end?",
    answer:
      "The pilot phase runs until 31 August 2026. All features across all plans are free during this period. Paid plans will activate automatically from 1 September 2026. You will receive 30 days' notice before billing begins, and you can cancel or downgrade at any time before that date.",
  },
  {
    question: "Can I stay on the free Basic plan as a supplier?",
    answer:
      "Yes. The Basic supplier plan is permanently free. You can list your business, get verified, and submit up to 3 quotes per month at no cost. If you want unlimited quotes and match notifications, you will need the Growth plan at R299/month after the pilot period ends.",
  },
  {
    question: "Do you offer annual billing discounts?",
    answer:
      "Yes. Annual billing saves approximately 20% compared to monthly billing. Annual pricing will be confirmed when paid plans launch after the pilot period. Contact us if you want to discuss annual pricing ahead of time.",
  },
  {
    question: "Is there a setup fee or onboarding cost?",
    answer:
      "No setup fees for Supplier Basic, Growth, Buyer Starter, or Professional plans. Government & SOE and Enterprise plans include dedicated onboarding which may be quoted separately depending on implementation complexity.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept EFT, debit order, and major credit cards. Government and SOE customers can pay via purchase order. All pricing is in South African Rand (ZAR) and invoices are VAT-inclusive where applicable.",
  },
]

function RocketIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M14 4.5c2.2-.9 4.1-.9 5.5-.3.6 1.4.6 3.3-.3 5.5-.9 2.3-2.8 4.8-5.5 7.1l-4.8-4.8c2.3-2.7 4.8-4.6 7.1-5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M8.8 12.2 5 12l3-3.2M11.8 15.2 12 19l3.2-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M6.5 17.5 4 20" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M16.5 7.5h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24">
      <path d="M6 12h12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const featured = Boolean(plan.featured)
  const ctaClass = plan.success
    ? "border-success bg-success text-button hover:bg-success/90"
    : featured
      ? "border-accent bg-accent text-button hover:bg-accent-strong"
      : "border-panel bg-panel text-heading hover:border-accent hover:text-accent"

  return (
    <article
      className={`relative flex h-full flex-col rounded-md border bg-card p-6 shadow-panel ${
        featured ? "border-accent ring-2 ring-accent/15" : "border-panel"
      }`}
    >
      {plan.featured && (
        <div className="absolute -top-4 left-6 rounded-full border border-accent bg-accent px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-button">
          {plan.featured}
        </div>
      )}

      <div className="flex-1">
        <h3 className="text-2xl font-semibold text-heading">{plan.name}</h3>
        <p className="mt-3 min-h-[3.5rem] text-sm leading-7 text-secondary">{plan.description}</p>

        <div className="mt-6 border-y border-panel py-5">
          <p className="text-3xl font-bold text-heading">{plan.price}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{plan.note}</p>
        </div>

        <ul className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-3 text-sm leading-6 text-secondary">
              <CheckIcon />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {plan.exclusions && (
          <ul className="mt-5 space-y-3 border-t border-panel pt-5">
            {plan.exclusions.map((feature) => (
              <li key={feature} className="flex gap-3 text-sm leading-6 text-muted">
                <MinusIcon />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href={plan.href}
        className={`mt-7 inline-flex min-h-12 items-center justify-center rounded-md border px-5 py-3 text-center text-sm font-bold transition ${ctaClass}`}
      >
        {plan.cta}
      </Link>
    </article>
  )
}

function PlanSection({
  id,
  label,
  plans,
}: {
  id: string
  label: string
  plans: Plan[]
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex flex-col gap-3 border-t border-strong pt-10">
        <p className="newspaper-kicker">{label}</p>
        <h2 className="text-3xl font-semibold text-heading">Choose the right launch plan</h2>
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>
    </section>
  )
}

export default function PricingPage() {
  const supplierRef = useRef<HTMLDivElement | null>(null)
  const buyerRef = useRef<HTMLDivElement | null>(null)
  const [audience, setAudience] = useState<"suppliers" | "buyers">("suppliers")
  const [openQuestion, setOpenQuestion] = useState(0)

  function selectAudience(nextAudience: "suppliers" | "buyers") {
    setAudience(nextAudience)
    const target = nextAudience === "suppliers" ? supplierRef.current : buyerRef.current
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-16 text-center lg:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-warning bg-warning-soft px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-warning">
            <RocketIcon />
            Pilot launch pricing
          </div>
          <h1 className="newspaper-headline mt-6 max-w-5xl">Simple pricing for SA procurement</h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            Suppliers list for free. Buyers pay for what they need. No hidden fees, no lock-in.
          </p>
          <div
            className="mt-8 inline-flex rounded-full border border-panel bg-card p-1 shadow-panel"
            aria-label="Choose pricing audience"
          >
            <button
              type="button"
              onClick={() => selectAudience("suppliers")}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                audience === "suppliers"
                  ? "bg-accent text-button"
                  : "text-secondary hover:bg-panel hover:text-accent"
              }`}
            >
              Suppliers
            </button>
            <button
              type="button"
              onClick={() => selectAudience("buyers")}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                audience === "buyers"
                  ? "bg-accent text-button"
                  : "text-secondary hover:bg-panel hover:text-accent"
              }`}
            >
              Buyers & teams
            </button>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6">
          <section className="rounded-md border border-warning bg-warning-soft p-6 shadow-panel">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-warning bg-card text-warning">
                <RocketIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-heading">
                  Pilot launch - all plans at no cost until 31 August 2026
                </h2>
                <p className="mt-3 max-w-5xl text-sm leading-7 text-secondary">
                  Monate Connect is in its pilot phase. All features across all plans are
                  available at no charge until 31 August 2026. After that, paid plans will
                  activate at the prices shown below.{" "}
                  <Link href="/contact" className="font-bold text-accent hover:text-accent-strong">
                    Contact us
                  </Link>{" "}
                  if you want to lock in pilot pricing beyond this date or discuss an
                  enterprise arrangement.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-14 lg:py-16">
          <div ref={supplierRef}>
            <PlanSection id="suppliers" label="For suppliers" plans={supplierPlans} />
          </div>

          <div ref={buyerRef}>
            <PlanSection id="buyers" label="For buyers & procurement teams" plans={buyerPlans} />
          </div>
        </div>

        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div className="text-center">
            <p className="newspaper-kicker justify-center">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold text-heading">Pricing questions</h2>
            <p className="mt-3 text-sm leading-7 text-secondary">
              Everything you need to know before committing.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
            {pricingQuestions.map((item, index) => {
              const isOpen = openQuestion === index

              return (
                <div key={item.question} className="border-b border-panel last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-bold text-heading hover:bg-panel"
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <ChevronIcon open={isOpen} />
                  </button>
                  <div className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-7 text-secondary">{item.answer}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-panel">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="newspaper-kicker">Pilot access</p>
              <h2 className="mt-4 text-3xl font-semibold text-heading">
                Start during the pilot - everything is free
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
                Get verified, browse RFQs, and submit quotes with no commitment until
                September 2026.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/contact" className="masthead__btn-secondary">
                Contact sales
              </Link>
              <Link href="/auth/signup" className="masthead__btn-primary">
                {"Register free ->"}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

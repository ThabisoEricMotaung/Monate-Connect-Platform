"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const demoSteps = [
  {
    title: "Public homepage",
    eyebrow: "Opening Context",
    appLink: "/",
    show:
      "Open the public homepage and point out the supplier, buyer, municipality, pilot partner and investor entry points.",
    matters:
      "The homepage frames Monate Connect as a South African procurement platform before the audience enters any logged-in workflow.",
    talkingPoint:
      "We start with a public, explainable procurement network: opportunities, suppliers, trust, pricing, help and pilot contact all have clear paths.",
  },
  {
    title: "Supplier registration",
    eyebrow: "Supplier Entry",
    appLink: "/auth/signup",
    show:
      "Show the supplier registration route and describe the information suppliers prepare before creating an account.",
    matters:
      "Supplier onboarding is the first step in widening access while keeping procurement data structured and accountable.",
    talkingPoint:
      "The platform is designed to bring suppliers into a governed procurement environment without hiding opportunities behind informal channels.",
  },
  {
    title: "Supplier verification",
    eyebrow: "Trust Controls",
    appLink: "/trust",
    show:
      "Use the Trust Centre to explain verification, compliance document checks, banking controls and supplier readiness.",
    matters:
      "Verification helps buyers understand supplier preparedness before moving into awards, contracts and payments.",
    talkingPoint:
      "Verification is not a marketing badge. It is a procurement readiness signal backed by profile, compliance and workflow evidence.",
  },
  {
    title: "RFQ marketplace",
    eyebrow: "Opportunity Discovery",
    appLink: "/opportunities",
    show:
      "Open the public RFQ marketplace preview and filter active opportunities by province, category and status.",
    matters:
      "A public opportunity preview helps suppliers discover work while quote submission remains protected behind login.",
    talkingPoint:
      "Suppliers can see the market signal publicly, but formal submission and procurement records stay inside authenticated workflows.",
  },
  {
    title: "Quote submission",
    eyebrow: "Supplier Response",
    appLink: "/auth/login",
    show:
      "Explain that registered suppliers log in, review RFQ requirements, ask clarifications and submit quotes before deadline.",
    matters:
      "Quote submission converts interest into structured procurement data that can be evaluated consistently.",
    talkingPoint:
      "The goal is to reduce scattered email trails and move RFQ responses into a traceable system.",
  },
  {
    title: "Award workflow",
    eyebrow: "Governed Decision",
    appLink: "/dashboard/admin/rfqs",
    show:
      "Show how buyers or admins compare quotes, evaluate supplier responses and award the selected quote.",
    matters:
      "Award governance creates a defensible bridge between supplier response, evaluation rationale and procurement commitment.",
    talkingPoint:
      "Every award should be explainable: who reviewed it, what was selected and how the next procurement record is created.",
  },
  {
    title: "Purchase order lifecycle",
    eyebrow: "PO Control",
    appLink: "/dashboard/purchase-orders",
    show:
      "Walk through purchase order generation and lifecycle states from issued through accepted, delivery and completion.",
    matters:
      "Purchase orders turn awarded quotes into trackable obligations with supplier action and delivery status.",
    talkingPoint:
      "The awarded quote stops being an isolated decision and becomes an operational record that both sides can follow.",
  },
  {
    title: "Contract management",
    eyebrow: "Continuity",
    appLink: "/dashboard/contracts",
    show:
      "Show contracts linked to purchase orders, including value, supplier, RFQ reference, status and renewal intelligence.",
    matters:
      "Contract records help procurement teams manage supplier continuity, expiry risk and renewal decisions.",
    talkingPoint:
      "Contracts give leadership a view of commitments beyond the purchase order: value, dates, risk and renewal timing.",
  },
  {
    title: "Invoice and payment tracking",
    eyebrow: "Procurement to Payment",
    appLink: "/dashboard/invoices",
    show:
      "Show invoice records, approval status and the payment tracking path for approved invoices.",
    matters:
      "Invoice and payment tracking closes the procurement loop and helps teams identify outstanding liabilities.",
    talkingPoint:
      "Procurement credibility improves when the platform can trace the journey from RFQ to payment outcome.",
  },
  {
    title: "SmartScore and supplier risk",
    eyebrow: "Reputation Intelligence",
    appLink: "/dashboard/intelligence/supplier-performance",
    show:
      "Explain SmartScore levels, supplier performance metrics, risk ratings and improvement tips.",
    matters:
      "SmartScore is a procurement trust, readiness and reputation indicator, not a credit score.",
    talkingPoint:
      "The score turns activity and readiness signals into a board-friendly supplier risk conversation.",
  },
  {
    title: "Executive Command Centre",
    eyebrow: "Leadership View",
    appLink: "/dashboard/executive",
    show:
      "Show KPI cards, spend trends, supplier risk overview, provincial activity and top suppliers.",
    matters:
      "Executive reporting helps municipalities, mining houses and enterprise teams see procurement value and exposure quickly.",
    talkingPoint:
      "This is the management view: value, activity, liabilities, supplier risk and regional participation in one place.",
  },
  {
    title: "Audit trail and compliance packs",
    eyebrow: "Audit Readiness",
    appLink: "/dashboard/admin/audit",
    show:
      "Show audit logs, governance records, exception handling and audit pack concepts for committee review.",
    matters:
      "Auditability turns procurement activity into evidence for internal audit, governance teams and oversight committees.",
    talkingPoint:
      "The platform is not only for transactions. It is built to answer what happened, who did it and why it was approved.",
  },
  {
    title: "WhatsApp procurement network",
    eyebrow: "Supplier Reach",
    appLink: "/dashboard/admin/whatsapp",
    show:
      "Show WhatsApp-ready alert drafts for RFQs, closing reminders, compliance prompts and award notices.",
    matters:
      "WhatsApp deep links support supplier communication without introducing paid messaging automation too early.",
    talkingPoint:
      "We meet suppliers where they already communicate, while keeping the formal procurement record inside Monate Connect.",
  },
]

function StepPanel({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-panel bg-panel p-5">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-3 text-sm leading-7 text-secondary">{value}</p>
    </div>
  )
}

export default function DemoWalkthroughPage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeStep = demoSteps[activeIndex]

  const progress = useMemo(
    () => Math.round(((activeIndex + 1) / demoSteps.length) * 100),
    [activeIndex]
  )

  function goToPrevious() {
    setActiveIndex((current) => Math.max(current - 1, 0))
  }

  function goToNext() {
    setActiveIndex((current) => Math.min(current + 1, demoSteps.length - 1))
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="border-b border-t border-heading py-10">
            <p className="newspaper-kicker">Guided Pilot Demo &middot; Presenter Mode</p>
            <h1 className="newspaper-headline mt-5">Walk partners through Monate Connect</h1>
            <p className="newspaper-body mt-6 max-w-3xl">
              A step-by-step presenter guide for pilot partners, investors, municipalities,
              mining houses and supplier networks. Use it to keep the demo focused on procurement
              value, trust controls and operational readiness.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveIndex(0)}
                className="masthead__btn-primary"
              >
                Start Demo Walkthrough
              </button>
              <Link href="/demo-pack" className="masthead__btn-secondary">
                View Demo Pack
              </Link>
              <Link href="/contact" className="masthead__btn-secondary">
                Request Pilot Discussion
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              Demo Progress
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-heading">
              Step {activeIndex + 1} of {demoSteps.length}
            </h2>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-panel">
              <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-4 text-sm leading-7 text-secondary">
              Current focus: <span className="font-semibold text-heading">{activeStep.title}</span>
            </p>
          </aside>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-10">
          <div className="flex flex-wrap gap-2">
            {demoSteps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  activeIndex === index
                    ? "border-accent bg-accent text-button"
                    : "border-panel bg-card text-secondary hover:border-accent hover:text-accent"
                }`}
              >
                {index + 1}. {step.title}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20">
          <article className="rounded-md border border-heading bg-card p-6 shadow-panel">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                  {activeStep.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-heading">{activeStep.title}</h2>
                <p className="mt-4 text-sm leading-7 text-secondary">
                  Use this step to move the audience through the story without losing the thread
                  between public access, workflow governance and executive assurance.
                </p>
                <div className="mt-6">
                  <Link href={activeStep.appLink} className="masthead__btn-primary">
                    Open Relevant Page
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                <StepPanel label="What to show" value={activeStep.show} />
                <StepPanel label="Why it matters" value={activeStep.matters} />
                <StepPanel label="Suggested talking point" value={activeStep.talkingPoint} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-panel pt-5">
              <button
                type="button"
                onClick={goToPrevious}
                disabled={activeIndex === 0}
                className="rounded-md border border-panel bg-panel px-4 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous Step
              </button>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                {progress}% complete
              </p>
              <button
                type="button"
                onClick={goToNext}
                disabled={activeIndex === demoSteps.length - 1}
                className="rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </article>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const stats = [
  { value: "100%", label: "CSD-verified suppliers" },
  { value: "3-layer", label: "Verification process" },
  { value: "48hr", label: "Average verification time" },
  { value: "0", label: "Ghost suppliers on platform" },
]

const verificationSteps = [
  {
    title: "CSD registration check",
    badge: "Automated",
    description:
      "We verify every supplier's CSD number directly against the National Treasury Central Supplier Database. Inactive, suspended, or invalid CSD registrations are blocked from the platform automatically.",
    detail:
      "What we check: active status, entity type, registration number, blacklist status.",
    complete: true,
  },
  {
    title: "BBBEE certificate verification",
    badge: "Manual review",
    description:
      "Suppliers upload their BBBEE verification certificate. Our compliance team validates the certificate against the issuing verification agency, checks the expiry date, and confirms the stated level matches the certificate.",
    detail:
      "Expired certificates trigger automatic downgrade. Suppliers are notified 30 days before expiry.",
    complete: true,
  },
  {
    title: "SARS tax clearance validation",
    badge: "Automated",
    description:
      "Tax clearance certificates are validated against SARS records. A supplier with outstanding tax obligations cannot be listed as verified on the platform - regardless of their CSD or BBBEE status.",
    detail: "Tax clearance is re-validated every 90 days to maintain current status.",
    complete: true,
  },
  {
    title: "Banking details verification",
    badge: "Required before award",
    description:
      "Before any purchase order can be issued, the supplier's banking details are verified against their company registration. This prevents payment fraud and ensures funds reach the correct entity.",
    detail: "Bank account holder name must match the registered company name on CIPC records.",
    complete: false,
  },
]

const smartScoreRows = [
  {
    icon: "profile",
    name: "Business profile complete",
    description:
      "Registered name, industry, provinces, description, and contact information all filled in.",
    points: "+20 pts",
  },
  {
    icon: "database",
    name: "CSD number verified",
    description: "Active CSD registration confirmed against National Treasury database.",
    points: "+20 pts",
  },
  {
    icon: "certificate",
    name: "BBBEE certificate verified",
    description:
      "Level 1-4: 20 points. Level 5-8: 10 points. Certificate must be current and validated.",
    points: "+10-20 pts",
  },
  {
    icon: "tax",
    name: "Tax clearance verified",
    description: "Current SARS tax clearance certificate validated and on file.",
    points: "+15 pts",
  },
  {
    icon: "bank",
    name: "Banking details verified",
    description: "Business bank account confirmed, holder name matches CIPC registration.",
    points: "+10 pts",
  },
  {
    icon: "identity",
    name: "Director identity verified (Optional)",
    description:
      "Director or authorised representative identity confirmed via document verification.",
    points: "+10 pts",
  },
  {
    icon: "document",
    name: "Company profile document (Optional)",
    description: "Formal company profile document uploaded and reviewed.",
    points: "+5 pts",
  },
]

const scoreBands = [
  {
    score: "90-100",
    label: "Excellent",
    tone: "text-success",
    items: [
      "All verifications complete",
      "Priority placement on RFQs",
      "Visible to all buyers",
    ],
  },
  {
    score: "75-89",
    label: "Good standing",
    tone: "text-sky-700",
    items: [
      "Core verifications done",
      "Eligible for all RFQs",
      "1-2 optional items missing",
    ],
  },
  {
    score: "50-74",
    label: "Building trust",
    tone: "text-warning",
    items: [
      "CSD verified",
      "Tax or banking pending",
      "Lower visibility on RFQs",
    ],
  },
]

const buyerTrustCards = [
  {
    title: "Buyer organisation verification",
    body:
      "Every buyer organisation is verified against CIPC records before they can post an RFQ. We confirm company registration, director information, and active trading status.",
  },
  {
    title: "Procurement officer validation",
    body:
      "Individual buyer accounts must use a work email domain that matches their registered organisation. Consumer email addresses (Gmail, Yahoo) are not permitted for buyer accounts.",
  },
  {
    title: "No ghost RFQs",
    body:
      "RFQs that receive no quotes within 48 hours of closing are automatically reviewed by our team. Buyers who repeatedly post and cancel RFQs without awarding are flagged and suspended.",
  },
  {
    title: "Dispute resolution",
    body:
      "If a supplier believes an RFQ was handled unfairly or an award decision was irregular, they can raise a dispute through the platform. Disputes are reviewed within 5 business days.",
  },
]

const faqs = [
  {
    question: "How long does verification take?",
    answer:
      "CSD and tax clearance checks are automated and complete within minutes of submission. BBBEE certificate review is manual and typically takes 1-2 business days. Banking verification takes up to 24 hours. Most suppliers are fully verified within 48 hours of completing their profile.",
  },
  {
    question: "What if my CSD registration is pending?",
    answer:
      "You can create a profile and complete all other verification steps while your CSD registration is being processed. You won't be able to respond to RFQs until CSD verification passes, but your profile will be ready to activate the moment it does.",
  },
  {
    question: "Does a higher SmartScore guarantee I'll win contracts?",
    answer:
      "No. SmartScore measures trust and completeness, not commercial competitiveness. A high SmartScore gives you better visibility and placement on matched RFQs - it doesn't influence award decisions, which are made by buyers based on price, quality, and fit.",
  },
  {
    question: "Is my company information visible to everyone?",
    answer:
      "Your business name, industry, province, BBBEE level, and SmartScore are visible on your public supplier profile. Your CSD number is masked (showing only the last 4 digits). Your email address, phone number, and banking details are never shown publicly - contact happens through the platform's messaging system.",
  },
  {
    question: "What happens if a buyer doesn't award an RFQ?",
    answer:
      "Buyers are required to close every RFQ with either an award or a formal cancellation with a stated reason. Suppliers who submitted quotes are notified of the outcome. Buyers who cancel RFQs repeatedly without valid reasons are reviewed by our team.",
  },
]

function TrustIcon({ icon }: { icon: string }) {
  if (icon === "profile") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (icon === "database") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (icon === "bank") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M4 10h16L12 4 4 10ZM6 10v8M10 10v8M14 10v8M18 10v8M4 20h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (icon === "identity") {
    return (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M5 4h14v16H5V4ZM9 9h6M9 13h6M9 17h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  )
}

export default function TrustCentrePage() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <section className="border-b border-panel bg-card">
          <div className="mx-auto max-w-[860px] px-6 py-16 text-center lg:py-20">
            <span className="inline-flex rounded-full border border-success bg-success-soft px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-success">
              Built for South African procurement
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-heading md:text-5xl">
              How trust works on Monate Connect
            </h1>
            <p className="mx-auto mt-5 max-w-[520px] text-base leading-8 text-secondary">
              Every supplier on the platform is verified against the Central Supplier Database,
              BBBEE records, and SARS tax status before they can respond to a single RFQ.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-md border border-panel bg-panel px-4 py-3 text-left shadow-panel">
                  <p className="text-xl font-bold text-heading">{stat.value}</p>
                  <p className="mt-1 text-xs text-secondary">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[860px] px-6 py-16">
          <p className="newspaper-kicker">For buyers</p>
          <h2 className="mt-3 text-3xl font-semibold text-heading">How we verify every supplier</h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Before a supplier can respond to any RFQ on Monate Connect, they go through a mandatory
            3-stage verification process. No shortcuts.
          </p>

          <div className="mt-8 space-y-4">
            {verificationSteps.map((step, index) => (
              <article key={step.title} className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <div className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                      step.complete
                        ? "border-success bg-success text-button"
                        : "border-panel bg-panel text-heading"
                    }`}
                  >
                    {step.complete ? "✓" : index + 1}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-heading">
                        Step {index + 1} - {step.title}
                      </h3>
                      <span className="rounded-md border border-panel bg-panel px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-secondary">
                        {step.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-secondary">{step.description}</p>
                    <p className="mt-3 text-xs leading-6 text-muted">{step.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-panel bg-card">
          <div className="mx-auto max-w-[860px] px-6 py-16">
            <p className="newspaper-kicker">Trust scoring</p>
            <h2 className="mt-3 text-3xl font-semibold text-heading">What is SmartScore?</h2>
            <p className="mt-4 text-sm leading-7 text-secondary">
              SmartScore is a 0-100 trust rating that tells buyers at a glance how complete,
              verified, and active a supplier is on the platform. It&apos;s calculated from
              objective compliance data - not reviews or self-reported information.
            </p>

            <div className="mt-8 overflow-hidden rounded-md border border-panel bg-page shadow-panel">
              {smartScoreRows.map((row) => (
                <div key={row.name} className="grid gap-4 border-b border-panel p-5 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md border border-panel bg-panel text-accent">
                    <TrustIcon icon={row.icon} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-heading">{row.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-secondary">{row.description}</p>
                  </div>
                  <p className="text-right text-sm font-bold text-accent">{row.points}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {scoreBands.map((band) => (
                <article key={band.score} className="rounded-md border border-panel bg-page p-5 shadow-panel">
                  <p className={`text-[0.68rem] font-bold uppercase tracking-[0.2em] ${band.tone}`}>
                    {band.score} / {band.label}
                  </p>
                  <div className="mt-4 space-y-2">
                    {band.items.map((item, index) => (
                      <p key={item} className="text-sm leading-6 text-secondary">
                        <span className={index === 0 ? "text-success" : "text-muted"}>
                          {index === 0 ? "✓" : "-"}
                        </span>{" "}
                        {item}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[860px] px-6 py-16">
          <p className="newspaper-kicker">For suppliers</p>
          <h2 className="mt-3 text-3xl font-semibold text-heading">How we protect suppliers</h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Suppliers have the right to know that the buyers posting RFQs on the platform are
            legitimate. Here&apos;s how we verify procurement teams.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {buyerTrustCards.map((card) => (
              <article key={card.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
                <h3 className="text-lg font-semibold text-heading">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-secondary">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-panel bg-card">
          <div className="mx-auto max-w-[860px] px-6 py-16">
            <p className="newspaper-kicker">Common questions</p>
            <h2 className="mt-3 text-3xl font-semibold text-heading">Frequently asked</h2>
            <div className="mt-8 overflow-hidden rounded-md border border-panel bg-page shadow-panel">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index
                return (
                  <article key={faq.question} className="border-b border-panel last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-bold text-heading">{faq.question}</span>
                      <svg
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 text-secondary transition ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5">
                        <p className="text-sm leading-7 text-secondary">{faq.answer}</p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[860px] px-6 py-16">
          <div className="rounded-md border border-panel bg-panel p-8 text-center shadow-panel">
            <h2 className="text-3xl font-semibold text-heading">
              Ready to join South Africa&apos;s verified procurement network?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-secondary">
              Register as a supplier or request a buyer account. Verification takes less than 48
              hours.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/auth/login?role=admin" className="masthead__btn-secondary">
                I&apos;m a buyer
              </Link>
              <Link href="/auth/signup" className="masthead__btn-primary">
                Register as supplier
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

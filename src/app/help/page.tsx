"use client"

import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { useMemo, useState } from "react"

const faqSections = [
  {
    title: "Supplier Registration",
    items: [
      {
        question: "Who can register as a supplier on AiForm Procure?",
        answer:
          "South African suppliers, SMEs, service providers and sector specialists can register to create a profile, view opportunities and participate in procurement workflows.",
      },
      {
        question: "What information should suppliers prepare before registering?",
        answer:
          "Suppliers should prepare business details, province, industry, registration information, compliance documents and contact details for the organisation.",
      },
    ],
  },
  {
    title: "Verification",
    items: [
      {
        question: "What does supplier verification mean?",
        answer:
          "Verification is a procurement readiness review of supplier profile information, compliance evidence, banking readiness and business identity signals.",
      },
      {
        question: "Does verification guarantee an award?",
        answer:
          "No. Verification improves buyer confidence, but awards still depend on RFQ requirements, quote quality, governance rules and buyer evaluation.",
      },
    ],
  },
  {
    title: "SmartScore",
    eyebrow: "SmartScore&trade;",
    items: [
      {
        question: "Is SmartScore a credit score?",
        answer:
          "No. SmartScore is not a credit score. It is a procurement trust, readiness and reputation indicator for sourcing and supplier development.",
      },
      {
        question: "What can improve a supplier SmartScore?",
        answer:
          "Profile completeness, verification progress, compliance uploads, banking verification, RFQ responses, awarded quotes, completed contracts, reviews and recent platform activity can improve the score.",
      },
    ],
  },
  {
    title: "RFQs and Quotes",
    items: [
      {
        question: "Can the public submit quotes from the opportunities page?",
        answer:
          "No. Public visitors can preview open opportunities, but suppliers must log in before submitting a quote.",
      },
      {
        question: "How do suppliers respond to an RFQ?",
        answer:
          "A registered supplier logs in, opens the RFQ, reviews requirements and submits the requested quote information before the deadline.",
      },
    ],
  },
  {
    title: "Purchase Orders",
    items: [
      {
        question: "When is a purchase order created?",
        answer:
          "A purchase order can be generated after a quote is awarded, turning the RFQ outcome into a trackable procurement commitment.",
      },
      {
        question: "Can suppliers accept purchase orders?",
        answer:
          "Yes. The procurement workflow supports supplier acceptance and lifecycle tracking for issued purchase orders.",
      },
    ],
  },
  {
    title: "Contracts",
    items: [
      {
        question: "How are contracts connected to procurement activity?",
        answer:
          "Contracts can be created from purchase orders so teams can track supplier, RFQ, purchase order, value, start date, end date, renewal status and lifecycle state.",
      },
      {
        question: "Does AiForm Procure track contract renewals?",
        answer:
          "Yes. Contract pages can surface renewal due, expiring soon, expired and active status signals where contract dates are available.",
      },
    ],
  },
  {
    title: "Invoices and Payments",
    items: [
      {
        question: "Can invoices be generated from contracts or purchase orders?",
        answer:
          "Yes. The procurement-to-payment workflow supports invoice generation from eligible contract and purchase order records.",
      },
      {
        question: "When can a payment be generated?",
        answer:
          "A payment can be generated when an invoice is approved, then tracked through pending, processing, paid, failed or cancelled states.",
      },
    ],
  },
  {
    title: "Banking Verification",
    items: [
      {
        question: "Why does banking verification matter?",
        answer:
          "Banking verification helps procurement and finance teams reduce payment risk before approved invoices move into payment tracking.",
      },
      {
        question: "Is banking information shown publicly?",
        answer:
          "No. Public supplier marketplace previews must not expose phone, email, banking details or compliance document links.",
      },
    ],
  },
  {
    title: "WhatsApp Alerts",
    items: [
      {
        question: "Does AiForm Procure send paid WhatsApp API messages?",
        answer:
          "Not yet. The current network uses WhatsApp-ready deep links and alert drafts rather than a paid WhatsApp API integration.",
      },
      {
        question: "What alert types can WhatsApp support?",
        answer:
          "RFQ notices, closing soon reminders, award notices, purchase order updates, invoice reminders and compliance prompts can be drafted for WhatsApp outreach.",
      },
    ],
  },
  {
    title: "Pilot Partnerships",
    items: [
      {
        question: "Who can request a pilot partnership?",
        answer:
          "Municipalities, mining houses, SOEs, supplier networks, procurement teams, investors and partner organisations can request a pilot discussion.",
      },
      {
        question: "Is fixed pricing available?",
        answer:
          "Pilot pricing is available on request. The platform does not include public payment processing or subscription checkout yet.",
      },
    ],
  },
  {
    title: "Accessibility and Languages",
    items: [
      {
        question: "What accessibility support is included?",
        answer:
          "The platform includes accessibility controls, theme preferences and interface considerations designed to improve access across supplier and buyer contexts.",
      },
      {
        question: "Why does language inclusion matter for procurement?",
        answer:
          "Supplier participation improves when procurement information is easier to understand, easier to navigate and more inclusive of different working contexts.",
      },
    ],
  },
]

const quickLinks = [
  { label: "Register Supplier", href: "/auth/signup", primary: true },
  { label: "Supplier Login", href: "/auth/login" },
  { label: "View Opportunities", href: "/opportunities" },
  { label: "Contact Support", href: "/contact" },
]

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function normalise(value: string) {
  return value.trim().toLowerCase()
}

export default function HelpCentrePage() {
  const [query, setQuery] = useState("")
  const [activeSection, setActiveSection] = useState("All")

  const filteredSections = useMemo(() => {
    const searchTerm = normalise(query)

    return faqSections
      .filter((section) => activeSection === "All" || section.title === activeSection)
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const searchable = `${section.title} ${item.question} ${item.answer}`.toLowerCase()
          return !searchTerm || searchable.includes(searchTerm)
        }),
      }))
      .filter((section) => section.items.length > 0)
  }, [activeSection, query])

  const resultCount = filteredSections.reduce((total, section) => total + section.items.length, 0)

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="bg-[#1a3a2a] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4"><BackLink className="text-[#f8f4ec]/70 hover:text-[#f8f4ec]" /></div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[#c8a060]">Help Centre &middot; Public FAQ</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-[#f8f4ec] md:text-6xl">Common questions about AiForm Procure</h1>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-[#f8f4ec]/70">
            Find answers about supplier registration, verification, SmartScore trust signals,
            RFQs, purchase orders, contracts, invoices, payments, WhatsApp alerts and pilot
            partnerships.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.primary
                    ? "inline-flex items-center rounded-md bg-[#c8a060] px-5 py-2.5 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#d7b373]"
                    : "inline-flex items-center rounded-md border border-[#f8f4ec]/30 px-5 py-2.5 text-sm font-semibold text-[#f8f4ec] transition hover:border-[#f8f4ec]/50 hover:bg-[#f8f4ec]/10"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Search FAQ
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">Filter by topic or question</h2>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">
              Search help articles
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={inputClass}
              placeholder="Search registration, invoices, SmartScore..."
              type="search"
            />
          </label>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Showing <span className="font-semibold text-heading">{resultCount}</span> matching
            questions.
          </p>
        </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="flex flex-wrap gap-2">
          {["All", ...faqSections.map((section) => section.title)].map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                activeSection === section
                  ? "border-accent bg-accent text-button"
                  : "border-panel bg-card text-secondary hover:border-accent hover:text-accent"
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        {filteredSections.length === 0 ? (
          <div className="rounded-md border border-panel bg-card p-8 text-center shadow-panel">
            <p className="text-sm font-semibold text-heading">No FAQ results found.</p>
            <p className="mt-2 text-sm text-secondary">
              Try a broader search term or contact support for a pilot-specific question.
            </p>
            <div className="mt-5">
              <Link href="/contact" className="masthead__btn-primary">
                Contact Support
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredSections.map((section) => (
              <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                  {section.eyebrow || section.title}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-heading">{section.title}</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {section.items.map((item) => (
                    <div key={item.question} className="rounded-md border border-panel bg-panel p-5">
                      <h3 className="text-base font-semibold text-heading">{item.question}</h3>
                      <p className="mt-3 text-sm leading-7 text-secondary">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

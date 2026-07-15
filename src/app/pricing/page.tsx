import {
  IconBuildingBank,
  IconCertificate,
  IconChecklist,
  IconHeadset,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react"
import Link from "next/link"
import BackLink from "@/components/BackLink"
import PayFastCheckoutButton from "@/components/PayFastCheckoutButton"

const supplierFeatures = [
  "Verified supplier profile",
  "Unlimited document uploads (CIPC, BBBEE, CSD, tax clearance)",
  "SmartScore",
  "Browse and respond to RFQs",
  "Quote submission and PO management",
  "Procurement Glossary and Help Centre",
  "Thuso AI procurement assistant",
]

const buyerFeatures = [
  "Unlimited RFQ publishing",
  "Verified supplier directory",
  "Filter by province, BBBEE, and industry",
  "Quote comparison and PO issuance",
]

const buyerProfessionalFeatures = [
  ...buyerFeatures,
  "Regional Insights SA province map",
  "Supplier Intelligence dashboard",
  "BBBEE spend tracking and compliance reporting",
  "Dedicated account support",
]

const comparisons = [
  {
    icon: IconHeadset,
    label: "Procurement consultant 1 hour",
    value: "R245-R500/hour",
    source:
      "ERI Economic Research Institute, Average SA Procurement Consultant hourly rate, 2025",
    sourceUrl: "https://www.erieri.com/salary/job/procurement-consultant/south-africa",
  },
  {
    icon: IconCertificate,
    label: "B-BBEE verification EME annual",
    value: "R3,000-R8,000/year",
    source: "Law Guide SA, B-BBEE Requirements Guide, 2024",
    sourceUrl: "https://www.bbbeecommission.co.za/",
  },
  {
    icon: IconUsers,
    label: "Procurement officer monthly salary",
    value: "R35,000-R51,000/month",
    source:
      "CIPS Procurement & Supply Salary Guide 2024, average SA procurement salary R614,777/year",
    sourceUrl: "https://www.payscale.com/research/ZA/Job=Procurement_Officer/Salary",
  },
  {
    icon: IconBuildingBank,
    label: "Value of winning one government RFQ",
    value: "R50,000-R5,000,000+",
    source: "Based on typical SA government RFQ values",
    sourceUrl: "https://ocpo.treasury.gov.za",
  },
]

const faqs = [
  {
    question: "Is it really free during the pilot?",
    answer:
      "Yes. AiForm Procure is free until October 31, 2026, and no credit card is required to join the pilot.",
  },
  {
    question: "What happens after October 2026?",
    answer:
      "You will receive advance notice before paid billing starts, and early adopter pricing will be honoured for pilot users.",
  },
  {
    question: "Are there long-term contracts?",
    answer:
      "No. Plans are month-to-month, and you can cancel anytime without a long-term commitment.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "Payments will be handled through PayFast, including credit and debit cards, instant EFT, and other South African payment methods.",
  },
]

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="mt-6 space-y-2.5">
      {features.map((feature) => (
        <li key={feature} className="flex gap-3 text-sm leading-6 text-[#40554a]">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5DCAA5]/15 text-[#168567]">
            <IconChecklist className="h-3.5 w-3.5" stroke={2.4} aria-hidden />
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f0ebe0] text-[#1a3a2a]">
      <section className="bg-[#1a3a2a] px-6 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-4 text-left">
            <BackLink className="text-[#f8f4ec]/70 hover:text-[#f8f4ec]" />
          </div>
          <span className="inline-flex rounded-full border border-[#c8a060]/45 bg-[#c8a060]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c8a060]">
            Transparent pricing
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Simple, honest pricing for SA procurement
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#dbe8df] sm:text-lg">
            Join the AiForm Procure pilot with full access free until October 31, 2026. No
            credit card, no surprise fees, just procurement tools built for South African
            suppliers and buyers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="flex flex-col rounded-md border border-l-4 border-[#d8cbb8] border-l-[#5DCAA5] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-[#5DCAA5]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#168567]">
                  For Suppliers
                </span>
                <h2 className="mt-4 font-display text-2xl font-semibold text-[#1a3a2a]">
                  Supplier Access
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-display text-3xl font-semibold text-[#1a3a2a]">R299</p>
                <p className="text-sm font-semibold text-[#63766b]">/month</p>
              </div>
            </div>
            <p className="mt-4 rounded-md bg-[#f0ebe0] px-4 py-3 text-sm font-semibold text-[#1a3a2a]">
              Free until October 2026 during the pilot.
            </p>
            <FeatureList features={supplierFeatures} />
            <PayFastCheckoutButton
              tier="supplier"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1a3a2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#10251b]"
            >
              Subscribe as supplier
            </PayFastCheckoutButton>
          </article>

          <article className="flex flex-col rounded-md border border-l-4 border-[#1a3a2a] border-l-[#c8a060] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-[#1a3a2a] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#c8a060]">
                  For Buyers
                </span>
                <h2 className="mt-4 font-display text-2xl font-semibold text-[#1a3a2a]">
                  Buyer Starter
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-display text-3xl font-semibold text-[#1a3a2a]">R990</p>
                <p className="text-sm font-semibold text-[#63766b]">/month</p>
              </div>
            </div>
            <p className="mt-4 rounded-md bg-[#c8a060]/15 px-4 py-3 text-sm font-semibold text-[#1a3a2a]">
              Free until October 2026 during the pilot.
            </p>
            <FeatureList features={buyerFeatures} />
            <PayFastCheckoutButton
              tier="buyer_starter"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#c8a060] px-5 py-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d8b36f]"
            >
              Subscribe to Starter
            </PayFastCheckoutButton>
          </article>

          <article className="flex flex-col rounded-md border border-l-4 border-[#1a3a2a] border-l-[#c8a060] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-[#1a3a2a] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#c8a060]">
                  For Buyers
                </span>
                <h2 className="mt-4 font-display text-2xl font-semibold text-[#1a3a2a]">
                  Buyer Professional
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-display text-3xl font-semibold text-[#1a3a2a]">R2,490</p>
                <p className="text-sm font-semibold text-[#63766b]">/month</p>
              </div>
            </div>
            <p className="mt-4 rounded-md bg-[#c8a060]/15 px-4 py-3 text-sm font-semibold text-[#1a3a2a]">
              Free until October 2026 during the pilot.
            </p>
            <FeatureList features={buyerProfessionalFeatures} />
            <PayFastCheckoutButton
              tier="buyer_professional"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#c8a060] px-5 py-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d8b36f]"
            >
              Subscribe to Professional
            </PayFastCheckoutButton>
          </article>
        </div>
      </section>

      <section className="bg-white px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a060]">
              Real-world context
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[#1a3a2a] sm:text-4xl">
              What does R299/month actually mean?
            </h2>
            <p className="mt-4 text-base leading-7 text-[#53665c]">
              For suppliers, the monthly price after the pilot is designed to be modest next
              to common procurement costs and the potential value of a single successful RFQ.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {comparisons.map((item) => {
              const Icon = item.icon
              return (
                <article
                  key={item.label}
                  className="rounded-md border border-[#e3d8c5] bg-[#f0ebe0] p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#5DCAA5]/15 text-[#168567]">
                      <Icon className="h-6 w-6" stroke={1.8} aria-hidden />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xl font-semibold text-[#1a3a2a]">
                          {item.label}
                        </h3>
                        <span className="rounded-full bg-[#5DCAA5] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#1a3a2a]">
                          vs
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-[#1a3a2a]">{item.value}</p>
                      <p className="mt-3 text-xs leading-5 text-[#63766b]">
                        Source: {item.source}
                      </p>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-xs font-medium text-[#5DCAA5] hover:underline"
                      >
                        Verify source →
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a060]">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-[#1a3a2a]">
            Pricing questions, answered
          </h2>
        </div>
        <div className="mt-8 divide-y divide-[#d8cbb8] rounded-md border border-[#d8cbb8] bg-white shadow-sm">
          {faqs.map((faq) => (
            <article key={faq.question} className="p-5 sm:p-6">
              <h3 className="font-display text-xl font-semibold text-[#1a3a2a]">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#53665c]">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-md bg-[#1a3a2a] p-7 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div>
            <p className="font-display text-3xl font-semibold">Join the pilot - it&apos;s free</p>
            <p className="mt-2 text-sm font-semibold text-[#dbe8df]">
              No credit card. No commitment. Just procurement made simpler.
            </p>
          </div>
          <Link
            href="/auth/register"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-[#c8a060] px-5 py-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d8b36f]"
          >
            Register for free
            <IconSparkles className="h-4 w-4" stroke={2.2} aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  )
}

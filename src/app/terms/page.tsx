import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const termsSections = [
  {
    title: "Acceptance of terms",
    body: "By accessing or using AiForm Procure, users agree to follow these terms and any platform rules made available during onboarding or use.",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    title: "Who may use the platform",
    body: "Supplier accounts are intended for South African-registered entities only. Buyer accounts must be used by registered organisations and authorised representatives.",
    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  },
  {
    title: "Supplier obligations",
    body: "Suppliers must provide accurate information, maintain a valid CSD registration, and keep BBBEE and tax clearance documentation current where those documents are submitted or required.",
    icon: "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z",
  },
  {
    title: "Buyer obligations",
    body: "Buyers must post legitimate RFQs only, must not publish spam RFQs, and must award or formally close RFQs within a reasonable procurement timeframe.",
    icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  },
  {
    title: "Platform rules",
    body: "Users must not misrepresent their identity, organisation, compliance status, procurement authority, pricing, documents, or banking information. Fraudulent documents are not permitted.",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
  {
    title: "Intellectual property",
    body: "AiForm Studio owns the AiForm Procure platform, including its product design, software, interface, workflows, brand assets, and related intellectual property.",
    icon: "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
  },
  {
    title: "Limitation of liability",
    body: "AiForm Procure facilitates procurement connections and workflows. It is not responsible for contract outcomes, supplier performance, buyer decisions, payment disputes, or commercial results between users.",
    icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  },
  {
    title: "Termination",
    body: "AiForm Procure may suspend or terminate accounts that breach platform rules, submit fraudulent documents, misuse procurement workflows, or otherwise violate these terms.",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  },
  {
    title: "Governing law",
    body: "These terms are governed by the laws of the Republic of South Africa.",
    icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z",
  },
  {
    title: "Subscriptions, Refunds and Cancellations",
    body: "AiForm Procure operates on a subscription basis during the pilot period. The platform is currently free for all registered users until October 2026.\n\nCancellation: Users may cancel their account at any time through their account settings. Cancellation takes effect immediately.\n\nRefunds: As the platform is currently free during the pilot period, no payments are collected and no refunds are applicable.\n\nDelivery: AiForm Procure is a digital platform. No physical goods are sold or delivered. All services are delivered electronically.\n\nDisputes: Any billing disputes should be directed to aiformstudio@gmail.com within 30 days of the charge.",
    icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  },
  {
    title: "Contact",
    body: "For questions about these terms, contact aiformstudio@gmail.com.",
    icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  },
]

export default function TermsOfServicePage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">

        {/* Hero */}
        <section className="bg-[#1a3a2a] px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <BackLink className="text-[#f8f4ec]/70 hover:text-[#f8f4ec]" />
            <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[#c8a060]">Legal Desk &middot; Terms of Service</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-[#f8f4ec] md:text-6xl">Terms of Service</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#f8f4ec]/70">
              These terms describe the expected rules for using AiForm Procure as a supplier, buyer, or authorised platform user.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c8a060]/30 bg-[#c8a060]/10 px-4 py-1.5 text-xs font-semibold text-[#c8a060]">
                Effective date: 26 June 2026
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5DCAA5]/30 bg-[#5DCAA5]/10 px-4 py-1.5 text-xs font-semibold text-[#5DCAA5]">
                Governed by South African law
              </span>
            </div>
          </div>
        </section>

        {/* Platform owner card */}
        <section className="border-b border-panel bg-card px-6 py-8">
          <div className="mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Platform owner</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-heading">AiForm Studio</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-secondary">
                AiForm Procure is operated as a procurement platform for verified supplier discovery, RFQ workflows, and buyer-supplier coordination.
              </p>
            </div>
            <Link href="/privacy" className="shrink-0 inline-flex items-center gap-2 rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent">
              Read Privacy Policy
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Content sections */}
        <section className="mx-auto max-w-7xl grid gap-5 px-6 py-12 md:grid-cols-2">
          {termsSections.map((section) => (
            <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
              <div className="flex items-center gap-3 border-b border-panel pb-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3a2a]/8 text-[#1a3a2a]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={section.icon} />
                  </svg>
                </span>
                <h2 className="font-display text-base font-semibold text-heading">{section.title}</h2>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-secondary">{section.body}</p>
            </article>
          ))}
        </section>

        {/* Footer CTA */}
        <section className="border-t border-panel bg-card px-6 py-12">
          <div className="mx-auto max-w-7xl flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1a3a2a]/8 text-[#1a3a2a]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-heading">Questions about these terms?</p>
                <p className="mt-1 text-sm text-secondary">Contact us at <span className="font-semibold text-accent">aiformstudio@gmail.com</span></p>
              </div>
            </div>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-md bg-[#1a3a2a] px-6 py-3 text-sm font-semibold text-[#c8a060] transition hover:bg-[#123020]">
              Contact our team
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </section>

      </main>
      <PublicFooter />
    </>
  )
}

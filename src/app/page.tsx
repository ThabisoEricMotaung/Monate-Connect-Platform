import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import Stats from "@/components/sections/Stats"
import Features from "@/components/sections/Features"
import Categories from "@/components/sections/Categories"
import SupplierSpotlight from "@/components/sections/SupplierSpotlight"

const userPaths = [
  {
    title: "I am a Supplier",
    text: "Find RFQs, build a verified profile, improve readiness, submit quotes and track procurement outcomes.",
    actions: [
      { label: "Register Supplier", href: "/auth/signup", primary: true },
      { label: "View Opportunities", href: "/opportunities" },
    ],
  },
  {
    title: "I am a Buyer",
    text: "Create RFQs, compare quotes, generate purchase orders, manage contracts and track invoices or payments.",
    actions: [
      { label: "Supplier Marketplace", href: "/suppliers", primary: true },
      { label: "Trust Centre", href: "/trust" },
    ],
  },
  {
    title: "I represent a Municipality / Mine / SOE",
    text: "Pilot supplier onboarding, local procurement visibility, compliance workflows and executive reporting.",
    actions: [
      { label: "Request Pilot", href: "/contact", primary: true },
      { label: "Pilot Packages", href: "/pricing" },
    ],
  },
  {
    title: "I want a Pilot Demo",
    text: "Review the investor and partner demo pack, then request a tailored walkthrough for your organisation.",
    actions: [
      { label: "Start Demo Walkthrough", href: "/demo-walkthrough", primary: true },
      { label: "View Demo Pack", href: "/demo-pack" },
    ],
  },
]

const workflow = [
  "Register",
  "Verify",
  "RFQ",
  "Quote",
  "Award",
  "PO",
  "Contract",
  "Invoice",
  "Payment",
]

function CtaLink({
  href,
  label,
  primary = false,
}: {
  href: string
  label: string
  primary?: boolean
}) {
  return (
    <Link href={href} className={primary ? "masthead__btn-primary" : "masthead__btn-secondary"}>
      {label}
    </Link>
  )
}

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-14 pt-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">South African Procurement &middot; Supplier Intelligence</p>
          <h1 className="newspaper-headline mt-5">
            Verified suppliers, governed sourcing and payment-ready procurement
          </h1>
          <p className="newspaper-body newspaper-drop-cap mt-6 max-w-4xl">
            South African procurement platform connecting verified suppliers with RFQs,
            contracts, invoices and payments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink href="/opportunities" label="View Opportunities" primary />
            <CtaLink href="/auth/signup" label="Register Supplier" />
            <CtaLink href="/demo-walkthrough" label="Start Demo Walkthrough" />
            <CtaLink href="/contact" label="Request Pilot" />
            <CtaLink href="/auth/login" label="Supplier Login" />
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Platform Brief
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Built for suppliers, buyers and pilot partners
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Monate Connect combines opportunity discovery, supplier verification, quote
            workflows, SmartScore trust indicators, audit trails, and procurement-to-payment
            tracking in one enterprise-ready environment.
          </p>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {userPaths.map((path) => (
            <article key={path.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                User Path
              </p>
              <h2 className="mt-3 text-xl font-semibold text-heading">{path.title}</h2>
              <p className="mt-4 text-sm leading-7 text-secondary">{path.text}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {path.actions.map((action) => (
                  <CtaLink key={action.href} href={action.href} label={action.label} primary={action.primary} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Platform Workflow
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Register to payment in one procurement operating layer
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-14 lg:grid-cols-3">
        <article className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            SmartScore&trade; Trust
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Procurement readiness, not credit scoring
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            SmartScore is a procurement trust, readiness and reputation indicator. It helps
            buyers understand verification, compliance posture, supplier activity and lifecycle
            performance without representing a credit score.
          </p>
          <div className="mt-5">
            <CtaLink href="/trust" label="Explore Trust Centre" primary />
          </div>
        </article>

        <article className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            WhatsApp Procurement Network
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Supplier alerts where suppliers already are
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            WhatsApp-ready RFQ alerts, closing reminders, compliance prompts, award notices,
            purchase order updates and invoice reminders support broader supplier reach.
          </p>
          <div className="mt-5">
            <CtaLink href="/demo-pack" label="View Demo Pack" primary />
          </div>
        </article>

        <article className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Accessibility & Language Inclusion
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Inclusive supplier access
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Language switching, theme controls and accessibility preferences help improve access
            for suppliers, procurement teams and pilot partners across different working contexts.
          </p>
          <div className="mt-5">
            <CtaLink href="/contact" label="Request Pilot Discussion" primary />
          </div>
        </article>
      </section>

      <Stats />
      <Features />
      <Categories />
      <SupplierSpotlight />
      </main>
      <PublicFooter />
    </>
  )
}

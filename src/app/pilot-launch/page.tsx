import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const quickLinks = [
  { label: "Pilot Tester Dashboard", href: "/test-pilot" },
  { label: "Feedback Form", href: "/feedback" },
  { label: "Supplier Registration", href: "/auth/signup" },
  { label: "Login", href: "/auth/login" },
  { label: "Demo Walkthrough", href: "/demo-walkthrough" },
]

const testerInstructions = [
  "Test on desktop and mobile.",
  "Try to register as a supplier.",
  "Try to browse RFQs and inspect opportunity details.",
  "Try to submit feedback after testing.",
  "Report anything confusing, broken, missing, or unexpectedly useful.",
]

const testingFocus = [
  "First impression and clarity of the public entry page.",
  "Supplier registration and login flow.",
  "RFQ browsing, supplier profile, and quote submission paths.",
  "Mobile readability, navigation, forms, and button usability.",
  "Feedback capture and issue reporting.",
]

export default function PilotLaunchPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page px-5 py-10 text-primary sm:px-6">
        <section className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="entry-paper-panel self-start">
              <p className="newspaper-kicker">Pilot Launch</p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-heading md:text-5xl">
                Welcome, AiForm Procure pilot tester.
              </h1>
              <p className="mt-5 text-sm leading-7 text-secondary">
                Thank you for helping test AiForm Procure. This pilot is focused on
                clarity, usability, trust, and whether suppliers and procurement teams
                can move through the platform with confidence.
              </p>

              <div className="mt-6 rounded-md border border-panel bg-surface p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
                  Testing time needed
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">30-60 minutes</p>
              </div>

              <Link
                href="/test-pilot"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-accent bg-accent px-5 py-3 text-sm font-bold text-button transition hover:bg-accent-strong"
              >
                Start Pilot Test
              </Link>
            </aside>

            <div className="grid gap-5">
              <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                  What AiForm Procure Is
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-heading">
                  Procurement and supplier intelligence for South African businesses.
                </h2>
                <p className="mt-4 text-sm leading-7 text-secondary">
                  AiForm Procure helps suppliers discover opportunities, build verified
                  profiles, respond to RFQs, and share structured feedback during the
                  pilot. It also helps buyers and administrators review supplier
                  intelligence and procurement readiness.
                </p>
              </section>

              <section className="grid gap-5 lg:grid-cols-2">
                <article className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                    What To Test
                  </p>
                  <ul className="mt-4 space-y-3">
                    {testingFocus.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-secondary">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                    Tester Instructions
                  </p>
                  <ul className="mt-4 space-y-3">
                    {testerInstructions.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-secondary">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </section>

              <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-panel pb-4">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                      Pilot Links
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-heading">
                      Start anywhere, then submit feedback.
                    </h2>
                  </div>
                  <Link
                    href="/feedback"
                    className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
                  >
                    Submit Feedback
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="entry-quick-link"
                    >
                      <span>{link.label}</span>
                      <span aria-hidden="true">-&gt;</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

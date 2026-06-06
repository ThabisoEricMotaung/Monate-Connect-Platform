import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const primaryActions = [
  { label: "Supplier Login", href: "/auth/login", tone: "light" },
  { label: "Register Supplier", href: "/auth/signup", tone: "paper" },
  { label: "Admin / Buyer Login", href: "/auth/login?role=admin", tone: "paper" },
  { label: "Explore Demo Tour", href: "/demo-walkthrough", tone: "outline" },
]

const quickLinks = [
  { label: "View Opportunities", href: "/opportunities" },
  { label: "Browse Verified Suppliers", href: "/suppliers" },
  { label: "Trust Centre", href: "/trust" },
  { label: "Request Pilot Demo", href: "/contact" },
]

function EntryButton({
  href,
  label,
  tone,
}: {
  href: string
  label: string
  tone: string
}) {
  const className =
    tone === "light"
      ? "entry-button entry-button--light"
      : tone === "outline"
        ? "entry-button entry-button--outline"
        : "entry-button entry-button--paper"

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:min-h-[calc(100vh-220px)] lg:justify-center lg:py-14">
          <div className="entry-editorial-card">
            <div className="entry-editorial-card__inner">
              <div className="max-w-4xl">
                <p className="entry-kicker">Monate Vendor Network</p>
                <h1 className="entry-title">Welcome to Monate Connect.</h1>
                <p className="entry-subtitle">
                  Procurement and supplier intelligence for South African businesses.
                </p>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#d8d2c7] sm:text-lg">
                  Sign in, register, or take a guided look around. The platform is here to
                  help suppliers and procurement teams meet with more clarity, trust, and
                  less administrative noise.
                </p>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {primaryActions.map((action) => (
                  <EntryButton
                    key={action.label}
                    href={action.href}
                    label={action.label}
                    tone={action.tone}
                  />
                ))}
              </div>
            </div>
          </div>

          <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="entry-paper-panel">
              <p className="newspaper-kicker">New here?</p>
              <h2 className="mt-3 text-2xl font-semibold text-heading">
                Choose a simple starting point.
              </h2>
              <p className="mt-4 text-sm leading-7 text-secondary">
                Start with public opportunities, browse verified suppliers, review the
                trust model, or ask for a pilot walkthrough.
              </p>
            </article>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="entry-quick-link">
                  <span>{link.label}</span>
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-strong py-4 text-sm text-secondary">
            <p>
              Looking for the full product walkthrough? Visit the demo experience when
              you are ready.
            </p>
            <Link href="/demo-pack" className="font-bold text-accent hover:text-accent-strong">
              View Demo Pack
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

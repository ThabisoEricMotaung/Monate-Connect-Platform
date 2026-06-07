import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import HomepageNewspaper from "@/components/HomepageNewspaper"

const audienceCards = [
  {
    icon: "shop",
    title: "Suppliers",
    description: "List your business, respond to RFQs, and get verified to increase visibility.",
    cta: "Register free →",
    href: "/auth/signup",
  },
  {
    icon: "briefcase",
    title: "Procurement teams",
    description: "Source verified suppliers, post RFQs, and manage quotes in one place.",
    cta: "Request a pilot →",
    href: "/contact",
  },
  {
    icon: "shield",
    title: "Verified buyers",
    description: "Access BBBEE intelligence and CSD-compliant supplier records.",
    cta: "Learn more →",
    href: "/trust",
  },
]

const platformTiles = [
  {
    icon: "briefcase",
    title: "Opportunities",
    description: "Live RFQs and tenders",
    href: "/opportunities",
  },
  {
    icon: "shop",
    title: "Supplier directory",
    description: "Verified SA businesses",
    href: "/suppliers",
  },
  {
    icon: "shield",
    title: "Trust centre",
    description: "How verification works",
    href: "/trust",
  },
  {
    icon: "pricing",
    title: "Pricing",
    description: "Plans and pilot options",
    href: "/pricing",
  },
]

function EntryIcon({ icon }: { icon: string }) {
  if (icon === "shop") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path d="M4 10h16l-1.5-5h-13L4 10Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M5 10v9h14v-9M9 19v-5h6v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    )
  }

  if (icon === "briefcase") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path d="M9 7V5h6v2M4 8h16v11H4V8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M4 13h16M10 13v1h4v-1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    )
  }

  if (icon === "shield") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path d="M5 8h14M7 8V5h10v3M7 8v11M17 8v11M9 12h6M9 16h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}

export default function Home() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
        <HomepageNewspaper />
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:py-14">

          <section>
            <div className="flex flex-col gap-3 border-t border-strong pt-8">
              <p className="newspaper-kicker">Who is this for?</p>
              <h2 className="text-3xl font-semibold text-heading">Built for procurement networks</h2>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {audienceCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-md border border-panel bg-card p-6 shadow-panel transition hover:border-accent"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-panel bg-panel text-accent">
                    <EntryIcon icon={card.icon} />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-heading">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-secondary">{card.description}</p>
                  <Link
                    href={card.href}
                    className="mt-5 inline-flex text-sm font-bold text-accent transition hover:text-accent-strong"
                  >
                    {card.cta}
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-3 border-t border-strong pt-8">
              <p className="newspaper-kicker">Explore the platform</p>
              <h2 className="text-3xl font-semibold text-heading">Start with the public pages</h2>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {platformTiles.map((tile) => (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className="rounded-md bg-panel p-5 text-primary transition hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-accent">
                      <EntryIcon icon={tile.icon} />
                    </span>
                    <span className="text-base font-bold text-heading">{tile.title}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-secondary">{tile.description}</p>
                </Link>
              ))}
            </div>
          </section>

        </section>
      </main>
      <PublicFooter />
    </>
  )
}
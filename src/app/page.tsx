
import Link from "next/link"
import Image from "next/image"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import GazetteHeader from "@/components/home/GazetteHeader"
import HeroSection from "@/components/home/HeroSection"
import OpportunityStatsBanner from "@/components/home/OpportunityStatsBanner"
import RegionalInsightsMap from "@/components/home/RegionalInsightsMap"
import CTASection from "@/components/home/CTASection"
import TrustStrip from "@/components/home/TrustStrip"
import LiveOpportunitiesSection from "@/components/home/LiveOpportunitiesSection"
import AccountDeletedNotice from "@/components/AccountDeletedNotice"
import IncompleteRegistrationBanner from "@/components/IncompleteRegistrationBanner"
import DigestSignupForm from "@/app/opportunities/DigestSignupForm"
import { fetchPublicOpportunities, fetchRecentlyClosedOpportunities } from "@/lib/publicOpportunities"
import type { Metadata } from "next"

// Enable ISR with 5-minute revalidation instead of force-dynamic
// Stats will be cached and page regenerated every 5 minutes
export const revalidate = 300

const title = "AiForm Procure | Verified Supplier Directory & Government Procurement Platform"
const description = "Discover verified suppliers & live government tenders on South Africa's trusted procurement platform. Search 500+ opportunities, verify compliance, get matched instantly."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "AiForm Procure | Verified Supplier Directory",
    description: "Discover verified suppliers & live government tenders. Search 500+ opportunities instantly.",
    url: "/",
    siteName: "AiForm Procure",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AiForm Procure — South African procurement opportunities" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
}

const audienceCards = [
  {
    icon: "shop",
    title: "Suppliers",
    description: "List your business, respond to RFQs, and get verified to increase visibility.",
    points: ["Create your supplier profile", "Respond to relevant RFQs", "Get verified & increase visibility"],
    cta: "Register free →",
    href: "/auth/signup",
    className: "bg-white",
    badgeClassName: "bg-[#185fa5]/12 text-[#185fa5]",
  },
  {
    icon: "briefcase",
    title: "Procurement teams",
    description: "Source verified suppliers, post RFQs, and manage quotes in one place.",
    points: ["Post RFQs in minutes", "Compare quotes side-by-side", "Manage suppliers & contracts"],
    cta: "Request a pilot →",
    href: "/contact",
    className: "bg-white",
    badgeClassName: "bg-[#185fa5]/12 text-[#185fa5]",
  },
  {
    icon: "shield",
    title: "Verified buyers",
    description: "Access BBBEE intelligence and CSD-compliant supplier records.",
    points: ["Verified & compliant suppliers", "BBBEE & CSD insights", "Secure & reliable data"],
    cta: "Learn more →",
    href: "/trust",
    className: "bg-white",
    badgeClassName: "bg-[#185fa5]/12 text-[#185fa5]",
  },
]

const platformTiles = [
  {
    icon: "briefcase",
    title: "Opportunities",
    description: "Live RFQs and tenders",
    href: "/opportunities",
    badgeClassName: "bg-[#185fa5]/15 text-[#185fa5]",
  },
  {
    icon: "shop",
    title: "Supplier directory",
    description: "Verified SA businesses",
    href: "/suppliers",
    badgeClassName: "bg-[#185fa5]/15 text-[#185fa5]",
  },
  {
    icon: "shield",
    title: "Trust centre",
    description: "How verification works",
    href: "/trust",
    badgeClassName: "bg-[#185fa5]/15 text-[#185fa5]",
  },
  {
    icon: "pricing",
    title: "Pricing",
    description: "Plans and pilot options",
    href: "/pricing",
    badgeClassName: "bg-[#185fa5]/15 text-[#185fa5]",
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

function CheckBulletIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8 12.5 2.5 2.5L16 9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  )
}

function MakersMark() {
  return (
    <section className="bg-white px-6 py-12 text-center">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <Image
          src="/aiform-mark.png"
          alt=""
          width={29}
          height={36}
          className="h-9 w-auto"
        />
        <p
          className="mt-4 font-display text-xl italic leading-7 text-heading sm:text-2xl"
        >
          Designed and built in Pretoria by AiForm Studio
        </p>
        <Link
          href="/trust#who-builds-monate-connect"
          className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-accent transition hover:text-accent-strong"
        >
          Read the story &rarr;
        </Link>
      </div>
    </section>
  )
}

export default async function Home() {
  const [liveOpportunities, recentlyClosedOpportunities] = await Promise.all([
    fetchPublicOpportunities().catch(() => []),
    fetchRecentlyClosedOpportunities(30).catch(() => []),
  ])

  // Merge live and recently-closed opportunities for map visualization
  const opportunities = [...liveOpportunities, ...recentlyClosedOpportunities]

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .glow-card, .glow-tile { box-shadow: 0 0 0 0px rgba(24, 95, 165, 0); cursor: pointer; }
            .glow-card:hover, .glow-tile:hover {
              box-shadow: 0 0 20px 2px rgba(24, 95, 165, 0.4), 0 0 40px 4px rgba(24, 95, 165, 0.2);
            }
          `,
        }}
      />
      <AccountDeletedNotice />
      <GazetteHeader />
      <PublicHeader />
      <main className="min-h-screen bg-white text-primary">
        <IncompleteRegistrationBanner />
        <HeroSection />
        <OpportunityStatsBanner />
        <RegionalInsightsMap opportunities={opportunities} totalGovernmentOpportunities={2087} />
        <LiveOpportunitiesSection />
        <MakersMark />
        <CTASection />
        <TrustStrip />
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:py-14 bg-white">

          <section>
            <div className="flex flex-col gap-3 border-t border-strong pt-8">
              <p className="newspaper-kicker">Who is this for?</p>
              <h2 className="font-display text-3xl font-semibold text-heading">Built for procurement networks</h2>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {audienceCards.map((card) => (
                <article
                  key={card.title}
                  className={`glow-card rounded-none border border-[#e8e0cc] ${card.className} p-4 transition`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-none ${card.badgeClassName}`}>
                    <EntryIcon icon={card.icon} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-medium text-heading">{card.title}</h3>
                  <p className="mt-2 font-serif text-xs leading-6 text-secondary">{card.description}</p>
                  <ul className="mt-3 space-y-1.5 border-t border-[#e8e0cc]/80 pt-3">
                    {card.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-xs font-semibold text-secondary">
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-none ${card.badgeClassName}`}>
                          <CheckBulletIcon />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={card.href}
                    className="mt-3 inline-flex text-xs font-bold text-accent transition hover:text-accent-strong"
                  >
                    {card.cta}
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-2 mb-8">
              <p className="newspaper-kicker">EXPLORE THE PLATFORM</p>
              <h2 className="font-display text-2xl font-semibold text-heading">Start with the public pages</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {platformTiles.map((tile) => (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className="glow-tile rounded-none border border-[#e5e5e7] bg-white p-5 text-primary transition"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-none ${tile.badgeClassName} mb-3`}>
                    <EntryIcon icon={tile.icon} />
                  </div>
                  <p className="font-display text-base font-semibold text-heading">{tile.title}</p>
                  <p className="mt-2 font-serif text-xs leading-5 text-secondary">{tile.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-5 rounded-none border border-[#d4d0c4] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:max-w-xs">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[#185fa5]/15 text-[#185fa5]">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                  <path d="m4 7 8 6 8-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                </svg>
              </span>
              <div>
                <p className="font-display text-base font-semibold text-heading">Not ready yet?</p>
                <p className="mt-1 font-serif text-sm leading-6 text-secondary">
                  Get this list emailed to you weekly, no account needed.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <DigestSignupForm />
              <p className="text-xs text-muted">We respect your privacy. Unsubscribe anytime.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#e8e0cc] pt-4 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0">
              <Link
                href="/auth/signup"
                className="rounded-none bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--button-text)] transition hover:opacity-90"
              >
                Register free
              </Link>
              <Link
                href="/auth/login"
                className="rounded-none border border-strong px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-primary transition hover:border-accent hover:text-accent"
              >
                Log in
              </Link>
              <Link
                href="/contact"
                className="rounded-none border border-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-accent transition hover:bg-accent/10"
              >
                I&apos;m a buyer
              </Link>
            </div>
          </section>

        </section>
      </main>
      <PublicFooter />
    </>
  )
}

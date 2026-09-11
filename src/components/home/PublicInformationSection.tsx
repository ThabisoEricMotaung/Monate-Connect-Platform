"use client"

import Link from "next/link"

interface NavCard {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

function PlatformIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7V5h6v2M4 8h16v11H4V8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 13h16M10 13v1h4v-1" />
    </svg>
  )
}

function SupportIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 2" />
    </svg>
  )
}

function LegalIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m9 12 2 2 4-4" />
    </svg>
  )
}

interface PublicInformationSectionProps {
  className?: string
}

export default function PublicInformationSection({ className = "" }: PublicInformationSectionProps) {
  const platformCards: NavCard[] = [
    {
      icon: <PlatformIcon />,
      title: "Opportunities",
      description: "Browse live RFQs, tenders, and procurement requests from verified public sources.",
      href: "/opportunities",
    },
    {
      icon: <PlatformIcon />,
      title: "Supplier directory",
      description: "Connect with verified South African businesses across all sectors.",
      href: "/suppliers",
    },
    {
      icon: <PlatformIcon />,
      title: "How to respond",
      description: "Step-by-step guides on responding to procurement opportunities.",
      href: "/guide/how-to-respond-to-opportunities",
    },
  ]

  const supportCards: NavCard[] = [
    {
      icon: <SupportIcon />,
      title: "FAQ",
      description: "Common questions about using AiForm Procure and responding to tenders.",
      href: "/support/faq",
    },
    {
      icon: <SupportIcon />,
      title: "Contact us",
      description: "Reach out to our team for questions about procurement or the platform.",
      href: "/contact",
    },
    {
      icon: <SupportIcon />,
      title: "Blog",
      description: "Insights and updates on South African procurement trends.",
      href: "/blog",
    },
  ]

  const legalCards: NavCard[] = [
    {
      icon: <LegalIcon />,
      title: "Terms of service",
      description: "Legal agreement governing your use of AiForm Procure.",
      href: "/legal/terms",
    },
    {
      icon: <LegalIcon />,
      title: "Privacy policy",
      description: "How we collect, use, and protect your personal data.",
      href: "/legal/privacy",
    },
    {
      icon: <LegalIcon />,
      title: "Trust centre",
      description: "Information about verification, compliance, and data security.",
      href: "/trust",
    },
  ]

  const sections = [
    { title: "PLATFORM", cards: platformCards },
    { title: "SUPPORT", cards: supportCards },
    { title: "LEGAL", cards: legalCards },
  ]

  return (
    <section className={`border-t border-[#e3d8c5] bg-[#faf7f2] px-6 py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl font-bold text-[#1a3a2a] sm:text-5xl">Public information</h2>
          <p className="mt-4 text-base text-[#5a6a5a] sm:text-lg">Everything you need to know about South African procurement</p>
        </div>

        {/* Three-column layout */}
        <div className="grid gap-8 sm:gap-6 md:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-6 font-display text-sm font-bold uppercase tracking-[0.15em] text-[#c8a060]">{section.title}</h3>
              <div className="space-y-4">
                {section.cards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group flex flex-col gap-3 rounded-none border border-[#e3d8c5] bg-white p-4 transition hover:border-[#c8a060] hover:bg-[#faf7f2]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-[#c8a060] transition group-hover:text-[#8c6a2f]">{card.icon}</span>
                      <span className="font-bold text-[#1a3a2a] transition group-hover:text-[#8c6a2f]">{card.title}</span>
                    </div>
                    <p className="text-sm text-[#5a6a5a] transition group-hover:text-[#3a4a3a]">{card.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Search functionality hint */}
        <div className="mt-12 rounded-none border-2 border-[#e3d8c5] bg-white p-6 text-center sm:p-8">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#c8a060]">Quick search</p>
          <p className="mb-6 text-base text-[#5a6a5a]">Can't find what you're looking for?</p>
          <Link href="/search" className="inline-flex rounded-none border-2 border-[#c8a060] px-6 py-3 font-bold text-[#c8a060] transition hover:bg-[#c8a060]/10">
            Search our site →
          </Link>
        </div>
      </div>
    </section>
  )
}

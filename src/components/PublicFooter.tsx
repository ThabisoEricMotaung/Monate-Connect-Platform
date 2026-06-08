"use client"

import Link from "next/link"

const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "Opportunities", href: "/opportunities" },
      { label: "Supplier Marketplace", href: "/suppliers" },
      { label: "Trust Centre", href: "/trust" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Centre", href: "/help" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Data Protection", href: "/data-protection" },
    ],
  },
]

export default function PublicFooter() {
  function openAccessibility() {
    window.dispatchEvent(new Event("monate:open-accessibility"))
  }

  return (
    <footer className="border-t border-panel bg-card text-primary">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_1.4fr]">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Monate Connect
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-heading">
            Public procurement intelligence, clearly signposted
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">
            Public information for suppliers, buyers, pilot partners and procurement stakeholders.
            Legal and policy pages contain professional placeholder language and are not final legal
            advice.
          </p>
        </div>

        <nav className="grid gap-5 sm:grid-cols-3" aria-label="Public footer navigation">
          {footerSections.map((section) => (
            <div key={section.title} className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-muted">
                {section.title}
              </p>
              <div className="mt-4 grid gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-semibold text-secondary transition hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-panel px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-muted">
          &copy; 2026 Monate Connect &middot; Procurement Edition
        </p>
        <button
          type="button"
          onClick={openAccessibility}
          className="w-fit text-xs font-semibold text-muted underline-offset-4 transition hover:text-accent hover:underline"
        >
          Accessibility
        </button>
      </div>
    </footer>
  )
}

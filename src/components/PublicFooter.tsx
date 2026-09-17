"use client"

import Image from "next/image"
import Link from "next/link"
import type { CSSProperties } from "react"

const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "About", href: "/about" },
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
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Data Protection", href: "/data-protection" },
    ],
  },
]

const footerVars = {
  "--procure-green": "#123c2b",
  "--procure-green-soft": "#1f5a41",
  "--procure-gold": "#c9a13b",
  "--procure-ivory": "#f8f3e7",
  "--procure-border": "rgba(18, 60, 43, 0.14)",
} as CSSProperties

const complianceBadges = [
  "CSD Verified",
  "BBBEE Compliant",
  "SARS Compliant",
  "POPIA Aware",
]

export default function PublicFooter() {
  function openAccessibility() {
    window.dispatchEvent(new Event("monate:open-accessibility"))
  }

  return (
    <footer className="public-footer border-t border-[#123c2b]/10 bg-[#f8f3e7] text-[#123c2b]" style={footerVars}>
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:py-12">
        <div className="mb-8 pb-6 border-b border-[#123c2b]/10">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1a3a2a]">
            AIFORM PROCURE
          </p>
          <p className="mt-2 text-sm leading-6 text-[#123c2b]/70 max-w-2xl">
            Public procurement intelligence, clearly signposted. Public information for suppliers, buyers, pilot partners and procurement stakeholders.
          </p>
        </div>

        <nav className="grid gap-8 md:grid-cols-3" aria-label="Public footer navigation">
          {footerSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#123c2b] mb-3">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm text-[#123c2b]/70 hover:text-[#c8a060] transition">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl border-t border-[#123c2b]/10 px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(260px,0.8fr)_1fr] lg:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-sm font-semibold text-[#123c2b]/70">
              &copy; 2026 AiForm Procure &middot; Procurement Suite
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#123c2b]/70">
              <Image
                src="/aiform-mark.png"
                alt=""
                width={19}
                height={24}
                className="h-6 w-auto"
              />
              <span>A product of AiForm Studio</span>
            </div>
          </div>

          <div className="footer-wire-wrap">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c8a060]/40" />
            <Link href="/opportunities" className="footer-wire-pill">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.25-5.25l-2.12 2.12M8.87 15.13l-2.12 2.12m10.5 0l-2.12-2.12M8.87 8.87L6.75 6.75M9.75 12a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z" />
              </svg>
              <span>AIFORMS PROCUREMENT WIRE</span>
            </Link>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c8a060]/40" />
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <a href="https://www.linkedin.com" className="footer-social-button" aria-label="LinkedIn">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.5 8.75H3.25v11H6.5v-11zM4.88 7.25a1.88 1.88 0 100-3.76 1.88 1.88 0 000 3.76zM20.75 13.41c0-2.95-1.57-4.91-4.13-4.91a3.56 3.56 0 00-3.21 1.77V8.75h-3.12v11h3.25v-5.44c0-1.44.27-2.83 2.05-2.83 1.76 0 1.78 1.64 1.78 2.92v5.35h3.25l.13-6.34z" />
              </svg>
            </a>
            <a href="https://www.facebook.com" className="footer-social-button" aria-label="Facebook">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14.2 21v-7.3h2.45l.37-2.84H14.2V9.05c0-.82.23-1.38 1.41-1.38h1.5V5.13A20.03 20.03 0 0014.92 5c-2.16 0-3.64 1.32-3.64 3.74v2.12H8.84v2.84h2.44V21h2.92z" />
              </svg>
            </a>
            <button
              type="button"
              onClick={openAccessibility}
              className="footer-social-button footer-access-button"
              aria-label="Accessibility"
            >
              <svg className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4.5 7.5h15M12 7.5v13.5m-4.5 0L12 12l4.5 9" />
              </svg>
              <span className="hidden sm:inline">Accessibility</span>
            </button>
          </div>
        </div>

        <div className="mt-5 text-xs text-[#123c2b]/60">
          {complianceBadges.join(" • ")}
        </div>
      </div>

      <style jsx global>{`
        .footer-wire-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          min-width: 0;
        }

        .footer-wire-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          white-space: nowrap;
          border: 1px solid rgba(201, 161, 59, 0.35);
          border-radius: 0;
          background: var(--procure-green);
          padding: 0.72rem 1rem;
          color: var(--procure-gold);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          transition: background-color 220ms ease;
        }

        .footer-wire-pill:hover {
          background: rgba(18, 60, 43, 1);
        }

        .footer-social-button {
          display: inline-flex;
          min-width: 2.5rem;
          height: 2.5rem;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border: 1px solid rgba(18, 60, 43, 0.16);
          border-radius: 0;
          background: transparent;
          padding-inline: 0.75rem;
          color: var(--procure-green);
          font-size: 0.8rem;
          font-weight: 600;
          transition: color 220ms ease, background-color 220ms ease;
        }

        .footer-social-button:hover {
          color: var(--procure-gold);
        }

        .footer-access-button {
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .footer-wire-wrap {
            justify-content: flex-start;
          }

          .footer-wire-wrap > span {
            display: none;
          }
        }
      `}</style>
    </footer>
  )
}

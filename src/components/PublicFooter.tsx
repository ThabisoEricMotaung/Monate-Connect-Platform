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
    <footer className="public-footer bg-[#1a2a3a] text-white" style={footerVars}>
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 pb-4 border-b border-white/20">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white/80">
            AIFORM PROCURE
          </p>
          <p className="mt-1.5 text-xs leading-5 text-white/60 max-w-2xl">
            Public procurement intelligence, clearly signposted
          </p>
        </div>

        <nav className="grid gap-8 md:grid-cols-3" aria-label="Public footer navigation">
          {footerSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80 mb-3">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.links.map((link) => (
                  <div key={link.href}>
                    <Link href={link.href} className="text-xs text-white/60 hover:text-[#c8a060] transition block">
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl border-t border-white/10 px-6 py-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-white/50">
              &copy; 2026 AiForm Procure &middot; Procurement Suite
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
              <Image
                src="/aiform-mark.png"
                alt=""
                width={19}
                height={24}
                className="h-5 w-auto"
              />
              <span>AiForm Studio</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="https://www.linkedin.com" className="footer-social-button" aria-label="LinkedIn">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.5 8.75H3.25v11H6.5v-11zM4.88 7.25a1.88 1.88 0 100-3.76 1.88 1.88 0 000 3.76zM20.75 13.41c0-2.95-1.57-4.91-4.13-4.91a3.56 3.56 0 00-3.21 1.77V8.75h-3.12v11h3.25v-5.44c0-1.44.27-2.83 2.05-2.83 1.76 0 1.78 1.64 1.78 2.92v5.35h3.25l.13-6.34z" />
              </svg>
              <span>LinkedIn</span>
            </a>
            <a href="https://www.facebook.com" className="footer-social-button" aria-label="Facebook">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14.2 21v-7.3h2.45l.37-2.84H14.2V9.05c0-.82.23-1.38 1.41-1.38h1.5V5.13A20.03 20.03 0 0014.92 5c-2.16 0-3.64 1.32-3.64 3.74v2.12H8.84v2.84h2.44V21h2.92z" />
              </svg>
              <span>Facebook</span>
            </a>
            <a href="https://www.instagram.com" className="footer-social-button" aria-label="Instagram">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.265-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 100-8 4 4 0 000 8zm4.965-10.322a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
              </svg>
              <span>Instagram</span>
            </a>
            <a href="https://www.tiktok.com" className="footer-social-button" aria-label="TikTok">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.321 5.562a5.122 5.122 0 01-2.961 2.965v8.875a4 4 0 11-5.464-3.746v3.052a2 2 0 10.977 1.77v-7.776A5.122 5.122 0 1119.32 5.562z" />
              </svg>
              <span>TikTok</span>
            </a>
            <button
              type="button"
              onClick={openAccessibility}
              className="footer-social-button footer-access-button"
              aria-label="Accessibility"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4.5 7.5h15M12 7.5v13.5m-4.5 0L12 12l4.5 9" />
              </svg>
              <span className="text-xs">Accessibility</span>
            </button>
          </div>
        </div>

        <div className="mt-3 text-[0.7rem] text-white/40">
          {complianceBadges.join(" • ")}
        </div>
      </div>

      <style jsx global>{`
        .footer-social-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: none;
          border-radius: 0;
          background: transparent;
          color: white/60;
          font-size: 0.8rem;
          font-weight: 500;
          transition: color 220ms ease;
        }

        .footer-social-button:hover {
          color: var(--procure-gold);
        }

        .footer-access-button {
          cursor: pointer;
        }
      `}</style>
    </footer>
  )
}

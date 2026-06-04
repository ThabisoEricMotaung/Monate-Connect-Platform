"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { label: "Opportunities", href: "/opportunities" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Trust Centre", href: "/trust" },
  { label: "Pricing", href: "/pricing" },
  { label: "Help", href: "/help" },
  { label: "Contact", href: "/contact" },
]

function isActiveLink(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function PublicHeader() {
  const pathname = usePathname() || "/"

  return (
    <header className="border-b border-panel bg-card text-primary shadow-panel">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="group">
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.24em] text-accent">
              Procurement Edition
            </p>
            <p className="mt-1 font-serif text-3xl font-bold leading-none text-heading md:text-4xl">
              Monate Connect
            </p>
          </Link>

          <nav className="flex flex-wrap gap-2" aria-label="Public navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  isActiveLink(pathname, link.href)
                    ? "border-accent bg-accent text-button"
                    : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap gap-2">
            <Link href="/auth/login" className="masthead__btn-secondary">
              Login
            </Link>
            <Link href="/auth/signup" className="masthead__btn-primary">
              Register
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "RFQs",
    href: "/dashboard/rfqs",
  },
  {
    name: "Quotes",
    href: "/dashboard/quotes",
  },
  {
    name: "Supplier Profile",
    href: "/dashboard/profile",
  },
  {
    name: "Verification",
    href: "/dashboard/verification",
  },
]

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname() || ""

  return (
    <main className="flex min-h-screen bg-page text-primary">

      <aside className="w-full max-w-[280px] border-r border-panel bg-panel p-5">

        <div className="mb-4 rounded-2xl border border-panel bg-surface p-4 text-sm">
          <Link
            href="/"
            className="text-accent transition hover:text-accent-strong"
          >
            Back to Portal
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3 border-b border-panel pb-5">
          <Link href="/" className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <div className="logo-mark flex h-14 w-14 items-center justify-center rounded-md bg-accent text-button font-extrabold text-xl shadow-md">
              <span className="sr-only">Monate</span>
              M
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-secondary">
                Supplier Workspace
              </p>
              <h2 className="text-xl font-semibold text-primary">
                Monate Vendor Network
              </h2>
            </div>
          </Link>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-accent bg-surface text-primary shadow-sm"
                    : "border-transparent text-secondary hover:bg-surface hover:text-primary"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      <section className="flex-1 p-6 md:p-8">
        <Breadcrumbs />
        {children}
      </section>

    </main>
  )
}

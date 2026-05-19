"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

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
    <main className="flex min-h-screen bg-[#050c08] text-slate-100">

      <aside className="w-full max-w-[280px] border-r border-slate-700 bg-[#08120e] p-5">

        <div className="mb-6 flex items-center gap-3 border-b border-slate-700 pb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-500 font-semibold text-black">
            M
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">
              Supplier Workspace
            </p>
            <h2 className="text-xl font-semibold text-white">
              Monate Vendor Network
            </h2>
          </div>
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
                className={`block rounded-md border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "border-green-500/40 bg-[#0f1f18] text-white shadow-sm"
                    : "border-transparent text-slate-300 hover:border-slate-600 hover:bg-[#07110d]"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      <section className="flex-1 p-6 md:p-8">
        {children}
      </section>

    </main>
  )
}
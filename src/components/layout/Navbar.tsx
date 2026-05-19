"use client"

import Link from "next/link"

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-green-900/30 bg-[#07120f] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-green-500 font-semibold text-black">
            M
          </div>

          <div>
            <h1 className="text-base font-semibold tracking-[0.08em] uppercase text-slate-100">
              Monate Vendor Network
            </h1>
            <p className="text-xs text-slate-400">
              Procurement & Supplier Portal
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-5 text-sm md:flex">
          <Link className="text-slate-300 transition hover:text-white" href="/auth/signup">
            Suppliers
          </Link>
          <Link className="text-slate-300 transition hover:text-white" href="/dashboard/rfqs">
            RFQs
          </Link>
          <Link className="text-slate-300 transition hover:text-white" href="/dashboard/verification">
            Verification
          </Link>
          <Link className="text-slate-300 transition hover:text-white" href="/dashboard">
            Dashboard
          </Link>
        </div>

        <Link
          href="/auth/signup"
          className="rounded-md border border-green-500 bg-green-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-400"
        >
          Join Network
        </Link>
      </div>
    </nav>
  )
}

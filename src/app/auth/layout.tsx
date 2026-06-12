import Link from "next/link"
import React from "react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page text-primary">
      <header className="flex justify-center px-6 py-8">
        <Link href="/">
          <p className="text-[0.63rem] font-bold uppercase tracking-[0.24em] text-accent">
            Procurement Edition
          </p>
          <p className="mt-1 font-display text-3xl font-bold leading-none text-heading">
            Monate Connect
          </p>
        </Link>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}

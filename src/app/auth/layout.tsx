"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideHeader = pathname === "/auth/verify-email"

  return (
    <div className="flex min-h-screen flex-col bg-page text-primary">
      {!hideHeader && (
        <header className="flex justify-center px-6 py-8">
          <Link href="/">
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.24em] text-accent">
              Procurement Suite
            </p>
            <p className="mt-1 font-display text-3xl font-bold leading-none text-heading">
              AiForm Procure
            </p>
          </Link>
        </header>
      )}

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}

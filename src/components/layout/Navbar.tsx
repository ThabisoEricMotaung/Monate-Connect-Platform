"use client"

import Link from "next/link"
import AppearanceCore from "@/components/theme/AppearanceCore"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function Navbar() {
  const router = useRouter()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      alert("Logout failed. Please try again.")
      return
    }

    router.push("/auth/login")
  }

  return (
    <nav className="navbar sticky top-0 z-50 border-b border-panel bg-surface text-primary shadow-panel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">

        <Link href="/" className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
          <div className="logo-mark flex h-12 w-12 items-center justify-center rounded-md bg-accent text-button font-extrabold text-lg">
            <span className="sr-only">Monate</span>
            M
          </div>

          <div>
            <h1 className="text-base font-semibold tracking-[0.08em] uppercase text-primary">
              Monate Vendor Network
            </h1>
            <p className="text-xs text-secondary">
              Procurement & Supplier Portal
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm md:gap-6">
          <Link className="text-secondary transition hover:text-primary" href="/">
            Home
          </Link>
          <Link className="text-secondary transition hover:text-primary" href="/dashboard">
            Dashboard
          </Link>
          <Link className="text-secondary transition hover:text-primary" href="/dashboard/rfqs">
            RFQs
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-secondary transition hover:text-primary"
          >
            Logout
          </button>
        </div>

        <div className="flex items-center gap-3">
          <AppearanceCore />
          <Link
            href="/auth/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Supplier Login
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Register Supplier
          </Link>
        </div>
      </div>
    </nav>
  )
}

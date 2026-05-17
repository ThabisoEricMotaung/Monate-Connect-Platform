import Link from "next/link"
import { ReactNode } from "react"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen bg-[#071b11] text-white">

      <aside className="w-[320px] border-r border-white/10 bg-black/20 p-6">

        <div className="flex items-center gap-4">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500 text-4xl font-bold text-black">
            M
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight">
              Monate Vendor Network
            </h2>

            <p className="mt-1 text-gray-400">
              Supplier Portal
            </p>
          </div>

        </div>

        <div className="mt-10 space-y-4">

          <Link
            href="/dashboard"
            className="block rounded-2xl border border-white/10 bg-black/20 px-6 py-5 transition hover:border-green-500"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/rfqs"
            className="block rounded-2xl border border-white/10 bg-black/20 px-6 py-5 transition hover:border-green-500"
          >
            RFQs
          </Link>

          <Link
            href="/dashboard/profile"
            className="block rounded-2xl border border-white/10 bg-black/20 px-6 py-5 transition hover:border-green-500"
          >
            Supplier Profile
          </Link>

          <Link
            href="/dashboard/verification"
            className="block rounded-2xl border border-white/10 bg-black/20 px-6 py-5 transition hover:border-green-500"
          >
            Verification
          </Link>

        </div>

      </aside>

      <section className="flex-1 p-10">
        {children}
      </section>

    </main>
  )
}
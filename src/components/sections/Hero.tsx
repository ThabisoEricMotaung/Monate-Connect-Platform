import Link from "next/link"

export default function Hero() {
  return (
    <section className="mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center justify-center px-6 text-center">

      <div className="mb-6 rounded-full border border-accent/30 bg-surface px-4 py-2 text-sm text-accent">
        Enterprise supplier access
      </div>

      <h1 className="max-w-5xl text-5xl font-bold leading-tight md:text-7xl text-primary">
        Operational supplier access for procurement teams
      </h1>

      <p className="mt-6 max-w-3xl text-lg text-secondary">
        Secure supplier login for RFQ response, verification workflow, compliance review,
        and procurement readiness across mining and infrastructure sourcing.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">

        <Link
          href="/auth/login"
          className="rounded-2xl bg-accent px-8 py-4 font-semibold text-button transition hover:bg-accent-strong"
        >
          Supplier Login
        </Link>

        <Link
          href="/auth/signup"
          className="rounded-2xl border border-panel bg-panel px-8 py-4 font-semibold text-secondary transition hover:bg-surface"
        >
          Register Supplier
        </Link>

      </div>

    </section>
  )
}

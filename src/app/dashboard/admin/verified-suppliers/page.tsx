import Link from "next/link"

export default function AdminVerifiedSuppliersPage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Suppliers
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Verified suppliers</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          CSD-registered, BBBEE-compliant suppliers on the platform.
        </p>
      </div>

      <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">
          Browse all verified suppliers across South Africa.
        </p>
        <Link
          href="/suppliers"
          className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
        >
          Go to supplier directory -&gt;
        </Link>
      </section>
    </div>
  )
}

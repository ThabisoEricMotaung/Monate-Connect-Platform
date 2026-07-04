import Link from "next/link"

export default function BillingCancelPage() {
  return (
    <main className="min-h-screen bg-[#f0ebe0] px-6 py-16 text-[#1a3a2a]">
      <section className="mx-auto max-w-3xl rounded-md border border-[#d8cbb8] bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a060]">
          Checkout cancelled
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold">
          No subscription payment was completed
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#53665c]">
          You cancelled the PayFast checkout before payment. You can return to pricing whenever
          you are ready to start a subscription.
        </p>
        <Link
          href="/pricing"
          className="mt-8 inline-flex rounded-md bg-[#1a3a2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#10251b]"
        >
          Back to pricing
        </Link>
      </section>
    </main>
  )
}

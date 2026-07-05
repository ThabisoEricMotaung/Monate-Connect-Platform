import Link from "next/link"

export default function BillingCancelPage() {
  return (
    <main className="flex min-h-screen items-center bg-[#f0ebe0] bg-[radial-gradient(circle_at_top_left,_rgba(200,160,96,0.24),_transparent_34%),linear-gradient(135deg,_#f7f1e6_0%,_#f0ebe0_48%,_#dfe8dc_100%)] px-6 py-16 text-[#1a3a2a]">
      <section className="mx-auto w-full max-w-3xl rounded-lg border border-white/70 bg-white/70 p-8 shadow-[0_24px_80px_rgba(26,58,42,0.16)] backdrop-blur md:p-10">
        <p className="inline-flex rounded-full border border-[#c8a060]/40 bg-[#fff8ea]/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#9b7435]">
          Checkout cancelled
        </p>
        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-[#1a3a2a] md:text-5xl">
          No subscription payment was completed.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#53665c] md:text-base">
          You cancelled the PayFast checkout before payment. You can return to pricing whenever
          you are ready to start a subscription.
        </p>
        <Link
          href="/pricing"
          className="mt-8 inline-flex rounded-md bg-[#1a3a2a] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#10251b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a060]"
        >
          Back to pricing
        </Link>
      </section>
    </main>
  )
}

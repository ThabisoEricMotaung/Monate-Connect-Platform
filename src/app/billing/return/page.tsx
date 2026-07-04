import Link from "next/link"

export default function BillingReturnPage() {
  return (
    <main className="min-h-screen bg-[#f0ebe0] px-6 py-16 text-[#1a3a2a]">
      <section className="mx-auto max-w-3xl rounded-md border border-[#d8cbb8] bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#168567]">
          Payment submitted
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold">
          PayFast is confirming your subscription
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#53665c]">
          Your payment was submitted on PayFast. The subscription will become active after
          PayFast sends the server confirmation to Monate Connect.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-md bg-[#1a3a2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#10251b]"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  )
}

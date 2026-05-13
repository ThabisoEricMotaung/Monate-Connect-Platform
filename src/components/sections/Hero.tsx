export default function Hero() {
  return (
    <section className="mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center justify-center px-6 text-center">

      <div className="mb-6 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300 backdrop-blur">
        Trusted African Vendor Infrastructure
      </div>

      <h1 className="max-w-5xl text-5xl font-bold leading-tight md:text-7xl">
        Verified Vendors. Real Opportunities.
      </h1>

      <p className="mt-6 max-w-3xl text-lg text-gray-300">
        Supplier onboarding, RFQ readiness, verification, and buyer discovery
        for mining, infrastructure, and Eskom ecosystems across Africa.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">

        <button className="rounded-2xl bg-green-500 px-8 py-4 font-semibold text-black transition hover:bg-green-400">
          Become a Supplier
        </button>

        <button className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-white transition hover:bg-white/10">
          Explore Vendors
        </button>

      </div>

    </section>
  )
}
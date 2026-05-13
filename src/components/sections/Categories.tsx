const categories = [
  "Electrical",
  "Mining Services",
  "PPE",
  "Logistics",
  "Construction",
  "Industrial Cleaning",
  "Fleet Services",
  "Welding",
]

export default function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">

      <div className="mb-14 text-center">

        <h2 className="text-4xl font-bold md:text-5xl">
          Explore Supplier Categories
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-400">
          Discover verified suppliers across mining, infrastructure,
          logistics, construction, and township business ecosystems.
        </p>

      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        {categories.map((category) => (
          <div
            key={category}
            className="group cursor-pointer rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur transition hover:border-green-500/40 hover:bg-white/10"
          >

            <div className="mb-6 h-16 w-16 rounded-2xl bg-green-500/20 transition group-hover:bg-green-500/30" />

            <h3 className="text-2xl font-semibold">
              {category}
            </h3>

            <p className="mt-3 text-gray-400">
              Verified suppliers and procurement opportunities.
            </p>

          </div>
        ))}

      </div>

    </section>
  )
}
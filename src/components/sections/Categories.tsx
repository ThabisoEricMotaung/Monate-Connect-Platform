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

        <p className="mx-auto mt-4 max-w-3xl text-lg text-secondary">
          Discover verified suppliers across mining, infrastructure,
          logistics, construction, and township business ecosystems.
        </p>

      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        {categories.map((category) => (
          <div
            key={category}
            className="group cursor-pointer rounded-3xl border border-panel bg-card p-8 transition hover:border-accent hover:bg-accent-soft"
          >

            <div className="mb-6 h-16 w-16 rounded-2xl bg-accent-soft transition group-hover:bg-accent" />

            <h3 className="text-2xl font-semibold text-heading">
              {category}
            </h3>

            <p className="mt-3 text-secondary">
              Verified suppliers and procurement opportunities.
            </p>

          </div>
        ))}

      </div>

    </section>
  )
}
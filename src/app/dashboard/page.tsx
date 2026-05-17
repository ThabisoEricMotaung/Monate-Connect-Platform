export default function DashboardPage() {
  return (
    <>
      <h1 className="text-6xl font-bold">Supplier Dashboard</h1>

      <p className="mt-4 text-2xl text-gray-400">
        Manage procurement opportunities, verification, RFQs, and buyer engagement.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-xl text-gray-400">Verification Status</p>

          <h2 className="mt-4 text-5xl font-bold text-green-400">Pending</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-xl text-gray-400">Active RFQs</p>

          <h2 className="mt-4 text-5xl font-bold">12</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-xl text-gray-400">Submitted Quotes</p>

          <h2 className="mt-4 text-5xl font-bold">4</h2>
        </div>

      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">

        <h2 className="text-4xl font-bold">Procurement Opportunities</h2>

        <div className="mt-8 space-y-6">

          <div className="rounded-3xl border border-white/10 bg-black/20 p-6">

            <h3 className="text-3xl font-semibold">Electrical Maintenance RFQ</h3>

            <p className="mt-3 text-gray-400">
              Mining contractor seeking certified township electrical suppliers in Mpumalanga.
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-6">

            <h3 className="text-3xl font-semibold">PPE Supply Contract</h3>

            <p className="mt-3 text-gray-400">
              Infrastructure procurement opportunity for safety equipment vendors.
            </p>

          </div>

        </div>

      </div>
    </>
  )
}
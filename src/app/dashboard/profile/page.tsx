export default function ProfilePage() {
  return (
    <>
      <h1 className="text-5xl font-bold">Supplier Profile</h1>

      <p className="mt-4 text-gray-400">Manage your business details, certifications, and supplier visibility.</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">Company Information</h2>

          <div className="mt-4 space-y-3 text-gray-300">
            <p>Business Name: Monate Electrical Services</p>
            <p>Location: Mpumalanga</p>
            <p>Industry: Electrical & Infrastructure</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">Verification Status</h2>

          <p className="mt-4 text-3xl font-bold text-green-400">Pending Review</p>
        </div>

      </div>
    </>
  )
}
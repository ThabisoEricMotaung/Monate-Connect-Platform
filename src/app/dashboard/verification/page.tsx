export default function VerificationPage() {
  return (
    <>
      <h1 className="text-5xl font-bold">Supplier Verification</h1>

      <p className="mt-4 text-gray-400">Upload your compliance documents and track verification progress.</p>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">

        <div className="space-y-6">

          <div>
            <label className="mb-2 block text-sm text-gray-400">Company Registration</label>

            <input type="file" className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">Tax Clearance Certificate</label>

            <input type="file" className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">B-BBEE Certificate</label>

            <input type="file" className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4" />
          </div>

          <button className="rounded-2xl bg-green-500 px-8 py-4 font-semibold text-black transition hover:bg-green-400">Submit Verification</button>

        </div>

      </div>
    </>
  )
}

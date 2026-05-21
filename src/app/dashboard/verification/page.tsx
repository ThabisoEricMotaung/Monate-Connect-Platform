export default function VerificationPage() {
  return (
    <>
      <h1 className="text-5xl font-bold text-heading">Supplier Verification</h1>

      <p className="mt-4 text-secondary">Upload your compliance documents and track verification progress.</p>

      <div className="mt-10 rounded-3xl border border-panel bg-card p-8">

        <div className="space-y-6">

          <div>
            <label className="mb-2 block text-sm text-secondary">Company Registration</label>

            <input type="file" className="w-full rounded-2xl border border-panel bg-panel px-5 py-4 text-heading" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-secondary">Tax Clearance Certificate</label>

            <input type="file" className="w-full rounded-2xl border border-panel bg-panel px-5 py-4 text-heading" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-secondary">B-BBEE Certificate</label>

            <input type="file" className="w-full rounded-2xl border border-panel bg-panel px-5 py-4 text-heading" />
          </div>

          <button className="rounded-2xl bg-accent px-8 py-4 font-semibold text-button transition hover:bg-accent-strong">Submit Verification</button>

        </div>

      </div>
    </>
  )
}

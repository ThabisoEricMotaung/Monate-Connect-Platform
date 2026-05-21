export default function ProfilePage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Supplier profile
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Supplier account management
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Manage business details, verification status, category data, and procurement readiness in a trusted supplier workspace.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-md border border-panel bg-panel p-6">
          <div className="flex flex-col gap-3 border-b border-panel pb-5">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Business information
            </p>
            <h2 className="text-xl font-semibold text-heading">Monate Electrical Services</h2>
            <p className="text-sm leading-7 text-secondary">
              Registered supplier providing electrical and infrastructure services to mining and municipal procurement operations.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Business name</p>
              <p className="mt-2 text-sm font-semibold text-heading">Monate Electrical Services</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Region</p>
              <p className="mt-2 text-sm font-semibold text-heading">Mpumalanga</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Industry</p>
              <p className="mt-2 text-sm font-semibold text-heading">Electrical & Infrastructure</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Supplier tier</p>
              <p className="mt-2 text-sm font-semibold text-heading">Approved</p>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-panel bg-card p-5">
            <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Procurement readiness</p>
            <ul className="mt-3 space-y-2 text-sm text-secondary">
              <li className="flex items-center gap-2"><span className="inline-flex h-2.5 w-2.5 rounded-full bg-success"></span>Profile completed</li>
              <li className="flex items-center gap-2"><span className="inline-flex h-2.5 w-2.5 rounded-full bg-success"></span>Banking and tax verified</li>
              <li className="flex items-center gap-2"><span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400"></span>Certifications pending review</li>
            </ul>
          </div>
        </section>

        <section className="rounded-md border border-panel bg-panel p-6">
          <div className="flex flex-col gap-3 border-b border-panel pb-5">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Verification status
            </p>
            <h2 className="text-xl font-semibold text-heading">Pending review</h2>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Current state</p>
              <p className="mt-2 text-sm font-semibold text-accent">Under procurement verification</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Last updated</p>
              <p className="mt-2 text-sm font-semibold text-heading">3 days ago</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Action required</p>
              <p className="mt-2 text-sm text-secondary">Upload outstanding certification documents to complete supplier onboarding.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-panel bg-panel p-6">
          <div className="flex items-center justify-between gap-4 border-b border-panel pb-5">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Contact information</p>
              <h2 className="mt-2 text-lg font-semibold text-heading">Primary contact</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-secondary">
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Contact name</p>
              <p className="mt-2 font-semibold text-heading">Thabo Mokoena</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Email</p>
              <p className="mt-2 font-semibold text-heading">thabo@monate.co.za</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Phone</p>
              <p className="mt-2 font-semibold text-heading">+27 82 555 0123</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-panel bg-panel p-6">
          <div className="flex items-center justify-between gap-4 border-b border-panel pb-5">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Supplier category</p>
              <h2 className="mt-2 text-lg font-semibold text-heading">Vendor classification</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-secondary">
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Sector</p>
              <p className="mt-2 font-semibold text-heading">Electrical & Infrastructure</p>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Certification</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="font-semibold text-heading">SMME</p>
                <div className="verified-pill">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block mr-2" aria-hidden>
                    <path d="M20 6L9 17l-5-5" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Verified</span>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-panel bg-card p-4">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Procurement readiness</p>
              <p className="mt-2 font-semibold text-heading">Ready for tenders</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}


export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#071b11]/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 font-bold text-black">
            M
          </div>

          <div>
            <h1 className="text-lg font-semibold">
              Monate Vendor Network
            </h1>

            <p className="text-xs text-gray-400">
              Procurement & Supplier Ecosystem
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a className="text-gray-300 transition hover:text-white" href="#">
            Suppliers
          </a>

          <a className="text-gray-300 transition hover:text-white" href="#">
            RFQs
          </a>

          <a className="text-gray-300 transition hover:text-white" href="#">
            Verification
          </a>

          <a className="text-gray-300 transition hover:text-white" href="#">
            Dashboard
          </a>
        </div>

        <button className="rounded-xl bg-green-500 px-5 py-3 font-semibold text-black transition hover:bg-green-400">
          Join Network
        </button>

      </div>
    </nav>
  )
}
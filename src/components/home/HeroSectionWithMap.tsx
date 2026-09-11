"use client"

import OpportunitiesMap from "./OpportunitiesMap"

interface HeroSectionWithMapProps {
  opportunities: Array<{ province?: string | null; provinces?: string[] | null }>
}

export default function HeroSectionWithMap({ opportunities }: HeroSectionWithMapProps) {
  return (
    <div className="relative overflow-hidden bg-[#f8f4ec]">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1400 600" preserveAspectRatio="none">
          <g fill="#1a3a2a">
            <circle cx="200" cy="150" r="80" opacity="0.3" />
            <circle cx="1200" cy="400" r="120" opacity="0.2" />
            <circle cx="700" cy="50" r="100" opacity="0.25" />
          </g>
        </svg>
      </div>

      <div className="relative z-10">
        {/* Header section */}
        <section className="px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <span className="inline-flex rounded-none border border-[#c8a060] bg-[#c8a060]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c8a060]">
                SOUTH AFRICAN PUBLIC PROCUREMENT
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-5xl font-bold leading-tight text-[#1a3a2a] sm:text-6xl">
              Procurement opportunities, made clearer.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#3a4a3a] sm:text-lg">
              Find public tenders from trusted sources, build supplier credibility and connect with procurement-ready businesses across South Africa.
            </p>
          </div>
        </section>

        {/* Map section */}
        <section className="px-6 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-none border border-[#e3d8c5] bg-white p-8 shadow-sm">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-[#1a3a2a]">Live opportunities across South Africa</h2>
                <p className="mt-2 text-[#5a6a5a]">Opportunities actively seeking responses, aggregated by province</p>
              </div>

              <OpportunitiesMap opportunities={opportunities} />
            </div>
          </div>
        </section>

        {/* Trust indicators */}
        <section className="border-t border-[#e3d8c5] px-6 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c8a060]">Verified</p>
                <p className="mt-2 text-base text-[#5a6a5a]">Official sources only</p>
              </div>
              <div className="text-center border-l border-r border-[#e3d8c5] px-6">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c8a060]">Current</p>
                <p className="mt-2 text-base text-[#5a6a5a]">Updated daily</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c8a060]">Clear</p>
                <p className="mt-2 text-base text-[#5a6a5a]">Transparent & simple</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

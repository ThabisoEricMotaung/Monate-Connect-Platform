import {
  IconBrandNextjs,
  IconBrandOpenai,
  IconBrandSupabase,
  IconBrandVercel,
  IconCheck,
  IconDatabase,
  IconFileCertificate,
  IconLanguage,
  IconMail,
  IconMap2,
  IconMessage2Check,
  IconMoonStars,
  IconPhoneCheck,
  IconShieldCheck,
  IconSparkles,
  IconTestPipe,
  IconUserCheck,
} from "@tabler/icons-react"
import Link from "next/link"

const stats = [
  { value: "5", label: "Role player sessions" },
  { value: "23", label: "Database tables secured" },
  { value: "9", label: "SA provinces mapped" },
  { value: "3", label: "Languages supported" },
]

const trustCards = [
  {
    icon: IconDatabase,
    title: "Row-level security on every table",
    body: "All 23 tables are protected by Supabase RLS so users only access records their role and session allow.",
  },
  {
    icon: IconShieldCheck,
    title: "Private document storage",
    body: "Compliance files use private buckets, signed URLs, and one-hour expiry windows for controlled access.",
  },
  {
    icon: IconFileCertificate,
    title: "SA compliance built in",
    body: "B-BBEE, CSD, CIPC, SARS, and VAT are core supplier fields rather than afterthoughts.",
  },
  {
    icon: IconUserCheck,
    title: "Developed with UP Business Enterprise",
    body: "POPIA guidance from legal advisors helped shape the platform's data protection posture.",
  },
]

const complianceItems = [
  "B-BBEE verification",
  "CSD registration",
  "CIPC certificate",
  "SARS tax clearance",
  "VAT registration",
  "Bank confirmation",
  "COID good standing",
  "UIF registration",
  "POPIA aligned",
]

const platformBadges = [
  "Help Centre in EN/ZU/AF",
  "All 9 SA provinces mapped",
  "Mobile-responsive",
  "Dark mode supported",
  "Accessibility controls",
]

const phases = [
  { phase: "Phase 1", title: "Core platform & authentication", body: "OAuth, phone OTP, and role-based access." },
  { phase: "Phase 2", title: "Procurement workflows", body: "RFQs, quotes, POs, and supplier directory." },
  { phase: "Phase 3", title: "Security hardening", body: "RLS, private buckets, and POPIA alignment." },
  { phase: "Phase 4", title: "Intelligence & insights", body: "SA province heatmap, SmartScore, and trilingual Help Centre." },
  { phase: "Phase 5", title: "Pilot testing & refinement", body: "Current phase: testing with role players and tightening workflows." },
]

const infrastructure = [
  { label: "Supabase PostgreSQL", icon: IconBrandSupabase },
  { label: "Vercel", icon: IconBrandVercel },
  { label: "Next.js App Router", icon: IconBrandNextjs },
  { label: "OpenAI Thuso AI", icon: IconBrandOpenai },
  { label: "Africa's Talking OTP", icon: IconPhoneCheck },
  { label: "Resend email", icon: IconMail },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8f4ec] text-[#1a3a2a]">
      <section className="bg-[#1a3a2a] px-6 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex rounded-full border border-[#c8a060]/40 bg-[#c8a060]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c8a060]">
            Built for South African Procurement
          </span>
          <h1 className="mt-6 max-w-4xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Why procurement professionals trust AiForm Procure
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-[#dbe8df] sm:text-lg">
            AiForm Procure is being tested with real procurement role players and built on enterprise-ready infrastructure for secure supplier onboarding, compliance evidence, and buyer workflows.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-md border border-[#e3d8c5] bg-white p-6 shadow-sm">
            <p className="font-display text-4xl font-semibold text-[#1a3a2a]">{stat.value}</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#6b7b71]">{stat.label}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {trustCards.map((card) => {
            const Icon = card.icon
            return (
              <article key={card.title} className="rounded-md border border-[#e3d8c5] bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#5DCAA5]/15 text-[#168567]">
                    <Icon className="h-6 w-6" stroke={1.8} aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-[#1a3a2a]">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[#53665c]">{card.body}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-md border border-[#e3d8c5] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a060]">Compliance coverage</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-[#1a3a2a]">Supplier readiness, checked from the start</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {complianceItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md bg-[#f0ebe0] px-4 py-3 text-sm font-semibold text-[#1a3a2a]">
                <IconCheck className="h-5 w-5 shrink-0 text-[#5DCAA5]" stroke={2.2} aria-hidden />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap gap-3">
          {platformBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-[#1a3a2a]/15 bg-white px-4 py-2 text-sm font-bold text-[#1a3a2a] shadow-sm">
              {badge}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a060]">Build timeline</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-[#1a3a2a]">From secure foundation to pilot refinement</h2>
        <div className="mt-7 grid gap-4">
          {phases.map((phase) => (
            <article key={phase.phase} className="rounded-md border border-[#e3d8c5] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span className="w-fit rounded-full bg-[#1a3a2a] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#c8a060]">{phase.phase}</span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#1a3a2a]">{phase.title}</h3>
                  <p className="mt-1 text-sm leading-7 text-[#53665c]">{phase.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <blockquote className="rounded-md border border-[#c8a060]/35 bg-white p-7 shadow-sm sm:p-10">
          <IconSparkles className="h-8 w-8 text-[#c8a060]" aria-hidden />
          <p className="mt-5 font-display text-2xl leading-10 text-[#1a3a2a]">
            "AiForm Procure was built because I could see that South African suppliers — especially small and emerging businesses — were losing procurement opportunities not because of poor capability, but because of compliance gaps and lack of visibility. This platform is designed to close that gap."
          </p>
          <footer className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-[#53665c]">
            Thabiso Motaung, Founder, AiForm Studio
          </footer>
        </blockquote>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a060]">Infrastructure</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-[#1a3a2a]">Built on trusted modern infrastructure</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {infrastructure.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-md border border-[#e3d8c5] bg-white p-4 shadow-sm">
                <Icon className="h-5 w-5 text-[#5DCAA5]" stroke={1.8} aria-hidden />
                <span className="text-sm font-bold text-[#1a3a2a]">{item.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-md bg-[#1a3a2a] p-7 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div>
            <p className="font-display text-3xl font-semibold">Ready to see it for yourself?</p>
            <p className="mt-2 text-sm font-semibold text-[#dbe8df]">Free during the pilot period until October 2026</p>
          </div>
          <Link
            href="/auth/register"
            className="inline-flex w-fit rounded-md bg-[#c8a060] px-5 py-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-[#d8b36f]"
          >
            Register for the pilot
          </Link>
        </div>
      </section>
    </main>
  )
}

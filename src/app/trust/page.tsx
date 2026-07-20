"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import ComplianceReminderForm from "./ComplianceReminderForm"

const stats = [
  { value: "100%", label: "CSD-verified suppliers", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
  { value: "3-layer", label: "Verification process", icon: "M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" },
  { value: "48hr", label: "Average verification time", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: "0", label: "Ghost suppliers on platform", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
]

const verificationSteps = [
  {
    title: "CSD registration check",
    badge: "Manual review",
    badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-700",
    description: "Suppliers submit their CSD number and registration certificate. Our compliance team verifies the submission against the Central Supplier Database and confirms active status before approving.",
    detail: "Suppliers with invalid or inactive CSD registrations are not approved onto the platform.",
    complete: true,
  },
  {
    title: "BBBEE certificate verification",
    badge: "Manual review",
    badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-700",
    description: "Suppliers upload their BBBEE verification certificate. Our compliance team validates the certificate against the issuing verification agency, checks the expiry date, and confirms the stated level matches the certificate.",
    detail: "Expired certificates trigger automatic downgrade. Suppliers are notified 30 days before expiry.",
    complete: true,
  },
  {
    title: "SARS tax clearance validation",
    badge: "Manual review",
    badgeColor: "border-sky-500/30 bg-sky-500/10 text-sky-700",
    description: "Suppliers upload their SARS tax clearance certificate. Our compliance team reviews and validates the document before approving tax clearance status.",
    detail: "Suppliers are responsible for uploading updated certificates when their tax clearance expires.",
    complete: true,
  },
  {
    title: "Banking details verification",
    badge: "Required before award",
    badgeColor: "border-warning/30 bg-warning/10 text-warning",
    description: "Before any purchase order can be issued, the supplier banking details are verified against their company registration. This prevents payment fraud and ensures funds reach the correct entity.",
    detail: "Bank account holder name must match the registered company name on CIPC records.",
    complete: false,
  },
]

const smartScoreRows = [
  { icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", name: "Business profile complete", description: "Registered name, industry, provinces, description, and contact information all filled in.", points: "+20 pts", badgeClassName: "bg-[#8497A6]/20 text-[#315A78]" },
  { icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125", name: "CSD number verified", description: "Active CSD registration confirmed against National Treasury database.", points: "+20 pts", badgeClassName: "bg-[#5DCAA5]/15 text-[#168567]" },
  { icon: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z", name: "BBBEE certificate verified", description: "Level 1-4: 20 points. Level 5-8: 10 points. Certificate must be current and validated.", points: "+10-20 pts", badgeClassName: "bg-[#c8a060]/15 text-[#8c6a2f]" },
  { icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", name: "Tax clearance verified", description: "Current SARS tax clearance certificate validated and on file.", points: "+15 pts", badgeClassName: "bg-[#8497A6]/20 text-[#315A78]" },
  { icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z", name: "Banking details verified", description: "Business bank account confirmed, holder name matches CIPC registration.", points: "+10 pts", badgeClassName: "bg-[#5DCAA5]/15 text-[#168567]" },
  { icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", name: "Director identity verified (Optional)", description: "Director or authorised representative identity confirmed via document verification.", points: "+10 pts", badgeClassName: "bg-[#c8a060]/15 text-[#8c6a2f]" },
  { icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5", name: "Company profile document (Optional)", description: "Formal company profile document uploaded and reviewed.", points: "+5 pts", badgeClassName: "bg-[#8497A6]/20 text-[#315A78]" },
]

const scoreBands = [
  { score: "90 – 100", label: "Excellent", color: "text-success", bar: "bg-success", items: ["All verifications complete", "Priority placement on RFQs", "Visible to all buyers"] },
  { score: "75 – 89", label: "Good Standing", color: "text-sky-700", bar: "bg-sky-500", items: ["Core verifications done", "Eligible for all RFQs", "1-2 optional items missing"] },
  { score: "50 – 74", label: "Building Trust", color: "text-warning", bar: "bg-warning", items: ["CSD verified", "Tax or banking pending", "Lower visibility on RFQs"] },
  { score: "0 – 49", label: "Low Trust", color: "text-rose-700", bar: "bg-rose-500", items: ["Incomplete documents", "Not visible to buyers", "Verification required"] },
]

const buyerTrustCards = [
  { title: "Buyer organisation verification", body: "Buyer organisations complete a registration process and are reviewed by our team before being permitted to post RFQs." },
  { title: "Procurement officer validation", body: "Buyer accounts are reviewed during onboarding. We recommend using a work email address that matches your organisation." },
  { title: "No ghost RFQs", body: "RFQs that receive no quotes are flagged for review. Buyers are expected to close or award RFQs within a reasonable timeframe." },
  { title: "Dispute resolution", body: "If a supplier believes an RFQ was handled unfairly, they can raise a dispute through the platform. Disputes are reviewed within 5 business days." },
]

const opportunitySourcingSteps = [
  {
    title: "Sourced from public government data",
    body: "Some opportunities on AiForm Procure are submitted directly by registered buyer organisations. Others are pulled automatically from National Treasury's eTenders open-data feed — the Office of the Chief Procurement Officer's public Open Contracting Data Standard (OCDS) release of government tender adverts — so suppliers can discover them in one place instead of checking multiple portals.",
  },
  {
    title: "Reviewed by a human curator before publishing",
    body: "Every automatically-sourced listing lands as a draft first, not a live opportunity. Our team reviews each one — checking classification, location, scope, and closing date look right — before it's published. Listings that look incomplete or inconsistent are held back and corrected or discarded rather than published as-is.",
  },
  {
    title: "Traceable back to the original listing",
    body: "Where the government data includes a link to the original tender document, that link is carried through to the opportunity on AiForm Procure, so you can always verify the details against the primary source yourself.",
  },
]

const faqs = [
  { question: "How long does verification take?", answer: "CSD, BBBEE, tax clearance, and banking verification are all reviewed manually by our compliance team. Most suppliers are fully verified within 48 hours of submitting complete documentation." },
  { question: "What if my CSD registration is pending?", answer: "You can create a profile and complete all other verification steps while your CSD registration is being processed. You won't be able to respond to RFQs until CSD verification passes, but your profile will be ready to activate the moment it does." },
  { question: "Does a higher SmartScore guarantee I'll win contracts?", answer: "No. SmartScore measures trust and completeness, not commercial competitiveness. A high SmartScore gives you better visibility and placement on matched RFQs — it doesn't influence award decisions, which are made by buyers based on price, quality, and fit." },
  { question: "Is my company information visible to everyone?", answer: "Your business name, industry, province, BBBEE level, and SmartScore are visible on your public supplier profile. Your CSD number is masked. Your email, phone, and banking details are never shown publicly." },
  { question: "What happens if a buyer doesn't award an RFQ?", answer: "Buyers are required to close every RFQ with either an award or a formal cancellation with a stated reason. Suppliers who submitted quotes are notified of the outcome." },
]

export default function TrustCentrePage() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">

        {/* Hero */}
        <section className="bg-[#1a3a2a] px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4"><BackLink className="text-[#f8f4ec]/70 hover:text-[#f8f4ec]" /></div>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-[#5DCAA5]/30 bg-[#5DCAA5]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#5DCAA5]">
                  Built for South African procurement
                </span>
                <h1 className="mt-6 font-display text-5xl font-semibold leading-tight text-[#f8f4ec] md:text-6xl">
                  How trust works on AiForm Procure
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-[#f8f4ec]/70">
                  Every supplier on the platform is verified against the Central Supplier Database,
                  BBBEE records, and SARS tax status before they can respond to a single RFQ.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-md border border-[#f8f4ec]/10 bg-[#f8f4ec]/5 p-4">
                      <svg className="h-5 w-5 text-[#5DCAA5]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                      </svg>
                      <p className="mt-2 text-xl font-bold tabular-nums text-[#f8f4ec]">{stat.value}</p>
                      <p className="mt-1 text-xs text-[#f8f4ec]/60">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shield graphic */}
              <div className="flex items-center justify-center">
                <div className="relative flex h-64 w-64 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-[#5DCAA5]/20 bg-[#5DCAA5]/5" />
                  <div className="absolute inset-8 rounded-full border border-[#5DCAA5]/30 bg-[#5DCAA5]/8" />
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-[#5DCAA5]">
                    <svg className="h-16 w-16 text-[#1a3a2a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  {[
                    { label: "CSD", sub: "Verified", pos: "-top-4 left-1/2 -translate-x-1/2" },
                    { label: "BBBEE", sub: "Verified", pos: "top-1/2 -right-8 -translate-y-1/2" },
                    { label: "SARS", sub: "Tax Cleared", pos: "-bottom-4 left-1/2 -translate-x-1/2" },
                    { label: "Banking", sub: "Verified", pos: "top-1/2 -left-8 -translate-y-1/2" },
                  ].map((badge) => (
                    <div key={badge.label} className={`absolute ${badge.pos} rounded-md border border-[#f8f4ec]/15 bg-[#1a3a2a] px-3 py-1.5 text-center shadow-lg`}>
                      <p className="text-xs font-bold text-[#c8a060]">{badge.label}</p>
                      <p className="text-[0.6rem] text-[#f8f4ec]/60">{badge.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verification steps */}
        <section className="border-b border-panel px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-accent">For buyers</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-heading">How we verify every supplier</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">
              Before a supplier can respond to any RFQ on AiForm Procure, they go through a mandatory verification process. No shortcuts.
            </p>
            <div className="mt-8 space-y-4">
              {verificationSteps.map((step, index) => (
                <article key={step.title} className="rounded-md border border-panel bg-card p-5 shadow-panel">
                  <div className="flex gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${step.complete ? "border-success bg-success text-button" : "border-panel bg-panel text-heading"}`}>
                      {step.complete ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-heading">Step {index + 1} — {step.title}</h3>
                        <span className={`rounded-md border px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${step.badgeColor}`}>
                          {step.badge}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-secondary">{step.description}</p>
                      <p className="mt-2 text-xs leading-6 text-muted">{step.detail}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance reminder lead magnet */}
        <section className="border-b border-panel px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-accent">Never miss a deadline</p>
                <h2 className="mt-3 font-display text-3xl font-semibold text-heading">
                  Get reminded before your B-BBEE certificate expires
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">
                  You don&apos;t need an account for this. Tell us the expiry date on your certificate and
                  we&apos;ll email you 30 days before it lapses — the same window we already notify our
                  registered suppliers with.
                </p>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-muted">
                  This is just a reminder based on the date you give us — we don&apos;t verify or check
                  certificates through this form.
                </p>
              </div>
              <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <ComplianceReminderForm />
              </div>
            </div>
          </div>
        </section>

        {/* SmartScore */}
        <section className="border-b border-panel bg-card px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-accent">Trust scoring</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-heading">What is SmartScore?</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">
              SmartScore is a 0–100 trust rating that tells buyers at a glance how complete, verified, and active a supplier is on the platform. Calculated from objective compliance data — not reviews or self-reported information.
            </p>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="overflow-hidden rounded-md border border-panel bg-page shadow-panel">
                {smartScoreRows.map((row) => (
                  <div key={row.name} className="grid gap-4 border-b border-panel p-4 last:border-b-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${row.badgeClassName}`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d={row.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-heading">{row.name}</p>
                      <p className="mt-0.5 text-xs leading-5 text-secondary">{row.description}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-accent">{row.points}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {scoreBands.map((band) => (
                  <div key={band.score} className="rounded-md border border-panel bg-page p-4 shadow-panel">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold tabular-nums ${band.color}`}>{band.score}</p>
                      <p className={`text-xs font-bold ${band.color}`}>{band.label}</p>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-panel">
                      <div className={`h-full rounded-full ${band.bar}`} style={{ width: band.score.startsWith("90") ? "95%" : band.score.startsWith("75") ? "80%" : band.score.startsWith("50") ? "60%" : "30%" }} />
                    </div>
                    <div className="mt-3 space-y-1">
                      {band.items.map((item) => (
                        <p key={item} className="flex items-center gap-1.5 text-xs text-secondary">
                          <svg className={`h-3.5 w-3.5 shrink-0 ${band.color}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Buyer trust */}
        <section className="border-b border-panel px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-accent">For suppliers</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-heading">How we protect suppliers</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">
              Suppliers have the right to know that the buyers posting RFQs on the platform are legitimate.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {buyerTrustCards.map((card) => (
                <article key={card.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <h3 className="font-display text-lg font-semibold text-heading">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-secondary">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Opportunity sourcing */}
        <section className="border-b border-panel px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-accent">Opportunity sourcing</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-heading">Where opportunities come from</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">
              Not every RFQ on the platform is submitted directly by a buyer, and we want that to be visible rather than assumed. Here&apos;s exactly how the rest get here.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {opportunitySourcingSteps.map((step, index) => (
                <article key={step.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xs font-bold text-accent">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-heading">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-secondary">{step.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 max-w-2xl text-xs leading-6 text-muted">
              Externally-sourced opportunities carry a visible &ldquo;source&rdquo; badge on their listing so it&apos;s always clear where they came from.
            </p>
          </div>
        </section>

        {/* FAQs */}
        <section className="border-b border-panel bg-card px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-accent">Common questions</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-heading">Frequently asked</h2>
            <div className="mt-8 overflow-hidden rounded-md border border-panel bg-page shadow-panel">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index
                return (
                  <article key={faq.question} className="border-b border-panel last:border-b-0">
                    <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface"
                      aria-expanded={isOpen}>
                      <span className="text-sm font-bold text-heading">{faq.question}</span>
                      <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-secondary transition ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24">
                        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5">
                        <p className="text-sm leading-7 text-secondary">{faq.answer}</p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-md border border-panel bg-[#1a3a2a] p-10 text-center shadow-panel">
              <h2 className="font-display text-3xl font-semibold text-[#f8f4ec]">
                Ready to join South Africa&apos;s verified procurement network?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#f8f4ec]/70">
                Register as a supplier or request a buyer account. Verification takes less than 48 hours.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/auth/signup" className="rounded-md bg-[#c8a060] px-6 py-3 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#b8902e]">
                  Register as supplier
                </Link>
                <Link href="/contact" className="rounded-md border border-[#f8f4ec]/20 px-6 py-3 text-sm font-semibold text-[#f8f4ec] transition hover:border-[#f8f4ec]/40">
                  Get in touch
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Studio section */}
        <section id="who-builds-monate-connect" className="border-t border-panel bg-card px-6 py-16 scroll-mt-24">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <Image src="/aiform-mark.png" alt="" width={26} height={32} className="h-8 w-auto" />
              <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.28em] text-accent">The studio behind the platform</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-heading">Who builds AiForm Procure</h2>
              <div className="mt-5 space-y-5 text-sm leading-7 text-secondary">
                <p>AiForm Procure is designed and built by AiForm Studio, a South African product studio based in Pretoria.</p>
                <p>The AiForm mark has an unusual origin. While working at the University of Pretoria, our founder noticed a small tan moth resting on a wall — Hypena proboscidalis, commonly called the A-Moth, named for the distinctive &apos;A&apos; shape its wings form at rest. In that moment the studio&apos;s identity was already there: the A of AiForm, the natural geometry of the moth, and the faceted form of something engineered. Noticed, not invented.</p>
                <p>That philosophy carries into everything we build. AiForm Procure wasn&apos;t invented from nothing either — it was noticed: thousands of capable South African suppliers and serious buyers, separated by paperwork, spreadsheets, and missed connections. We build the structure that lets them find each other.</p>
              </div>
              <p className="mt-6 text-sm italic text-muted">Shaping intelligence. Designing impact.</p>
            </div>
            <Image src="/aiform-story.png" alt="AiForm Studio story mark" width={720} height={540} className="w-full rounded-md border border-panel object-cover shadow-panel" />
          </div>
        </section>

      </main>
      <PublicFooter />
    </>
  )
}


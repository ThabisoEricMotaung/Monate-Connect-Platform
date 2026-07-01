"use client"

import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { FormEvent, useState } from "react"
import {
  SA_PHONE_ERROR,
  formatSAPhoneInput,
  phoneBlurValue,
  phoneFocusValue,
  validateSAPhone,
} from "@/lib/formValidation"
import { supabase } from "@/lib/supabase"

const REQUEST_TYPES = [
  "Joining as a supplier",
  "Sourcing as a buyer",
  "Municipality / Government",
  "Enterprise / Mining",
  "Partnership or investment",
  "General Enquiry",
]

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
]

const INTENT_CHIPS = [
  { label: "Joining as a supplier", icon: "supplier" },
  { label: "Sourcing as a buyer", icon: "buyer" },
  { label: "Onboarding a supplier network", icon: "network" },
  { label: "Partnership or integration", icon: "partner" },
  { label: "Just exploring for now", icon: "explore" },
]

const initialForm = {
  name: "",
  organisation: "",
  email: "",
  phone: "",
  request_type: "",
  province: "",
  message: "",
}

type ContactForm = typeof initialForm

const STORAGE_KEY = "contact_form_draft"

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function IntentIcon({ type }: { type: string }) {
  if (type === "supplier") return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  )
  if (type === "buyer") return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
  if (type === "network") return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
  if (type === "partner") return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  )
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(() => {
    if (typeof window === "undefined") return initialForm
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      return saved ? { ...initialForm, ...JSON.parse(saved) } : initialForm
    } catch { return initialForm }
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [selectedIntent, setSelectedIntent] = useState("")

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => {
      const updated = { ...current, [field]: value }
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  function updatePhone(value: string) { updateField("phone", formatSAPhoneInput(value)) }
  function handlePhoneFocus() { updateField("phone", phoneFocusValue(form.phone)) }
  function handlePhoneBlur() { updateField("phone", phoneBlurValue(form.phone)) }

  function selectIntent(label: string) {
    setSelectedIntent(label)
    updateField("request_type", label)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess("")
    setError("")
    if (!form.name.trim()) { setError("Please enter your name."); return }
    if (!isValidEmail(form.email)) { setError("Please enter a valid email address."); return }
    if (!form.request_type) { setError("Please select a request type."); return }
    if (form.phone.trim() && !validateSAPhone(form.phone)) { setError(SA_PHONE_ERROR); return }
    if (!supabase) { setError("Supabase is not configured."); return }
    setSubmitting(true)
    const payload = {
      name: form.name.trim(),
      organisation: form.organisation.trim() || null,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      request_type: form.request_type,
      province: form.province || null,
      message: form.message.trim() || null,
      status: "New",
    }
    const { error: insertError } = await supabase.from("pilot_requests").insert([payload])
    setSubmitting(false)
    if (insertError) { setError(insertError.message); return }
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name, email: payload.email, request_type: payload.request_type, organisation: payload.organisation }),
      })
    } catch {}
    setForm(initialForm)
    setSelectedIntent("")
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
    setSuccess("Thank you. AiForm Procure will contact you soon.")
  }

  const trustItems = [
    { icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", label: "Tailored to your needs", body: "We will connect you with the right team and solution." },
    { icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", label: "Quick response", body: "Expect a response within 1 business day." },
    { icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z", label: "Your information is safe", body: "We respect your privacy and keep your data secure." },
  ]

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-[#f8f4ec] text-primary">
        <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-2 lg:py-20">

          {/* Left panel */}
          <div className="flex flex-col justify-between gap-10">
            <div>
              <div className="mb-6">
                <BackLink />
              </div>
              <p className="newspaper-kicker">Contact · Pilot Requests</p>
              <h1 className="newspaper-headline mt-5">Start an AiForm Procure conversation</h1>
              <p className="newspaper-body mt-6 max-w-lg">
                Request a pilot demo, partnership discussion, supplier onboarding session, or buyer/procurement team setup.
              </p>

              <div className="mt-10 space-y-4">
                {trustItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-panel bg-card text-heading">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-bold text-heading">{item.label}</p>
                      <p className="mt-0.5 text-sm text-secondary">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-4 py-2.5 text-sm font-semibold text-[#f8f4ec] transition hover:bg-[#123020]">Register as Supplier</Link>
                <Link href="/opportunities" className="inline-flex items-center gap-2 rounded-md border border-[#1a3a2a] px-4 py-2.5 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#1a3a2a]/5">View Opportunities</Link>
                <Link href="/suppliers" className="inline-flex items-center gap-2 rounded-md border border-[#1a3a2a] px-4 py-2.5 text-sm font-semibold text-[#1a3a2a] transition hover:bg-[#1a3a2a]/5">Browse Suppliers</Link>
              </div>
            </div>

            <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Need immediate assistance?</p>
              <p className="mt-2 text-sm text-secondary">Our support team is ready to help.</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-heading">
                <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                aiformstudio@gmail.com
              </div>
            </div>
          </div>

          {/* Right panel — form */}
          <form onSubmit={handleSubmit} className="rounded-md border border-panel bg-white p-6 shadow-xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Pilot Request Form</p>
            <h2 className="mt-3 text-2xl font-semibold text-heading">Tell us what you want to explore</h2>

            {success && (
              <div className="mt-5 rounded-md border border-success/30 bg-success-soft px-4 py-3">
                <p className="text-sm font-semibold text-success">{success}</p>
              </div>
            )}
            {error && (
              <div className="mt-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-heading">Name <span className="text-rose-500">*</span></span>
                <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Your full name" className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-heading">Organisation</span>
                <input value={form.organisation} onChange={(e) => updateField("organisation", e.target.value)} placeholder="Organisation name" className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-heading">Email <span className="text-rose-500">*</span></span>
                <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-heading">Phone</span>
                <input type="tel" value={form.phone} onChange={(e) => updatePhone(e.target.value)} onFocus={handlePhoneFocus} onBlur={handlePhoneBlur} placeholder="+27 82 123 4567" className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-heading">Request type <span className="text-rose-500">*</span></span>
                <select value={form.request_type} onChange={(e) => updateField("request_type", e.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30">
                  <option value="">Select request type</option>
                  {REQUEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-heading">Province</span>
                <select value={form.province} onChange={(e) => updateField("province", e.target.value)} className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30">
                  <option value="">Select province</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <span className="mb-2 block text-sm font-semibold text-heading">I am interested in…</span>
              <div className="flex flex-wrap gap-2">
                {INTENT_CHIPS.map((chip) => {
                  const active = selectedIntent === chip.label
                  return (
                    <button key={chip.label} type="button" onClick={() => selectIntent(chip.label)}
                      className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-semibold transition ${active ? "border-accent bg-accent text-button" : "border-panel bg-panel text-secondary hover:border-accent hover:text-heading"}`}
                      aria-pressed={active}
                    >
                      <IntentIcon type={chip.icon} />
                      {chip.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-heading">Tell us more <span className="text-muted font-normal">(optional)</span></span>
              <textarea rows={4} value={form.message} onChange={(e) => updateField("message", e.target.value)}
                placeholder="Tell us about your supplier network, buyer team, pilot objective, or partnership interest."
                className="w-full resize-none rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30" />
            </label>

            <button type="submit" disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1a3a2a] px-5 py-3 text-sm font-semibold text-[#c8a060] transition hover:bg-[#123020] disabled:cursor-not-allowed disabled:opacity-60">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              {submitting ? "Submitting..." : "Submit pilot request"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Your information is secure and will only be used to respond to your request.
            </p>
          </form>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

"use client"

import Link from "next/link"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { FormEvent, useState } from "react"
import { supabase } from "@/lib/supabase"

const REQUEST_TYPES = [
  "Supplier Onboarding",
  "Buyer / Procurement Pilot",
  "Municipality Pilot",
  "Mining / Enterprise Pilot",
  "Investor / Partnership",
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
  {
    label: "Joining as a supplier",
    message:
      "Hi, I represent a supplier business and I'd like to join the AiForm Procure network to access verified RFQs and procurement opportunities.",
  },
  {
    label: "Sourcing as a buyer",
    message:
      "Hi, I'm a procurement manager and I'd like to explore AiForm Procure for posting RFQs and sourcing verified suppliers for our organisation.",
  },
  {
    label: "Onboarding a supplier network",
    message:
      "Hi, I manage a supplier network or association and I'm interested in onboarding our members onto AiForm Procure as part of a bulk partnership.",
  },
  {
    label: "Partnership or integration",
    message:
      "Hi, I'm interested in a partnership or integration opportunity with AiForm Procure and would like to discuss how we can collaborate.",
  },
  {
    label: "Just exploring for now",
    message:
      "Hi, I'd like to learn more about AiForm Procure and how it works before deciding whether it's right for my organisation.",
  },
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

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function ContactPage() {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [selectedIntent, setSelectedIntent] = useState("")

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function selectIntent(label: string, message: string) {
    setSelectedIntent(label)
    updateField("message", message)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess("")
    setError("")

    if (!form.name.trim()) {
      setError("Please enter your name.")
      return
    }
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (!form.request_type) {
      setError("Please select a request type.")
      return
    }
    if (!form.message.trim()) {
      setError("Please add a short message.")
      return
    }
    if (!supabase) {
      setError("Supabase is not configured.")
      return
    }

    setSubmitting(true)
    const payload = {
      name: form.name.trim(),
      organisation: form.organisation.trim() || null,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      request_type: form.request_type,
      province: form.province || null,
      message: form.message.trim(),
      status: "New",
    }

    const { error: insertError } = await supabase
      .from("pilot_requests")
      .insert([payload])

    setSubmitting(false)

    if (insertError) {
      console.error("Pilot request insert error:", insertError)
      setError(insertError.message)
      return
    }

    setForm(initialForm)
    setSelectedIntent("")
    setSuccess("Thank you. AiForm Procure will contact you soon.")
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <p className="newspaper-kicker">Contact &middot; Pilot Requests</p>
          <h1 className="newspaper-headline mt-5">Start an AiForm Procure conversation</h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            Request a pilot demo, partnership discussion, supplier onboarding session,
            or buyer/procurement team setup.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth/signup" className="masthead__btn-primary">
              Register Supplier
            </Link>
            <Link href="/opportunities" className="masthead__btn-secondary">
              View Opportunities
            </Link>
            <Link href="/suppliers" className="masthead__btn-secondary">
              Browse Suppliers
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Pilot Request Form
          </p>
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

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Name</span>
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Organisation</span>
              <input value={form.organisation} onChange={(event) => updateField("organisation", event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Email</span>
              <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Phone</span>
              <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Request Type</span>
              <select value={form.request_type} onChange={(event) => updateField("request_type", event.target.value)} className={inputClass}>
                <option value="">Select request type</option>
                {REQUEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Province</span>
              <select value={form.province} onChange={(event) => updateField("province", event.target.value)} className={inputClass}>
                <option value="">Select province</option>
                {PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4">
            <span className="mb-2 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">I&apos;m interested in&hellip;</span>
            <div className="flex flex-wrap gap-2">
              {INTENT_CHIPS.map((chip) => {
                const active = selectedIntent === chip.label

                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => selectIntent(chip.label, chip.message)}
                    className={`rounded-[20px] border px-3.5 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-[#1a3a2a] bg-[#c8960c] text-[#1a3a2a] shadow-sm"
                        : "border-panel bg-panel text-secondary hover:border-accent hover:text-heading"
                    }`}
                    aria-pressed={active}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Message</span>
            <textarea
              rows={6}
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Tell us about your supplier network, buyer team, pilot objective, or partnership interest."
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-accent bg-accent px-5 py-3 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Pilot Request"}
          </button>
        </form>
      </section>
      </main>
      <PublicFooter />
    </>
  )
}

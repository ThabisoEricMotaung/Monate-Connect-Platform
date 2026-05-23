"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
]

const CATEGORIES = [
  "Construction & Infrastructure",
  "Electrical & Engineering",
  "IT & Technology",
  "Mining & Resources",
  "Municipal Services",
  "Professional Services",
  "Supply & Logistics",
  "Water & Sanitation",
  "Other",
]

const STATUS_OPTIONS = ["Open", "Closing Soon", "Closed", "Awarded"]

type FormState = {
  title: string
  description: string
  province: string
  category: string
  budget: string
  deadline: string
  status: string
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  province: "",
  category: "",
  budget: "",
  deadline: "",
  status: "Open",
}

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelClass =
  "mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"

function cleanAmountInput(value: string): string {
  return value.replace(/[^\d]/g, "")
}

export default function NewRFQPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const value = e.target.name === "budget"
      ? cleanAmountInput(e.target.value)
      : e.target.value

    setForm((prev) => ({ ...prev, [e.target.name]: value }))
    setSuccess(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!form.title.trim()) {
      setError("Title is required.")
      return
    }

    if (!supabase) {
      setError("Supabase is not configured. Check environment variables.")
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase.from("rfqs").insert([
      {
        title: form.title.trim(),
        description: form.description.trim(),
        province: form.province,
        category: form.category,
        budget: cleanAmountInput(form.budget),
        deadline: form.deadline || null,
        status: form.status,
      },
    ])

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSuccess(true)
    setForm(EMPTY_FORM)
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Create new RFQ
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Define procurement requirements, set operational parameters, and
          publish a request for quotation for registered suppliers to respond to.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-success">
              RFQ created successfully
            </p>
            <p className="mt-0.5 text-xs text-success/80">
              The procurement request is now live and visible to registered suppliers.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-rose-200">Submission failed</p>
            <p className="mt-0.5 text-xs text-rose-200/70">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Main details card */}
        <section className="rounded-md border border-panel bg-panel p-6">
          <div className="border-b border-panel pb-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Procurement details
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading">
              Request information
            </h2>
          </div>

          <div className="mt-6 space-y-5">
            {/* Title — full width */}
            <div>
              <label htmlFor="title" className={labelClass}>
                RFQ Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. Supply of Electrical Equipment — Limpopo Region"
                value={form.title}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            {/* Description — full width */}
            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Describe the procurement scope, operational requirements, and supplier expectations..."
                value={form.description}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Classification card */}
        <section className="mt-5 rounded-md border border-panel bg-panel p-6">
          <div className="border-b border-panel pb-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Classification
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading">
              Regional & category parameters
            </h2>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {/* Province */}
            <div>
              <label htmlFor="province" className={labelClass}>
                Province
              </label>
              <select
                id="province"
                name="province"
                value={form.province}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select province</option>
                {SA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className={labelClass}>
                Category
              </label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Financial & scheduling card */}
        <section className="mt-5 rounded-md border border-panel bg-panel p-6">
          <div className="border-b border-panel pb-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Financial & scheduling
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading">
              Budget and deadline
            </h2>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {/* Budget */}
            <div>
              <label htmlFor="budget" className={labelClass}>
                Budget (ZAR)
              </label>
              <div className="flex overflow-hidden rounded-md border border-panel bg-panel transition focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
                <span className="flex items-center border-r border-panel bg-muted px-3 text-sm font-semibold text-secondary">
                  R
                </span>
                <input
                  id="budget"
                  name="budget"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="500000"
                  value={form.budget}
                  onChange={handleChange}
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-heading outline-none placeholder:text-muted"
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Enter numbers only. Currency is applied automatically.
              </p>
            </div>

            {/* Deadline */}
            <div>
              <label htmlFor="deadline" className={labelClass}>
                Submission deadline
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Status card */}
        <section className="mt-5 rounded-md border border-panel bg-panel p-6">
          <div className="border-b border-panel pb-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Procurement status
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading">
              Publication state
            </h2>
          </div>

          <div className="mt-6 max-w-sm">
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">
              Select the current procurement publication state for supplier visibility and tracking.
            </p>
          </div>
        </section>

        {/* Submit action */}
        <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-panel bg-card px-5 py-4">
          <p className="text-xs text-muted">
            All fields marked as required must be completed before the RFQ can be submitted.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            {loading ? "Creating RFQ…" : "Create RFQ"}
          </button>
        </div>
      </form>
    </div>
  )
}

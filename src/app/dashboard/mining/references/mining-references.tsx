"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { MiningProjectReference, MiningProjectReferenceStatus } from "@/types/mining"

type FormState = {
  mine_name: string
  project_description: string
  role_performed: string
  start_date: string
  end_date: string
  contact_name: string
  contact_phone: string
  contact_email: string
}

const initialForm: FormState = {
  mine_name: "",
  project_description: "",
  role_performed: "",
  start_date: "",
  end_date: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
}

const statusStyles: Record<MiningProjectReferenceStatus, string> = {
  pending: "border-[#c08a2e]/30 bg-[#fff8e8] text-[#8a641f]",
  verified: "border-[#3d7a54]/30 bg-[#f0f7f3] text-[#2f6544]",
  rejected: "border-[#b3583f]/30 bg-[#fff7f5] text-[#9a4633]",
}

function formatDate(value: string | null) {
  if (!value) return "Ongoing"
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

export default function MiningReferences() {
  const [form, setForm] = useState(initialForm)
  const [references, setReferences] = useState<MiningProjectReference[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  const loadReferences = useCallback(async () => {
    if (!supabase) {
      setMessage({ tone: "error", text: "Supabase is not configured." })
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from("mining_project_references")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) setMessage({ tone: "error", text: error.message })
    else setReferences((data ?? []) as MiningProjectReference[])
    setLoading(false)
  }, [])

  useEffect(() => { void loadReferences() }, [loadReferences])

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    if (form.end_date && form.end_date < form.start_date) {
      setMessage({ tone: "error", text: "End date cannot be earlier than the start date." })
      return
    }

    setSubmitting(true)
    setMessage(null)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setMessage({ tone: "error", text: "Please sign in again before submitting a reference." })
      setSubmitting(false)
      return
    }

    const optional = (value: string) => value.trim() || null
    const { error } = await supabase.from("mining_project_references").insert({
      supplier_id: user.id,
      mine_name: form.mine_name.trim(),
      project_description: form.project_description.trim(),
      role_performed: optional(form.role_performed),
      start_date: form.start_date,
      end_date: form.end_date || null,
      contact_name: optional(form.contact_name),
      contact_phone: optional(form.contact_phone),
      contact_email: optional(form.contact_email),
      status: "pending",
    })

    setSubmitting(false)
    if (error) {
      setMessage({ tone: "error", text: error.message })
      return
    }
    setForm(initialForm)
    setMessage({ tone: "success", text: "Project reference submitted for verification." })
    await loadReferences()
  }

  const inputClass = "min-h-11 w-full rounded-md border border-[#d4d4d4] bg-white px-3 py-2.5 text-base text-[#22281f] outline-none transition focus:border-[#c8a060] focus:ring-2 focus:ring-[#c8a060]/25"
  const labelClass = "mb-1.5 block text-sm font-semibold text-[#1a3a2a]"

  return (
    <section className="mx-auto max-w-5xl text-[#22281f]">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a9834a]">Mining passport</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#1a3a2a]">Project references</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#555555]">Submit completed or ongoing mining work for review. Verified references strengthen your opportunity qualification results.</p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-[#ebebeb] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="font-display text-xl font-bold text-[#1a3a2a]">Add a reference</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label><span className={labelClass}>Mine name <span className="text-[#b3583f]">*</span></span><input required value={form.mine_name} onChange={(event) => update("mine_name", event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>Role performed <span className="font-normal text-[#6b7568]">(optional)</span></span><input value={form.role_performed} onChange={(event) => update("role_performed", event.target.value)} className={inputClass} /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Project description <span className="text-[#b3583f]">*</span></span><textarea required rows={4} value={form.project_description} onChange={(event) => update("project_description", event.target.value)} className={`${inputClass} resize-y`} /></label>
          <label><span className={labelClass}>Start date <span className="text-[#b3583f]">*</span></span><input type="date" required value={form.start_date} onChange={(event) => update("start_date", event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>End date <span className="font-normal text-[#6b7568]">(leave blank if ongoing)</span></span><input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(event) => update("end_date", event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>Contact name <span className="font-normal text-[#6b7568]">(optional)</span></span><input value={form.contact_name} onChange={(event) => update("contact_name", event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>Contact phone <span className="font-normal text-[#6b7568]">(optional)</span></span><input type="tel" value={form.contact_phone} onChange={(event) => update("contact_phone", event.target.value)} className={inputClass} /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Contact email <span className="font-normal text-[#6b7568]">(optional)</span></span><input type="email" value={form.contact_email} onChange={(event) => update("contact_email", event.target.value)} className={inputClass} /></label>
        </div>
        {message && <p role="status" className={`mt-5 rounded-md border px-4 py-3 text-sm ${message.tone === "success" ? "border-[#3d7a54]/30 bg-[#f0f7f3] text-[#2f6544]" : "border-[#b3583f]/30 bg-[#fff7f5] text-[#9a4633]"}`}>{message.text}</p>}
        <button type="submit" disabled={submitting} className="mt-6 min-h-11 cursor-pointer rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#244f39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a060] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Submitting…" : "Submit reference"}</button>
      </form>

      <div className="mt-8 rounded-xl border border-[#ebebeb] bg-white shadow-sm">
        <div className="border-b border-[#ebebeb] px-5 py-4 sm:px-7"><h2 className="font-display text-xl font-bold text-[#1a3a2a]">Your references</h2><p className="mt-1 text-sm text-[#6b7568]">Track references awaiting review and those already decided.</p></div>
        {loading ? <p className="p-7 text-sm text-[#6b7568]">Loading references…</p> : references.length === 0 ? <p className="p-7 text-sm text-[#6b7568]">No project references submitted yet.</p> : (
          <div className="divide-y divide-[#ebebeb]">
            {references.map((reference) => <article key={reference.id} className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-[#1a3a2a]">{reference.mine_name}</h3><p className="mt-1 text-sm text-[#555555]">{reference.project_description}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusStyles[reference.status]}`}>{reference.status}</span></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">Period</dt><dd className="mt-1 text-[#555555]">{formatDate(reference.start_date)} – {formatDate(reference.end_date)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">Role</dt><dd className="mt-1 text-[#555555]">{reference.role_performed || "Not supplied"}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">Submitted</dt><dd className="mt-1 text-[#555555]">{new Date(reference.created_at).toLocaleDateString("en-ZA")}</dd></div></dl></article>)}
          </div>
        )}
      </div>
    </section>
  )
}

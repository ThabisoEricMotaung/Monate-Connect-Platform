"use client"

import { FormEvent, useState } from "react"

type FormState = {
  mine_group: string
  operation_name: string
  commodity: string
  province: string
  district_municipality: string
  local_municipality: string
  host_communities: string
  procurement_system: string
  procurement_portal_url: string
}

const initialState: FormState = {
  mine_group: "",
  operation_name: "",
  commodity: "",
  province: "",
  district_municipality: "",
  local_municipality: "",
  host_communities: "",
  procurement_system: "",
  procurement_portal_url: "",
}

export default function MineOperationsAdminPage() {
  const [form, setForm] = useState(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    const response = await fetch("/api/admin/mining/mine-operations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        host_communities: form.host_communities.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: string; mine_operation?: { operation_name?: string } } | null
    setSubmitting(false)

    if (!response.ok) {
      setMessage({ tone: "error", text: payload?.error ?? "Could not create the mine operation." })
      return
    }
    setMessage({ tone: "success", text: `${payload?.mine_operation?.operation_name ?? "Mine operation"} was created.` })
    setForm(initialState)
  }

  const fields: { key: keyof FormState; label: string; required?: boolean; placeholder?: string; type?: string }[] = [
    { key: "mine_group", label: "Mine group", required: true, placeholder: "Sibanye-Stillwater" },
    { key: "operation_name", label: "Operation name", required: true, placeholder: "Kloof Operation" },
    { key: "commodity", label: "Commodity", placeholder: "Gold" },
    { key: "province", label: "Province", required: true, placeholder: "Gauteng" },
    { key: "district_municipality", label: "District municipality" },
    { key: "local_municipality", label: "Local municipality" },
    { key: "host_communities", label: "Host communities", placeholder: "Community one, Community two" },
    { key: "procurement_system", label: "Procurement system", placeholder: "Coupa, SAP Ariba, SCNet or proprietary" },
    { key: "procurement_portal_url", label: "Procurement portal URL", type: "url", placeholder: "https://…" },
  ]

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a9834a]">Mining reference data</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#1a3a2a]">Mine operations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#555555]">Add the mine sites used for opportunity and host-community matching.</p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-[#ebebeb] bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className={field.key === "host_communities" || field.key === "procurement_portal_url" ? "sm:col-span-2" : ""}>
              <span className="mb-1.5 block text-sm font-semibold text-[#1a3a2a]">{field.label}{field.required && <span className="text-[#b3583f]"> *</span>}</span>
              <input
                type={field.type ?? "text"}
                required={field.required}
                value={form[field.key]}
                placeholder={field.placeholder}
                onChange={(event) => update(field.key, event.target.value)}
                className="min-h-11 w-full rounded-md border border-[#d4d4d4] bg-white px-3 py-2.5 text-base text-[#22281f] outline-none transition focus:border-[#c8a060] focus:ring-2 focus:ring-[#c8a060]/25"
              />
              {field.key === "host_communities" && <span className="mt-1 block text-xs text-[#6b7568]">Separate multiple communities with commas.</span>}
            </label>
          ))}
        </div>

        {message && (
          <p role="status" className={`mt-5 rounded-md border px-4 py-3 text-sm ${message.tone === "success" ? "border-[#3d7a54]/30 bg-[#f0f7f3] text-[#2f6544]" : "border-[#b3583f]/30 bg-[#fff7f5] text-[#9a4633]"}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 min-h-11 cursor-pointer rounded-md border border-[#1a3a2a] bg-[#1a3a2a] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#244f39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a060] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create mine operation"}
        </button>
      </form>
    </section>
  )
}

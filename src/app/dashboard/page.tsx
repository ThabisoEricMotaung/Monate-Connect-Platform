import { redirect } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default async function DashboardPage() {

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!existingProfile) {

    await supabase
      .from("profiles")
      .insert([
        {
          id: user.id,
          business_name:
            user.user_metadata.business_name || "Supplier",
          email: user.email,
        },
      ])
  }

  return (
    <div>

      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">
          Supplier dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Welcome back, {user.user_metadata.business_name || "Supplier"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Review verification progress, active procurement requests, and submitted quote status from a stable supplier portal.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-700 bg-[#08120e] p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
            Verification status
          </p>
          <p className="mt-4 text-3xl font-semibold text-green-300">Pending</p>
          <p className="mt-2 text-sm text-slate-400">
            Your compliance documents are under review by the procurement team.
          </p>
        </section>

        <section className="rounded-lg border border-slate-700 bg-[#08120e] p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
            Active RFQs
          </p>
          <p className="mt-4 text-3xl font-semibold text-white">12</p>
          <p className="mt-2 text-sm text-slate-400">
            Active requests for quotes currently available for supplier response.
          </p>
        </section>

        <section className="rounded-lg border border-slate-700 bg-[#08120e] p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
            Submitted quotes
          </p>
          <p className="mt-4 text-3xl font-semibold text-white">4</p>
          <p className="mt-2 text-sm text-slate-400">
            Quotes you have sent to prospective buyers and procurement teams.
          </p>
        </section>

      </div>

    </div>
  )
}
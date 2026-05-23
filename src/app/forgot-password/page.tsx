"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setError("Please enter your email address.")
      return
    }

    if (!supabase) {
      setError("Supabase is not configured. Check environment variables.")
      return
    }

    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: "http://localhost:3000/reset-password",
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setEmail(normalizedEmail)
    setSuccess(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10 text-primary sm:px-6">
      <section className="w-full max-w-[520px] border border-strong bg-panel shadow-panel">
        <div className="border-b border-strong bg-muted px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.24em] text-accent">
                MonateConnect
              </p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight text-heading">
                Password Recovery
              </h1>
            </div>
            <div className="hidden border border-panel bg-surface px-3 py-2 text-right sm:block">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted">
                Portal
              </p>
              <p className="text-xs font-bold text-secondary">Supplier Access</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-7 sm:px-8">
          <div className="mb-6 border border-panel bg-card px-4 py-3">
            <p className="text-sm leading-6 text-secondary">
              Enter the email address linked to your enterprise account. We will
              send a secure password reset link to that inbox.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold uppercase tracking-[0.08em] text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.co.za"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                  setSuccess(false)
                }}
                required
                className="mt-2 w-full border border-strong bg-surface px-4 py-3 text-base text-heading outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.14)]"
              />
            </div>

            {error && (
              <div className="border border-rose-500/40 bg-rose-500/10 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">
                  Request failed
                </p>
                <p className="mt-1 text-sm leading-5 text-rose-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="border border-success bg-success-soft px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-success">
                  Reset link sent
                </p>
                <p className="mt-1 text-sm leading-5 text-secondary">
                  Check {email} for password reset instructions. If it does not
                  arrive shortly, check junk mail or request another link.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border border-accent bg-accent px-5 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 border-t border-panel pt-5 text-center">
            <Link
              href="/auth/login"
              className="text-sm font-bold text-accent transition hover:text-accent-strong"
            >
              Return to supplier login
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

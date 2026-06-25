"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

function RockArtBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute bottom-[-60px] right-[-60px] h-72 w-72 rounded-full border-[60px] border-[#1a3a2a]/5" />
      <div className="absolute top-[-40px] right-[80px] h-40 w-40 rounded-full border-[35px] border-[#1a3a2a]/4" />
      <div className="absolute bottom-[40px] left-[-40px] h-32 w-32 rounded-full border-[25px] border-[#c8a060]/5" />
      <svg viewBox="0 0 800 300" className="absolute bottom-0 h-[55%] w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
        <ellipse cx="100" cy="200" rx="30" ry="18" fill="#3a2a1a"/>
        <ellipse cx="160" cy="190" rx="35" ry="20" fill="#3a2a1a"/>
        <ellipse cx="230" cy="195" rx="28" ry="16" fill="#3a2a1a"/>
        <line x1="100" y1="218" x2="95" y2="250" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="107" y1="218" x2="112" y2="248" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="160" y1="210" x2="155" y2="245" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="167" y1="210" x2="172" y2="244" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="230" y1="211" x2="225" y2="242" stroke="#3a2a1a" strokeWidth="4"/>
        <line x1="237" y1="211" x2="242" y2="242" stroke="#3a2a1a" strokeWidth="4"/>
        <circle cx="320" cy="170" r="10" fill="#3a2a1a"/>
        <line x1="320" y1="180" x2="320" y2="220" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="320" y1="195" x2="300" y2="210" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="320" y1="195" x2="340" y2="208" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="320" y1="220" x2="308" y2="245" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="320" y1="220" x2="332" y2="245" stroke="#3a2a1a" strokeWidth="3"/>
        <circle cx="380" cy="175" r="9" fill="#3a2a1a"/>
        <line x1="380" y1="184" x2="380" y2="222" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="380" y1="198" x2="362" y2="212" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="380" y1="198" x2="398" y2="210" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="380" y1="222" x2="370" y2="248" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="380" y1="222" x2="390" y2="248" stroke="#3a2a1a" strokeWidth="3"/>
        <circle cx="430" cy="168" r="10" fill="#3a2a1a"/>
        <line x1="430" y1="178" x2="430" y2="218" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="430" y1="193" x2="412" y2="205" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="430" y1="193" x2="448" y2="205" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="430" y1="218" x2="420" y2="244" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="430" y1="218" x2="440" y2="244" stroke="#3a2a1a" strokeWidth="3"/>
        <ellipse cx="500" cy="195" rx="32" ry="17" fill="#3a2a1a"/>
        <ellipse cx="575" cy="188" rx="36" ry="19" fill="#3a2a1a"/>
        <ellipse cx="650" cy="200" rx="28" ry="15" fill="#3a2a1a"/>
        <ellipse cx="720" cy="192" rx="30" ry="17" fill="#3a2a1a"/>
        <line x1="490" y1="212" x2="485" y2="240" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="510" y1="212" x2="515" y2="240" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="562" y1="207" x2="557" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="582" y1="207" x2="587" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="640" y1="215" x2="635" y2="242" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="658" y1="215" x2="663" y2="242" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="710" y1="209" x2="705" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
        <line x1="728" y1="209" x2="733" y2="238" stroke="#3a2a1a" strokeWidth="3"/>
      </svg>
    </div>
  )
}

function PasswordTrustPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-center bg-white px-10 py-12 relative overflow-hidden">
      <div className="absolute bottom-[-40px] right-[-40px] w-64 h-64 rounded-full border-[50px] border-[#1a3a2a]/5" />
      <div className="absolute top-[-30px] right-[60px] w-40 h-40 rounded-full border-[30px] border-[#1a3a2a]/4" />
      <span className="inline-block w-fit mb-5 text-[10px] font-semibold tracking-[0.12em] uppercase text-[#c8a060] bg-[#c8a060]/10 border border-[#c8a060]/30 rounded-full px-3 py-1">
        Secure account recovery
      </span>
      <h2 className="font-display text-3xl font-semibold text-[#1a3a2a] leading-snug mb-3">
        Recover access with<br/>
        <em className="text-[#c8a060] not-italic">trusted safeguards.</em>
      </h2>
      <p className="text-sm text-[#555555] leading-relaxed mb-8 max-w-sm">
        Reset emails are sent through Supabase Auth so only the owner of the email inbox can start the password recovery flow.
      </p>
      <div className="space-y-3 mb-8">
        {[
          "Secure reset links are sent only to the registered account email",
          "Reset links expire automatically to reduce account takeover risk",
          "Users return to the verified login flow after updating credentials",
          "Supplier and buyer data remains protected during recovery",
        ].map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5] mt-1.5 shrink-0" />
            <p className="text-sm text-[#555555] leading-relaxed">{feature}</p>
          </div>
        ))}
      </div>
      <div className="border-l-2 border-[#c8a060]/40 pl-4 mt-auto">
        <p className="text-xs text-[#888888] italic leading-relaxed mb-2">
          Recovery should be calm, clear, and secure, especially when procurement access is on the line.
        </p>
        <p className="text-[10px] text-[#c8a060] font-semibold">AiForm Procure Security</p>
      </div>
    </div>
  )
}

function SplitAuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f8f4ec] text-primary">
      <div className="relative z-10 px-8 py-6">
        <Link href="/" className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-medium text-[#1a3a2a] hover:text-[#c8a060] transition-colors">
          ← Back to home
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#888]">Procurement Suite</p>
          <p className="font-display text-xl font-semibold text-[#1a3a2a]">AiForm Procure</p>
        </div>
      </div>
      <RockArtBackground />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col justify-center bg-white px-8 py-12">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
        <PasswordTrustPanel />
      </div>
    </div>
  )
}

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
    <SplitAuthShell>
      <section className="w-full rounded-2xl border border-[#ebebeb] bg-white p-8">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">AiForm Procure</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-primary">Password Recovery</h1>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Enter the email address linked to your enterprise account. We will send a secure password reset link to that inbox.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary">
              Email address
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
              className="mt-2 w-full rounded-2xl border border-panel bg-surface px-5 py-4 text-primary outline-none transition focus:border-accent"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
              <p className="text-sm font-semibold text-rose-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-success bg-success-soft px-5 py-4">
              <p className="text-sm font-semibold text-success">Reset link sent</p>
              <p className="mt-1 text-sm leading-5 text-secondary">
                Check {email} for password reset instructions. If it does not arrive shortly, check junk mail or request another link.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent py-4 font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 border-t border-panel pt-5 text-center">
          <Link href="/auth/login" className="text-sm font-semibold text-accent transition hover:text-accent-strong">
            Return to supplier login
          </Link>
        </div>
      </section>
    </SplitAuthShell>
  )
}

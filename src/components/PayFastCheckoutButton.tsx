"use client"

import { IconChevronRight, IconLoader2 } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { type PayFastTier } from "@/lib/payfast-plans"
import { supabase } from "@/lib/supabase"

type PayFastCheckoutButtonProps = {
  tier: PayFastTier
  children: React.ReactNode
  className: string
}

export default function PayFastCheckoutButton({
  tier,
  children,
  className,
}: PayFastCheckoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function startCheckout() {
    setLoading(true)
    setError("")

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.")
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/auth/register")
        return
      }

      const response = await fetch("/api/payfast/create-subscription", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not start PayFast checkout.")
      }

      const form = document.createElement("form")
      form.method = "POST"
      form.action = data.url
      form.style.display = "none"

      Object.entries(data.fields as Record<string, string>).forEach(([name, value]) => {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = name
        input.value = value
        form.appendChild(input)
      })

      document.body.appendChild(form)
      form.submit()
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.")
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={className}
      >
        {children}
        {loading ? (
          <IconLoader2 className="h-4 w-4 animate-spin" stroke={2.4} aria-hidden />
        ) : (
          <IconChevronRight className="h-4 w-4" stroke={2.4} aria-hidden />
        )}
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  )
}

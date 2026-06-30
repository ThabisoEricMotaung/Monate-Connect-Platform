"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function BackLink({ fallback = "/", className }: { fallback?: string; className?: string }) {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(window.history.length > 1)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${className ?? "text-[#555] hover:text-[#1a3a2a]"}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7-7 7 7 7" />
      </svg>
      Back
    </button>
  )
}

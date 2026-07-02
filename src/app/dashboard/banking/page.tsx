"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BankingRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard/profile?tab=banking")
  }, [router])
  return null
}

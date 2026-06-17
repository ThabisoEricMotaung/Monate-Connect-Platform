"use client"

import { useEffect, useState } from "react"

export default function AccountDeletedNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setVisible(params.get("accountDeleted") === "1")
  }, [])

  if (!visible) return null

  return (
    <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-center">
      <p className="text-sm font-semibold text-emerald-800">
        Your account has been scheduled for deletion.
      </p>
    </div>
  )
}

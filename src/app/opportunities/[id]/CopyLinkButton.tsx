"use client"

import { useState } from "react"

// Tiny client island inside an otherwise server-rendered page — just enough
// to touch the clipboard API. Keeping the rest of the page a server
// component is what makes it crawlable/shareable in the first place.
export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can be unavailable (older browsers, insecure context).
      // Nothing sensitive here, so just fail quietly rather than error.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel hover:text-heading"
    >
      {copied ? "Link copied" : "Copy link to share"}
    </button>
  )
}

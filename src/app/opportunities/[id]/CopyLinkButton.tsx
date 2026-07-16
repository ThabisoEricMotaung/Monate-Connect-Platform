"use client"

import { useState } from "react"

// Tiny client island inside an otherwise server-rendered detail page (and
// reused on the client-rendered feed page) — just enough to touch the
// clipboard API and build share-intent URLs. One-tap WhatsApp/LinkedIn links
// remove the copy-then-switch-app-then-paste friction that a bare "copy
// link" button leaves, which matters here since the whole point of this
// page existing is to get forwarded.
export default function CopyLinkButton({ url, title }: { url: string; title?: string }) {
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

  const shareText = title ? `${title} — ${url}` : url
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on WhatsApp"
        aria-label="Share on WhatsApp"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-panel bg-surface text-[#25D366] transition hover:border-[#25D366]/40 hover:bg-[#25D366]/10"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.2-.1-.4-.1-.6.1-.2.2-.6.9-.8 1-.2.2-.3.2-.6.1-.9-.4-1.8-1-2.6-1.9-.7-.7-1.2-1.5-1.5-2.1-.1-.2 0-.4.1-.5.2-.2.5-.5.6-.7.1-.2.1-.4 0-.6-.1-.2-.6-1.5-.8-2-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1 0 1.3.9 2.5 1.1 2.7.1.2 1.7 2.7 4.3 3.8 2.1.9 2.6.7 3 .6.5-.1 1.6-.6 1.8-1.2.2-.6.2-1.1.2-1.2-.1-.2-.2-.2-.4-.3Z" />
          <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5.1-1.3c1.4.8 3.1 1.2 4.9 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3C4.1 15 3.6 13.5 3.6 12c0-4.6 3.8-8.4 8.4-8.4s8.4 3.8 8.4 8.4-3.8 8.4-8.4 8.4Z" />
        </svg>
      </a>
      <a
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on LinkedIn"
        aria-label="Share on LinkedIn"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-panel bg-surface text-[#0A66C2] transition hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 7.02a1.96 1.96 0 1 0 0-3.92 1.96 1.96 0 0 0 0 3.92ZM20.44 20h-3.37v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20H9.68V8.5h3.24v1.57h.05c.45-.86 1.56-1.77 3.2-1.77 3.42 0 4.05 2.25 4.05 5.17V20Z" />
        </svg>
      </a>
      <button
        onClick={handleCopy}
        title="Copy link"
        aria-label="Copy link"
        className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-panel hover:text-heading"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  )
}

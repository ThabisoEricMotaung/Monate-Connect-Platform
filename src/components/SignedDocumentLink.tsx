"use client"

import { useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

const PRIVATE_DOCUMENT_BUCKETS = ["supplier-documents", "rfq-documents"] as const
type PrivateDocumentBucket = (typeof PRIVATE_DOCUMENT_BUCKETS)[number]
const SIGNED_URL_EXPIRES_IN: Record<PrivateDocumentBucket, number> = {
  "supplier-documents": 600,
  "rfq-documents": 60 * 60,
}

function isPrivateBucket(bucket: string | null | undefined): bucket is PrivateDocumentBucket {
  return PRIVATE_DOCUMENT_BUCKETS.includes(bucket as PrivateDocumentBucket)
}

function extractStorageObject(
  value: string,
  fallbackBucket?: PrivateDocumentBucket,
): { bucket: PrivateDocumentBucket; path: string } | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (!/^https?:\/\//i.test(trimmed)) {
    return fallbackBucket ? { bucket: fallbackBucket, path: trimmed.replace(/^\/+/, "") } : null
  }

  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/)
    if (!match) {
      if (!fallbackBucket) return null

      const marker = `/${fallbackBucket}/`
      const markerIndex = url.pathname.indexOf(marker)
      if (markerIndex === -1) return null

      return {
        bucket: fallbackBucket,
        path: decodeURIComponent(url.pathname.slice(markerIndex + marker.length)),
      }
    }

    const bucket = decodeURIComponent(match[1])
    if (!isPrivateBucket(bucket)) return null

    return {
      bucket,
      path: decodeURIComponent(match[2]),
    }
  } catch {
    return null
  }
}

export default function SignedDocumentLink({
  value,
  bucket,
  children,
  className,
}: {
  value: string | null | undefined
  bucket?: PrivateDocumentBucket
  children: ReactNode
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function openDocument() {
    const rawValue = value?.trim()
    if (!rawValue) return

    setError("")
    const object = extractStorageObject(rawValue, bucket)

    if (!object) {
      window.open(rawValue, "_blank", "noopener,noreferrer")
      return
    }

    if (!supabase) {
      setError("Storage is not configured.")
      return
    }

    setLoading(true)
    const { data, error: signedUrlError } = await supabase.storage
      .from(object.bucket)
      .createSignedUrl(object.path, SIGNED_URL_EXPIRES_IN[object.bucket])
    setLoading(false)

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message || "Could not create a secure document link.")
      return
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={openDocument}
        disabled={!value || loading}
        className={className}
      >
        {loading ? "Preparing secure link..." : children}
      </button>
      {error && <span className="text-xs font-semibold text-rose-700">{error}</span>}
    </span>
  )
}

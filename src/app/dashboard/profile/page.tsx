"use client"

import Link from "next/link"
import Image from "next/image"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop"
import { ProfileImage, initialsFromName } from "@/components/ProfileImage"
import SignedDocumentLink from "@/components/SignedDocumentLink"
import { logEvent } from "@/hooks/useSessionTracking"
import { logActivity } from "@/lib/activity"
import {
  calculateSmartScore,
  getSmartScoreBreakdown,
  type SupplierSmartScoreProfile,
} from "@/lib/smartScore"
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning"
import { supabase } from "@/lib/supabase"
import {
  NATIONAL_PROVINCE_VALUE,
  SA_PHONE_ERROR,
  displayProvinceList,
  displayProvinceValue,
  formatSAPhoneInput,
  isNationalSelection,
  phoneBlurValue,
  phoneFocusValue,
  validateCsdNumber,
  validateSAPhone,
  validateTaxNumber,
  validateVatNumber,
} from "@/lib/formValidation"

// --- Types ---

type Tab = "profile" | "verification" | "documents" | "banking"

type Profile = {
  id: string
  full_name: string | null
  preferred_name: string | null
  avatar_url: string | null
  company_logo_url: string | null
  business_name: string | null
  province: string | null
  provinces?: string[] | null
  industry: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  company_registration: string | null
  tax_reference: string | null
  vat_number: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
  tax_status: string | null
  cidb_grade: string | null
  verification_notes: string | null
  smart_score?: number | string | null
  csd_verified?: boolean | null
  bbbee_verified?: boolean | null
  tax_verified?: boolean | null
  banking_verified?: boolean | null
  bank_verified?: boolean | null
  director_verified?: boolean | null
  tax_clearance_url?: string | null
  csd_document_url: string | null
  bbbee_document_url: string | null
  tax_document_url: string | null
  company_registration_url: string | null
  cidb_document_url: string | null
  capability_statement_url: string | null
  tax_expiry_date: string | null
  bbbee_expiry_date: string | null
  csd_expiry_date: string | null
  cidb_expiry_date: string | null
  updated_at: string | null
}

type BankRecord = {
  id: number | null
  bank_name: string
  account_holder: string
  account_number: string
  branch_code: string
  account_type: string
  verification_status: string | null
  verification_notes: string | null
}

type DocumentField =
  | "csd_document_url"
  | "bbbee_document_url"
  | "tax_document_url"
  | "company_registration_url"
  | "cidb_document_url"
  | "capability_statement_url"

type DocUrls = Record<DocumentField, string>
type SaveResult = { ok: boolean; error?: string }

// --- Constants ---

const SA_BANKS = [
  "ABSA",
  "First National Bank (FNB)",
  "Standard Bank",
  "Nedbank",
  "Capitec Bank",
  "African Bank",
  "Investec",
  "Discovery Bank",
  "Bidvest Bank",
  "TymeBank",
  "Bank Zero",
  "Other",
]

const ACCOUNT_TYPES = [
  "Current / Cheque Account",
  "Savings Account",
  "Transmission Account",
]

const BBBEE_LEVELS = ["Level 1","Level 2","Level 3","Level 4","Level 5","Level 6","Level 7","Level 8","Non-compliant"]
const TAX_STATUSES = ["Compliant", "Pending", "Non-compliant"]

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
]

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "verification", label: "Verification" },
  { key: "documents", label: "Documents" },
  { key: "banking", label: "Banking details" },
]

const PUBLIC_STORAGE_BASE =
  "https://enoyrbdflwihxzitpour.supabase.co/storage/v1/object/public"
const PERSONAL_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]
const COMPANY_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
const PERSONAL_PHOTO_MAX_BYTES = 2 * 1024 * 1024
const COMPANY_LOGO_MAX_BYTES = 5 * 1024 * 1024
const COVER_GRADIENTS = [
  ["#1a3a2a", "#2d5a3d"],
  ["#c8a060", "#a67c3a"],
  ["#2d4a6b", "#1a2f45"],
  ["#6b3a2d", "#4a2419"],
  ["#1a4a4a", "#0d2d2d"],
  ["#4a3a6b", "#2d2145"],
] as const

// --- Style helpers ---

const inputCls =
  "w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelCls =
  "mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary"

// --- Helpers ---

function profileDisplayName(profile: Profile | null): string {
  const preferredName = profile?.preferred_name?.trim()
  if (preferredName) return preferredName

  const fullName = profile?.full_name?.trim()
  if (fullName) return fullName.split(/\s+/)[0] || "Your"

  return "Your"
}

function profileHeading(profile: Profile | null): string {
  const name = profileDisplayName(profile)
  return name === "Your" ? "Your business profile" : `${name}'s business profile`
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "unknown"
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return "today"
  if (diff === 1) return "1 day ago"
  return `${diff} days ago`
}

function isVerified(status: string | null | undefined) {
  return (status ?? "").toLowerCase().includes("verified")
}

function docLabel(field: DocumentField): string {
  const map: Record<DocumentField, string> = {
    csd_document_url: "CSD Document",
    bbbee_document_url: "BBBEE Certificate",
    tax_document_url: "Tax Clearance",
    company_registration_url: "Company Registration",
    cidb_document_url: "CIDB Certificate",
    capability_statement_url: "Company Profile",
  }
  return map[field]
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-2 text-xs font-semibold text-rose-700">{message}</p>
}

function SmartScoreNudge() {
  return <p className="mt-2 text-xs text-muted">Not uploaded — add this to improve your SmartScore.</p>
}

function profileProvinceValues(profile: Profile) {
  if (profile.provinces?.length) return profile.provinces
  if (profile.province) return [profile.province]
  return []
}

function cleanFileName(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-")
}

function publicStorageUrl(bucket: "avatars" | "company-logos", path: string): string {
  return `${PUBLIC_STORAGE_BASE}/${bucket}/${path}`
}

function coverGradient(name: string | null | undefined): string {
  const firstLetter = name?.trim().charAt(0).toUpperCase() || "S"
  const [from, to] = COVER_GRADIENTS[firstLetter.charCodeAt(0) % COVER_GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

function centerSquareCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 88 }, 1, width, height),
    width,
    height,
  )
}

async function getCroppedImageBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const canvas = document.createElement("canvas")
  const width = Math.max(1, Math.round(crop.width * scaleX))
  const height = Math.max(1, Math.round(crop.height * scaleY))
  const context = canvas.getContext("2d")

  canvas.width = width
  canvas.height = height
  if (!context) throw new Error("Image crop could not be prepared.")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    width,
    height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Cropped image could not be saved."))
    }, "image/jpeg", 0.92)
  })
}

function scoreProfile(profile: Profile | null, bank: BankRecord | null): SupplierSmartScoreProfile | null {
  if (!profile) return null

  return {
    ...profile,
    provinces: profile.provinces?.length ? profile.provinces : profile.province ? [profile.province] : [],
    bank_name: bank?.bank_name ?? null,
    bank_account_number: bank?.account_number ?? null,
    bank_verification_status: bank?.verification_status ?? null,
  }
}

function syncSmartScore(userId: string, profile: Profile | null, bank: BankRecord | null) {
  if (!supabase || !userId || !profile) return
  const score = calculateSmartScore(scoreProfile(profile, bank))

  void supabase
    .from("profiles")
    .update({ smart_score: score, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .then(({ error }) => {
      if (error) console.warn("SmartScore update failed:", error.message)
    })
}

// --- Score circle (0-100) ---

function ScoreCircle({ score }: { score: number }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, score / 100)
  const color =
    score >= 90 ? "#16a34a" : score >= 75 ? "#2563eb" : score >= 50 ? "#d97706" : "#dc2626"
  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: 104, height: 104 }}>
      <svg width={104} height={104} viewBox="0 0 104 104" aria-hidden="true">
        <circle cx={52} cy={52} r={r} fill="none" stroke="var(--border)" strokeWidth={9} />
        <circle
          cx={52} cy={52} r={r} fill="none"
          stroke={color} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 52 52)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums leading-none" style={{ color }}>
          {score}
        </span>
        <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted">/ 100</span>
      </div>
    </div>
  )
}

// --- Status badges ---

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "amber" | "red" | "sky" | "gray" }) {
  const cls = {
    green: "border-success/40 bg-success/10 text-success",
    amber: "border-warning/40 bg-warning/10 text-warning",
    red: "border-rose-500/35 bg-rose-500/10 text-rose-700",
    sky: "border-sky-500/35 bg-sky-500/10 text-sky-700",
    gray: "border-panel bg-panel text-muted",
  }[color]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${cls}`}>
      {children}
    </span>
  )
}

// --- Upload zone ---

function UploadZone({
  id,
  uploading,
  onChange,
}: {
  id: string
  uploading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label
      htmlFor={id}
      className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-panel px-4 py-6 text-center transition hover:border-accent"
    >
      <svg className="h-6 w-6 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-xs font-semibold text-secondary">
        {uploading ? "Uploading..." : "Drag and drop or click to browse"}
      </p>
      <p className="text-[0.65rem] text-muted">PDF - max 10 MB</p>
      <input id={id} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={onChange} disabled={uploading} />
    </label>
  )
}

// --- Uploaded file row ---

function FileRow({ label, url, status }: { label: string; url: string; status: "Verified" | "Under review" }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-panel bg-panel px-4 py-3">
      <svg className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-heading">{label}</span>
      <Badge color={status === "Verified" ? "green" : "amber"}>{status}</Badge>
      <SignedDocumentLink value={url} bucket="supplier-documents" className="text-xs font-semibold text-accent hover:text-accent-strong">
        View
      </SignedDocumentLink>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept temporarily while the upload UX migrates to the cover header.
function ProfileImageUploads({
  profile,
  onSave,
}: {
  profile: Profile
  onSave: (patch: Partial<Profile>) => Promise<SaveResult>
}) {
  const [uploading, setUploading] = useState<"avatar" | "logo" | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{
    file: File
    kind: "avatar" | "logo"
    previewUrl: string
  } | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const cropImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrl) URL.revokeObjectURL(pendingUpload.previewUrl)
    }
  }, [pendingUpload?.previewUrl])

  function startImageCrop(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "avatar" | "logo",
  ) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !supabase) return

    const isAvatar = kind === "avatar"
    const validTypes = isAvatar ? PERSONAL_PHOTO_TYPES : COMPANY_LOGO_TYPES
    const maxBytes = isAvatar ? PERSONAL_PHOTO_MAX_BYTES : COMPANY_LOGO_MAX_BYTES

    setError("")
    setMessage("")

    if (!validTypes.includes(file.type)) {
      setError(isAvatar ? "Upload a JPEG, PNG, or WebP photo." : "Upload a JPEG, PNG, WebP, or SVG logo.")
      return
    }

    if (file.size > maxBytes) {
      setError(isAvatar ? "Personal photo must be 2MB or smaller." : "Company logo must be 5MB or smaller.")
      return
    }

    setCrop(undefined)
    setCompletedCrop(null)
    setPendingUpload({ file, kind, previewUrl: URL.createObjectURL(file) })
  }

  function closeCropModal() {
    setPendingUpload(null)
    setCrop(undefined)
    setCompletedCrop(null)
    setUploading(null)
  }

  function imageCropToPixels(image: HTMLImageElement): PixelCrop | null {
    if (completedCrop?.width && completedCrop?.height) return completedCrop
    if (!crop?.width || !crop?.height) return null

    if (crop.unit === "%") {
      return {
        unit: "px",
        x: ((crop.x ?? 0) / 100) * image.width,
        y: ((crop.y ?? 0) / 100) * image.height,
        width: (crop.width / 100) * image.width,
        height: (crop.height / 100) * image.height,
      }
    }

    return {
      unit: "px",
      x: crop.x ?? 0,
      y: crop.y ?? 0,
      width: crop.width,
      height: crop.height,
    }
  }

  async function saveCroppedImage() {
    if (!pendingUpload || !supabase || !cropImageRef.current) return
    const pixelCrop = imageCropToPixels(cropImageRef.current)
    if (!pixelCrop) {
      setError("Choose a square crop before saving.")
      return
    }

    const isAvatar = pendingUpload.kind === "avatar"
    setUploading(pendingUpload.kind)
    setError("")
    setMessage("")

    let blob: Blob
    try {
      blob = await getCroppedImageBlob(cropImageRef.current, pixelCrop)
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Image crop failed.")
      setUploading(null)
      return
    }

    const bucket = isAvatar ? "avatars" : "company-logos"
    const path = isAvatar ? `${profile.id}/avatar.jpg` : `${profile.id}/logo.jpg`
    const column = isAvatar ? "avatar_url" : "company_logo_url"
    const publicUrl = publicStorageUrl(bucket, path)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: "image/jpeg", upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(null)
      return
    }

    const result = await onSave({ [column]: publicUrl } as Partial<Profile>)
    setUploading(null)
    if (!result.ok) {
      setError(result.error ?? "The image uploaded, but the profile URL could not be saved.")
      return
    }

    setMessage(isAvatar ? "Personal photo updated." : "Company logo updated.")
    closeCropModal()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {error && (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3 lg:col-span-2">
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}
      {message && (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 lg:col-span-2">
          <p className="text-xs font-semibold text-success">{message}</p>
        </div>
      )}

      <section className="rounded-md border border-panel bg-card p-5">
        <div className="flex items-center gap-4">
          <ProfileImage
            src={profile.avatar_url}
            alt="Personal avatar"
            className="h-20 w-20 rounded-full border border-panel object-cover"
            fallbackClassName="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-panel bg-accent text-xl font-bold text-button"
            fallbackText={initialsFromName(profile.full_name || profile.preferred_name || profile.email, "S")}
            seedName={profile.full_name || profile.preferred_name || profile.email}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-heading">Profile photo (shown on your public listing)</p>
            <p className="mt-1 text-xs leading-5 text-secondary">JPEG, PNG, or WebP. Max 2MB.</p>
            <label className="mt-3 inline-flex cursor-pointer rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong">
              {uploading === "avatar" ? "Uploading..." : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading !== null}
                onChange={(e) => startImageCrop(e, "avatar")}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-panel bg-card p-5">
        <div className="flex items-center gap-4">
          <ProfileImage
            src={profile.company_logo_url}
            alt="Company logo"
            className="h-20 w-20 rounded-xl border border-panel bg-white object-contain p-1"
            fallbackClassName="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-panel bg-panel text-xl font-bold text-heading"
            fallbackText={initialsFromName(profile.business_name, "S")}
            seedName={profile.business_name}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-heading">Cover image (shown as your profile banner)</p>
            <p className="mt-1 text-xs leading-5 text-secondary">JPEG, PNG, WebP, or SVG. Max 5MB.</p>
            <label className="mt-3 inline-flex cursor-pointer rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong">
              {uploading === "logo" ? "Uploading..." : "Upload logo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="sr-only"
                disabled={uploading !== null}
                onChange={(e) => startImageCrop(e, "logo")}
              />
            </label>
          </div>
        </div>
      </section>

      {pendingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-image-title">
          <div className="w-full max-w-xl rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-panel pb-3">
              <div>
                <h3 id="crop-image-title" className="text-base font-bold text-heading">
                  Crop {pendingUpload.kind === "avatar" ? "personal photo" : "company logo"}
                </h3>
                <p className="mt-1 text-xs text-secondary">Drag to position a 1:1 square crop before saving.</p>
              </div>
              <button
                type="button"
                onClick={closeCropModal}
                className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent"
              >
                Cancel
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-md border border-panel bg-panel p-3">
              <ReactCrop
                crop={crop}
                aspect={1}
                minWidth={80}
                minHeight={80}
                keepSelection
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- react-image-crop needs an HTMLImageElement for canvas cropping. */}
                <img
                  ref={cropImageRef}
                  src={pendingUpload.previewUrl}
                  alt="Crop preview"
                  className="max-h-[52vh] w-auto max-w-full"
                  onLoad={(event) => {
                    const nextCrop = centerSquareCrop(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
                    setCrop(nextCrop)
                  }}
                />
              </ReactCrop>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeCropModal}
                className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading !== null}
                onClick={saveCroppedImage}
                className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Saving..." : "Crop & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Profile Header Card ---

function ProfileHeaderCard({
  profile,
  bank,
  onTabChange,
  onSave,
}: {
  profile: Profile
  bank: BankRecord | null
  onTabChange: (tab: Tab) => void
  onSave: (patch: Partial<Profile>) => Promise<SaveResult>
}) {
  const csdVerified = Boolean(profile.csd_number) && isVerified(profile.verification_status)
  const bbbeeVerified = Boolean(profile.bbbee_level) && isVerified(profile.verification_status)
  const taxPending = Boolean(profile.tax_document_url) && !isVerified(profile.verification_status)
  const taxVerified = Boolean(profile.tax_document_url) && isVerified(profile.verification_status)
  const bankingMissing = !bank?.id
  const businessName = profile.business_name?.trim() || "Your business"
  const contactName =
    profile.preferred_name?.trim() ||
    profile.full_name?.trim() ||
    profile.email?.trim() ||
    businessName
  const smartScore = calculateSmartScore(scoreProfile(profile, bank))
  const location = profile.province ? displayProvinceValue(profile.province) : ""
  const profileMeta = [profile.industry, location].filter(Boolean).join(" | ") || "Industry | Province"
  const [uploading, setUploading] = useState<"avatar" | "logo" | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{
    file: File
    kind: "avatar" | "logo"
    previewUrl: string
  } | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const cropImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrl) URL.revokeObjectURL(pendingUpload.previewUrl)
    }
  }, [pendingUpload?.previewUrl])

  function startImageCrop(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "avatar" | "logo",
  ) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !supabase) return

    const isAvatar = kind === "avatar"
    const validTypes = isAvatar ? PERSONAL_PHOTO_TYPES : COMPANY_LOGO_TYPES
    const maxBytes = isAvatar ? PERSONAL_PHOTO_MAX_BYTES : COMPANY_LOGO_MAX_BYTES

    setError("")
    setMessage("")

    if (!validTypes.includes(file.type)) {
      setError(isAvatar ? "Upload a JPEG, PNG, or WebP photo." : "Upload a JPEG, PNG, WebP, or SVG cover image.")
      return
    }

    if (file.size > maxBytes) {
      setError(isAvatar ? "Personal photo must be 2MB or smaller." : "Cover image must be 5MB or smaller.")
      return
    }

    setCrop(undefined)
    setCompletedCrop(null)
    setPendingUpload({ file, kind, previewUrl: URL.createObjectURL(file) })
  }

  function closeCropModal() {
    setPendingUpload(null)
    setCrop(undefined)
    setCompletedCrop(null)
    setUploading(null)
  }

  function imageCropToPixels(image: HTMLImageElement): PixelCrop | null {
    if (completedCrop?.width && completedCrop?.height) return completedCrop
    if (!crop?.width || !crop?.height) return null

    if (crop.unit === "%") {
      return {
        unit: "px",
        x: ((crop.x ?? 0) / 100) * image.width,
        y: ((crop.y ?? 0) / 100) * image.height,
        width: (crop.width / 100) * image.width,
        height: (crop.height / 100) * image.height,
      }
    }

    return {
      unit: "px",
      x: crop.x ?? 0,
      y: crop.y ?? 0,
      width: crop.width,
      height: crop.height,
    }
  }

  async function saveCroppedImage() {
    if (!pendingUpload || !supabase || !cropImageRef.current) return
    const pixelCrop = imageCropToPixels(cropImageRef.current)
    if (!pixelCrop) {
      setError("Choose a square crop before saving.")
      return
    }

    const isAvatar = pendingUpload.kind === "avatar"
    setUploading(pendingUpload.kind)
    setError("")
    setMessage("")

    let blob: Blob
    try {
      blob = await getCroppedImageBlob(cropImageRef.current, pixelCrop)
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Image crop failed.")
      setUploading(null)
      return
    }

    const bucket = isAvatar ? "avatars" : "company-logos"
    const path = isAvatar ? `${profile.id}/avatar.jpg` : `${profile.id}/logo.jpg`
    const column = isAvatar ? "avatar_url" : "company_logo_url"
    const publicUrl = publicStorageUrl(bucket, path)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: "image/jpeg", upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(null)
      return
    }

    const result = await onSave({ [column]: publicUrl } as Partial<Profile>)
    setUploading(null)
    if (!result.ok) {
      setError(result.error ?? "The image uploaded, but the profile URL could not be saved.")
      return
    }

    setMessage(isAvatar ? "Profile photo updated." : "Cover image updated.")
    closeCropModal()
  }

  return (
    <>
    <div className="mt-5 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
      <div className="relative h-[180px]">
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="sr-only"
          disabled={uploading !== null}
          onChange={(e) => startImageCrop(e, "logo")}
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading !== null}
          onChange={(e) => startImageCrop(e, "avatar")}
        />
        {profile.company_logo_url ? (
          <Image
            src={profile.company_logo_url}
            alt={`${businessName} cover image`}
            fill
            unoptimized
            className="object-cover"
            sizes="(min-width: 1280px) 896px, 100vw"
          />
        ) : (
          <div className="h-full w-full" style={{ background: coverGradient(businessName) }} />
        )}
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="group absolute inset-0 z-10 cursor-pointer"
          aria-label="Change cover image"
        >
          <span className="flex h-full w-full items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100 group-focus-visible:bg-black/45 group-focus-visible:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-bold text-white shadow-lg">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              Change cover
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="group absolute bottom-0 left-6 z-20 translate-y-1/2 cursor-pointer rounded-full"
          aria-label="Change profile photo"
        >
          <ProfileImage
            src={profile.avatar_url}
            alt={`${contactName} avatar`}
            className="h-24 w-24 rounded-full border-[3px] border-card object-cover shadow-lg"
            fallbackClassName="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] border-card bg-accent text-2xl font-bold text-button shadow-lg"
            fallbackText={initialsFromName(contactName, "S")}
            seedName={contactName}
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition group-hover:bg-black/55 group-hover:opacity-100 group-focus-visible:bg-black/55 group-focus-visible:opacity-100">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </span>
        </button>
      </div>
      <div className="px-6 pb-5 pt-14">
        <p className="mb-4 text-[13px] text-secondary">Click your cover or profile photo to update</p>
        {error && (
          <div className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3">
            <p className="text-xs font-semibold text-rose-700">{error}</p>
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md border border-success/30 bg-success-soft px-4 py-3">
            <p className="text-xs font-semibold text-success">{message}</p>
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xl font-bold text-heading">{businessName}</p>
            <p className="mt-1 text-xs text-secondary">{profileMeta}</p>
          </div>
          <div className="w-fit rounded-md border border-accent/50 bg-panel px-4 py-3 text-center">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-accent">SmartScore</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-heading">{smartScore}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
            {csdVerified && <Badge color="green">CSD verified</Badge>}
            {bbbeeVerified && (
              <Badge color="green">BBBEE Level {profile.bbbee_level?.replace("Level ", "")}</Badge>
            )}
            {taxPending && <Badge color="amber">Tax clearance pending</Badge>}
            {taxVerified && <Badge color="green">Tax clearance verified</Badge>}
            {bankingMissing && (
              <button
                type="button"
                onClick={() => onTabChange("banking")}
                className="inline-flex items-center rounded-full border border-rose-500/35 bg-rose-500/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-rose-700 transition hover:border-rose-500/60"
              >
                Banking details missing
              </button>
            )}
          </div>

        <p className="mt-3 text-[0.68rem] text-muted">
        Profile last updated {daysAgo(profile.updated_at)} ·{" "}
        <Link href="/suppliers" className="text-accent hover:text-accent-strong">
          Preview public profile →
        </Link>
        </p>
      </div>
    </div>
    {pendingUpload && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-image-title">
        <div className="w-full max-w-xl rounded-md border border-panel bg-card p-5 shadow-panel">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-panel pb-3">
            <div>
              <h3 id="crop-image-title" className="text-base font-bold text-heading">
                Crop {pendingUpload.kind === "avatar" ? "profile photo" : "cover image"}
              </h3>
              <p className="mt-1 text-xs text-secondary">Drag to position a 1:1 square crop before saving.</p>
            </div>
            <button
              type="button"
              onClick={closeCropModal}
              className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent"
            >
              Cancel
            </button>
          </div>

          <div className="max-h-[60vh] overflow-auto rounded-md border border-panel bg-panel p-3">
            <ReactCrop
              crop={crop}
              aspect={1}
              minWidth={80}
              minHeight={80}
              keepSelection
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- react-image-crop needs an HTMLImageElement for canvas cropping. */}
              <img
                ref={cropImageRef}
                src={pendingUpload.previewUrl}
                alt="Crop preview"
                className="max-h-[52vh] w-auto max-w-full"
                onLoad={(event) => {
                  const nextCrop = centerSquareCrop(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
                  setCrop(nextCrop)
                }}
              />
            </ReactCrop>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeCropModal}
              className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={uploading !== null}
              onClick={saveCroppedImage}
              className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Saving..." : "Crop & Save"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// --- TAB 1: Profile ---

function ProfileTab({
  profile,
  onSave,
  onDirtyChange,
  saving,
}: {
  profile: Profile
  onSave: (patch: Partial<Profile>) => Promise<SaveResult>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}) {
  const [bizEdit, setBizEdit] = useState(false)
  const [compEdit, setCompEdit] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [lastSavedSection, setLastSavedSection] = useState<"business" | "compliance" | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})
  const [bizForm, setBizForm] = useState({
    preferred_name: profile.preferred_name ?? "",
    business_name: profile.business_name ?? "",
    industry: profile.industry ?? "",
    phone: formatSAPhoneInput(profile.phone ?? ""),
    email: profile.email ?? "",
    website: profile.website ?? "",
    province: profile.province ?? "",
    provinces: profileProvinceValues(profile),
    description: profile.description ?? "",
    company_registration: profile.company_registration ?? "",
  })

  useEffect(() => {
    if (!saveError) return
    const timeout = window.setTimeout(() => setSaveError(""), 5000)
    return () => window.clearTimeout(timeout)
  }, [saveError])
  const [compForm, setCompForm] = useState({
    csd_number: profile.csd_number ?? "",
    bbbee_level: profile.bbbee_level ?? "",
    tax_status: profile.tax_status ?? "",
    tax_reference: profile.tax_reference ?? "",
    vat_number: profile.vat_number ?? "",
    cidb_grade: profile.cidb_grade ?? "",
  })

  function handleBizChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const value = e.target.name === "phone" ? formatSAPhoneInput(e.target.value) : e.target.value
    setBizForm((p) => ({ ...p, [e.target.name]: value }))
    setFieldErrors((p) => ({ ...p, [e.target.name]: undefined }))
    onDirtyChange(true)
  }

  function handleBizPhoneFocus() {
    setBizForm((p) => ({ ...p, phone: phoneFocusValue(p.phone) }))
  }

  function handleBizPhoneBlur() {
    setBizForm((p) => ({ ...p, phone: phoneBlurValue(p.phone) }))
  }

  function handleCompChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setCompForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setFieldErrors((p) => ({ ...p, [e.target.name]: undefined }))
    onDirtyChange(true)
  }

  function toggleBizProvince(province: string) {
    if (isNationalSelection(bizForm.provinces)) return
    setBizForm((p) => {
      const provinces = p.provinces.includes(province)
        ? p.provinces.filter((item) => item !== province)
        : [...p.provinces, province]
      return { ...p, provinces, province: displayProvinceList(provinces) }
    })
    setFieldErrors((p) => ({ ...p, provinces: undefined }))
    onDirtyChange(true)
  }

  function toggleBizNational(checked: boolean) {
    const provinces = checked ? [NATIONAL_PROVINCE_VALUE] : []
    setBizForm((p) => ({ ...p, provinces, province: displayProvinceList(provinces) }))
    setFieldErrors((p) => ({ ...p, provinces: undefined }))
    onDirtyChange(true)
  }

  function validateBizForm() {
    const nextErrors: Record<string, string> = {}
    if (bizForm.phone.trim() && !validateSAPhone(bizForm.phone)) {
      nextErrors.phone = SA_PHONE_ERROR
    }
    if (bizForm.provinces.length === 0) {
      nextErrors.provinces = "Select at least one province."
    }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function validateCompForm() {
    const nextErrors: Record<string, string> = {}
    if (compForm.csd_number.trim() && !validateCsdNumber(compForm.csd_number)) {
      nextErrors.csd_number = "Enter a valid CSD number in MAAA-XXXXXXXX format."
    }
    if (compForm.tax_reference.trim() && !validateTaxNumber(compForm.tax_reference)) {
      nextErrors.tax_reference = "Tax number must be exactly 10 digits."
    }
    if (compForm.vat_number.trim() && !validateVatNumber(compForm.vat_number)) {
      nextErrors.vat_number = "VAT number must be exactly 10 digits and start with 4."
    }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function saveBiz() {
    setSaveError("")
    setSaveSuccess("")
    setLastSavedSection(null)
    if (!validateBizForm()) return
    const result = await onSave({
      ...bizForm,
      province: displayProvinceList(bizForm.provinces),
      provinces: bizForm.provinces,
    })
    if (!result.ok) {
      setSaveError(result.error ?? "We could not save your profile changes.")
      return
    }
    setBizEdit(false)
    onDirtyChange(false)
    setLastSavedSection("business")
    setSaveSuccess("Saved successfully.")
  }

  async function saveComp() {
    setSaveError("")
    setSaveSuccess("")
    setLastSavedSection(null)
    if (!validateCompForm()) return
    const result = await onSave(compForm)
    if (!result.ok) {
      setSaveError(result.error ?? "We could not save your profile changes.")
      return
    }
    setCompEdit(false)
    onDirtyChange(false)
    setLastSavedSection("compliance")
    setSaveSuccess("Saved successfully.")
  }

  function cancelBiz() {
    setBizForm({
      preferred_name: profile.preferred_name ?? "",
      business_name: profile.business_name ?? "",
      industry: profile.industry ?? "",
      phone: formatSAPhoneInput(profile.phone ?? ""),
      email: profile.email ?? "",
      website: profile.website ?? "",
      province: profile.province ?? "",
      provinces: profileProvinceValues(profile),
      description: profile.description ?? "",
      company_registration: profile.company_registration ?? "",
    })
    setFieldErrors({})
    setSaveError("")
    setSaveSuccess("")
    setLastSavedSection(null)
    setBizEdit(false)
    onDirtyChange(false)
  }

  function cancelComp() {
    setCompForm({
      csd_number: profile.csd_number ?? "",
      bbbee_level: profile.bbbee_level ?? "",
      tax_status: profile.tax_status ?? "",
      tax_reference: profile.tax_reference ?? "",
      vat_number: profile.vat_number ?? "",
      cidb_grade: profile.cidb_grade ?? "",
    })
    setFieldErrors({})
    setSaveError("")
    setSaveSuccess("")
    setLastSavedSection(null)
    setCompEdit(false)
    onDirtyChange(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-panel bg-panel p-6">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-panel pb-4">
          <h2 className="text-base font-bold text-heading">Business details</h2>
          {!bizEdit && (
            <button type="button" onClick={() => setBizEdit(true)} className="rounded-md border border-panel bg-card px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
              Edit
            </button>
          )}
        </div>
        {!bizEdit && saveSuccess && lastSavedSection === "business" && (
          <p className="mb-4 text-sm font-semibold text-success">{saveSuccess}</p>
        )}

        {bizEdit ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="preferred_name" className={labelCls}>Preferred display name</label>
                <input
                  id="preferred_name"
                  name="preferred_name"
                  type="text"
                  placeholder="e.g. Thabo, TK, or leave blank to use your full name"
                  value={bizForm.preferred_name}
                  onChange={handleBizChange}
                  className={inputCls}
                />
                <p className="mt-2 text-xs text-muted">This is how we&apos;ll greet you across the platform.</p>
              </div>
              <div>
                <label htmlFor="business_name" className={labelCls}>Registered business name</label>
                <input id="business_name" name="business_name" type="text" value={bizForm.business_name} onChange={handleBizChange} className={inputCls} />
              </div>
              <div>
                <label htmlFor="company_registration" className={labelCls}>Company registration number</label>
                <input id="company_registration" name="company_registration" type="text" placeholder="2024/000000/07" value={bizForm.company_registration} onChange={handleBizChange} className={inputCls} />
              </div>
              <div>
                <label htmlFor="industry" className={labelCls}>Industry</label>
                <input id="industry" name="industry" type="text" value={bizForm.industry} onChange={handleBizChange} className={inputCls} />
              </div>
              <div>
                <label htmlFor="phone" className={labelCls}>Phone number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+27821234567"
                  value={bizForm.phone}
                  onChange={handleBizChange}
                  onFocus={handleBizPhoneFocus}
                  onBlur={handleBizPhoneBlur}
                  className={inputCls}
                />
                <FieldError message={fieldErrors.phone} />
              </div>
              <div>
                <label htmlFor="email" className={labelCls}>Work email</label>
                <input id="email" name="email" type="email" value={bizForm.email} onChange={handleBizChange} className={inputCls} />
              </div>
              <div>
                <label htmlFor="website" className={labelCls}>Website</label>
                <input id="website" name="website" type="url" placeholder="https://" value={bizForm.website} onChange={handleBizChange} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <p className={labelCls}>Province(s) you operate in</p>
                <label className="mb-3 flex items-center gap-3 rounded-md border border-panel bg-card px-4 py-3 text-sm font-semibold text-secondary">
                  <input
                    type="checkbox"
                    checked={isNationalSelection(bizForm.provinces)}
                    onChange={(e) => toggleBizNational(e.target.checked)}
                    className="h-4 w-4 rounded border-panel accent-[var(--accent)]"
                  />
                  <span>I operate nationally</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROVINCES.map((province) => {
                    const selected = bizForm.provinces.includes(province)
                    const nationallySelected = isNationalSelection(bizForm.provinces)
                    return (
                      <button
                        key={province}
                        type="button"
                        onClick={() => toggleBizProvince(province)}
                        disabled={nationallySelected}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          selected
                            ? "border-accent bg-accent text-button"
                            : "border-panel bg-card text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"
                        }`}
                      >
                        {province}
                      </button>
                    )
                  })}
                </div>
                <FieldError message={fieldErrors.provinces} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="description" className={labelCls}>Business description</label>
                <textarea id="description" name="description" rows={3} value={bizForm.description} onChange={handleBizChange} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={saveBiz} disabled={saving} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
              <button type="button" onClick={cancelBiz} className="rounded-md border border-panel bg-card px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface">Cancel</button>
            </div>
            {saveError && <p className="text-sm font-semibold text-rose-700">{saveError}</p>}
            {saveSuccess && <p className="text-sm font-semibold text-success">{saveSuccess}</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Preferred display name", value: profile.preferred_name },
              { label: "Registered business name", value: profile.business_name },
              { label: "Company registration number", value: profile.company_registration },
              { label: "Industry", value: profile.industry },
              { label: "Phone number", value: profile.phone },
              { label: "Work email", value: profile.email },
              { label: "Website", value: profile.website },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border border-panel bg-card p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">{label}</p>
                <p className={`mt-2 text-sm font-semibold ${value ? "text-heading" : "text-muted"}`}>{value || "Not added"}</p>
              </div>
            ))}
            <div className="rounded-md border border-panel bg-card p-4 sm:col-span-2">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Province(s)</p>
              {profileProvinceValues(profile).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profileProvinceValues(profile).map((province) => (
                    <span key={province} className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-3 py-0.5 text-xs font-semibold text-accent">
                      {displayProvinceValue(province)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-muted">Not added</p>
              )}
            </div>
            <div className="rounded-md border border-panel bg-card p-4 sm:col-span-2">
              <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">Business description</p>
              <p className={`mt-2 text-sm leading-relaxed ${profile.description ? "text-secondary" : "text-muted"}`}>{profile.description || "Not added"}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border border-panel bg-panel p-6">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-panel pb-4">
          <h2 className="text-base font-bold text-heading">Compliance details</h2>
          {!compEdit && (
            <button type="button" onClick={() => setCompEdit(true)} className="rounded-md border border-panel bg-card px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
              Edit
            </button>
          )}
        </div>
        {!compEdit && saveSuccess && lastSavedSection === "compliance" && (
          <p className="mb-4 text-sm font-semibold text-success">{saveSuccess}</p>
        )}

        {compEdit ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="csd_number" className={labelCls}>CSD supplier number</label>
                <input id="csd_number" name="csd_number" type="text" placeholder="MAAA-12345678" value={compForm.csd_number} onChange={handleCompChange} className={inputCls} />
                <FieldError message={fieldErrors.csd_number} />
              </div>
              <div>
                <label htmlFor="bbbee_level" className={labelCls}>BBBEE level</label>
                <select id="bbbee_level" name="bbbee_level" value={compForm.bbbee_level} onChange={handleCompChange} className={inputCls}>
                  <option value="">Select level</option>
                  {BBBEE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="tax_reference" className={labelCls}>Tax reference number</label>
                <input id="tax_reference" name="tax_reference" type="text" value={compForm.tax_reference} onChange={handleCompChange} className={inputCls} />
                {!compForm.tax_reference.trim() && <SmartScoreNudge />}
                <FieldError message={fieldErrors.tax_reference} />
              </div>
              <div>
                <label htmlFor="vat_number" className={labelCls}>VAT registration number</label>
                <input id="vat_number" name="vat_number" type="text" placeholder="Optional" value={compForm.vat_number} onChange={handleCompChange} className={inputCls} />
                {!compForm.vat_number.trim() && <SmartScoreNudge />}
                <FieldError message={fieldErrors.vat_number} />
              </div>
              <div>
                <label htmlFor="tax_status" className={labelCls}>Tax status</label>
                <select id="tax_status" name="tax_status" value={compForm.tax_status} onChange={handleCompChange} className={inputCls}>
                  <option value="">Select status</option>
                  {TAX_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cidb_grade" className={labelCls}>CIDB grade</label>
                <input id="cidb_grade" name="cidb_grade" type="text" placeholder="e.g. 3GB, 5CE" value={compForm.cidb_grade} onChange={handleCompChange} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={saveComp} disabled={saving} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
              <button type="button" onClick={cancelComp} className="rounded-md border border-panel bg-card px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface">Cancel</button>
            </div>
            {saveError && <p className="text-sm font-semibold text-rose-700">{saveError}</p>}
            {saveSuccess && <p className="text-sm font-semibold text-success">{saveSuccess}</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "CSD supplier number", value: profile.csd_number, verified: Boolean(profile.csd_number) && isVerified(profile.verification_status) },
              { label: "BBBEE level", value: profile.bbbee_level, verified: Boolean(profile.bbbee_level) && isVerified(profile.verification_status) },
              { label: "Tax reference number", value: profile.tax_reference, verified: false },
              { label: "VAT registration number", value: profile.vat_number || "Not registered", verified: false },
            ].map(({ label, value, verified }) => (
              <div key={label} className="rounded-md border border-panel bg-card p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">{label}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className={`text-sm font-semibold ${value ? "text-heading" : "text-muted"}`}>{value || "Not added"}</p>
                  {verified && <Badge color="green">Verified</Badge>}
                </div>
                {!value && <SmartScoreNudge />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- TAB 2: Verification ---

function VerificationRow({
  icon,
  title,
  status,
  optional,
  verifiedText,
  pendingText,
  missingText,
  missingAction,
  uploadSlot,
}: {
  icon: React.ReactNode
  title: string
  status: "verified" | "pending" | "missing"
  optional?: boolean
  verifiedText: string
  pendingText: string
  missingText: string
  missingAction?: React.ReactNode
  uploadSlot?: React.ReactNode
}) {
  const iconBg = status === "verified" ? "bg-success/10" : status === "pending" ? "bg-warning/10" : "bg-panel"
  return (
    <div className="rounded-md border border-panel bg-card p-4">
      <div className="flex gap-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconBg}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-heading">{title}</p>
            {optional && <Badge color="gray">Optional</Badge>}
            {status === "verified" && <Badge color="green">Verified</Badge>}
            {status === "pending" && <Badge color="amber">Under review</Badge>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-secondary">
            {status === "verified" ? verifiedText : status === "pending" ? pendingText : missingText}
          </p>
          {status === "missing" && missingAction && <div className="mt-2">{missingAction}</div>}
          {uploadSlot}
        </div>
      </div>
    </div>
  )
}

function VerificationTab({
  profile,
  docUrls,
  userId,
  onDocUploaded,
  onTabChange,
}: {
  profile: Profile
  docUrls: DocUrls
  userId: string
  onDocUploaded: (field: DocumentField, url: string) => void
  onTabChange: (tab: Tab) => void
}) {
  const [uploadingField, setUploadingField] = useState<DocumentField | null>(null)
  const [uploadError, setUploadError] = useState("")

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, field: DocumentField, type: string) {
    const file = e.target.files?.[0]
    if (!file || !supabase || !userId) return
    setUploadError("")
    setUploadingField(field)
    const path = `${userId}/${type}/${cleanFileName(file.name)}`
    const { error: upErr } = await supabase.storage.from("supplier-documents").upload(path, file, { upsert: true })
    if (upErr) { setUploadError(upErr.message); setUploadingField(null); return }
    await supabase.from("profiles").update({ [field]: path }).eq("id", userId)
    onDocUploaded(field, path)
    setUploadingField(null)
    e.target.value = ""
  }

  function statusOf(doc: DocumentField): "verified" | "pending" | "missing" {
    if (!docUrls[doc]) return "missing"
    return isVerified(profile.verification_status) ? "verified" : "pending"
  }

  return (
    <div className="rounded-md border border-panel bg-panel p-6">
      <div className="mb-5 border-b border-panel pb-4">
        <h2 className="text-base font-bold text-heading">Verification status</h2>
      </div>

      {uploadError && (
        <div className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <p className="text-xs font-semibold text-rose-700">{uploadError}</p>
        </div>
      )}

      <div className="space-y-4">
        <VerificationRow
          icon={<svg className={`h-4 w-4 ${profile.csd_number ? "text-success" : "text-muted"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
          title="CSD registration"
          status={profile.csd_number ? (isVerified(profile.verification_status) ? "verified" : "pending") : "missing"}
          verifiedText={`Your CSD number ${profile.csd_number} has been confirmed as active.`}
          pendingText="CSD number submitted — under review."
          missingText="Enter your CSD number to begin verification."
          missingAction={<span className="text-xs text-secondary">Edit in the <button type="button" className="font-semibold text-accent hover:text-accent-strong" onClick={() => onTabChange("profile")}>Profile tab</button></span>}
        />

        <VerificationRow
          icon={<svg className={`h-4 w-4 ${statusOf("bbbee_document_url") === "verified" ? "text-success" : statusOf("bbbee_document_url") === "pending" ? "text-warning" : "text-muted"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
          title="BBBEE certificate"
          status={statusOf("bbbee_document_url")}
          verifiedText={`Level ${profile.bbbee_level?.replace("Level ", "")} certificate verified${profile.bbbee_expiry_date ? `. Expires ${profile.bbbee_expiry_date}` : ""}.`}
          pendingText="Under review — typically 1-2 business days."
          missingText="Upload your BBBEE certificate to verify."
          uploadSlot={
            <div className="mt-2">
              {docUrls.bbbee_document_url
                ? <FileRow label="BBBEE Certificate" url={docUrls.bbbee_document_url} status={statusOf("bbbee_document_url") === "verified" ? "Verified" : "Under review"} />
                : (
                  <>
                    <UploadZone id="bbbee-upload" uploading={uploadingField === "bbbee_document_url"} onChange={(e) => handleUpload(e, "bbbee_document_url", "bbbee-certificate")} />
                    <SmartScoreNudge />
                  </>
                )
              }
            </div>
          }
        />

        <VerificationRow
          icon={<svg className={`h-4 w-4 ${statusOf("tax_document_url") === "verified" ? "text-success" : statusOf("tax_document_url") === "pending" ? "text-warning" : "text-muted"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
          title="Tax clearance certificate"
          status={statusOf("tax_document_url")}
          verifiedText="Tax clearance certificate verified."
          pendingText="Under review — typically 1-2 business days."
          missingText="Upload your tax clearance certificate to verify."
          uploadSlot={
            <div className="mt-2">
              {docUrls.tax_document_url
                ? <FileRow label="Tax Clearance" url={docUrls.tax_document_url} status={statusOf("tax_document_url") === "verified" ? "Verified" : "Under review"} />
                : (
                  <>
                    <UploadZone id="tax-upload" uploading={uploadingField === "tax_document_url"} onChange={(e) => handleUpload(e, "tax_document_url", "tax-clearance-document")} />
                    <SmartScoreNudge />
                  </>
                )
              }
            </div>
          }
        />

        <VerificationRow
          icon={<svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" /></svg>}
          title="Banking details"
          status="missing"
          verifiedText="Banking details confirmed."
          pendingText="Banking details under review."
          missingText="Required before any PO can be processed."
          missingAction={<button type="button" onClick={() => onTabChange("banking")} className="text-xs font-semibold text-accent hover:text-accent-strong">Add banking details →</button>}
        />

        <VerificationRow
          icon={<svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
          title="Director ID verification"
          status="missing"
          optional
          verifiedText="Identity verified."
          pendingText="Identity verification in progress."
          missingText="Verify a director or authorised representative to add a trust badge to your public profile."
          missingAction={<button type="button" className="text-xs font-semibold text-accent hover:text-accent-strong">Start verification →</button>}
        />
      </div>
    </div>
  )
}

// --- TAB 3: Documents ---

const ALL_DOC_FIELDS: DocumentField[] = [
  "csd_document_url",
  "bbbee_document_url",
  "tax_document_url",
  "company_registration_url",
  "cidb_document_url",
  "capability_statement_url",
]

function DocumentsTab({
  profile,
  docUrls,
  userId,
  onDocUploaded,
}: {
  profile: Profile
  docUrls: DocUrls
  userId: string
  onDocUploaded: (field: DocumentField, url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<DocumentField>("bbbee_document_url")
  const [uploadError, setUploadError] = useState("")
  const [uploadSuccess, setUploadSuccess] = useState("")

  const existing = ALL_DOC_FIELDS.filter((f) => docUrls[f])

  async function handleNewUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !supabase || !userId) return
    setUploadError("")
    setUploadSuccess("")
    setUploading(true)
    const type = uploadCategory.replace("_document_url", "").replace("_url", "").replace(/_/g, "-")
    const path = `${userId}/${type}/${cleanFileName(file.name)}`
    const { error: upErr } = await supabase.storage.from("supplier-documents").upload(path, file, { upsert: true })
    if (upErr) { setUploadError(upErr.message); setUploading(false); return }
    await supabase.from("profiles").update({ [uploadCategory]: path }).eq("id", userId)
    onDocUploaded(uploadCategory, path)
    setUploading(false)
    setUploadSuccess(`${docLabel(uploadCategory)} uploaded.`)
    e.target.value = ""
  }

  const statusOfDoc = (): "Verified" | "Under review" =>
    isVerified(profile.verification_status) ? "Verified" : "Under review"

  return (
    <div className="rounded-md border border-panel bg-panel p-6">
      <div className="mb-5 border-b border-panel pb-4">
        <h2 className="text-base font-bold text-heading">Documents</h2>
        <p className="mt-1 text-xs text-secondary">All compliance documents uploaded to your profile.</p>
      </div>

      {existing.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-3">
          {existing.map((field) => (
            <div key={field} className="flex flex-wrap items-center gap-3 rounded-md border border-panel bg-card px-4 py-3">
              <svg className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="min-w-0 flex-1 text-sm font-semibold text-heading">{docLabel(field)}</span>
              <Badge color={statusOfDoc() === "Verified" ? "green" : "amber"}>{statusOfDoc()}</Badge>
              <SignedDocumentLink value={docUrls[field]} bucket="supplier-documents" className="rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
                Download
              </SignedDocumentLink>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-panel pt-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-secondary">Upload a new compliance document</p>
        {uploadError && (
          <div className="mb-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-2">
            <p className="text-xs text-rose-700">{uploadError}</p>
          </div>
        )}
        {uploadSuccess && (
          <div className="mb-3 rounded-md border border-success/30 bg-success-soft px-4 py-2">
            <p className="text-xs text-success">{uploadSuccess}</p>
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="doc-category" className={labelCls}>Document type</label>
          <select id="doc-category" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as DocumentField)} className={inputCls}>
            {ALL_DOC_FIELDS.map((f) => <option key={f} value={f}>{docLabel(f)}</option>)}
          </select>
          {!docUrls[uploadCategory] && <SmartScoreNudge />}
        </div>
        <UploadZone id="new-doc-upload" uploading={uploading} onChange={handleNewUpload} />
      </div>
    </div>
  )
}

// --- TAB 4: Banking details ---

function BankingTab({
  userId,
  bank,
  businessName,
  onBankSaved,
  onDirtyChange,
}: {
  userId: string
  bank: BankRecord | null
  businessName: string | null
  onBankSaved: (record: BankRecord) => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const hasExisting = Boolean(bank?.id)
  const [editMode, setEditMode] = useState(!hasExisting)
  const [form, setForm] = useState({
    bank_name: bank?.bank_name ?? "",
    account_holder: bank?.account_holder ?? (businessName ?? ""),
    account_number: bank?.account_number ?? "",
    branch_code: bank?.branch_code ?? "",
    account_type: bank?.account_type ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
    setError("")
    setSuccess("")
    onDirtyChange(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.bank_name || !form.account_holder || !form.account_number) {
      setError("Bank name, account holder, and account number are required.")
      return
    }
    if (!supabase || !userId) { setError("Not authenticated."); return }
    setSaving(true)
    const payload = {
      supplier_id: userId,
      bank_name: form.bank_name.trim(),
      account_holder: form.account_holder.trim(),
      account_number: form.account_number.trim(),
      branch_code: form.branch_code.trim(),
      account_type: form.account_type,
      verification_status: "Unverified",
    }
    if (bank?.id) {
      const { error: err } = await supabase.from("supplier_bank_details").update(payload).eq("id", bank.id)
      if (err) { setSaving(false); setError(err.message); return }
      onBankSaved({ ...bank, ...payload })
    } else {
      const { data, error: err } = await supabase
        .from("supplier_bank_details")
        .insert([payload])
        .select("id")
        .single()
      if (err) { setSaving(false); setError(err.message); return }
      onBankSaved({ ...(data as { id: number }), ...payload, verification_notes: null })
    }
    setSaving(false)
    setEditMode(false)
    onDirtyChange(false)
    setSuccess("Banking details saved. A finance administrator will verify your details before payment can be processed.")
    try {
      await logActivity({ action: "supplier.banking_details_submitted", entity_type: "supplier_profile", entity_id: userId, metadata: { bank_name: form.bank_name } })
    } catch { /* swallow */ }
  }

  function verificationBadgeColor(status: string | null): "green" | "sky" | "red" | "amber" {
    if (status === "Verified") return "green"
    if (status === "Under Review") return "sky"
    if (status === "Rejected") return "red"
    return "amber"
  }

  return (
    <div className="rounded-md border border-panel bg-panel p-6">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-panel pb-4">
        <h2 className="text-base font-bold text-heading">Banking details</h2>
        {hasExisting && !editMode && (
          <button type="button" onClick={() => { setEditMode(true); setSuccess("") }} className="rounded-md border border-panel bg-card px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-success/30 bg-success-soft px-4 py-3">
          <p className="text-xs font-semibold text-success">{success}</p>
        </div>
      )}

      {hasExisting && !editMode && bank && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-panel bg-card p-4">
            <div>
              <p className={labelCls}>Verification status</p>
              <p className="mt-1 text-sm font-bold text-heading">{bank.verification_status ?? "Unverified"}</p>
            </div>
            <Badge color={verificationBadgeColor(bank.verification_status)}>{bank.verification_status ?? "Unverified"}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Bank name", value: bank.bank_name },
              { label: "Account holder", value: bank.account_holder },
              { label: "Account number", value: bank.account_number },
              { label: "Branch code", value: bank.branch_code || "—" },
              { label: "Account type", value: bank.account_type || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border border-panel bg-card p-4">
                <p className={labelCls}>{label}</p>
                <p className="mt-1 text-sm font-semibold text-heading">{value}</p>
              </div>
            ))}
          </div>
          {bank.verification_notes && (
            <div className="rounded-md border border-panel bg-panel px-4 py-3">
              <p className={labelCls}>Verification notes</p>
              <p className="mt-1 text-sm text-secondary">{bank.verification_notes}</p>
            </div>
          )}
        </div>
      )}

      {(!hasExisting || editMode) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bank_name" className={labelCls}>Bank name <span className="text-rose-500">*</span></label>
            <select id="bank_name" name="bank_name" value={form.bank_name} onChange={handleChange} className={inputCls} required>
              <option value="">Select bank</option>
              {SA_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="account_holder" className={labelCls}>Account holder name <span className="text-rose-500">*</span></label>
            <input id="account_holder" name="account_holder" type="text" value={form.account_holder} onChange={handleChange} className={inputCls} required placeholder="Must match CIPC registration" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="account_number" className={labelCls}>Account number <span className="text-rose-500">*</span></label>
              <input id="account_number" name="account_number" type="text" value={form.account_number} onChange={handleChange} className={inputCls} required placeholder="e.g. 62123456789" />
            </div>
            <div>
              <label htmlFor="branch_code" className={labelCls}>Branch code</label>
              <input id="branch_code" name="branch_code" type="text" value={form.branch_code} onChange={handleChange} className={inputCls} placeholder="e.g. 632005" />
            </div>
          </div>
          <div>
            <label htmlFor="account_type" className={labelCls}>Account type</label>
            <select id="account_type" name="account_type" value={form.account_type} onChange={handleChange} className={inputCls}>
              <option value="">Select account type</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <p className="text-[0.65rem] text-muted">Universal branch codes: ABSA 632005 · FNB 250655 · Standard Bank 051001 · Nedbank 198765 · Capitec 470010</p>
          <div className="flex items-start gap-3 rounded-md border border-warning/25 bg-warning/8 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-warning">
              <strong>Important:</strong> Submitting incorrect banking details may delay payment. Ensure details exactly match your bank-stamped confirmation letter.{hasExisting && " Editing and resubmitting will reset your verification status."}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:opacity-50">
              {saving ? "Saving..." : "Save banking details"}
            </button>
            {hasExisting && editMode && (
              <button type="button" onClick={() => { setEditMode(false); setError(""); onDirtyChange(false) }} className="rounded-md border border-panel bg-card px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface">Cancel</button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

// --- Sidebar: SmartScore card ---

function SmartScoreCard({ profile, bank }: { profile: Profile | null; bank: BankRecord | null }) {
  const smartProfile = scoreProfile(profile, bank)
  const items = getSmartScoreBreakdown(smartProfile)
  const score = calculateSmartScore(smartProfile)

  const levelLabel =
    score >= 90
      ? "Excellent — priority visibility"
      : score >= 75
      ? "Good standing"
      : score >= 50
      ? "Building trust"
      : "Incomplete profile"

  const nextThreshold = score >= 90 ? null : score >= 75 ? 90 : score >= 50 ? 75 : 50
  const pointsToNext = nextThreshold ? nextThreshold - score : 0

  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.67rem] font-bold uppercase tracking-[0.24em] text-accent">SmartScore</p>
      <div className="mt-4">
        <ScoreCircle score={score} />
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-heading">{levelLabel}</p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-panel">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${score}%` }} />
      </div>

      {nextThreshold && (
        <p className="mt-2 text-center text-[0.65rem] text-secondary">
          Complete {pointsToNext} more point{pointsToNext !== 1 ? "s" : ""} to reach {nextThreshold}+{nextThreshold >= 90 ? " and unlock priority visibility" : ""}
        </p>
      )}

      <div className="mt-4 space-y-2 border-t border-panel pt-4">
        {items.map((item) => {
          const textCls = item.status === "earned" ? "text-success" : item.status === "pending" ? "text-warning" : "text-muted"
          const label =
            item.status === "earned"
              ? `+${item.earnedPoints}`
              : item.status === "pending"
              ? `Pending (${item.earnedPoints}/${item.points} pts)`
              : item.status === "optional"
              ? `Optional (${item.points} pts)`
              : `Missing (${item.points} pts)`
          return (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-xs text-secondary">
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0.55rem] font-bold ${
                    item.status === "earned"
                      ? "border-success/40 bg-success-soft text-success"
                      : item.status === "pending"
                      ? "border-warning/40 bg-warning-soft text-warning"
                      : "border-panel bg-panel text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {item.status === "earned" ? "+" : item.status === "pending" ? "..." : ""}
                </span>
                <span>{item.label}</span>
              </span>
              <span className={`text-[0.65rem] font-bold ${textCls}`}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Sidebar: RFQ visibility card ---

function RFQVisibilityCard({ profile }: { profile: Profile | null }) {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <p className="text-[0.67rem] font-bold uppercase tracking-[0.24em] text-accent">RFQ visibility</p>
      <p className="mt-2 text-xs leading-relaxed text-secondary">
        Your profile appears in searches for{" "}
        {profile?.industry ? <strong className="text-heading">{profile.industry}</strong> : "your industry"} RFQs in{" "}
        {profile?.province ? <strong className="text-heading">{profile.province}</strong> : "your province"}.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Profile views", value: "—" },
          { label: "RFQs matched", value: "—" },
          { label: "Shortlisted", value: "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-md border border-panel bg-panel p-3 text-center">
            <p className="text-base font-bold text-heading">{value}</p>
            <p className="mt-0.5 text-[0.6rem] text-muted">{label}</p>
          </div>
        ))}
      </div>
      <Link
        href="/suppliers"
        className="mt-4 flex w-full items-center justify-center rounded-md border border-panel bg-panel px-4 py-2.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent"
      >
        Preview public profile
      </Link>
    </div>
  )
}

// --- Main page inner ---

function ProfilePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  function resolveTab(param: string | null): Tab {
    const valid: Tab[] = ["profile", "verification", "documents", "banking"]
    return valid.includes(param as Tab) ? (param as Tab) : "profile"
  }

  const [activeTab, setActiveTab] = useState<Tab>(resolveTab(searchParams.get("tab")))
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [docUrls, setDocUrls] = useState<DocUrls>({
    csd_document_url: "",
    bbbee_document_url: "",
    tax_document_url: "",
    company_registration_url: "",
    cidb_document_url: "",
    capability_statement_url: "",
  })
  const [bank, setBank] = useState<BankRecord | null>(null)
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deleteScheduled, setDeleteScheduled] = useState(false)
  const { confirmNavigation } = useUnsavedChangesWarning(hasUnsaved)

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab")))
  }, [searchParams])

  useEffect(() => {
    async function load() {
      if (!supabase) { setError("Supabase is not configured."); setLoading(false); return }
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) { setError("You must be signed in."); setLoading(false); return }
      setUserId(user.id)

      const [profileRes, bankRes] = await Promise.all([
        supabase.from("profiles").select(
          "id, full_name, preferred_name, avatar_url, company_logo_url, business_name, province, provinces, industry, phone, email, website, description, company_registration, tax_reference, vat_number, verification_status, smart_score, csd_number, csd_verified, bbbee_level, bbbee_verified, tax_status, tax_verified, banking_verified, bank_verified, director_verified, tax_clearance_url, cidb_grade, verification_notes, csd_document_url, bbbee_document_url, tax_document_url, company_registration_url, cidb_document_url, capability_statement_url, tax_expiry_date, bbbee_expiry_date, csd_expiry_date, cidb_expiry_date, updated_at"
        ).eq("id", user.id).maybeSingle(),
        supabase.from("supplier_bank_details").select(
          "id, bank_name, account_holder, account_number, branch_code, account_type, verification_status, verification_notes"
        ).eq("supplier_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ])

      if (profileRes.error) { setError(profileRes.error.message); setLoading(false); return }

      const p = profileRes.data as Profile | null
      if (p) {
        setProfile(p)
        setDocUrls({
          csd_document_url: p.csd_document_url ?? "",
          bbbee_document_url: p.bbbee_document_url ?? "",
          tax_document_url: p.tax_document_url ?? "",
          company_registration_url: p.company_registration_url ?? "",
          cidb_document_url: p.cidb_document_url ?? "",
          capability_statement_url: p.capability_statement_url ?? "",
        })
      }

      if (bankRes.data && !bankRes.error) {
        setBank(bankRes.data as BankRecord)
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!deleteScheduled) return

    const signOutTimer = window.setTimeout(() => {
      void (async () => {
        await supabase.auth.signOut()
        router.replace("/")
      })()
    }, 3000)

    return () => window.clearTimeout(signOutTimer)
  }, [deleteScheduled, router])

  async function handleSave(patch: Partial<Profile>) {
    if (!supabase || !userId) {
      return { ok: false, error: "Supabase is not configured or your session has expired." }
    }
    setSaving(true)
    const { error: err } = await supabase.from("profiles").update(patch).eq("id", userId)
    setSaving(false)
    if (err) {
      setError(err.message)
      return { ok: false, error: err.message }
    }
    setProfile((p) => {
      const updated = p ? { ...p, ...patch } : p
      syncSmartScore(userId, updated, bank)
      return updated
    })
    setHasUnsaved(false)
    setError("")
    void logEvent("profile_saved")
    return { ok: true }
  }

  function handleDocUploaded(field: DocumentField, url: string) {
    setDocUrls((p) => ({ ...p, [field]: url }))
    setProfile((p) => {
      const updated = p ? { ...p, [field]: url } : p
      syncSmartScore(userId, updated, bank)
      return updated
    })
    void logEvent("document_uploaded", { document_type: field, path: url })
  }

  function handleBankSaved(record: BankRecord) {
    setBank(record)
    syncSmartScore(userId, profile, record)
  }

  async function handleDeleteAccount() {
    if (!supabase || !userId || deleteConfirmation !== "DELETE") return

    setDeletePending(true)
    setDeleteError("")
    setError("")

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error("Account deletion session lookup failed:", sessionError?.message)
      setDeleteError("Something went wrong. Please try again or contact support.")
      setDeletePending(false)
      return
    }

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      })
      const result = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !result.success) {
        console.error("Account deletion failed:", result.error ?? response.statusText)
        setDeleteError("Something went wrong. Please try again or contact support.")
        setDeletePending(false)
        return
      }
    } catch (deleteRequestError) {
      console.error("Account deletion request failed:", deleteRequestError)
      setDeleteError("Something went wrong. Please try again or contact support.")
      setDeletePending(false)
      return
    }

    setDeleteModalOpen(false)
    setDeleteConfirmation("")
    setDeletePending(false)
    setDeleteScheduled(true)
  }

  function requestTabChange(tab: Tab) {
    if (hasUnsaved && !confirmNavigation()) return
    navigateToTab(tab)
  }

  function navigateToTab(tab: Tab) {
    setActiveTab(tab)
    setHasUnsaved(false)
    const params = new URLSearchParams()
    if (tab !== "profile") params.set("tab", tab)
    const qs = params.toString()
    router.push(`/dashboard/profile${qs ? `?${qs}` : ""}`, { scroll: false } as Parameters<typeof router.push>[1])
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-7 w-48 animate-pulse rounded bg-panel" />
        <div className="h-10 animate-pulse rounded-md bg-panel" />
        <div className="mt-4 h-32 animate-pulse rounded-md bg-panel" />
        <div className="mt-4 h-64 animate-pulse rounded-md bg-panel" />
      </div>
    )
  }

  if (deleteScheduled) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <section className="max-w-2xl rounded-md border border-emerald-500/30 bg-emerald-500/10 p-8 text-center shadow-panel">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Deletion scheduled</p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">Your account has been scheduled for deletion.</h1>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Your details have been anonymised and your account will be permanently deleted within 30 days.
          </p>
          <p className="mt-5 text-xs font-semibold text-muted">Signing you out...</p>
        </section>
      </main>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-heading">
          {profileHeading(profile)}
        </h1>
        <p className="mt-1 text-sm text-secondary">Manage your supplier profile and compliance documents.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <div className="flex overflow-x-auto border-b border-panel">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => requestTabChange(tab.key)}
            className={`shrink-0 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {profile && <ProfileHeaderCard profile={profile} bank={bank} onTabChange={requestTabChange} onSave={handleSave} />}

      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          {!profile && (
            <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
              <p className="text-sm font-semibold text-heading">No supplier profile found.</p>
              <p className="mt-2 text-xs text-muted">Complete registration to set up your profile.</p>
            </div>
          )}
          {profile && activeTab === "profile" && (
            <ProfileTab profile={profile} onSave={handleSave} onDirtyChange={setHasUnsaved} saving={saving} />
          )}
          {profile && activeTab === "verification" && (
            <VerificationTab profile={profile} docUrls={docUrls} userId={userId} onDocUploaded={handleDocUploaded} onTabChange={requestTabChange} />
          )}
          {profile && activeTab === "documents" && (
            <DocumentsTab profile={profile} docUrls={docUrls} userId={userId} onDocUploaded={handleDocUploaded} />
          )}
          {activeTab === "banking" && (
            <BankingTab userId={userId} bank={bank} businessName={profile?.business_name ?? null} onBankSaved={handleBankSaved} onDirtyChange={setHasUnsaved} />
          )}
        </div>

        <aside className="w-full space-y-4 xl:w-72 xl:shrink-0">
          <SmartScoreCard profile={profile} bank={bank} />
          <RFQVisibilityCard profile={profile} />
        </aside>
      </div>

      <section className="mt-8 rounded-md border border-rose-500/30 bg-rose-500/10 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">Danger zone</p>
        <h2 className="mt-2 text-lg font-semibold text-rose-800">Delete my account</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-rose-800">
          This will permanently delete your account after 30 days. Your name and contact details will be anonymised immediately.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmation("")
            setDeleteError("")
            setDeleteModalOpen(true)
          }}
          className="mt-4 rounded-md border border-rose-600 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Delete my account
        </button>
      </section>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">Confirm deletion</p>
            <h2 className="mt-2 text-xl font-semibold text-heading">Delete your account?</h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              This will permanently delete your account after 30 days. Your name and contact details will be anonymised immediately.
            </p>
            <label className="mt-5 block text-sm font-semibold text-heading">
              Type DELETE to confirm
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                disabled={deletePending}
                className={`${inputCls} mt-2`}
              />
            </label>
            {deleteError && (
              <p className="mt-3 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deletePending}
                className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-card disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== "DELETE" || deletePending}
                className="rounded-md border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletePending ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Export ---

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-7 w-48 animate-pulse rounded bg-panel" />
          <div className="h-10 animate-pulse rounded-md bg-panel" />
          <div className="h-40 animate-pulse rounded-md bg-panel" />
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  )
}

"use client"

import { useRef, Dispatch, SetStateAction } from "react"
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop"
import "react-image-crop/dist/index.css"

function centerSquareCrop(
  mediaWidth: number,
  mediaHeight: number,
  desiredSize = 150
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      1,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

interface PendingUpload {
  previewUrl: string
  kind: "avatar" | "logo"
}

interface ImageCropModalProps {
  pendingUpload: PendingUpload | null
  crop: Crop
  completedCrop: PixelCrop | null
  uploading: string | null
  onCropChange: (crop: Crop) => void
  onCropComplete: (crop: PixelCrop) => void
  onCancel: () => void
  onSave: () => void
  cropImageRef: React.RefObject<HTMLImageElement>
}

export default function ImageCropModal({
  pendingUpload,
  crop,
  uploading,
  onCropChange,
  onCropComplete,
  onCancel,
  onSave,
  cropImageRef,
}: ImageCropModalProps) {
  if (!pendingUpload) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-image-title"
    >
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
            onClick={onCancel}
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
            onChange={(_, percentCrop) => onCropChange(percentCrop)}
            onComplete={(pixelCrop) => onCropComplete(pixelCrop)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- react-image-crop needs an HTMLImageElement for canvas cropping. */}
            <img
              ref={cropImageRef}
              src={pendingUpload.previewUrl}
              alt="Crop preview"
              className="max-h-[52vh] w-auto max-w-full"
              onLoad={(event) => {
                const nextCrop = centerSquareCrop(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
                onCropChange(nextCrop)
              }}
            />
          </ReactCrop>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={uploading !== null}
            onClick={onSave}
            className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Saving..." : "Crop & Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

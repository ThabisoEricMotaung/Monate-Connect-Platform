export const suggestionAttachmentMaxFileSize = 10 * 1024 * 1024
export const suggestionAttachmentTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]

export function cleanSuggestionAttachmentFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase()
}

export function formatSuggestionAttachmentFileSize(size: number | null) {
  if (!size) return ""
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function validateSuggestionAttachment(file: File) {
  if (!suggestionAttachmentTypes.includes(file.type)) return "Attach an image or PDF only."
  if (file.size > suggestionAttachmentMaxFileSize) return "Attachments must be 10MB or smaller."
  return ""
}

function extensionFromMimeType(type: string) {
  switch (type) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    default:
      return "png"
  }
}

export function imageFileFromClipboardItems(items: DataTransferItemList | null | undefined) {
  if (!items) return null

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (!item || item.kind !== "file" || !item.type.startsWith("image/")) continue

    const clipboardFile = item.getAsFile()
    if (!clipboardFile) continue

    if (clipboardFile.name.trim()) return clipboardFile

    const extension = extensionFromMimeType(clipboardFile.type)
    return new File([clipboardFile], `pasted-image-${Date.now()}.${extension}`, {
      type: clipboardFile.type,
      lastModified: clipboardFile.lastModified || Date.now(),
    })
  }

  return null
}

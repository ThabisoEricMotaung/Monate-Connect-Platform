import { supabase } from "@/lib/supabase"

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
  fileName?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]

export async function uploadSupplierDocument(
  file: File,
  rfqId: number,
  userId: string,
  documentType: "beecert" | "taxcert" | "company_reg" | "cidb" | "other" = "other"
): Promise<UploadResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" }
  }

  // Validate file
  if (!file) {
    return { success: false, error: "No file provided" }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "File type not allowed. Use PDF, Word, Excel, or images." }
  }

  try {
    // Create unique file path
    const timestamp = new Date().getTime()
    const fileName = `${rfqId}/${userId}/${documentType}/${timestamp}-${file.name}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from("supplier-documents").upload(fileName, file)

    if (error) {
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("supplier-documents")
      .getPublicUrl(fileName)

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    }
  }
}

export async function deleteSupplierDocument(filePath: string): Promise<UploadResult> {
  if (!supabase) {
    return { success: false, error: "Supabase not configured" }
  }

  try {
    const { error } = await supabase.storage.from("supplier-documents").remove([filePath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Delete failed",
    }
  }
}

export async function getSupplierDocuments(
  rfqId: number,
  userId: string
): Promise<{ name: string; url: string; uploadedAt: string }[]> {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase.storage
      .from("supplier-documents")
      .list(`${rfqId}/${userId}`, { limit: 100, sortBy: { column: "created_at", order: "desc" } })

    if (error) {
      console.error("Failed to list documents:", error)
      return []
    }

    return (data || []).map((file) => {
      const { data: urlData } = supabase.storage
        .from("supplier-documents")
        .getPublicUrl(`${rfqId}/${userId}/${file.name}`)

      return {
        name: file.name,
        url: urlData.publicUrl,
        uploadedAt: file.created_at,
      }
    })
  } catch (err) {
    console.error("Error fetching documents:", err)
    return []
  }
}
